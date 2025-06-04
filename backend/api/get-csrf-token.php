<?php
/**
 * API Endpoint para obtener token CSRF - VERSIÓN ROBUSTA
 * Funciona sin dependencias complejas y es compatible con Hostinger
 */

// Configuración de errores para diagnóstico
error_reporting(E_ALL);
ini_set('display_errors', 0); // Cambiar a 1 solo para debug local
ini_set('log_errors', 1);

// Headers de seguridad
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Solo permitir GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// Función para generar token seguro (sin dependencias externas)
function generateCSRFToken() {
    try {
        // Método 1: random_bytes (PHP 7+)
        if (function_exists('random_bytes')) {
            return bin2hex(random_bytes(32));
        }

        // Método 2: openssl_random_pseudo_bytes
        if (function_exists('openssl_random_pseudo_bytes')) {
            $bytes = openssl_random_pseudo_bytes(32, $strong);
            if ($strong) {
                return bin2hex($bytes);
            }
        }

        // Método 3: Fallback seguro
        $data = uniqid(mt_rand(), true) . microtime(true) . $_SERVER['REQUEST_TIME_FLOAT'] . rand();
        return hash('sha256', $data);

    } catch (Exception $e) {
        // Último fallback
        return hash('sha256', uniqid() . time() . rand());
    }
}

// Función para iniciar sesión segura
function startSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Configurar sesión segura
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_strict_mode', 1);

        // Solo usar secure en HTTPS
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            ini_set('session.cookie_secure', 1);
        }

        session_start();
    }
    return true;
}

try {
    // Iniciar sesión
    startSession();

    // Generar token CSRF
    $csrf_token = generateCSRFToken();

    // Guardar en sesión
    $_SESSION['csrf_token'] = $csrf_token;
    $_SESSION['csrf_time'] = time();

    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'csrf_token' => $csrf_token,
        'expires_in' => 3600,
        'generated_at' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    // Log del error
    $log_dir = __DIR__ . '/../logs/';
    if (is_dir($log_dir)) {
        $log_entry = date('Y-m-d H:i:s') . " - CSRF Error: " . $e->getMessage() . "\n";
        @file_put_contents($log_dir . 'csrf_errors.log', $log_entry, FILE_APPEND | LOCK_EX);
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error generando token de seguridad',
        'debug' => $e->getMessage() // Solo para desarrollo
    ]);
}
?>
