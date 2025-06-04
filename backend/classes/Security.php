<?php
/**
 * Clase de Seguridad
 * Maneja todas las validaciones y medidas de seguridad
 */

if (!defined('BACKEND_ACCESS')) {
    http_response_code(403);
    die('Access denied');
}

class Security {

    /**
     * Sanitizar entrada de texto
     */
    public static function sanitizeInput($input, $type = 'string') {
        if (!is_string($input)) {
            return '';
        }

        // Remover caracteres nulos y de control
        $input = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $input);

        switch ($type) {
            case 'email':
                return filter_var(trim($input), FILTER_SANITIZE_EMAIL);

            case 'phone':
                // Permitir solo números, espacios, +, -, (, )
                return preg_replace('/[^0-9\s\+\-\(\)]/', '', trim($input));

            case 'name':
                // Permitir solo letras, espacios, acentos, guiones y apostrofes
                $input = trim($input);
                // Usar expresión regular compatible con PHP para caracteres Unicode
                $input = preg_replace('/[^a-zA-ZÀ-ÿñÑ\s\'\-]/u', '', $input);
                return $input;

            case 'string':
            default:
                $input = trim($input);
                $input = htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                return $input;
        }
    }

    /**
     * Validar email
     */
    public static function validateEmail($email) {
        $email = self::sanitizeInput($email, 'email');

        if (empty($email)) {
            return ['valid' => false, 'error' => 'Email es requerido'];
        }

        if (strlen($email) > MAX_EMAIL_LENGTH) {
            return ['valid' => false, 'error' => 'Email demasiado largo'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'error' => 'Email inválido'];
        }

        // Validar dominio
        $domain = substr(strrchr($email, "@"), 1);
        if (!checkdnsrr($domain, "MX") && !checkdnsrr($domain, "A")) {
            return ['valid' => false, 'error' => 'Dominio de email inválido'];
        }

        // Lista de dominios temporales/desechables (básica)
        $disposable_domains = [
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'yopmail.com', 'temp-mail.org'
        ];

        if (in_array(strtolower($domain), $disposable_domains)) {
            return ['valid' => false, 'error' => 'No se permiten emails temporales'];
        }

        return ['valid' => true, 'email' => $email];
    }

    /**
     * Validar nombre
     */
    public static function validateName($name) {
        $name = self::sanitizeInput($name, 'name');

        if (empty($name)) {
            return ['valid' => false, 'error' => 'Nombre es requerido'];
        }

        if (strlen($name) < 2) {
            return ['valid' => false, 'error' => 'Nombre muy corto (mínimo 2 caracteres)'];
        }

        if (strlen($name) > MAX_NAME_LENGTH) {
            return ['valid' => false, 'error' => 'Nombre muy largo (máximo ' . MAX_NAME_LENGTH . ' caracteres)'];
        }

        // Verificar que no sea solo espacios o caracteres especiales
        if (!preg_match('/[a-zA-ZÀ-ÿñÑ]/u', $name)) {
            return ['valid' => false, 'error' => 'Nombre debe contener al menos una letra'];
        }

        return ['valid' => true, 'name' => $name];
    }

    /**
     * Validar teléfono
     */
    public static function validatePhone($phone) {
        $phone = self::sanitizeInput($phone, 'phone');

        if (empty($phone)) {
            return ['valid' => false, 'error' => 'Teléfono es requerido'];
        }

        // Remover espacios para validación
        $clean_phone = preg_replace('/\s/', '', $phone);

        if (strlen($clean_phone) < 8) {
            return ['valid' => false, 'error' => 'Teléfono muy corto'];
        }

        if (strlen($phone) > MAX_PHONE_LENGTH) {
            return ['valid' => false, 'error' => 'Teléfono muy largo'];
        }

        // Validar formato básico (debe empezar con + o dígito)
        if (!preg_match('/^[\+]?[0-9]/', $clean_phone)) {
            return ['valid' => false, 'error' => 'Formato de teléfono inválido'];
        }

        return ['valid' => true, 'phone' => $phone];
    }

    /**
     * Verificar reCAPTCHA
     */
    public static function verifyRecaptcha($token, $ip = null) {
        if (empty($token)) {
            return ['valid' => false, 'error' => 'Token reCAPTCHA requerido'];
        }

        $secret = getConfig('RECAPTCHA_SECRET_KEY');
        if (!$secret) {
            Logger::log('error', 'reCAPTCHA secret key no configurada');
            return ['valid' => false, 'error' => 'Configuración de seguridad incompleta'];
        }

        $data = [
            'secret' => $secret,
            'response' => $token
        ];

        if ($ip) {
            $data['remoteip'] = $ip;
        }

        $options = [
            'http' => [
                'header' => "Content-type: application/x-www-form-urlencoded\r\n",
                'method' => 'POST',
                'content' => http_build_query($data),
                'timeout' => 10
            ]
        ];

        $context = stream_context_create($options);
        $response = @file_get_contents('https://www.google.com/recaptcha/api/siteverify', false, $context);

        if ($response === false) {
            Logger::log('error', 'Error al verificar reCAPTCHA: No se pudo conectar');
            return ['valid' => false, 'error' => 'Error de verificación de seguridad'];
        }

        $result = json_decode($response, true);

        if (!$result || !isset($result['success'])) {
            Logger::log('error', 'Error al verificar reCAPTCHA: Respuesta inválida');
            return ['valid' => false, 'error' => 'Error de verificación de seguridad'];
        }

        if (!$result['success']) {
            $errors = isset($result['error-codes']) ? implode(', ', $result['error-codes']) : 'Unknown';
            Logger::log('warning', "reCAPTCHA falló: $errors", ['ip' => $ip]);
            return ['valid' => false, 'error' => 'Verificación de seguridad falló'];
        }

        // Verificar score si está disponible (reCAPTCHA v3)
        if (isset($result['score']) && $result['score'] < 0.5) {
            Logger::log('warning', "reCAPTCHA score bajo: {$result['score']}", ['ip' => $ip]);
            return ['valid' => false, 'error' => 'Verificación de seguridad falló'];
        }

        return ['valid' => true, 'score' => $result['score'] ?? null];
    }

    /**
     * Generar token CSRF
     */
    public static function generateCSRFToken() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
        $_SESSION['csrf_time'] = time();

        return $token;
    }

    /**
     * Verificar token CSRF
     */
    public static function verifyCSRFToken($token) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_time'])) {
            return false;
        }

        // Token expira en 1 hora
        if (time() - $_SESSION['csrf_time'] > 3600) {
            unset($_SESSION['csrf_token'], $_SESSION['csrf_time']);
            return false;
        }

        return hash_equals($_SESSION['csrf_token'], $token);
    }

    /**
     * Obtener IP real del cliente
     */
    public static function getRealIP() {
        $ip_headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_X_FORWARDED_FOR',      // Proxy
            'HTTP_X_FORWARDED',          // Proxy
            'HTTP_X_CLUSTER_CLIENT_IP',  // Cluster
            'HTTP_FORWARDED_FOR',        // Proxy
            'HTTP_FORWARDED',            // Proxy
            'REMOTE_ADDR'                // Standard
        ];

        foreach ($ip_headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);

                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    /**
     * Detectar honeypot
     */
    public static function checkHoneypot($honeypot_value) {
        // Si el honeypot tiene valor, es un bot
        return !empty($honeypot_value);
    }
}
?>
