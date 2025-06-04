<?php
/**
 * Webhook para PayPal
 * Recibe notificaciones cuando se completa un pago
 */

// Definir constante de acceso
define('BACKEND_ACCESS', true);

// Cargar configuración y clases
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../classes/Logger.php';
require_once __DIR__ . '/../classes/Security.php';

// Headers de seguridad
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Method not allowed';
    exit;
}

try {
    // Obtener IP del cliente
    $client_ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    // Log de intento de webhook
    Logger::log('info', 'Webhook PayPal recibido', [
        'ip' => $client_ip,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 0
    ]);

    // Leer datos POST de PayPal (Webhook v2 - JSON)
    $raw_post_data = file_get_contents('php://input');
    $webhook_data = json_decode($raw_post_data, true);

    // Log temporal para debug - JSON completo
    Logger::log('info', 'JSON completo de PayPal (DEBUG)', [
        'raw_json' => $raw_post_data,
        'decoded_structure' => $webhook_data
    ]);

    // Extraer datos del formato v2
    $event_type = $webhook_data['event_type'] ?? '';
    $resource = $webhook_data['resource'] ?? [];

    // Log de datos recibidos (sin información sensible)
    Logger::log('info', 'Datos webhook PayPal', [
        'event_type' => $event_type,
        'resource_id' => $resource['id'] ?? '',
        'payer_email' => $resource['custom_id'] ?? '',
        'amount' => $resource['amount']['value'] ?? ''
    ]);

    // Verificar que es una notificación de pago completado
    if ($event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
        Logger::log('info', 'Webhook ignorado - pago no completado', [
            'event_type' => $event_type
        ]);
        echo 'Payment not completed';
        exit;
    }

    // Verificar que tenemos los datos necesarios
    $payer_email = $resource['custom_id'] ?? '';
    $transaction_id = $resource['id'] ?? '';
    $amount = $resource['amount']['value'] ?? '';

    if (empty($payer_email) || empty($transaction_id)) {
        Logger::log('error', 'Webhook PayPal - datos faltantes', [
            'has_payer_email' => !empty($payer_email),
            'has_transaction_id' => !empty($transaction_id)
        ]);
        echo 'Missing required data';
        exit;
    }

    // Actualizar registro en Airtable
    $update_result = updateAirtablePayment($payer_email, $transaction_id, $amount);

    if ($update_result['success']) {
        Logger::log('info', 'Pago actualizado exitosamente', [
            'email' => $payer_email,
            'transaction_id' => $transaction_id,
            'amount' => $amount
        ]);
        echo 'Payment updated successfully';
    } else {
        Logger::log('error', 'Error actualizando pago', [
            'email' => $payer_email,
            'error' => $update_result['error']
        ]);
        echo 'Error updating payment';
    }

} catch (Exception $e) {
    Logger::log('error', 'Error en webhook PayPal: ' . $e->getMessage(), [
        'ip' => $client_ip ?? 'unknown'
    ]);
    echo 'Internal error';
}

/**
 * Función para actualizar el pago en Airtable
 */
function updateAirtablePayment($email, $transaction_id, $amount) {
    try {
        // Configuración de Airtable
        $api_key = getConfig('AIRTABLE_API_KEY');
        $base_id = getConfig('AIRTABLE_BASE_ID');
        $table_name = getConfig('AIRTABLE_TABLE_NAME');

        // Log de configuración (DEBUG)
        Logger::log('info', 'Configuración Airtable (DEBUG)', [
            'has_api_key' => !empty($api_key),
            'api_key_length' => strlen($api_key ?? ''),
            'base_id' => $base_id,
            'table_name' => $table_name,
            'email_to_search' => $email
        ]);

        if (!$api_key || !$base_id || !$table_name) {
            return ['success' => false, 'error' => 'Configuración de Airtable incompleta'];
        }

        // 1. Buscar registro por email
        $search_url = "https://api.airtable.com/v0/{$base_id}/{$table_name}";
        $search_params = "?filterByFormula=" . urlencode("{Email}='{$email}'");

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $search_url . $search_params,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $api_key
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $search_response = curl_exec($ch);
        $search_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        // Log de búsqueda (DEBUG)
        Logger::log('info', 'Búsqueda en Airtable (DEBUG)', [
            'search_url' => $search_url . $search_params,
            'http_code' => $search_http_code,
            'curl_error' => $curl_error,
            'response_length' => strlen($search_response ?? ''),
            'response_preview' => substr($search_response ?? '', 0, 200)
        ]);

        if ($search_http_code !== 200) {
            return ['success' => false, 'error' => "Error buscando registro: HTTP {$search_http_code}, cURL: {$curl_error}"];
        }

        $search_result = json_decode($search_response, true);

        // Log de resultado de búsqueda (DEBUG)
        Logger::log('info', 'Resultado búsqueda Airtable (DEBUG)', [
            'json_decode_success' => $search_result !== null,
            'has_records' => isset($search_result['records']),
            'records_count' => count($search_result['records'] ?? []),
            'search_result' => $search_result
        ]);

        if (!isset($search_result['records']) || empty($search_result['records'])) {
            return ['success' => false, 'error' => 'No se encontró registro con ese email'];
        }

        // Tomar el primer registro encontrado
        $record = $search_result['records'][0];
        $record_id = $record['id'];

        // 2. Actualizar el registro
        $update_url = "https://api.airtable.com/v0/{$base_id}/{$table_name}/{$record_id}";

        $update_data = [
            'fields' => [
                'Estado Pago' => 'PAGADO',
                'Método Pago' => 'PayPal',
                'ID Transacción' => $transaction_id
            ]
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $update_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'PATCH',
            CURLOPT_POSTFIELDS => json_encode($update_data),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $api_key,
                'Content-Type: application/json'
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $update_response = curl_exec($ch);
        $update_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $update_curl_error = curl_error($ch);
        curl_close($ch);

        // Log de actualización (DEBUG)
        Logger::log('info', 'Actualización en Airtable (DEBUG)', [
            'update_url' => $update_url,
            'update_data' => $update_data,
            'http_code' => $update_http_code,
            'curl_error' => $update_curl_error,
            'response_length' => strlen($update_response ?? ''),
            'response_preview' => substr($update_response ?? '', 0, 200)
        ]);

        if ($update_http_code !== 200) {
            return ['success' => false, 'error' => "Error actualizando registro: HTTP {$update_http_code}, cURL: {$update_curl_error}"];
        }

        return ['success' => true, 'record_id' => $record_id];

    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}
?>
