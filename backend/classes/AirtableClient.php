<?php
/**
 * Cliente para Airtable
 * Maneja el envío seguro de datos a Airtable
 */

if (!defined('BACKEND_ACCESS')) {
    http_response_code(403);
    die('Access denied');
}

class AirtableClient {
    private $api_key;
    private $base_id;
    private $table_name;

    public function __construct() {
        $this->api_key = getConfig('AIRTABLE_API_KEY');
        $this->base_id = getConfig('AIRTABLE_BASE_ID');
        $this->table_name = getConfig('AIRTABLE_TABLE_NAME');

        if (!$this->api_key || !$this->base_id || !$this->table_name) {
            throw new Exception('Configuración de Airtable incompleta');
        }
    }

    /**
     * Enviar datos a Airtable
     */
    public function createRecord($data) {
        // Verificar si el email ya existe
        $existing_record = $this->findRecordByEmail($data['email']);
        if ($existing_record) {
            throw new Exception('Ya existe un registro con este email. Si quieres pagar, usa el botón de pago.');
        }

        $url = "https://api.airtable.com/v0/{$this->base_id}/{$this->table_name}";

        $payload = [
            'fields' => [
                'Nombre' => $data['name'],
                'Email' => $data['email'],
                'Teléfono' => $data['phone'],
                'Estado Pago' => 'PENDIENTE'
                // Fecha de registro se maneja automáticamente en Airtable
            ]
        ];

        $headers = [
            'Authorization: Bearer ' . $this->api_key,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'Landing Page Backend/1.0'
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($curl_error) {
            Logger::log('error', 'Error cURL en Airtable: ' . $curl_error);
            throw new Exception('Error de conexión con Airtable');
        }

        if ($http_code !== 200) {
            $error_data = json_decode($response, true);
            $error_message = isset($error_data['error']['message'])
                ? $error_data['error']['message']
                : "HTTP $http_code";

            Logger::log('error', "Error Airtable HTTP $http_code: $error_message", [
                'response' => $response,
                'payload' => $payload
            ]);

            throw new Exception("Error al guardar en Airtable: $error_message");
        }

        $result = json_decode($response, true);
        if (!$result || !isset($result['id'])) {
            Logger::log('error', 'Respuesta inválida de Airtable', ['response' => $response]);
            throw new Exception('Respuesta inválida de Airtable');
        }

        Logger::log('info', 'Registro creado en Airtable', [
            'record_id' => $result['id'],
            'email_domain' => substr(strrchr($data['email'], "@"), 1)
        ]);

        return $result;
    }

    /**
     * Verificar conexión con Airtable
     */
    public function testConnection() {
        $url = "https://api.airtable.com/v0/{$this->base_id}/{$this->table_name}?maxRecords=1";

        $headers = [
            'Authorization: Bearer ' . $this->api_key
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($curl_error) {
            return ['success' => false, 'error' => 'Error de conexión: ' . $curl_error];
        }

        if ($http_code !== 200) {
            $error_data = json_decode($response, true);
            $error_message = isset($error_data['error']['message'])
                ? $error_data['error']['message']
                : "HTTP $http_code";
            return ['success' => false, 'error' => $error_message];
        }

        $result = json_decode($response, true);
        $record_count = isset($result['records']) ? count($result['records']) : 0;

        return ['success' => true, 'record_count' => $record_count];
    }

    /**
     * Buscar registro por email
     */
    private function findRecordByEmail($email) {
        $url = "https://api.airtable.com/v0/{$this->base_id}/{$this->table_name}";
        $params = "?filterByFormula=" . urlencode("{Email}='{$email}'");

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url . $params,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->api_key
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code !== 200) {
            return false; // En caso de error, permitir crear el registro
        }

        $result = json_decode($response, true);
        return isset($result['records']) && !empty($result['records']) ? $result['records'][0] : false;
    }
}
?>
