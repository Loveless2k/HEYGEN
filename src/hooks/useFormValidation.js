import { useState } from 'react';
import { validateField, sanitizeInput } from '../utils/validation';

export const useFormValidation = (initialFormData) => {
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  // Manejar cambios en los campos del formulario con feedback inmediato
  const handleInputChange = (e, setSecurityStatus, isSubmitting) => {
    const { name, value, type, checked } = e.target;

    // Sanitizar el valor para prevenir XSS
    const sanitizedValue = type === 'checkbox' ? checked : sanitizeInput(value);

    setFormData({
      ...formData,
      [name]: sanitizedValue
    });

    // Validación en tiempo real con feedback visual
    if (type !== 'checkbox' || name === 'consent') {
      const fieldValue = type === 'checkbox' ? checked : value;
      const error = validateField(name, fieldValue);

      // Actualizar errores del formulario
      setFormErrors({
        ...formErrors,
        [name]: error
      });

      // Actualizar mensaje de seguridad basado en la validación
      if (error) {
        // Solo actualizar el mensaje si hay un error y no estamos en medio de un envío
        if (!isSubmitting && setSecurityStatus) {
          setSecurityStatus({
            status: 'warning',
            message: 'Por favor, corrige los errores en el formulario antes de continuar.'
          });
        }
      } else if (Object.values(formErrors).filter(Boolean).length === 0) {
        // Si no hay errores, mostrar mensaje positivo
        if (setSecurityStatus) {
          setSecurityStatus({
            status: 'info',
            message: 'Tus datos están seguros. Utilizamos encriptación para proteger tu información.'
          });
        }
      }
    }
  };

  // Manejar cambio de código de país
  const handleCountryCodeChange = (selectedCountry) => {
    setFormData({
      ...formData,
      phoneCountry: selectedCountry
    });
  };

  // Resetear formulario
  const resetForm = (initialData) => {
    setFormData(initialData);
    setFormErrors({});
  };

  return {
    formData,
    formErrors,
    setFormData,
    setFormErrors,
    handleInputChange,
    handleCountryCodeChange,
    resetForm
  };
};
