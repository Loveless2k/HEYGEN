<?php
/**
 * Configuración principal del backend
 * Landing Page Security Backend
 */

// Prevenir acceso directo
if (!defined('BACKEND_ACCESS')) {
    http_response_code(403);
    die('Access denied');
}

// Configuración de errores (solo en desarrollo)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Cambiar a 1 solo en desarrollo
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');

// Configuración de seguridad
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.use_strict_mode', 1);

// Headers de seguridad
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

// Content Security Policy
$csp = "default-src 'self'; " .
       "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com; " .
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " .
       "font-src 'self' https://fonts.gstatic.com; " .
       "img-src 'self' data: https:; " .
       "connect-src 'self' https://api.airtable.com; " .
       "frame-src https://www.google.com;";
header("Content-Security-Policy: $csp");

// Configuración de base de datos (opcional, para logs)
define('DB_HOST', 'localhost');
define('DB_NAME', 'tu_base_datos'); // Cambiar por tu BD
define('DB_USER', 'tu_usuario');    // Cambiar por tu usuario
define('DB_PASS', 'tu_password');   // Cambiar por tu password

// Configuración de Airtable
define('AIRTABLE_API_KEY', 'tu_airtable_token'); // Cambiar por tu token
define('AIRTABLE_BASE_ID', 'appoRKe4XVRRFY54Y');
define('AIRTABLE_TABLE_NAME', 'LandingPageLeads');

// Configuración de reCAPTCHA
define('RECAPTCHA_SECRET_KEY', 'tu_recaptcha_secret'); // Cambiar por tu secret
define('RECAPTCHA_SITE_KEY', 'tu_recaptcha_site_key'); // Para el frontend

// Configuración de rate limiting
define('RATE_LIMIT_REQUESTS', 5);     // Máximo 5 intentos
define('RATE_LIMIT_WINDOW', 300);     // En 5 minutos (300 segundos)
define('RATE_LIMIT_BLOCK_TIME', 900); // Bloquear por 15 minutos

// Configuración de validación
define('MAX_NAME_LENGTH', 50);
define('MAX_EMAIL_LENGTH', 100);
define('MAX_PHONE_LENGTH', 20);

// Configuración de logs
define('LOG_DIRECTORY', __DIR__ . '/../logs/');
define('ENABLE_LOGGING', true);

// Configuración de notificaciones
define('ADMIN_EMAIL', 'tu_email@dominio.com'); // Cambiar por tu email
define('ENABLE_EMAIL_NOTIFICATIONS', true);

// Timezone
date_default_timezone_set('America/Santiago'); // Cambiar según tu zona

// Función para cargar variables de entorno (si usas .env)
function loadEnv($file) {
    if (!file_exists($file)) return;
    
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if (!array_key_exists($key, $_ENV)) {
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
}

// Cargar .env si existe
loadEnv(__DIR__ . '/../.env');

// Función para obtener configuración con fallback
function getConfig($key, $default = null) {
    return $_ENV[$key] ?? constant($key) ?? $default;
}

// Verificar que las configuraciones críticas estén definidas
$required_configs = [
    'AIRTABLE_API_KEY',
    'AIRTABLE_BASE_ID', 
    'RECAPTCHA_SECRET_KEY'
];

foreach ($required_configs as $config) {
    if (!getConfig($config)) {
        error_log("Configuración crítica faltante: $config");
        if (getConfig('ENABLE_LOGGING')) {
            file_put_contents(
                LOG_DIRECTORY . 'config_errors.log',
                date('Y-m-d H:i:s') . " - Configuración faltante: $config\n",
                FILE_APPEND | LOCK_EX
            );
        }
    }
}
?>
