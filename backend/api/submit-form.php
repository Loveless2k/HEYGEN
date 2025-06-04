<?php
/**
 * API Endpoint para envío de formulario
 * Maneja toda la lógica de seguridad y validación
 */

// Definir constante de acceso
define('BACKEND_ACCESS', true);

// Cargar configuración y clases
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Security.php';
require_once __DIR__ . '/../classes/RateLimiter.php';
require_once __DIR__ . '/../classes/Logger.php';
require_once __DIR__ . '/../classes/AirtableClient.php';

// Headers de seguridad adicionales para API
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// Verificar Content-Type
$content_type = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($content_type, 'application/json') === false &&
    strpos($content_type, 'application/x-www-form-urlencoded') === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Content-Type no válido']);
    exit;
}

try {
    // Obtener IP del cliente
    $client_ip = Security::getRealIP();

    // Verificar rate limiting
    $rate_limiter = new RateLimiter();
    if ($rate_limiter->isBlocked($client_ip)) {
        $remaining_time = $rate_limiter->getBlockTimeRemaining($client_ip);

        Logger::logSecurityThreat('rate_limit_exceeded', [
            'ip' => $client_ip,
            'remaining_time' => $remaining_time
        ]);

        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Demasiados intentos. Intenta nuevamente en ' . ceil($remaining_time / 60) . ' minutos.',
            'retry_after' => $remaining_time
        ]);
        exit;
    }

    // Registrar intento
    if (!$rate_limiter->registerAttempt($client_ip)) {
        $remaining_time = $rate_limiter->getBlockTimeRemaining($client_ip);

        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Límite de intentos excedido. Intenta nuevamente en ' . ceil($remaining_time / 60) . ' minutos.',
            'retry_after' => $remaining_time
        ]);
        exit;
    }

    // Obtener datos del formulario
    $input_data = [];
    if (strpos($content_type, 'application/json') !== false) {
        $json_input = file_get_contents('php://input');
        $input_data = json_decode($json_input, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('JSON inválido');
        }
    } else {
        $input_data = $_POST;
    }

    // Verificar que se recibieron datos
    if (empty($input_data)) {
        throw new Exception('No se recibieron datos');
    }

    // Verificar honeypot
    if (Security::checkHoneypot($input_data['website'] ?? '')) {
        Logger::logSecurityThreat('honeypot_triggered', [
            'ip' => $client_ip,
            'honeypot_value' => $input_data['website'] ?? ''
        ]);

        // Responder como si fuera exitoso para confundir al bot
        echo json_encode(['success' => true, 'message' => 'Formulario enviado correctamente']);
        exit;
    }

    // Verificar token CSRF
    if (!Security::verifyCSRFToken($input_data['csrf_token'] ?? '')) {
        Logger::logSecurityThreat('csrf_token_invalid', ['ip' => $client_ip]);
        throw new Exception('Token de seguridad inválido');
    }

    // Verificar reCAPTCHA
    $recaptcha_result = Security::verifyRecaptcha(
        $input_data['recaptcha_token'] ?? '',
        $client_ip
    );

    if (!$recaptcha_result['valid']) {
        Logger::logSecurityThreat('recaptcha_failed', [
            'ip' => $client_ip,
            'error' => $recaptcha_result['error']
        ]);
        throw new Exception($recaptcha_result['error']);
    }

    // Validar campos del formulario
    $validation_errors = [];

    // Validar nombre
    $name_result = Security::validateName($input_data['name'] ?? '');
    if (!$name_result['valid']) {
        $validation_errors['name'] = $name_result['error'];
    }

    // Validar email
    $email_result = Security::validateEmail($input_data['email'] ?? '');
    if (!$email_result['valid']) {
        $validation_errors['email'] = $email_result['error'];
    }

    // Validar teléfono
    $phone_result = Security::validatePhone($input_data['phone'] ?? '');
    if (!$phone_result['valid']) {
        $validation_errors['phone'] = $phone_result['error'];
    }

    // Verificar consentimiento
    if (empty($input_data['consent']) || $input_data['consent'] !== 'true') {
        $validation_errors['consent'] = 'Debe aceptar recibir información';
    }

    // Si hay errores de validación
    if (!empty($validation_errors)) {
        Logger::logFormAttempt($input_data, false, $validation_errors);

        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Datos del formulario inválidos',
            'validation_errors' => $validation_errors
        ]);
        exit;
    }

    // Preparar datos limpios para Airtable
    $clean_data = [
        'name' => $name_result['name'],
        'email' => $email_result['email'],
        'phone' => $phone_result['phone']
    ];

    // Enviar a Airtable
    $airtable = new AirtableClient();
    $airtable_result = $airtable->createRecord($clean_data);

    // Resetear rate limiting después de envío exitoso
    $rate_limiter->resetAttempts($client_ip);

    // Log de éxito
    Logger::logFormAttempt($clean_data, true);

    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'message' => 'Formulario enviado correctamente',
        'record_id' => $airtable_result['id'] ?? null
    ]);

} catch (Exception $e) {
    // Verificar si es error de email duplicado
    if (strpos($e->getMessage(), 'Ya existe un registro con este email') !== false) {
        // Log informativo para email duplicado
        Logger::log('info', 'Intento de registro con email duplicado: ' . $e->getMessage(), [
            'ip' => $client_ip ?? 'unknown',
            'email' => $input_data['email'] ?? 'unknown'
        ]);

        // Respuesta informativa (no error)
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    } else {
        // Log del error real
        Logger::log('error', 'Error en submit-form: ' . $e->getMessage(), [
            'ip' => $client_ip ?? 'unknown',
            'input_data' => array_intersect_key($input_data ?? [], array_flip(['name', 'email']))
        ]);

        // Respuesta de error interno
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Error interno del servidor. Por favor, inténtalo de nuevo.'
        ]);
    }
}
?>
