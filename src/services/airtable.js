/**
 * Servicio para envío de formularios a través del backend seguro
 * Reemplaza la conexión directa a Airtable por una conexión segura vía backend PHP
 */

// Configuración del backend
const BACKEND_BASE_URL = './backend/api'; // Ruta relativa para que funcione en subdirectorios

// Detectar si estamos en modo desarrollo SIN backend PHP (Vite dev server)
const isDevelopmentWithoutBackend = (import.meta.env.DEV ||
                                   window.location.hostname === 'localhost' ||
                                   window.location.hostname === '127.0.0.1') &&
                                   (window.location.port === '5173' ||
                                    window.location.port === '5174');

// Detectar si tenemos backend disponible (XAMPP localhost:80 o producción)
const hasBackend = (window.location.hostname === 'localhost' &&
                   (window.location.port === '80' || !window.location.port)) ||
                   window.location.protocol === 'https:' ||
                   !import.meta.env.DEV;



/**
 * Obtener token CSRF del backend
 */
export const getCSRFToken = async () => {
  // En modo desarrollo sin backend, simular token CSRF
  if (isDevelopmentWithoutBackend) {
    const token = 'dev_csrf_token_' + Math.random().toString(36).substr(2, 9);
    return {
      success: true,
      token: token
    };
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/get-csrf-token.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin' // Importante para mantener la sesión
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error obteniendo token CSRF');
    }

    return { success: true, token: result.csrf_token };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Enviar datos del formulario al backend seguro o directamente a Airtable en desarrollo
 */
export const submitFormToAirtable = async (formData, recaptchaToken, csrfToken) => {
  // En modo desarrollo sin backend, enviar directamente a Airtable
  if (isDevelopmentWithoutBackend) {

    try {
      // Obtener credenciales de Airtable desde variables de entorno
      const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
      const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
      const AIRTABLE_TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;

      if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
        throw new Error('Credenciales de Airtable no configuradas');
      }

      // Preparar datos para Airtable
      const airtableData = {
        fields: {
          'Nombre': formData.nombre,
          'Email': formData.email,
          'Teléfono': formData.telefono,
          'Estado Pago': 'PENDIENTE'
        }
      };

      // Enviar a Airtable
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(airtableData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: { id: result.id },
        message: '¡Registro exitoso! Tus datos han sido guardados en Airtable.'
      };

    } catch (error) {
      return {
        success: false,
        error: `Error al guardar en Airtable: ${error.message}`
      };
    }
  }

  try {
    // Preparar los datos para el backend
    const backendData = {
      name: formData.nombre,
      email: formData.email,
      phone: formData.telefono,
      consent: 'true', // El usuario ya aceptó en el frontend
      csrf_token: csrfToken,
      recaptcha_token: recaptchaToken,
      website: '' // Campo honeypot (debe estar vacío)
    };

    // Usar endpoint seguro con getConfig()

    const response = await fetch(`${BACKEND_BASE_URL}/submit-form.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin', // Importante para mantener la sesión
      body: JSON.stringify(backendData)
    });

    const result = await response.json();

    // Manejar diferentes códigos de respuesta
    if (response.status === 429) {
      // Rate limiting
      const retryMinutes = Math.ceil((result.retry_after || 300) / 60);
      return {
        success: false,
        error: `Demasiados intentos. Intenta nuevamente en ${retryMinutes} minutos.`,
        rateLimited: true,
        retryAfter: result.retry_after
      };
    }

    if (response.status === 400 && result.validation_errors) {
      // Errores de validación
      return {
        success: false,
        error: 'Datos del formulario inválidos',
        validationErrors: result.validation_errors
      };
    }

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Error desconocido del servidor');
    }

    return {
      success: true,
      data: { id: result.record_id },
      message: result.message || 'Formulario enviado correctamente'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error de conexión con el servidor'
    };
  }
};
