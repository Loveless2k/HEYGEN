import { useEffect, useRef, useState } from 'react';
import ReCAPTCHA from "react-google-recaptcha";
import Slider from 'react-slick';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';
import { countryCodes, getDefaultCountryCode } from './countryCodes';
import FaqAccordion from "./FaqAccordion";
import PaymentButtons from './PaymentButtons';
import ScrollReveal from './ScrollReveal';
import { debounce, getSecurityFeedback, SubmissionThrottler } from './securityUtils';
import { getCSRFToken, submitFormToAirtable } from './services/airtable';
import ThemeToggle from './ThemeToggle';
import VideoPlayer from './VideoPlayer';

// Función para sanitizar entradas de texto (prevenir XSS)
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Validación robusta de email
const validateEmail = (email) => {
  // Expresión regular más estricta para validar emails
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

// Validación de número de teléfono
const validatePhone = (phone) => {
  // Eliminar espacios y caracteres no numéricos para la validación
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  // Verificar longitud mínima y que comience con + o dígito
  return cleanPhone.length >= 8 && /^(\+|\d)/.test(cleanPhone);
};

function App() {
  // Fecha límite: 10 de junio de 2025 a las 11:59 (horario Chile)
  const targetDate = new Date('2025-06-10T23:59:00-04:00'); // UTC-4 para Chile

  // Estado para el tiempo restante
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [isFloatingBtnVisible, setIsFloatingBtnVisible] = useState(true);

  // Estado para el formulario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneCountry: getDefaultCountryCode(),
    phoneNumber: '',
    consent: false
  });

  // Estado para errores del formulario
  const [formErrors, setFormErrors] = useState({});

  // Estado para mostrar mensaje de éxito
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Estado para la intención de compra (siempre false inicialmente)
  const [purchaseIntent, setPurchaseIntent] = useState(false);

  // Estado para guardar datos del usuario para el pago
  const [submittedUserData, setSubmittedUserData] = useState({
    name: '',
    email: ''
  });

  // Estado para formulario completado (nuevo)
  const [formularioCompletado, setFormularioCompletado] = useState(false);

  // Estados para formulario simple
  const [simpleFormData, setSimpleFormData] = useState({
    name: '',
    email: ''
  });



  // Referencias y estados para medidas de seguridad
  const recaptchaRef = useRef(null);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [securityStatus, setSecurityStatus] = useState({
    status: 'info',
    message: 'Tus datos están seguros. Utilizamos encriptación para proteger tu información.'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Instancia del throttler para controlar intentos de envío
  const throttlerRef = useRef(new SubmissionThrottler(5, 60000)); // 5 intentos, 1 minuto de bloqueo

  // Validación en tiempo real de un campo específico
  const validateField = (name, value) => {
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

  // Manejar cambios en los campos del formulario con feedback inmediato
  const handleInputChange = (e) => {
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
        if (!isSubmitting) {
          setSecurityStatus({
            status: 'warning',
            message: 'Por favor, corrige los errores en el formulario antes de continuar.'
          });
        }
      } else if (Object.values(formErrors).filter(Boolean).length === 0) {
        // Si no hay errores, mostrar mensaje positivo
        setSecurityStatus({
          status: 'info',
          message: 'Tus datos están seguros. Utilizamos encriptación para proteger tu información.'
        });
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



  // Función para calcular el tiempo restante hasta la fecha límite
  const calculateTimeLeft = () => {
    const now = new Date();
    const difference = targetDate - now;

    // Si la fecha ya pasó, devolver todos ceros
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    // Calcular días, horas, minutos y segundos
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  // Inicializar el tiempo restante
  useEffect(() => {
    // Establecer el tiempo inicial
    setTimeLeft(calculateTimeLeft());

    // Actualizar cada segundo
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(timer);
  }, []);

  // Obtener token CSRF al cargar la página
  useEffect(() => {

    const fetchCSRFToken = async () => {
      try {
        const result = await getCSRFToken();

        if (result.success) {
          setCsrfToken(result.token);
          setSecurityStatus({
            status: 'info',
            message: 'Tus datos están seguros. Utilizamos encriptación para proteger tu información.'
          });
        } else {
          setSecurityStatus({
            status: 'warning',
            message: 'Error de seguridad. Por favor, recarga la página.'
          });
        }
      } catch (error) {
        setSecurityStatus({
          status: 'warning',
          message: 'Error de seguridad. Por favor, recarga la página.'
        });
      }
    };

    fetchCSRFToken();
  }, []);

  // Monitorear cambios en el token CSRF
  useEffect(() => {
    // Token CSRF actualizado
  }, [csrfToken]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Función para manejar el formulario simple
  const handleSimpleSubmit = async (e) => {
    e.preventDefault();

    // Validación básica
    if (!simpleFormData.name.trim() || !simpleFormData.email.trim()) {
      alert('Por favor, completa todos los campos');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(simpleFormData.email)) {
      alert('Por favor, ingresa un email válido');
      return;
    }

    // Guardar datos para PayPal
    setSubmittedUserData({
      name: simpleFormData.name,
      email: simpleFormData.email
    });

    // Marcar formulario como completado
    setFormularioCompletado(true);
  };

  // Validar formulario
  const validateForm = () => {
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

  // Función para manejar el cambio en reCAPTCHA
  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);

    // Actualizar el estado de seguridad
    if (token) {
      setSecurityStatus({
        status: 'success',
        message: 'Verificación completada. Tus datos están seguros.'
      });
    } else {
      setSecurityStatus({
        status: 'warning',
        message: 'Por favor, completa la verificación de seguridad.'
      });
    }
  };

  // Versión con debounce del envío del formulario para prevenir múltiples clics
  const debouncedSubmit = debounce(async (formData, recaptchaToken, purchaseIntent) => {
    setIsSubmitting(true);
    setSecurityStatus({
      status: 'loading',
      message: 'Procesando tu solicitud...'
    });

    try {


      // Verificar que tenemos el token CSRF, si no, intentar obtenerlo
      let currentCsrfToken = csrfToken;
      if (!currentCsrfToken) {
        try {
          const result = await getCSRFToken();
          if (result.success) {
            currentCsrfToken = result.token;
            setCsrfToken(result.token);
          } else {
            setSecurityStatus({
              status: 'error',
              message: 'Error de seguridad. Por favor, recarga la página.'
            });
            setIsSubmitting(false);
            return;
          }
        } catch (error) {
          setSecurityStatus({
            status: 'error',
            message: 'Error de seguridad. Por favor, recarga la página.'
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Preparar los datos para enviar al backend
      const formDataForBackend = {
        nombre: formData.name,
        email: formData.email,
        telefono: `${formData.phoneCountry.code} ${formData.phoneNumber}`
      };

      // Enviar datos al backend seguro
      const result = await submitFormToAirtable(formDataForBackend, recaptchaToken, currentCsrfToken);

      if (!result.success) {
        // Manejar diferentes tipos de errores
        if (result.rateLimited) {
          const retryMinutes = Math.ceil((result.retryAfter || 300) / 60);
          setSecurityStatus({
            status: 'error',
            message: `Demasiados intentos. Intenta nuevamente en ${retryMinutes} minutos.`
          });
        } else if (result.validationErrors) {
          // Mostrar errores de validación del servidor
          const errorMessages = Object.values(result.validationErrors).join(', ');
          setSecurityStatus({
            status: 'error',
            message: `Errores de validación: ${errorMessages}`
          });
        } else {
          // Verificar si es error de email duplicado
          if (result.error && result.error.includes('Ya existe un registro con este email')) {
            // Guardar datos del usuario para mostrar botones de pago
            setSubmittedUserData({
              name: formData.name,
              email: formData.email
            });

            // Mostrar mensaje informativo y cambiar a estado de pago
            setSecurityStatus({
              status: 'info',
              message: result.error
            });
            setFormSubmitted(true);
          } else {
            setSecurityStatus({
              status: 'error',
              message: result.error || 'Error al guardar los datos. Por favor, inténtalo de nuevo.'
            });
          }
        }
        setIsSubmitting(false);
        return;
      }

      // En un caso real, aquí procesaríamos el pago si hay intención de compra
      if (purchaseIntent) {
        // Aquí iría la lógica de procesamiento de pago
      }

      // Reiniciar el throttler después de un envío exitoso
      throttlerRef.current.reset();

      // Guardar datos del usuario para el pago antes de limpiar
      setSubmittedUserData({
        name: formData.name,
        email: formData.email
      });

      // Mostrar mensaje de éxito
      setSecurityStatus({
        status: 'success',
        message: result.message || '¡Registro exitoso! Tus datos han sido guardados de forma segura.'
      });
      setFormSubmitted(true);

      // Limpiar el formulario
      setFormData({
        name: '',
        email: '',
        phoneCountry: getDefaultCountryCode(),
        phoneNumber: '',
        consent: false
      });
      setFormErrors({});

    } catch (error) {
      setSecurityStatus({
        status: 'error',
        message: 'Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, 500); // 500ms de debounce

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verificar si el envío está bloqueado por throttling
    if (throttlerRef.current.isBlocked()) {
      const remainingTime = throttlerRef.current.getRemainingBlockTime();
      setSecurityStatus({
        status: 'error',
        message: `Demasiados intentos. Por favor, espera ${remainingTime} segundos antes de intentar nuevamente.`
      });
      return;
    }

    // Registrar intento de envío
    if (!throttlerRef.current.registerAttempt()) {
      const remainingTime = throttlerRef.current.getRemainingBlockTime();
      setSecurityStatus({
        status: 'error',
        message: `Demasiados intentos. Por favor, espera ${remainingTime} segundos antes de intentar nuevamente.`
      });
      return;
    }

    // Validar formulario
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSecurityStatus({
        status: 'warning',
        message: 'Por favor, corrige los errores en el formulario antes de continuar.'
      });
      return;
    }

    // Si no hay token de reCAPTCHA, ejecutarlo y continuar con el envío
    if (!recaptchaToken) {
      try {
        setSecurityStatus({
          status: 'loading',
          message: 'Verificando seguridad...'
        });

        // Ejecutar reCAPTCHA si existe la referencia
        if (recaptchaRef.current) {
          // Ejecutar reCAPTCHA y esperar a que se complete
          const token = await new Promise((resolve) => {
            // Crear una función de callback que capture el token
            const captureToken = (token) => {
              // Llamar a la función handleRecaptchaChange para actualizar el estado
              handleRecaptchaChange(token);
              // Resolver la promesa con el token
              resolve(token);
            };

            // Ejecutar reCAPTCHA con nuestra función de callback
            recaptchaRef.current.executeAsync()
              .then(captureToken)
              .catch(() => {
                resolve(null);
              });
          });

          // Si obtuvimos un token válido, enviar el formulario
          if (token) {
            // Usar el token recién obtenido, no el del estado que podría no estar actualizado
            debouncedSubmit(formData, token, purchaseIntent);
          } else {
            setSecurityStatus({
              status: 'error',
              message: 'Error en la verificación de seguridad. Por favor, inténtalo de nuevo.'
            });
          }
        }
      } catch (error) {
        setSecurityStatus({
          status: 'error',
          message: 'Error en la verificación de seguridad. Por favor, inténtalo de nuevo.'
        });
      }
    } else {
      // Ya tenemos el token, enviar formulario directamente
      debouncedSubmit(formData, recaptchaToken, purchaseIntent);
    }
  };

  return (
    <>
      <ScrollReveal />

      {/* Header */}
      <header>
        <div className="container header-container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="./Informatik-AI Logo.png" alt="InformatiK-AI Logo" style={{ height: '50px', marginTop: '5px' }} className="animate-fadeIn" />

          </div>
          <ThemeToggle />
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="container">
            <div className="hero-grid">
              <div>
                <span className="hero-badge animate-fadeIn">ACCESO LIMITADO ¡SOLO POR POCOS DÍAS!</span>
                <h1 className="hero-title animate-fadeInUp">Convierte minutos de tu tiempo en una nueva habilidad digital que puedes monetizar</h1>
                <p className="hero-description animate-fadeInUp delay-200">
                  Aprende a crear tu propio avatar con inteligencia artificial, <strong>sin ser técnico ni experto</strong>. Usa esta herramienta para vender más, ahorrar en producción y destacar en el mundo digital. <strong>Cientos de personas como tú</strong> ya están generando contenido y creando nuevas fuentes de ingreso.
                </p>

                <div className="countdown-container animate-fadeInUp delay-300">
                  <h3 className="countdown-title" style={{ fontWeight: '700' }}>⏳ El mundo digital no espera. ¿Y tú?</h3>
                  <p style={{ marginBottom: '15px' }}>Accede a este taller solo por tiempo limitado.<br />Da el primer paso hoy y evita quedarte atrás.</p>
                  <p style={{ fontWeight: '600', marginBottom: '10px' }}>El acceso cierra en:</p>
                  <div className="countdown-grid">
                    <div className="countdown-item animate-scaleIn delay-400">
                      <div className="countdown-box animate-pulse-highlight">
                        <span className="countdown-value">{timeLeft.days.toString().padStart(2, '0')}</span>
                      </div>
                      <span className="countdown-label">Días</span>
                    </div>
                    <div className="countdown-item animate-scaleIn delay-500">
                      <div className="countdown-box animate-pulse-highlight">
                        <span className="countdown-value">{timeLeft.hours.toString().padStart(2, '0')}</span>
                      </div>
                      <span className="countdown-label">Horas</span>
                    </div>
                    <div className="countdown-item animate-scaleIn delay-600">
                      <div className="countdown-box animate-pulse-highlight">
                        <span className="countdown-value">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                      </div>
                      <span className="countdown-label">Minutos</span>
                    </div>
                    <div className="countdown-item animate-scaleIn delay-700">
                      <div className="countdown-box animate-pulse-highlight">
                        <span className="countdown-value">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                      </div>
                      <span className="countdown-label">Segundos</span>
                    </div>
                  </div>
                </div>


              </div>

              <div style={{ position: 'relative', marginRight: { xs: '0', md: '100px' } }} className="video-section">
                <div className="video-container animate-fadeInRight">
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%'
                  }}>
                    {/* Barra superior estilo Instagram */}
                    <div style={{
                      width: '100%',
                      padding: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="animate-fadeIn delay-800">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '8px',
                          padding: '2px', /* Pequeño padding para que la imagen no toque los bordes */
                          overflow: 'hidden'
                        }} className="animate-scaleIn delay-900">
                          <img
                            src="./favicon.png"
                            alt="Informatik-AI"
                            style={{
                              width: '80%',
                              height: '80%',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }} className="animate-fadeInRight delay-1000">informatik_ai</span>
                      </div>
                      <div style={{ color: 'white', fontSize: '18px' }} className="animate-fadeIn delay-1000">•••</div>
                    </div>

                    {/* Área principal del video */}
                    <div style={{
                      flex: 1,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      overflow: 'hidden'
                    }}>
                      <VideoPlayer src="./Demo.mp4" />
                    </div>

                    {/* Barra inferior estilo Instagram */}
                    <div style={{
                      width: '100%',
                      padding: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <span style={{ color: 'white', fontSize: '18px' }}>♥</span>
                          <span style={{ color: 'white', fontSize: '18px' }}>💬</span>
                          <span style={{ color: 'white', fontSize: '18px' }}>↪</span>
                        </div>
                        <span style={{ color: 'white', fontSize: '18px' }}>🔖</span>
                      </div>
                      <div style={{
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        2,845 likes
                      </div>
                      <div style={{
                        color: 'white',
                        fontSize: '13px',
                        display: 'flex',
                        flexWrap: 'wrap' // Permite que el texto se envuelva en pantallas pequeñas
                      }}>
                        <span style={{ fontWeight: '600', marginRight: '4px' }}>informatik_ai</span>
                        <span>Crea tu propio avatar hiperrealista y genera contenido en minutos ✨</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenedor para los badges estadísticos - responsivo */}
                <div className="stats-badges-container" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  alignItems: 'flex-start',
                  position: 'relative',
                  zIndex: 10,
                  marginTop: '20px' // Espacio para móviles cuando los badges están debajo
                }}>
                  {/* Primer badge */}
                  <div className="stat-badge" style={{
                    position: 'relative',
                    animation: 'pulse 2s infinite',
                    margin: 0,
                    width: '100%', // Ancho completo en móviles
                    maxWidth: '200px' // Limitar ancho máximo
                  }}>
                    <p className="stat-value">90 min</p>
                    <p className="stat-label">Duración del Taller</p>
                  </div>

                  {/* Segundo badge */}
                  <div className="stat-badge" style={{
                    position: 'relative',
                    animation: 'pulse 2s infinite',
                    margin: 0,
                    width: '100%', // Ancho completo en móviles
                    maxWidth: '200px' // Limitar ancho máximo
                  }}>
                    <p className="stat-value">100%</p>
                    <p className="stat-label">Garantía de Satisfacción</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Benefits Section */}
        <section className="section section-themed" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '28px', fontWeight: '700', color: 'var(--theme-text)' }} className="reveal reveal-up">
              ¿Por qué esta habilidad puede cambiar tu futuro digital?<br/>Mira esto:
            </h2>

            <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div style={{ padding: '24px', borderRadius: '8px' }} className="reveal reveal-left card-hover benefit-card">
                <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                  CREA <span style={{ color: 'var(--accent)' }}>CONTENIDO PROFESIONAL</span> CON IA EN MINUTOS
                </h3>
                <p style={{ color: 'var(--theme-text)', marginBottom: '12px', fontSize: '16px' }}>
                  En solo <strong>90 minutos</strong> aprenderás una habilidad digital moderna, lista para monetizar sin depender de nadie.
                </p>
              </div>

              <div style={{ padding: '24px', borderRadius: '8px' }} className="reveal reveal-up card-hover benefit-card">
                <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                  CREA Y <span style={{ color: 'var(--accent)' }}>VENDE CONTENIDO</span> DESDE HOY MISMO
                </h3>
                <p style={{ color: 'var(--theme-text)', marginBottom: '12px', fontSize: '16px' }}>
                  Esta habilidad te permite lanzar contenido rentable y empezar a generar ingresos desde el primer día.
                </p>
              </div>

              <div style={{ padding: '24px', borderRadius: '8px' }} className="reveal reveal-right card-hover benefit-card">
                <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                  <span style={{ color: 'var(--accent)' }}>POTENCIA TU ESTILO</span> SIN PERDER TU ESENCIA
                </h3>
                <p style={{ color: 'var(--theme-text)', marginBottom: '12px', fontSize: '16px' }}>
                  Integra la IA a tu proceso creativo sin comprometer lo que te hace auténtico y valioso.
                </p>
              </div>

              <div style={{ padding: '24px', borderRadius: '8px' }} className="reveal reveal-left card-hover benefit-card">
                <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                  HAZ QUE LA IA POTENCIE TU ESTILO Y TU <span style={{ color: 'var(--accent)' }}>VALOR CREATIVO</span>
                </h3>
                <p style={{ color: 'var(--theme-text)', marginBottom: '12px', fontSize: '16px' }}>
                  Aprende en solo 90 minutos a integrar la inteligencia artificial para amplificar tu esencia creativa y diferenciarte en el mercado, permitiéndote liderar con innovación en lugar de competir por precio en tus proyectos y contenidos.
                </p>
              </div>

              <div style={{ padding: '24px', borderRadius: '8px' }} className="reveal reveal-up card-hover benefit-card">
                <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                  LIBERA TU <span style={{ color: 'var(--accent)' }}>POTENCIAL ECONÓMICO</span> CON IA, SIN NECESIDAD DE SER UN EXPERTO EN TECNOLOGÍA
                </h3>
                <p style={{ color: 'var(--theme-text)', marginBottom: '12px', fontSize: '16px' }}>
                  Siente la confianza de crear contenido de nivel profesional y generar ingresos tangibles mediante la inteligencia artificial, gracias a un taller accesible que te guía paso a paso, demostrándote que no se requiere ser un gurú tecnológico para construir tu camino hacia la libertad económica y digital.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quiénes Somos Section */}
        <section className="section section-themed" style={{ backgroundColor: 'var(--theme-bg)' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '28px', fontWeight: '700', color: 'var(--theme-text)' }} className="reveal reveal-up">
              ¿Quién está detrás de todo esto? Personas como tú.
            </h2>
            <p style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px', color: 'var(--gray)' }} className="reveal reveal-up">
              Somos una empresa emergente. Un equipo de creativos, diseñadores, emprendedores y educadores que creemos que la inteligencia artificial no debería ser solo para expertos.
            </p>
            <p style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px', color: 'var(--gray)' }} className="reveal reveal-up">
              Por eso creamos este taller: para hacer accesible lo complejo, sin perder lo humano.
            </p>
            <p style={{ textAlign: 'center', marginBottom: '30px', fontWeight: '600', color: 'var(--theme-text)' }} className="reveal reveal-up">
              Aquí puedes conocernos 👇
            </p>

            <div style={{ maxWidth: '900px', margin: '0 auto 40px', position: 'relative' }} className="reveal reveal-up">
              <Slider
                dots={true}
                infinite={true}
                speed={500}
                slidesToShow={2}
                slidesToScroll={2}
                autoplay={false}
                arrows={true}
                responsive={[
                  {
                    breakpoint: 768,
                    settings: {
                      slidesToShow: 1,
                      slidesToScroll: 1
                    }
                  }
                ]}
                className="team-carousel"
              >
                {/* Miembro 1 */}
                <div style={{ padding: '10px' }}>
                  <div style={{
                    padding: '30px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '100%'
                  }} className="card-hover team-card">
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                      fontSize: '40px',
                      overflow: 'hidden'
                    }}>
                      <img src="/team-member-1.jpg" alt="Valentina Ruiz" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = 'VR';
                      }} />
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: 'var(--theme-text)' }}>
                      Valentina Ruiz
                    </h3>
                    <p style={{ fontSize: '16px', color: 'var(--gray)', marginBottom: '16px' }}>
                      Diseñadora digital y co-creadora del taller. Su pasión es hacer que las herramientas tecnológicas se vuelvan fáciles, bonitas y humanas.
                    </p>
                  </div>
                </div>

                {/* Miembro 2 */}
                <div style={{ padding: '10px' }}>
                  <div style={{
                    padding: '30px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '100%'
                  }} className="card-hover team-card">
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--secondary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                      fontSize: '40px',
                      overflow: 'hidden'
                    }}>
                      <img src="/team-member-2.jpg" alt="Luis García" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = 'LG';
                      }} />
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: 'var(--theme-text)' }}>
                      Luis García
                    </h3>
                    <p style={{ fontSize: '16px', color: 'var(--gray)', marginBottom: '16px' }}>
                      Emprendedor digital con más de 10 años en formación online. Cree que enseñar desde la empatía es la clave de la transformación.
                    </p>
                  </div>
                </div>

                {/* Miembro 3 */}
                <div style={{ padding: '10px' }}>
                  <div style={{
                    padding: '30px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '100%'
                  }} className="card-hover team-card">
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                      fontSize: '40px',
                      overflow: 'hidden'
                    }}>
                      <img src="/team-member-3.jpg" alt="Camila Ortega" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = 'CO';
                      }} />
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: 'var(--theme-text)' }}>
                      Camila Ortega
                    </h3>
                    <p style={{ fontSize: '16px', color: 'var(--gray)', marginBottom: '16px' }}>
                      Coach de comunicación. Ayuda a personas a usar su voz (y ahora también sus avatares) para transformar sus negocios.
                    </p>
                  </div>
                </div>

                {/* Miembro 4 (Nuevo) */}
                <div style={{ padding: '10px' }}>
                  <div style={{
                    padding: '30px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '100%'
                  }} className="card-hover team-card">
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                      fontSize: '40px',
                      overflow: 'hidden'
                    }}>
                      <img src="/team-member-4.jpg" alt="Martín Torres" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = 'MT';
                      }} />
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: 'var(--theme-text)' }}>
                      Martín Torres
                    </h3>
                    <p style={{ fontSize: '16px', color: 'var(--gray)', marginBottom: '16px' }}>
                      Especialista en IA y producción audiovisual. Combina tecnología avanzada con narrativas efectivas para crear contenido que conecta y convierte.
                    </p>
                  </div>
                </div>
              </Slider>
            </div>
          </div>
        </section>

        {/* Transformación Section */}
        <section className="section section-themed" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '28px', fontWeight: '700', color: 'var(--theme-text)' }} className="reveal reveal-up">
              ¿Cómo vas a salir después de este taller?
            </h2>

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
                {/* Antes */}
                <div style={{
                  padding: '30px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column'
                }} className="reveal reveal-left benefit-card">
                  <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '20px', color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>✋</span> ANTES DEL TALLER: ATASCADO Y PERDIENDO OPORTUNIDADES
                  </h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginLeft: '0', paddingLeft: '0', listStyle: 'none' }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--theme-text-secondary)', fontSize: '18px' }}>•</span>
                      <span style={{ color: 'var(--theme-text)' }}>La IA te parece un laberinto: no sabes por dónde empezar ni cómo podría ayudarte a generar ingresos.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--theme-text-secondary)', fontSize: '18px' }}>•</span>
                      <span style={{ color: 'var(--theme-text)' }}>Sientes que la tecnología es una barrera, y crear contenido profesional parece costoso, técnico y te consume demasiado tiempo.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--theme-text-secondary)', fontSize: '18px' }}>•</span>
                      <span style={{ color: 'var(--theme-text)' }}>Tienes ideas y proyectos valiosos, pero te cuesta destacar y monetizarlos efectivamente en el competitivo mundo digital.</span>
                    </li>
                  </ul>
                </div>

                {/* Después */}
                <div style={{
                  padding: '30px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column'
                }} className="reveal reveal-right benefit-card">
                  <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>🚀</span> DESPUÉS DEL TALLER: EQUIPADO, RÁPIDO Y MONETIZANDO
                  </h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginLeft: '0', paddingLeft: '0', listStyle: 'none' }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '18px' }}>•</span>
                      <span style={{ color: 'var(--theme-text)' }}>Tendrás tu primer avatar profesional con IA, listo para usar y generar ingresos hoy mismo, en solo 90 minutos.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '18px' }}>•</span>
                      <span style={{ color: 'var(--theme-text)' }}>Sabrás exactamente cómo crear contenido que te representa auténticamente, sin necesidad de cámaras, micrófonos o complejas habilidades de edición.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '18px' }}>•</span>
                      <span style={{ color: 'var(--theme-text)' }}>Comenzarás a ahorrar cientos de dólares en producción y desbloquearás una nueva fuente de ingresos digitales, utilizando una habilidad práctica y demandada.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div style={{
                padding: '30px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '20px'
              }} className="reveal reveal-up benefit-card">
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: 'var(--theme-text)' }}>
                  TU TRANSFORMACIÓN GARANTIZADA EN 90 MINUTOS:
                </h3>
                <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary)', fontStyle: 'italic' }}>
                  De sentirte abrumado por la IA y sin una ruta clara de monetización, a crear un avatar profesional que trabaja para ti y te abre puertas a nuevas oportunidades económicas, todo en una sola sesión práctica.
                </p>
              </div>

              <div style={{
                textAlign: 'center',
                marginTop: '30px'
              }} className="reveal reveal-up">
                <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--theme-text)' }}>
                  ESTO NO ES SOLO UN TALLER:<br/>
                  Es tu vía rápida para adquirir una habilidad digital rentable y ponerte al frente en la nueva era del contenido.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bonuses Section */}
        <section className="section section-themed" style={{ backgroundColor: 'var(--theme-bg)' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '28px', fontWeight: '700', color: 'var(--theme-text)' }} className="reveal reveal-up">
              🎁 Bonos gratis si te inscribes hoy
            </h2>
            <p style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px', color: 'var(--gray)', fontSize: '20px', fontWeight: '600' }} className="reveal reveal-up">
              Accede a estos recursos exclusivos valorados en más de $500, totalmente GRATIS con tu acceso a la clase
            </p>

            <div className="bonuses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              {/* Bono 1 */}
              <div style={{
                padding: '30px',
                borderRadius: '8px',
                border: '2px solid var(--accent)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }} className="reveal reveal-left card-hover animate-shimmer bonus-card">
                <div style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  fontSize: '30px'
                }}>
                  ✍️
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: 'var(--theme-text)' }}>
                  Guiones IA listos para usar
                </h3>
                <p style={{ marginBottom: '16px', color: 'var(--gray)' }}>
                  Colección de guiones optimizados para avatares en diferentes nichos: marketing, educación, finanzas y más.
                </p>
                <p style={{ fontWeight: '700', color: 'var(--accent)' }}>Valor: $197</p>
              </div>

              {/* Bono 2 */}
              <div style={{
                padding: '30px',
                borderRadius: '8px',
                border: '2px solid var(--accent)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }} className="reveal reveal-up card-hover animate-shimmer bonus-card">
                <div style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  fontSize: '30px'
                }}>
                  🔧
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: 'var(--theme-text)' }}>
                  Settings perfectos para cada plataforma
                </h3>
                <p style={{ marginBottom: '16px', color: 'var(--gray)' }}>
                  Configuraciones exactas de calidad, iluminación y audio para YouTube, Instagram, LinkedIn, TikTok y presentaciones corporativas.
                </p>
                <p style={{ fontWeight: '700', color: 'var(--accent)' }}>Valor: $139</p>
              </div>

              {/* Bono 3 */}
              <div style={{
                padding: '30px',
                borderRadius: '8px',
                border: '2px solid var(--accent)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }} className="reveal reveal-right card-hover animate-shimmer bonus-card">
                <div style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  fontSize: '30px'
                }}>
                  🔄
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: 'var(--theme-text)' }}>
                  Sistema para automatizar tu producción
                </h3>
                <p style={{ marginBottom: '16px', color: 'var(--gray)' }}>
                  Flujo de trabajo completo para crear y programar contenido con avatares en múltiples plataformas.
                </p>
                <p style={{ fontWeight: '700', color: 'var(--accent)' }}>Valor: $249</p>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <p style={{ fontWeight: '700', fontSize: '24px', color: 'var(--accent)' }}>
                Total: +$500 | Hoy: GRATIS con tu acceso a la clase
              </p>
            </div>
          </div>
        </section>

        {/* Guarantee Section */}
        <section className="section section-themed" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="container">
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              padding: '40px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }} className="reveal reveal-up benefit-card">
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                fontSize: '40px'
              }} className="animate-bounce">
                🛡️
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '20px', color: 'var(--theme-text)' }}>
                Si no aprendes, te reembolsamos. Así de simple.
              </h2>
              <p style={{ fontSize: '18px', marginBottom: '24px', maxWidth: '600px', color: 'var(--theme-text)' }}>
                Aprende, aplica, crea. Si después de seguir el programa no logras crear tu primer avatar, te devolvemos tu inversión sin preguntas.
              </p>
              <div style={{
                padding: '16px 24px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ fontWeight: '600', color: 'var(--secondary)', margin: 0 }}>
                  100% Garantía de satisfacción durante 30 días.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta" className="section" style={{ backgroundColor: 'var(--dark)', color: 'white' }}>
          <div className="container">
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '32px', marginBottom: '24px', fontWeight: '700' }} className="reveal reveal-up">🔥 LANZA TU PRIMER AVATAR RENTABLE CON IA Y EMPIEZA A MONETIZAR</h2>

              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '30px', borderRadius: '8px', margin: '0 auto 32px', maxWidth: '700px' }} className="reveal reveal-up delay-200">
                <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '20px', fontWeight: '700' }}>EN SOLO 90 MINUTOS, TENDRÁS TODO LO NECESARIO PARA:</p>
                <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '20px' }}>✅</span>
                    <span style={{ fontSize: '18px', lineHeight: '1.4' }}>Crear tu avatar profesional con IA, listo para captar la atención.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '20px' }}>✅</span>
                    <span style={{ fontSize: '18px', lineHeight: '1.4' }}>Dominar estrategias claras para monetizarlo desde el primer día.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '20px' }}>✅</span>
                    <span style={{ fontSize: '18px', lineHeight: '1.4' }}>Posicionarte y destacar con una herramienta innovadora en el mercado digital.</span>
                  </li>
                </ul>
              </div>

              <div style={{ fontSize: '18px', marginBottom: '24px', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600' }}>💸 Oferta Exclusiva por Tiempo Limitado:</span>
                </p>
                <p style={{ marginBottom: '12px' }}>
                  De <span style={{ textDecoration: 'line-through', color: 'rgba(255, 255, 255, 0.6)' }}>$100 USD</span> a solo <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)' }}>$30 USD</span> <span style={{ fontWeight: '600', color: 'var(--accent)' }}>(¡Ahorra 70% Hoy!)</span>
                </p>
                <p style={{ marginBottom: '12px' }}>
                  🎁 Incluye 3 Bonos de Acción Rápida (valorados en $50 USD) + Nuestra Garantía Total de Satisfacción.
                </p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)' }}>
                  👉 ¡Asegura Tu Cupo y Empieza a Generar Ingresos con IA!
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }} className="reveal reveal-up delay-300">
                <div className="countdown-grid">
                  <div className="countdown-item animate-scaleIn delay-400">
                    <div className="countdown-box animate-pulse-highlight" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                      <span className="countdown-value">{timeLeft.days.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="countdown-label">Días</span>
                  </div>
                  <div className="countdown-item animate-scaleIn delay-500">
                    <div className="countdown-box animate-pulse-highlight" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                      <span className="countdown-value">{timeLeft.hours.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="countdown-label">Horas</span>
                  </div>
                  <div className="countdown-item animate-scaleIn delay-600">
                    <div className="countdown-box animate-pulse-highlight" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                      <span className="countdown-value">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="countdown-label">Minutos</span>
                  </div>
                  <div className="countdown-item animate-scaleIn delay-700">
                    <div className="countdown-box animate-pulse-highlight" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                      <span className="countdown-value">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="countdown-label">Segundos</span>
                  </div>
                </div>
              </div>

              {/* Formulario integrado en CTA */}
              <div id="lead-form" style={{
                maxWidth: '600px',
                margin: '32px auto 0',
                backgroundColor: 'var(--theme-form-bg)',
                padding: '32px',
                borderRadius: '8px',
                boxShadow: '0 10px 25px var(--theme-shadow)',
                color: 'var(--theme-form-text)',
                border: '1px solid var(--theme-border)'
              }} className="reveal reveal-up delay-400">
                {!formSubmitted ? (
                  <>
                    <h3 style={{ fontSize: '28px', marginBottom: '16px', textAlign: 'center', fontWeight: '700', color: 'var(--theme-form-text)' }}>
                      ¿Listo para dar el salto digital más importante de tu vida?
                    </h3>
                    <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--theme-text-secondary)' }}>
                      Completa tus datos para recibir información exclusiva sobre el curso. El futuro empieza hoy.
                    </p>

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📩</div>
                      <p style={{ fontSize: '16px', color: 'var(--theme-text-secondary)', fontWeight: '600' }}>
                        Regístrate ahora y descubre cómo esta habilidad digital puede transformar tu presencia online
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--theme-form-text)' }}>
                          Nombre completo
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Tu nombre"
                          maxLength={50}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '6px',
                            border: formErrors.name ? '1px solid #e53e3e' : `1px solid var(--theme-input-border)`,
                            fontSize: '16px',
                            backgroundColor: 'var(--theme-input-bg)',
                            color: 'var(--theme-text)'
                          }}
                        />
                        {formErrors.name && (
                          <p style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{formErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--theme-form-text)' }}>
                          Correo electrónico
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="tu@email.com"
                          maxLength={100}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '6px',
                            border: formErrors.email ? '1px solid #e53e3e' : `1px solid var(--theme-input-border)`,
                            fontSize: '16px',
                            backgroundColor: 'var(--theme-input-bg)',
                            color: 'var(--theme-text)'
                          }}
                        />
                        {formErrors.email && (
                          <p style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{formErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="phoneNumber" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--theme-form-text)' }}>
                          Número de celular
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{
                            position: 'relative',
                            width: '110px'
                          }}>
                            <select
                              value={formData.phoneCountry.code}
                              onChange={(e) => {
                                const selectedCountry = countryCodes.find(country => country.code === e.target.value);
                                handleCountryCodeChange(selectedCountry);
                              }}
                              style={{
                                width: '100%',
                                padding: '12px 16px 12px 38px',
                                borderRadius: '6px',
                                border: `1px solid var(--theme-input-border)`,
                                fontSize: '15px',
                                appearance: 'none',
                                backgroundColor: 'var(--theme-input-bg)',
                                color: 'var(--theme-text)',
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s ease',
                                outline: 'none',
                                boxShadow: 'none'
                              }}
                            >
                              {countryCodes.map((country) => (
                                <option
                                  key={country.code}
                                  value={country.code}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px',
                                    fontFamily: 'inherit'
                                  }}
                                >
                                  {country.code}
                                </option>
                              ))}
                            </select>
                            <div style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {formData.phoneCountry.flag}
                            </div>
                            <div style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                              fontSize: '12px',
                              color: '#666'
                            }}>
                              ▼
                            </div>
                          </div>
                          <input
                            type="tel"
                            id="phoneNumber"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="600 000 000"
                            maxLength={15}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              borderRadius: '6px',
                              border: formErrors.phoneNumber ? '1px solid #e53e3e' : `1px solid var(--theme-input-border)`,
                              fontSize: '15px',
                              fontFamily: 'inherit',
                              backgroundColor: 'var(--theme-input-bg)',
                              color: 'var(--theme-text)'
                            }}
                          />
                        </div>
                        {formErrors.phoneNumber && (
                          <p style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{formErrors.phoneNumber}</p>
                        )}
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: 'var(--theme-text-secondary)' }}>
                          <input
                            type="checkbox"
                            name="consent"
                            checked={formData.consent}
                            onChange={handleInputChange}
                            style={{ marginTop: '3px' }}
                          />
                          <span>
                            Acepto recibir información sobre el curso y promociones relacionadas. Puedo darme de baja en cualquier momento.
                          </span>
                        </label>
                        {formErrors.consent && (
                          <p style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{formErrors.consent}</p>
                        )}
                      </div>

                      {/* Campo oculto para la intención de compra */}
                      <input type="hidden" name="purchaseIntent" value={purchaseIntent} />

                      {/* Campo honeypot (debe permanecer vacío para detectar bots) */}
                      <input
                        type="text"
                        name="website"
                        value=""
                        onChange={() => {}} // No hacer nada si un bot intenta llenarlo
                        style={{
                          position: 'absolute',
                          left: '-9999px',
                          opacity: 0,
                          pointerEvents: 'none',
                          tabIndex: -1
                        }}
                        tabIndex="-1"
                        autoComplete="off"
                      />

                      {/* reCAPTCHA invisible */}
                      <div style={{ marginTop: '20px' }}>
                        <ReCAPTCHA
                          ref={recaptchaRef}
                          sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Clave de prueba de Google
                          size="invisible"
                          onChange={handleRecaptchaChange}
                        />
                      </div>

                      {/* Indicador de seguridad */}
                      <div style={{
                        marginTop: '20px',
                        padding: '10px',
                        backgroundColor: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.backgroundColor,
                        borderColor: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.borderColor,
                        color: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.color,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderRadius: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '16px',
                        transition: 'all 0.3s ease'
                      }}>
                        <span style={{ marginRight: '8px', fontSize: '18px' }}>
                          {getSecurityFeedback(securityStatus.status, securityStatus.message).styles.icon}
                        </span>
                        <p style={{ fontSize: '14px', margin: 0 }}>
                          {securityStatus.message}
                        </p>
                      </div>



                      <div style={{ marginTop: '16px' }}>
                        <p style={{
                          textAlign: 'center',
                          marginBottom: '12px',
                          fontSize: '14px',
                          color: 'var(--theme-text-secondary)'
                        }}>
                          Al hacer clic en el botón, te enviaremos información exclusiva sobre el curso
                        </p>

                        <button
                          type="submit"
                          className="btn"
                          style={{
                            width: '100%',
                            fontSize: '18px',
                            fontWeight: '700',
                            backgroundColor: 'var(--accent)',
                            color: 'white',
                            padding: '16px',
                            transition: 'all 0.3s ease',
                            opacity: isSubmitting ? 0.7 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                          }}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'PROCESANDO...' : '¡QUIERO SABER MÁS!'}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    {/* Mostrar mensaje de estado si existe */}
                    {securityStatus.message && (
                      <div style={{
                        marginBottom: '20px',
                        padding: '12px',
                        backgroundColor: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.backgroundColor,
                        borderColor: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.borderColor,
                        color: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.color,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                      }}>
                        <span style={{ marginRight: '8px', fontSize: '18px' }}>
                          {getSecurityFeedback(securityStatus.status, securityStatus.message).styles.icon}
                        </span>
                        <p style={{ fontSize: '14px', margin: 0, fontWeight: '600' }}>
                          {securityStatus.message}
                        </p>
                      </div>
                    )}

                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h3 style={{ fontSize: '28px', marginBottom: '16px', color: 'var(--primary)', fontWeight: '700' }}>
                      {securityStatus.status === 'info' ? '¡Ya tienes un registro!' : '¡Gracias por Registrarte!'}
                    </h3>
                    <p style={{ marginBottom: '20px', fontSize: '16px', color: 'var(--theme-form-text)' }}>
                      {securityStatus.status === 'info'
                        ? 'Perfecto, ya tienes tus datos registrados. Ahora puedes proceder con el pago para acceder al curso.'
                        : 'Hemos recibido tus datos correctamente. En breve recibirás información exclusiva sobre el curso en tu WhatsApp y correo electrónico.'
                      }
                    </p>

                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--theme-form-text)', fontWeight: '700' }}>
                        ¿Por qué esperar cuando puedes empezar hoy mismo?
                      </h4>
                      <p style={{ marginBottom: '16px', color: 'var(--theme-text-secondary)' }}>
                        Los cupos son limitados y la oferta especial termina pronto. No pierdas esta oportunidad única de transformar tu presencia digital y crear nuevas fuentes de ingresos.
                      </p>
                      <ul style={{ textAlign: 'left', marginBottom: '20px', paddingLeft: '20px', color: 'var(--theme-form-text)' }}>
                        <li style={{ marginBottom: '8px' }}>✅ Acceso inmediato a todo el contenido</li>
                        <li style={{ marginBottom: '8px' }}>✅ Bonos exclusivos valorados en más de $500</li>
                        <li style={{ marginBottom: '8px' }}>✅ Garantía de satisfacción de 30 días</li>
                      </ul>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--gray)', marginRight: '10px', fontSize: '18px' }}>$100</span>
                        <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '24px' }}>$30</span>
                      </div>

                      <PaymentButtons
                        userEmail={submittedUserData.email}
                        userName={submittedUserData.name}
                        amount={30}
                        onPaymentSuccess={(paymentData) => {
                          setSecurityStatus({
                            status: 'success',
                            message: '¡Pago completado! Recibirás un email de confirmación pronto.'
                          });
                        }}
                        onPaymentError={(error) => {
                          setSecurityStatus({
                            status: 'error',
                            message: error || 'Error en el pago. Por favor, inténtalo de nuevo.'
                          });
                        }}
                      />
                    </div>

                    <p style={{ fontWeight: '600', color: 'var(--primary)' }}>
                      ¡Prepárate para transformar tu presencia digital con avatares hiperrealistas!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="section section-themed" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 40px' }}>
              <h2 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: '700', color: 'var(--theme-text)' }} className="reveal reveal-up">¿Tienes dudas? Aquí te respondemos lo que todos quieren saber</h2>
              <p style={{ fontSize: '18px', color: 'var(--theme-text-secondary)', marginBottom: '40px' }} className="reveal reveal-up delay-200">
                Esto es para ti si:
                <span style={{ display: 'block', marginTop: '15px', color: 'var(--theme-text)' }}>
                  ✅ No sabes nada de tecnología<br/>
                  ✅ Nunca hiciste un taller online<br/>
                  ✅ Quieres resultados rápidos y aplicables<br/>
                  ✅ Buscas una nueva forma de generar ingresos
                </span>
              </p>

              <div style={{
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'left'
              }} className="reveal reveal-up delay-300 benefit-card">
                <FaqAccordion
                  faqs={[
                    {
                      question: "¿Necesito experiencia previa en edición de video?",
                      answer: "No, el taller está diseñado para todos los niveles. Comenzamos desde lo básico y avanzamos gradualmente. Las herramientas y técnicas son explicadas paso a paso."
                    },
                    {
                      question: "¿Qué equipo necesito para crear avatares hiperrealistas?",
                      answer: "Solo necesitas una computadora con conexión a internet. No se requiere hardware especializado ni cámaras profesionales. Todas las herramientas que utilizamos son accesibles desde navegadores web o con requisitos mínimos de sistema."
                    },
                    {
                      question: "¿Cuánto tiempo toma dominar la creación de avatares?",
                      answer: "El tiempo que te tome lo decides tú. Nuestro taller está orientado a que tengas todos los conocimientos necesarios para usar la herramienta y crear tu avatar durante la misma clase. El tiempo que te tome dominarla depende de la práctica, pero en 30 días puedes desarrollar habilidades profesionales siguiendo nuestro programa."
                    },
                    {
                      question: "¿Cómo puedo monetizar mis avatares una vez creados?",
                      answer: "El taller incluye una sección sobre monetización donde se mencionan algunas opciones. Además, uno de los bonos incluye una guía detallada sobre cómo monetizar tu avatar. Algunas ideas incluyen creación de contenido para redes sociales, servicios a empresas, marketing de afiliados, creación de talleres propios, y más. Además, tendrás acceso a nuestro grupo exclusivo donde compartimos oportunidades de negocio."
                    },
                    {
                      question: "¿Por cuánto tiempo tendré acceso al contenido del taller?",
                      answer: "El acceso al taller es por 1 mes. Una vez se imparta el taller, el video será subido a una plataforma donde podrás acceder al material cuando quieras y tantas veces como necesites."
                    }
                  ]}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)', padding: '60px 0 20px', borderTop: '1px solid var(--theme-border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', borderTop: '1px solid var(--theme-border)', marginTop: '40px', paddingTop: '20px' }}>
            <p style={{ color: 'var(--theme-text)' }}>© {new Date().getFullYear()} InformatiK-AI. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Floating Button */}
      {isFloatingBtnVisible && !formSubmitted && (
        <div className="floating-btn visible">
          <a
            href="#lead-form"
            className="btn btn-animated"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('lead-form');
            }}
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              padding: '12px 24px',
              borderRadius: '8px',
              textAlign: 'center',
              display: 'block',
              maxWidth: '100%',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
            }}
          >
            ¡ACCEDE AHORA!
          </a>
        </div>
      )}
    </>
  )
}

export default App
