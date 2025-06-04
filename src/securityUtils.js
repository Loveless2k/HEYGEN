// Utilidades de seguridad para el lado del cliente

/**
 * Función para verificar el token de reCAPTCHA
 * @param {string} token - Token generado por reCAPTCHA
 * @returns {Promise<boolean>} - Promesa que resuelve a true si el token es válido
 */
export const verifyRecaptchaToken = async (token) => {
  // En un entorno real, esta verificación debería hacerse en el servidor
  // Aquí simulamos una verificación del lado del cliente para fines de demostración

  // Verificación básica de que el token existe y tiene una longitud adecuada
  if (!token || token.length < 20) {
    return false;
  }

  // Simulamos una verificación exitosa
  // En un entorno real, enviarías este token a tu backend para verificarlo con Google
  return true;
};

/**
 * Función de debounce para limitar la frecuencia de llamadas a una función
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en milisegundos
 * @returns {Function} - Función con debounce aplicado
 */
export const debounce = (func, wait) => {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Clase para gestionar intentos de envío de formulario
 * Implementa un mecanismo de bloqueo temporal después de múltiples intentos
 */
export class SubmissionThrottler {
  constructor(maxAttempts = 5, blockDuration = 60000) {
    this.attempts = 0;
    this.maxAttempts = maxAttempts;
    this.blockDuration = blockDuration; // en milisegundos
    this.blockedUntil = 0;
    this.storageKey = 'form_submission_throttler';

    // Cargar estado anterior si existe
    this.loadState();
  }

  // Cargar estado desde localStorage
  loadState() {
    try {
      const savedState = localStorage.getItem(this.storageKey);
      if (savedState) {
        const { attempts, blockedUntil } = JSON.parse(savedState);
        this.attempts = attempts;
        this.blockedUntil = blockedUntil;
      }
    } catch (error) {
      // Error al cargar el estado del throttler
    }
  }

  // Guardar estado en localStorage
  saveState() {
    try {
      const state = {
        attempts: this.attempts,
        blockedUntil: this.blockedUntil
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      // Error al guardar el estado del throttler
    }
  }

  // Verificar si el envío está bloqueado
  isBlocked() {
    // Si el tiempo de bloqueo ya pasó, reiniciar contador
    if (this.blockedUntil > 0 && Date.now() > this.blockedUntil) {
      this.attempts = 0;
      this.blockedUntil = 0;
      this.saveState();
      return false;
    }

    return this.blockedUntil > Date.now();
  }

  // Obtener tiempo restante de bloqueo en segundos
  getRemainingBlockTime() {
    if (!this.isBlocked()) return 0;
    return Math.ceil((this.blockedUntil - Date.now()) / 1000);
  }

  // Registrar un intento de envío
  registerAttempt() {
    if (this.isBlocked()) return false;

    this.attempts++;

    // Si se excede el número máximo de intentos, bloquear
    if (this.attempts >= this.maxAttempts) {
      this.blockedUntil = Date.now() + this.blockDuration;
      this.saveState();
      return false;
    }

    this.saveState();
    return true;
  }

  // Reiniciar contador después de un envío exitoso
  reset() {
    this.attempts = 0;
    this.blockedUntil = 0;
    this.saveState();
  }
}

/**
 * Función para mostrar feedback visual de seguridad
 * @param {string} status - Estado de la validación ('success', 'error', 'warning', 'loading')
 * @param {string} message - Mensaje a mostrar
 * @returns {Object} - Objeto con clases CSS y mensaje
 */
export const getSecurityFeedback = (status, message) => {
  const feedbackStyles = {
    success: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.5)',
      color: '#065f46',
      icon: '✅'
    },
    error: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.5)',
      color: '#991b1b',
      icon: '❌'
    },
    warning: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.5)',
      color: '#92400e',
      icon: '⚠️'
    },
    loading: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.5)',
      color: '#1e40af',
      icon: '⏳'
    },
    info: {
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      borderColor: 'rgba(79, 70, 229, 0.5)',
      color: '#3730a3',
      icon: 'ℹ️'
    }
  };

  return {
    styles: feedbackStyles[status] || feedbackStyles.info,
    message: message
  };
};
