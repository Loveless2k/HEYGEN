<?php
/**
 * Clase Rate Limiter
 * Controla la frecuencia de envíos por IP
 */

if (!defined('BACKEND_ACCESS')) {
    http_response_code(403);
    die('Access denied');
}

class RateLimiter {
    private $db;
    private $table_name = 'rate_limits';

    public function __construct() {
        $this->initDatabase();
    }

    /**
     * Inicializar base de datos
     */
    private function initDatabase() {
        try {
            $this->db = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );

            $this->createTable();
        } catch (PDOException $e) {
            // Si no hay BD, usar archivos como fallback
            Logger::log('warning', 'No se pudo conectar a BD, usando archivos: ' . $e->getMessage());
            $this->db = null;
        }
    }

    /**
     * Crear tabla si no existe
     */
    private function createTable() {
        if (!$this->db) return;

        $sql = "CREATE TABLE IF NOT EXISTS {$this->table_name} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip_address VARCHAR(45) NOT NULL,
            attempts INT DEFAULT 1,
            first_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            blocked_until TIMESTAMP NULL,
            INDEX idx_ip (ip_address),
            INDEX idx_blocked (blocked_until)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

        try {
            $this->db->exec($sql);
        } catch (PDOException $e) {
            Logger::log('error', 'Error creando tabla rate_limits: ' . $e->getMessage());
        }
    }

    /**
     * Verificar si IP está bloqueada
     */
    public function isBlocked($ip) {
        if ($this->db) {
            return $this->isDatabaseBlocked($ip);
        } else {
            return $this->isFileBlocked($ip);
        }
    }

    /**
     * Registrar intento
     */
    public function registerAttempt($ip) {
        if ($this->db) {
            return $this->registerDatabaseAttempt($ip);
        } else {
            return $this->registerFileAttempt($ip);
        }
    }

    /**
     * Obtener tiempo restante de bloqueo
     */
    public function getBlockTimeRemaining($ip) {
        if ($this->db) {
            return $this->getDatabaseBlockTime($ip);
        } else {
            return $this->getFileBlockTime($ip);
        }
    }

    /**
     * Resetear intentos después de envío exitoso
     */
    public function resetAttempts($ip) {
        if ($this->db) {
            $this->resetDatabaseAttempts($ip);
        } else {
            $this->resetFileAttempts($ip);
        }
    }

    // ========== MÉTODOS PARA BASE DE DATOS ==========

    private function isDatabaseBlocked($ip) {
        try {
            $stmt = $this->db->prepare("
                SELECT blocked_until
                FROM {$this->table_name}
                WHERE ip_address = ? AND blocked_until > NOW()
            ");
            $stmt->execute([$ip]);

            return $stmt->rowCount() > 0;
        } catch (PDOException $e) {
            Logger::log('error', 'Error verificando bloqueo BD: ' . $e->getMessage());
            return false;
        }
    }

    private function registerDatabaseAttempt($ip) {
        try {
            // Limpiar registros antiguos
            $this->cleanOldRecords();

            // Verificar si ya está bloqueado
            if ($this->isDatabaseBlocked($ip)) {
                return false;
            }

            // Obtener intentos actuales
            $stmt = $this->db->prepare("
                SELECT attempts, first_attempt
                FROM {$this->table_name}
                WHERE ip_address = ? AND first_attempt > DATE_SUB(NOW(), INTERVAL ? SECOND)
            ");
            $stmt->execute([$ip, RATE_LIMIT_WINDOW]);
            $record = $stmt->fetch();

            if ($record) {
                $new_attempts = $record['attempts'] + 1;

                // Si excede el límite, bloquear
                if ($new_attempts >= RATE_LIMIT_REQUESTS) {
                    $blocked_until = date('Y-m-d H:i:s', time() + RATE_LIMIT_BLOCK_TIME);

                    $stmt = $this->db->prepare("
                        UPDATE {$this->table_name}
                        SET attempts = ?, blocked_until = ?
                        WHERE ip_address = ?
                    ");
                    $stmt->execute([$new_attempts, $blocked_until, $ip]);

                    Logger::log('warning', "IP bloqueada por rate limiting: $ip");
                    return false;
                }

                // Actualizar intentos
                $stmt = $this->db->prepare("
                    UPDATE {$this->table_name}
                    SET attempts = ?
                    WHERE ip_address = ?
                ");
                $stmt->execute([$new_attempts, $ip]);
            } else {
                // Primer intento
                $stmt = $this->db->prepare("
                    INSERT INTO {$this->table_name} (ip_address, attempts)
                    VALUES (?, 1)
                    ON DUPLICATE KEY UPDATE
                    attempts = 1,
                    first_attempt = CURRENT_TIMESTAMP,
                    blocked_until = NULL
                ");
                $stmt->execute([$ip]);
            }

            return true;
        } catch (PDOException $e) {
            Logger::log('error', 'Error registrando intento BD: ' . $e->getMessage());
            return true; // En caso de error, permitir el intento
        }
    }

    private function getDatabaseBlockTime($ip) {
        try {
            $stmt = $this->db->prepare("
                SELECT TIMESTAMPDIFF(SECOND, NOW(), blocked_until) as remaining
                FROM {$this->table_name}
                WHERE ip_address = ? AND blocked_until > NOW()
            ");
            $stmt->execute([$ip]);
            $result = $stmt->fetch();

            return $result ? max(0, $result['remaining']) : 0;
        } catch (PDOException $e) {
            Logger::log('error', 'Error obteniendo tiempo de bloqueo BD: ' . $e->getMessage());
            return 0;
        }
    }

    private function resetDatabaseAttempts($ip) {
        try {
            $stmt = $this->db->prepare("
                DELETE FROM {$this->table_name}
                WHERE ip_address = ?
            ");
            $stmt->execute([$ip]);
        } catch (PDOException $e) {
            Logger::log('error', 'Error reseteando intentos BD: ' . $e->getMessage());
        }
    }

    private function cleanOldRecords() {
        try {
            $stmt = $this->db->prepare("
                DELETE FROM {$this->table_name}
                WHERE first_attempt < DATE_SUB(NOW(), INTERVAL ? SECOND)
                AND (blocked_until IS NULL OR blocked_until < NOW())
            ");
            $stmt->execute([RATE_LIMIT_WINDOW * 2]);
        } catch (PDOException $e) {
            if (class_exists('Logger')) {
                Logger::log('error', 'Error limpiando registros antiguos: ' . $e->getMessage());
            }
        }
    }

    // ========== MÉTODOS PARA ARCHIVOS (FALLBACK) ==========

    private function getFilePath($ip) {
        $safe_ip = preg_replace('/[^a-zA-Z0-9\.]/', '_', $ip);
        return LOG_DIRECTORY . "rate_limit_$safe_ip.json";
    }

    private function isFileBlocked($ip) {
        $file = $this->getFilePath($ip);

        if (!file_exists($file)) {
            return false;
        }

        $data = json_decode(file_get_contents($file), true);
        if (!$data) return false;

        return isset($data['blocked_until']) && $data['blocked_until'] > time();
    }

    private function registerFileAttempt($ip) {
        $file = $this->getFilePath($ip);
        $now = time();

        // Leer datos existentes
        $data = [];
        if (file_exists($file)) {
            $content = file_get_contents($file);
            $data = json_decode($content, true) ?: [];
        }

        // Verificar si está bloqueado
        if (isset($data['blocked_until']) && $data['blocked_until'] > $now) {
            return false;
        }

        // Limpiar intentos antiguos
        if (!isset($data['first_attempt']) || ($now - $data['first_attempt']) > RATE_LIMIT_WINDOW) {
            $data = [
                'attempts' => 1,
                'first_attempt' => $now,
                'last_attempt' => $now
            ];
        } else {
            $data['attempts'] = ($data['attempts'] ?? 0) + 1;
            $data['last_attempt'] = $now;
        }

        // Verificar límite
        if ($data['attempts'] >= RATE_LIMIT_REQUESTS) {
            $data['blocked_until'] = $now + RATE_LIMIT_BLOCK_TIME;
            Logger::log('warning', "IP bloqueada por rate limiting (archivo): $ip");

            file_put_contents($file, json_encode($data), LOCK_EX);
            return false;
        }

        file_put_contents($file, json_encode($data), LOCK_EX);
        return true;
    }

    private function getFileBlockTime($ip) {
        $file = $this->getFilePath($ip);

        if (!file_exists($file)) {
            return 0;
        }

        $data = json_decode(file_get_contents($file), true);
        if (!$data || !isset($data['blocked_until'])) {
            return 0;
        }

        return max(0, $data['blocked_until'] - time());
    }

    private function resetFileAttempts($ip) {
        $file = $this->getFilePath($ip);
        if (file_exists($file)) {
            unlink($file);
        }
    }
}
?>
