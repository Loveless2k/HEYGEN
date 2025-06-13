// Función para sanitizar entradas de texto (prevenir XSS)
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Validación robusta de email
export const validateEmail = (email) => {
  // Expresión regular más estricta para validar emails
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

// Validación de número de teléfono
export const validatePhone = (phone) => {
  // Eliminar espacios y caracteres no numéricos para la validación
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  // Verificar longitud mínima y que comience con + o dígito
  return cleanPhone.length >= 8 && /^(\+|\d)/.test(cleanPhone);
};

// Validación de un campo específico
export const validateField = (name, value) => {
  switch (name) {
    case 'name':
      if (!value.trim()) return 'El nombre es obligatorio';
      if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
      if (value.trim().length > 50) return 'El nombre no debe exceder los 50 caracteres';
      // Validar que el nombre solo contenga letras, espacios y caracteres especiales como tildes, diéresis o virgulilla
      // Usamos una expresión regular más amplia para caracteres Unicode
      const nameRegex = /^[\p{L}\s'-]+$/u;
      if (!nameRegex.test(value.trim())) return 'El nombre solo debe contener letras';
      return null;
    case 'email':
      if (!value.trim()) return 'El correo electrónico es obligatorio';
      if (!validateEmail(value)) return 'El correo electrónico no es válido';
      if (value.trim().length > 100) return 'El correo electrónico no debe exceder los 100 caracteres';
      return null;
    case 'phoneNumber':
      if (!value.trim()) return 'El número de celular es obligatorio';
      if (!validatePhone(value)) return 'El número de teléfono no es válido';
      if (value.trim().length > 15) return 'El número de teléfono no debe exceder los 15 caracteres';
      return null;
    case 'consent':
      if (!value) return 'Debes aceptar recibir información';
      return null;
    default:
      return null;
  }
};

// Validar formulario completo
export const validateForm = (formData) => {
  const errors = {};

  // Validación del nombre
  if (!formData.name.trim()) {
    errors.name = 'El nombre es obligatorio';
  } else if (formData.name.trim().length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres';
  } else if (formData.name.trim().length > 50) {
    errors.name = 'El nombre no debe exceder los 50 caracteres';
  } else {
    // Validar que el nombre solo contenga letras, espacios y caracteres especiales como tildes, diéresis o virgulilla
    // Usamos una expresión regular más amplia para caracteres Unicode
    const nameRegex = /^[\p{L}\s'-]+$/u;
    if (!nameRegex.test(formData.name.trim())) {
      errors.name = 'El nombre solo debe contener letras';
    }
  }

  // Validación del correo electrónico
  if (!formData.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio';
  } else if (!validateEmail(formData.email)) {
    errors.email = 'El correo electrónico no es válido';
  } else if (formData.email.trim().length > 100) {
    errors.email = 'El correo electrónico no debe exceder los 100 caracteres';
  }

  // Validación del número de teléfono
  if (!formData.phoneNumber.trim()) {
    errors.phoneNumber = 'El número de celular es obligatorio';
  } else if (!validatePhone(formData.phoneNumber)) {
    errors.phoneNumber = 'El número de teléfono no es válido';
  } else if (formData.phoneNumber.trim().length > 15) {
    errors.phoneNumber = 'El número de teléfono no debe exceder los 15 caracteres';
  }

  // Validación del consentimiento
  if (!formData.consent) {
    errors.consent = 'Debes aceptar recibir información';
  }

  return errors;
};
