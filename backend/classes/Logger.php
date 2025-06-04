<?php
/**
 * Clase Logger
 * Sistema de logging para seguridad y monitoreo
 */

if (!defined('BACKEND_ACCESS')) {
    http_response_code(403);
    die('Access denied');
}

class Logger {
    
    /**
     * Log de eventos
     */
    public static function log($level, $message, $context = []) {
        if (!getConfig('ENABLE_LOGGING', true)) {
            return;
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $ip = Security::getRealIP();
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        
        // Preparar contexto
        $context_data = array_merge([
            'ip' => $ip,
            'user_agent' => substr($user_agent, 0, 200),
            'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? ''
        ], $context);
        
        $log_entry = [
            'timestamp' => $timestamp,
            'level' => strtoupper($level),
            'message' => $message,
            'context' => $context_data
        ];
        
        // Escribir a archivo
        self::writeToFile($level, $log_entry);
        
        // Enviar notificación si es crítico
        if (in_array($level, ['error', 'critical']) && getConfig('ENABLE_EMAIL_NOTIFICATIONS')) {
            self::sendNotification($log_entry);
        }
    }
    
    /**
     * Escribir a archivo de log
     */
    private static function writeToFile($level, $log_entry) {
        $log_dir = LOG_DIRECTORY;
        
        // Crear directorio si no existe
        if (!is_dir($log_dir)) {
            mkdir($log_dir, 0755, true);
        }
        
        // Archivo por nivel y fecha
        $date = date('Y-m-d');
        $filename = "{$log_dir}{$level}_{$date}.log";
        
        // Formato de línea
        $line = sprintf(
            "[%s] %s: %s | Context: %s\n",
            $log_entry['timestamp'],
            $log_entry['level'],
            $log_entry['message'],
            json_encode($log_entry['context'], JSON_UNESCAPED_UNICODE)
        );
        
        // Escribir con lock
        file_put_contents($filename, $line, FILE_APPEND | LOCK_EX);
        
        // Rotar logs si son muy grandes (>10MB)
        if (file_exists($filename) && filesize($filename) > 10 * 1024 * 1024) {
            self::rotateLog($filename);
        }
    }
    
    /**
     * Rotar logs grandes
     */
    private static function rotateLog($filename) {
        $backup_name = $filename . '.' . time() . '.bak';
        rename($filename, $backup_name);
        
        // Comprimir si está disponible
        if (function_exists('gzopen')) {
            $gz_name = $backup_name . '.gz';
            $fp_in = fopen($backup_name, 'rb');
            $fp_out = gzopen($gz_name, 'wb9');
            
            if ($fp_in && $fp_out) {
                while (!feof($fp_in)) {
                    gzwrite($fp_out, fread($fp_in, 8192));
                }
                fclose($fp_in);
                gzclose($fp_out);
                unlink($backup_name);
            }
        }
    }
    
    /**
     * Enviar notificación por email
     */
    private static function sendNotification($log_entry) {
        $admin_email = getConfig('ADMIN_EMAIL');
        if (!$admin_email) return;
        
        $subject = "Alerta de Seguridad - Landing Page";
        $message = "Se ha detectado un evento de seguridad:\n\n";
        $message .= "Nivel: {$log_entry['level']}\n";
        $message .= "Mensaje: {$log_entry['message']}\n";
        $message .= "Timestamp: {$log_entry['timestamp']}\n";
        $message .= "IP: {$log_entry['context']['ip']}\n";
        $message .= "User Agent: {$log_entry['context']['user_agent']}\n";
        $message .= "URI: {$log_entry['context']['request_uri']}\n\n";
        $message .= "Contexto completo:\n" . json_encode($log_entry['context'], JSON_PRETTY_PRINT);
        
        $headers = [
            'From: noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
            'Reply-To: ' . $admin_email,
            'X-Mailer: Landing Page Security System'
        ];
        
        @mail($admin_email, $subject, $message, implode("\r\n", $headers));
    }
    
    /**
     * Log específico para intentos de formulario
     */
    public static function logFormAttempt($data, $success = true, $errors = []) {
        $level = $success ? 'info' : 'warning';
        $message = $success ? 'Formulario enviado exitosamente' : 'Intento de formulario falló';
        
        $context = [
            'form_data' => [
                'name_length' => strlen($data['name'] ?? ''),
                'email_domain' => substr(strrchr($data['email'] ?? '', "@"), 1),
                'phone_country' => substr($data['phone'] ?? '', 0, 4),
                'has_consent' => isset($data['consent']) ? 'yes' : 'no'
            ],
            'success' => $success,
            'errors' => $errors
        ];
        
        self::log($level, $message, $context);
    }
    
    /**
     * Log específico para ataques detectados
     */
    public static function logSecurityThreat($threat_type, $details = []) {
        $message = "Amenaza de seguridad detectada: $threat_type";
        
        $context = array_merge([
            'threat_type' => $threat_type,
            'severity' => 'high'
        ], $details);
        
        self::log('error', $message, $context);
    }
    
    /**
     * Log específico para rate limiting
     */
    public static function logRateLimit($ip, $attempts, $blocked = false) {
        $level = $blocked ? 'warning' : 'info';
        $message = $blocked ? "IP bloqueada por rate limiting" : "Intento registrado";
        
        $context = [
            'ip' => $ip,
            'attempts' => $attempts,
            'blocked' => $blocked,
            'rate_limit_window' => RATE_LIMIT_WINDOW,
            'max_attempts' => RATE_LIMIT_REQUESTS
        ];
        
        self::log($level, $message, $context);
    }
    
    /**
     * Limpiar logs antiguos
     */
    public static function cleanOldLogs($days = 30) {
        $log_dir = LOG_DIRECTORY;
        if (!is_dir($log_dir)) return;
        
        $cutoff_time = time() - ($days * 24 * 60 * 60);
        $files = glob($log_dir . '*.log*');
        
        foreach ($files as $file) {
            if (filemtime($file) < $cutoff_time) {
                unlink($file);
            }
        }
    }
    
    /**
     * Obtener estadísticas de logs
     */
    public static function getStats($days = 7) {
        $log_dir = LOG_DIRECTORY;
        if (!is_dir($log_dir)) return [];
        
        $stats = [
            'total_requests' => 0,
            'successful_submissions' => 0,
            'failed_submissions' => 0,
            'blocked_ips' => 0,
            'security_threats' => 0
        ];
        
        $cutoff_date = date('Y-m-d', strtotime("-$days days"));
        $files = glob($log_dir . "*.log");
        
        foreach ($files as $file) {
            $filename = basename($file);
            if (preg_match('/(\d{4}-\d{2}-\d{2})/', $filename, $matches)) {
                if ($matches[1] >= $cutoff_date) {
                    $content = file_get_contents($file);
                    
                    // Contar eventos
                    $stats['total_requests'] += substr_count($content, 'Formulario enviado');
                    $stats['successful_submissions'] += substr_count($content, 'exitosamente');
                    $stats['failed_submissions'] += substr_count($content, 'falló');
                    $stats['blocked_ips'] += substr_count($content, 'bloqueada por rate');
                    $stats['security_threats'] += substr_count($content, 'Amenaza de seguridad');
                }
            }
        }
        
        return $stats;
    }
}
?>
