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



        {/* Benefits Section - Estilo Noticias Moderno */}
        <section className="section section-themed section-decorative" style={{ 
          backgroundColor: 'var(--theme-surface)',
          padding: '80px 0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="container">
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '60px',
              position: 'relative',
              zIndex: 2
            }} className="reveal reveal-up">
              <span style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                borderRadius: '30px',
                fontSize: '15px',
                fontWeight: '700',
                marginBottom: '24px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                boxShadow: '0 8px 20px rgba(74, 144, 226, 0.25)',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                animation: 'shimmer-new 3s infinite',
                transition: 'transform 0.3s ease',
              }}
              className="shimmer-effect"
              aria-label="Sección de Transformación Digital"
              >
                🚀 Transformación Digital
              </span>
              <h2 style={{
                fontSize: '36px',
                fontWeight: '800',
                color: 'var(--theme-text)',
                marginBottom: '20px',
                lineHeight: '1.3',
                letterSpacing: '-0.5px',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
              }}>
                ¿Por qué esta habilidad puede cambiar tu futuro digital?
              </h2>
              <p style={{
                fontSize: '19px',
                color: 'var(--theme-text-secondary)',
                maxWidth: '650px',
                margin: '0 auto',
                lineHeight: '1.7',
                fontWeight: '400'
              }}>
                Descubre cómo la IA puede transformar tu carrera y abrir nuevas oportunidades económicas
              </p>
            </div>

            <div className="news-style-benefits" style={{
              gap: '35px',
              position: 'relative',
              zIndex: 2
            }}>
              {/* Artículo 1 - Creación de Contenido */}
              <article className="benefit-article enhanced-hover reveal reveal-left" style={{
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '20px',
                overflow: 'hidden'
              }}>
                <div className="benefit-image-container" style={{
                  height: '220px'
                }}>
                  <img
                    src="./avatars/avatar-content-creation.png"
                    alt="Avatar creando contenido profesional con IA"
                    className="benefit-image"
                    loading="lazy"
                    style={{
                      transition: 'transform 0.6s ease-in-out'
                    }}
                  />
                  <div className="benefit-image-overlay" style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)'
                  }}></div>
                </div>
                <div className="benefit-content" style={{
                  padding: '28px',
                  backgroundColor: 'var(--theme-card-bg)'
                }}>
                  <span className="benefit-category" style={{
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 12px rgba(74, 144, 226, 0.15)'
                  }}>Creación</span>
                  <h3 className="benefit-title" style={{
                    fontSize: '22px',
                    marginTop: '16px',
                    lineHeight: '1.4'
                  }}>
                    Crea <span className="highlight">Contenido Profesional</span> con IA en Minutos
                  </h3>
                  <p className="benefit-description" style={{
                    marginTop: '14px',
                    lineHeight: '1.7',
                    color: 'var(--theme-text-secondary)'
                  }}>
                    En solo 90 minutos aprenderás una habilidad digital moderna, lista para monetizar sin depender de nadie. Domina las herramientas que están revolucionando la creación de contenido.
                  </p>
                  <div className="benefit-meta" style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--theme-border)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div className="benefit-time" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--theme-text-muted)',
                      fontSize: '14px'
                    }}>
                      <svg className="benefit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{
                        width: '18px',
                        height: '18px',
                        color: 'var(--primary)'
                      }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      90 min de aprendizaje
                    </div>
                  </div>
                </div>
              </article>

              {/* Artículo 2 - Monetización */}
              <article className="benefit-article enhanced-hover reveal reveal-up" style={{
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '20px',
                overflow: 'hidden'
              }}>
                <div className="benefit-image-container" style={{
                  height: '220px'
                }}>
                  <img
                    src="./avatars/avatar-selling.png"
                    alt="Avatar vendiendo y monetizando contenido"
                    className="benefit-image"
                    loading="lazy"
                    style={{
                      transition: 'transform 0.6s ease-in-out'
                    }}
                  />
                  <div className="benefit-image-overlay" style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)'
                  }}></div>
                </div>
                <div className="benefit-content" style={{
                  padding: '28px',
                  backgroundColor: 'var(--theme-card-bg)'
                }}>
                  <span className="benefit-category" style={{
                    background: 'linear-gradient(135deg, var(--secondary) 0%, var(--accent-alt) 100%)',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 12px rgba(228, 105, 148, 0.15)'
                  }}>Monetización</span>
                  <h3 className="benefit-title" style={{
                    fontSize: '22px',
                    marginTop: '16px',
                    lineHeight: '1.4'
                  }}>
                    Crea y <span className="highlight">Vende Contenido</span> desde Hoy Mismo
                  </h3>
                  <p className="benefit-description" style={{
                    marginTop: '14px',
                    lineHeight: '1.7',
                    color: 'var(--theme-text-secondary)'
                  }}>
                    Esta habilidad te permite lanzar contenido rentable y empezar a generar ingresos desde el primer día. Aprende estrategias probadas de monetización.
                  </p>
                  <div className="benefit-meta" style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--theme-border)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div className="benefit-time" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--theme-text-muted)',
                      fontSize: '14px'
                    }}>
                      <svg className="benefit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{
                        width: '18px',
                        height: '18px',
                        color: 'var(--secondary)'
                      }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Ingresos inmediatos
                    </div>
                  </div>
                </div>
              </article>

              {/* Artículo 3 - Creatividad */}
              <article className="benefit-article enhanced-hover reveal reveal-right" style={{
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '20px',
                overflow: 'hidden'
              }}>
                <div className="benefit-image-container" style={{
                  height: '220px'
                }}>
                  <img
                    src="./avatars/avatar-creative.png"
                    alt="Avatar potenciando creatividad con IA"
                    className="benefit-image"
                    loading="lazy"
                    style={{
                      transition: 'transform 0.6s ease-in-out'
                    }}
                  />
                  <div className="benefit-image-overlay" style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)'
                  }}></div>
                </div>
                <div className="benefit-content" style={{
                  padding: '28px',
                  backgroundColor: 'var(--theme-card-bg)'
                }}>
                  <span className="benefit-category" style={{
                    background: 'linear-gradient(135deg, var(--tertiary) 0%, var(--primary) 100%)',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 12px rgba(154, 218, 251, 0.15)'
                  }}>Creatividad</span>
                  <h3 className="benefit-title" style={{
                    fontSize: '22px',
                    marginTop: '16px',
                    lineHeight: '1.4'
                  }}>
                    <span className="highlight">Potencia tu Estilo</span> sin Perder tu Esencia
                  </h3>
                  <p className="benefit-description" style={{
                    marginTop: '14px',
                    lineHeight: '1.7',
                    color: 'var(--theme-text-secondary)'
                  }}>
                    Integra la IA a tu proceso creativo sin comprometer lo que te hace auténtico y valioso. Mantén tu voz única mientras amplias tus capacidades.
                  </p>
                  <div className="benefit-meta" style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--theme-border)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div className="benefit-time" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--theme-text-muted)',
                      fontSize: '14px'
                    }}>
                      <svg className="benefit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{
                        width: '18px',
                        height: '18px',
                        color: 'var(--tertiary)'
                      }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Creatividad amplificada
                    </div>
                  </div>
                </div>
              </article>

              {/* Artículo 4 - Innovación */}
              <article className="benefit-article enhanced-hover reveal reveal-left " style={{
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 15px 35px rgba(74, 144, 226, 0.12)',
                border: '1px solid var(--primary)'
              }}>
                <div className="benefit-image-container" style={{
                  height: '250px'
                }}>
                  <img
                    src="./avatars/avatar-innovation.png"
                    alt="Avatar liderando con innovación"
                    className="benefit-image"
                    loading="lazy"
                    style={{
                      transition: 'transform 0.6s ease-in-out'
                    }}
                  />
                  <div className="benefit-image-overlay" style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)'
                  }}></div>
                </div>
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-alt) 100%)',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  boxShadow: '0 4px 10px rgba(74, 144, 226, 0.3)',
                  zIndex: 2
                }}>
                  Destacado
                </div>
                <div className="benefit-content" style={{
                  padding: '32px',
                  backgroundColor: 'var(--theme-card-bg)'
                }}>
                  <span className="benefit-category" style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 12px rgba(255, 126, 95, 0.15)'
                  }}>Innovación</span>
                  <h3 className="benefit-title" style={{
                    fontSize: '24px',
                    marginTop: '16px',
                    lineHeight: '1.4'
                  }}>
                    <span className="highlight">Lidera el Cambio</span> en la Era Digital
                  </h3>
                  <p className="benefit-description" style={{
                    marginTop: '14px',
                    lineHeight: '1.7',
                    color: 'var(--theme-text-secondary)'
                  }}>
                    Posiciónate como pionero en la revolución de la IA. Aprende a usar estas herramientas antes que la mayoría y obtén una ventaja competitiva significativa.
                  </p>
                  <div className="benefit-meta" style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--theme-border)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div className="benefit-time" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--theme-text-muted)',
                      fontSize: '14px'
                    }}>
                      <svg className="benefit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{
                        width: '18px',
                        height: '18px',
                        color: 'var(--accent)'
                      }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Ventaja competitiva
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Quiénes Somos Section - Diseño Tipo Redes Sociales */}
        <section className="section section-themed section-decorative" style={{ backgroundColor: 'var(--theme-bg)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '50px' }} className="reveal reveal-up">
              <span style={{
                display: 'inline-block',
                padding: '8px 20px',
                backgroundColor: 'var(--secondary)',
                color: 'white',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                👥 Nuestro Equipo
              </span>
              <h2 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: 'var(--theme-text)',
                marginBottom: '16px',
                lineHeight: '1.2'
              }}>
                ¿Quién está detrás de todo esto? Personas como tú.
              </h2>
              <p style={{
                fontSize: '18px',
                color: 'var(--theme-text-secondary)',
                maxWidth: '700px',
                margin: '0 auto 16px'
              }}>
                Somos una empresa emergente. Un equipo de creativos, diseñadores, emprendedores y educadores que creemos que la inteligencia artificial no debería ser solo para expertos.
              </p>
              <p style={{
                fontSize: '16px',
                color: 'var(--theme-text-secondary)',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Por eso creamos este taller: para hacer accesible lo complejo, sin perder lo humano.
              </p>
            </div>

            <div className="team-social-grid"
              style={{
                opacity: 0,
                animation: 'fadeInUp 0.8s ease forwards',
                animationDelay: '0.3s'
              }}
            >
              {/* Miembro 1 - Javier Roa */}
              <div className="team-social-card reveal reveal-left">
                <div className="team-avatar-container">
                  <div className="team-specialty-badge">Developer & Formador IA</div>
                  <img
                    src="/nosotros/roa.png"
                    alt="Javier Roa"
                    className="team-avatar"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'team-avatar-fallback';
                      fallback.textContent = 'JR';
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                </div>
                <h3 className="team-member-name">💡 Javier Roa</h3>
                <p className="team-member-role">Developer Autodidacta | Formador en Inteligencia Artificial</p>
                <p className="team-member-description">
                  📍 Desarrollo Java/JS • Inteligencia Artificial • Formación Tecnológica
                  <br /><br />
                  Developer autodidacta y formador en IA con experiencia en Java, JavaScript, Spring Boot y React. Apasionado por la tecnología, aplica sus conocimientos tanto en desarrollo de software como en la creación de experiencias educativas, simplificando conceptos complejos de IA para audiencias sin experiencia previa.
                </p>
                <div className="team-experience-badge">
                  <span>🚀</span>
                  <span>+5 años en enseñanza y divulgación IA</span>
                </div>
                <div className="team-social-links">
                  <a href="#" className="team-social-link" title="LinkedIn">
                    <span>💼</span>
                  </a>
                  <a href="#" className="team-social-link" title="Portfolio">
                    <span>🎨</span>
                  </a>
                  <a href="#" className="team-social-link" title="Email">
                    <span>✉️</span>
                  </a>
                </div>
              </div>

              {/* Miembro 2 - CamiDevAI */}
              <div className="team-social-card reveal reveal-up">
                <div className="team-avatar-container">
                  <div className="team-specialty-badge">IA Creativa</div>
                  <img
                    src="/nosotros/camidevai.png"
                    alt="CamiDevAI"
                    className="team-avatar"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'team-avatar-fallback';
                      fallback.textContent = '💡';
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                </div>
                <h3 className="team-member-name">CamiDevAI</h3>
                <p className="team-member-role">Ingeniera en Informática | Experta en IA Creativa</p>
                <p className="team-member-description">
                  📍 Marketing • IA Generativa • Crecimiento Orgánico<br/><br/>
                  Con posgrado en Inteligencia Artificial y background en ingeniería informática, combina tecnología y creatividad para descubrir, analizar y viralizar herramientas de IA.<br/><br/>
                  🔍 Convierte herramientas complejas en contenido que conecta y vende.
                </p>
                <div className="team-experience-badge">
                  <span>🚀</span>
                  <span>+5 años explorando el futuro de la IA creativa</span>
                </div>
                <div className="team-social-links">
                  <a href="#" className="team-social-link" title="Ingeniería & análisis de herramientas">
                    <span>�‍💻</span>
                  </a>
                  <a href="#" className="team-social-link" title="Estrategia viral para redes sociales">
                    <span>�</span>
                  </a>
                  <a href="#" className="team-social-link" title="Automatización con propósito">
                    <span>🎯</span>
                  </a>
                  <a href="#" className="team-social-link" title="Contenido educativo con alto impacto">
                    <span>✨</span>
                  </a>
                </div>
              </div>

              {/* Miembro 3 - Jorge Salgado */}
              <div className="team-social-card reveal reveal-right">
                <div className="team-avatar-container">
                  <div className="team-specialty-badge">Ingeniero & IA Generativa</div>
                  <img
                    src="/nosotros/danny.png"
                    alt="Jorge Salgado"
                    className="team-avatar"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'team-avatar-fallback';
                      fallback.textContent = 'JS';
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                </div>
                <h3 className="team-member-name">💡 Jorge Salgado</h3>
                <p className="team-member-role">Ingeniero Informático | Especialista en IA Generativa</p>
                <p className="team-member-description">
                  📍 Desarrollo BackEnd • IA Generativa • Arquitectura de Software
                  <br /><br />
                  Con 10 años de trayectoria como Ingeniero de Software y actual Senior Consultant, combina su experiencia en desarrollo BackEnd (Java, Python, Spring Boot, Microservicios) con especialización en IA Generativa (RAG, Chatbots, Langchain, Prompt Engineering).
                </p>
                <div className="team-experience-badge">
                  <span>🚀</span>
                  <span>+10 años innovando en software e IA</span>
                </div>
                <div className="team-social-links">
                  <a href="#" className="team-social-link" title="LinkedIn">
                    <span>💼</span>
                  </a>
                  <a href="#" className="team-social-link" title="Instagram">
                    <span>📸</span>
                  </a>
                  <a href="#" className="team-social-link" title="Email">
                    <span>✉️</span>
                  </a>
                </div>
              </div>

            
            </div>
          </div>
        </section>

        {/* Transformación Section */}
        <section className="section section-themed" style={{
          backgroundColor: 'var(--theme-surface)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Background Elements */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '-5%',
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, var(--primary)20, var(--secondary)20)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            zIndex: 0
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '10%',
            right: '-5%',
            width: '150px',
            height: '150px',
            background: 'linear-gradient(135deg, var(--accent)20, var(--primary)20)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            zIndex: 0
          }}></div>

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            {/* Enhanced Title */}
            <div style={{ textAlign: 'center', marginBottom: '60px' }} className="reveal reveal-up">
              <h2 style={{
                fontSize: 'clamp(28px, 4vw, 36px)',
                fontWeight: '800',
                color: 'var(--theme-text)',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                ¿Cómo vas a salir después de este taller?
              </h2>
              <div style={{
                width: '80px',
                height: '4px',
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                margin: '0 auto',
                borderRadius: '2px'
              }}></div>
            </div>

            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              {/* Before/After Cards with VS Design */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '40px',
                marginBottom: '60px',
                position: 'relative'
              }}>
                {/* VS Badge */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: '25px',
                  fontWeight: '800',
                  fontSize: '16px',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  border: '3px solid white'
                }}>
                  VS
                </div>

                {/* Antes Card */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--theme-card-bg) 0%, var(--theme-surface) 100%)',
                  padding: '40px 30px',
                  borderRadius: '25px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: '3px solid #dc3545',
                  boxShadow: '0 15px 40px rgba(220, 53, 69, 0.15)',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }} className="reveal reveal-left benefit-card">
                  {/* Patrón de fondo sutil */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundImage: 'url(./AntesyDespues/antes.png)',
                    backgroundSize: '200px',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'bottom right',
                    opacity: '0.05',
                    zIndex: 0
                  }}></div>

                  {/* Negative indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #dc3545, #c82333)',
                    color: 'white',
                    padding: '10px 18px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '800',
                    boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
                    zIndex: 2
                  }}>
                    ❌ PROBLEMA
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #dc3545, #c82333)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '20px',
                    marginBottom: '25px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Imagen de fondo con overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      right: '0',
                      bottom: '0',
                      backgroundImage: 'url(./AntesyDespues/antes.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: '0.15',
                      zIndex: 0
                    }}></div>

                    {/* Contenido principal */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 15px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        <img
                          src="./AntesyDespues/antes.png"
                          alt="Antes del taller"
                          style={{
                            width: '50px',
                            height: '50px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            filter: 'brightness(1.2) contrast(1.1)'
                          }}
                        />
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0', textTransform: 'uppercase' }}>
                        ANTES DEL TALLER
                      </h3>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: '0.9', fontWeight: '600' }}>
                        Atascado y perdiendo oportunidades
                      </p>
                    </div>
                  </div>

                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginLeft: '0', paddingLeft: '0', listStyle: 'none', position: 'relative', zIndex: 1 }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', background: 'rgba(220, 53, 69, 0.1)', borderRadius: '12px', borderLeft: '4px solid #dc3545' }}>
                      <span style={{ color: '#dc3545', fontSize: '20px', marginTop: '2px' }}>❌</span>
                      <span style={{ color: 'var(--theme-text)', fontSize: '16px', lineHeight: '1.5' }}>La IA te parece un laberinto: no sabes por dónde empezar ni cómo podría ayudarte a generar ingresos.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', background: 'rgba(220, 53, 69, 0.1)', borderRadius: '12px', borderLeft: '4px solid #dc3545' }}>
                      <span style={{ color: '#dc3545', fontSize: '20px', marginTop: '2px' }}>❌</span>
                      <span style={{ color: 'var(--theme-text)', fontSize: '16px', lineHeight: '1.5' }}>Sientes que la tecnología es una barrera, y crear contenido profesional parece costoso, técnico y te consume demasiado tiempo.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', background: 'rgba(220, 53, 69, 0.1)', borderRadius: '12px', borderLeft: '4px solid #dc3545' }}>
                      <span style={{ color: '#dc3545', fontSize: '20px', marginTop: '2px' }}>❌</span>
                      <span style={{ color: 'var(--theme-text)', fontSize: '16px', lineHeight: '1.5' }}>Tienes ideas y proyectos valiosos, pero te cuesta destacar y monetizarlos efectivamente en el competitivo mundo digital.</span>
                    </li>
                  </ul>
                </div>

                {/* Después Card */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--primary)15, var(--secondary)15)',
                  padding: '40px 30px',
                  borderRadius: '25px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: '3px solid var(--primary)',
                  boxShadow: '0 20px 50px rgba(74, 144, 226, 0.25)',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }} className="reveal reveal-right benefit-card">
                  {/* Patrón de fondo sutil */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundImage: 'url(./AntesyDespues/despues.png)',
                    backgroundSize: '200px',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'bottom right',
                    opacity: '0.05',
                    zIndex: 0
                  }}></div>

                  {/* Positive indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: 'white',
                    padding: '10px 18px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '800',
                    boxShadow: '0 4px 15px rgba(74, 144, 226, 0.3)',
                    zIndex: 2
                  }}>
                    ✅ SOLUCIÓN
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '20px',
                    marginBottom: '25px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Imagen de fondo con overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      right: '0',
                      bottom: '0',
                      backgroundImage: 'url(./AntesyDespues/despues.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: '0.15',
                      zIndex: 0
                    }}></div>

                    {/* Contenido principal */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 15px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        <img
                          src="./AntesyDespues/despues.png"
                          alt="Después del taller"
                          style={{
                            width: '50px',
                            height: '50px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            filter: 'brightness(1.2) contrast(1.1)'
                          }}
                        />
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0', textTransform: 'uppercase' }}>
                        DESPUÉS DEL TALLER
                      </h3>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: '0.9', fontWeight: '600' }}>
                        Equipado, rápido y monetizando
                      </p>
                    </div>
                  </div>

                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginLeft: '0', paddingLeft: '0', listStyle: 'none', position: 'relative', zIndex: 1 }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', background: 'rgba(74, 144, 226, 0.1)', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '20px', marginTop: '2px' }}>✅</span>
                      <span style={{ color: 'var(--theme-text)', fontSize: '16px', lineHeight: '1.5' }}>Tendrás tu primer avatar profesional con IA, listo para usar y generar ingresos hoy mismo, en solo 90 minutos.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', background: 'rgba(74, 144, 226, 0.1)', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '20px', marginTop: '2px' }}>✅</span>
                      <span style={{ color: 'var(--theme-text)', fontSize: '16px', lineHeight: '1.5' }}>Sabrás exactamente cómo crear contenido que te representa auténticamente, sin necesidad de cámaras, micrófonos o complejas habilidades de edición.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', background: 'rgba(74, 144, 226, 0.1)', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '20px', marginTop: '2px' }}>✅</span>
                      <span style={{ color: 'var(--theme-text)', fontSize: '16px', lineHeight: '1.5' }}>Comenzarás a ahorrar cientos de dólares en producción y desbloquearás una nueva fuente de ingresos digitales, utilizando una habilidad práctica y demandada.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Transformation Guarantee Card */}
              <div style={{
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                padding: '40px',
                borderRadius: '25px',
                textAlign: 'center',
                marginBottom: '40px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }} className="reveal reveal-up benefit-card">
                {/* Decorative elements */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%'
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
                  <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px', textTransform: 'uppercase' }}>
                    Tu Transformación Garantizada en 90 Minutos
                  </h3>
                  <p style={{ fontSize: '18px', fontWeight: '500', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
                    De sentirte abrumado por la IA y sin una ruta clara de monetización, a crear un avatar profesional que trabaja para ti y te abre puertas a nuevas oportunidades económicas, todo en una sola sesión práctica.
                  </p>
                </div>
              </div>

              {/* Final CTA Message */}
              {/* Modern CTA Card */}
              <div style={{
                background: 'linear-gradient(135deg, var(--theme-card-bg) 0%, var(--theme-surface) 100%)',
                padding: 'clamp(40px, 6vw, 60px)',
                borderRadius: '30px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid transparent',
              
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box',
                boxShadow: '0 25px 60px rgba(74, 144, 226, 0.15)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }} className="reveal reveal-up">

                {/* Elementos decorativos animados */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'linear-gradient(135deg, var(--primary)20, var(--secondary)20)',
                  borderRadius: '50%',
                  filter: 'blur(30px)',
                  animation: 'float 6s ease-in-out infinite',
                  zIndex: 0
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, var(--tertiary)25, var(--accent)25)',
                  borderRadius: '50%',
                  filter: 'blur(25px)',
                  animation: 'float 8s ease-in-out infinite reverse',
                  zIndex: 0
                }}></div>

                {/* Contenido principal */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Icono principal mejorado */}
                  <div style={{
                    display: 'inline-block',
                    position: 'relative',
                    marginBottom: 'clamp(20px, 4vw, 30px)'
                  }}>
                    <div style={{
                      width: 'clamp(80px, 12vw, 120px)',
                      height: 'clamp(80px, 12vw, 120px)',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'clamp(32px, 6vw, 48px)',
                      boxShadow: '0 15px 40px rgba(74, 144, 226, 0.3)',
                      position: 'relative'
                    }}>
                      {/* Anillos de pulso */}
                      <div style={{
                        position: 'absolute',
                        inset: '-8px',
                        borderRadius: '50%',
                        border: '3px solid var(--primary)',
                        opacity: '0.3',
                        animation: 'pulse 2s infinite'
                      }}></div>
                      <div style={{
                        position: 'absolute',
                        inset: '-16px',
                        borderRadius: '50%',
                        border: '2px solid var(--secondary)',
                        opacity: '0.2',
                        animation: 'pulse 2s infinite 0.5s'
                      }}></div>
                      🎯
                    </div>
                  </div>

                  {/* Título principal */}
                  <h3 style={{
                    fontSize: 'clamp(24px, 4.5vw, 36px)',
                    fontWeight: '900',
                    marginBottom: 'clamp(16px, 3vw, 24px)',
                    lineHeight: '1.2',
                    letterSpacing: '-0.02em'
                  }}>
                    <span style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textTransform: 'uppercase'
                    }}>
                      ESTO NO ES SOLO UN TALLER
                    </span>
                  </h3>

                  {/* Descripción mejorada */}
                  <p style={{
                    fontSize: 'clamp(18px, 3.2vw, 24px)',
                    fontWeight: '600',
                    color: 'var(--theme-text)',
                    lineHeight: '1.5',
                    margin: '0 auto',
                    maxWidth: '600px'
                  }}>
                    Es tu <span style={{
                      background: 'linear-gradient(135deg, var(--accent), var(--primary))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontWeight: '800'
                    }}>vía rápida</span> para adquirir una habilidad digital rentable y ponerte al frente en la nueva era del contenido.
                  </p>

                  {/* Elementos de valor agregado */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 'clamp(15px, 3vw, 25px)',
                    flexWrap: 'wrap',
                    marginTop: 'clamp(24px, 4vw, 32px)'
                  }}>
                    {[
                      { icon: '⚡', text: '90 Minutos' },
                      { icon: '💰', text: 'Rentable' },
                      { icon: '🚀', text: 'Inmediato' }
                    ].map((item, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, var(--primary)10, var(--secondary)10)',
                        padding: 'clamp(8px, 2vw, 12px) clamp(16px, 3vw, 20px)',
                        borderRadius: '25px',
                        border: '1px solid var(--theme-border)',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease'
                      }}>
                        <span style={{ fontSize: 'clamp(16px, 3vw, 20px)' }}>{item.icon}</span>
                        <span style={{
                          fontSize: 'clamp(12px, 2.5vw, 14px)',
                          fontWeight: '700',
                          color: 'var(--theme-text)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bonuses Section */}
        <section className="section section-themed" style={{
          backgroundColor: 'var(--theme-bg)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Background Elements */}
          <div style={{
            position: 'absolute',
            top: '5%',
            right: '-10%',
            width: '300px',
            height: '300px',
            background: 'linear-gradient(135deg, var(--accent)15, var(--primary)15)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            zIndex: 0
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '5%',
            left: '-10%',
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, var(--secondary)20, var(--accent)20)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            zIndex: 0
          }}></div>

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            {/* Enhanced Header */}
            <div style={{ textAlign: 'center', marginBottom: '60px' }} className="reveal reveal-up">
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, var(--accent), var(--primary))',
                padding: '12px 24px',
                borderRadius: '25px',
                marginBottom: '20px',
                color: 'white',
                fontWeight: '700',
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                🎁 Oferta Especial
              </div>

              <h2 style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: '800',
                color: 'var(--theme-text)',
                marginBottom: '20px',
                background: 'linear-gradient(135deg, var(--accent), var(--primary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Bonos Exclusivos si te Inscribes Hoy
              </h2>

              <p style={{
                textAlign: 'center',
                maxWidth: '800px',
                margin: '0 auto',
                color: 'var(--gray)',
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                fontWeight: '600',
                lineHeight: '1.5'
              }}>
                Accede a estos recursos exclusivos valorados en más de <span style={{ color: 'var(--accent)', fontWeight: '800' }}>$500</span>, totalmente <span style={{ color: 'var(--primary)', fontWeight: '800' }}>GRATIS</span> con tu acceso a la clase
              </p>
            </div>

            {/* Enhanced Bonuses Grid */}
            <div className="bonuses-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '40px',
              marginBottom: '60px'
            }}>
              {/* Bono 1 - Enhanced */}
              <div style={{
                background: 'linear-gradient(135deg, var(--theme-card-bg) 0%, var(--theme-surface) 100%)',
                borderRadius: '30px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: '3px solid transparent',
                backgroundImage: `
                  linear-gradient(var(--theme-card-bg), var(--theme-surface)),
                  linear-gradient(135deg, var(--accent), var(--primary))
                `,
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box',
                boxShadow: '0 25px 60px rgba(200, 162, 200, 0.15)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden'
              }} className="reveal reveal-left card-hover animate-shimmer bonus-card">

                {/* Precio destacado en la esquina */}
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                  color: 'white',
                  padding: '15px 20px',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
                  zIndex: 3,
                  transform: 'rotate(12deg)',
                  border: '3px solid white'
                }}>
                  <div style={{ fontSize: '14px', opacity: '0.9' }}>Valor</div>
                  <div style={{ fontSize: '24px', lineHeight: '1' }}>$197</div>
                </div>

                {/* Sección de imagen */}
                <div style={{
                  height: '200px',
                  background: 'linear-gradient(135deg, var(--accent)15, var(--primary)15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Imagen del bono */}
                  <img
                    src="./bonos/guionesIA.png"
                    alt="Guiones IA Listos para Usar"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.style.cssText = `
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(135deg, var(--accent)20, var(--primary)20);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 48px;
                        color: var(--accent);
                      `;
                      fallback.textContent = '✍️';
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />

                  {/* Overlay sutil para mejor legibilidad */}
                  <div style={{
                    position: 'absolute',
                    inset: '0',
                    background: 'linear-gradient(135deg, var(--accent)05, var(--primary)05)',
                    pointerEvents: 'none'
                  }}></div>
                </div>

                {/* Contenido */}
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    marginBottom: '15px',
                    color: 'var(--theme-text)',
                    lineHeight: '1.2'
                  }}>
                    Guiones IA Listos para Usar
                  </h3>

                  <p style={{
                    marginBottom: '25px',
                    color: 'var(--theme-text-secondary)',
                    fontSize: '16px',
                    lineHeight: '1.6'
                  }}>
                    Colección de guiones optimizados para avatares en diferentes nichos: marketing, educación, finanzas y más.
                  </p>

                  {/* Precio y ahorro destacado */}
                  <div style={{
                    background: 'linear-gradient(135deg, var(--accent)10, var(--primary)10)',
                    padding: '20px',
                    borderRadius: '20px',
                    border: '2px solid var(--accent)',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '15px',
                      marginBottom: '10px'
                    }}>
                      <span style={{
                        fontSize: '20px',
                        color: 'var(--theme-text-secondary)',
                        textDecoration: 'line-through',
                        fontWeight: '600'
                      }}>
                        $197
                      </span>
                      <span style={{
                        fontSize: '32px',
                        fontWeight: '900',
                        color: 'var(--accent)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        GRATIS
                      </span>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '15px',
                      fontSize: '14px',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      ¡Ahorras $197 HOY!
                    </div>
                  </div>
                </div>
              </div>

              {/* Bono 2 - Enhanced */}
              <div style={{
                background: 'linear-gradient(135deg, var(--theme-card-bg) 0%, var(--theme-surface) 100%)',
                borderRadius: '30px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: '3px solid transparent',
                backgroundImage: `
                  linear-gradient(var(--theme-card-bg), var(--theme-surface)),
                  linear-gradient(135deg, var(--primary), var(--secondary))
                `,
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box',
                boxShadow: '0 25px 60px rgba(74, 144, 226, 0.15)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden'
              }} className="reveal reveal-up card-hover animate-shimmer bonus-card">

                {/* Precio destacado en la esquina */}
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                  color: 'white',
                  padding: '15px 20px',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
                  zIndex: 3,
                  transform: 'rotate(12deg)',
                  border: '3px solid white'
                }}>
                  <div style={{ fontSize: '14px', opacity: '0.9' }}>Valor</div>
                  <div style={{ fontSize: '24px', lineHeight: '1' }}>$139</div>
                </div>

                {/* Sección de imagen */}
                <div style={{
                  height: '200px',
                  background: 'linear-gradient(135deg, var(--primary)15, var(--secondary)15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Imagen del bono */}
                  <img
                    src="./bonos/settings.png"
                    alt="Settings Perfectos para Cada Plataforma"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.style.cssText = `
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(135deg, var(--primary)20, var(--secondary)20);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 48px;
                        color: var(--primary);
                      `;
                      fallback.textContent = '🔧';
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />

                  {/* Overlay sutil para mejor legibilidad */}
                  <div style={{
                    position: 'absolute',
                    inset: '0',
                    background: 'linear-gradient(135deg, var(--primary)05, var(--secondary)05)',
                    pointerEvents: 'none'
                  }}></div>
                </div>

                {/* Contenido */}
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    marginBottom: '15px',
                    color: 'var(--theme-text)',
                    lineHeight: '1.2'
                  }}>
                    Settings Perfectos para Cada Plataforma
                  </h3>

                  <p style={{
                    marginBottom: '25px',
                    color: 'var(--theme-text-secondary)',
                    fontSize: '16px',
                    lineHeight: '1.6'
                  }}>
                    Configuraciones exactas de calidad, iluminación y audio para YouTube, Instagram, LinkedIn, TikTok y presentaciones corporativas.
                  </p>

                  {/* Precio y ahorro destacado */}
                  <div style={{
                    background: 'linear-gradient(135deg, var(--primary)10, var(--secondary)10)',
                    padding: '20px',
                    borderRadius: '20px',
                    border: '2px solid var(--primary)',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '15px',
                      marginBottom: '10px'
                    }}>
                      <span style={{
                        fontSize: '20px',
                        color: 'var(--theme-text-secondary)',
                        textDecoration: 'line-through',
                        fontWeight: '600'
                      }}>
                        $139
                      </span>
                      <span style={{
                        fontSize: '32px',
                        fontWeight: '900',
                        color: 'var(--primary)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        GRATIS
                      </span>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '15px',
                      fontSize: '14px',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      ¡Ahorras $139 HOY!
                    </div>
                  </div>
                </div>
              </div>

              {/* Bono 3 - Enhanced */}
              <div style={{
                background: 'linear-gradient(135deg, var(--theme-card-bg) 0%, var(--theme-surface) 100%)',
                borderRadius: '30px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: '3px solid transparent',
                backgroundImage: `
                  linear-gradient(var(--theme-card-bg), var(--theme-surface)),
                  linear-gradient(135deg, var(--secondary), var(--accent))
                `,
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box',
                boxShadow: '0 25px 60px rgba(228, 105, 148, 0.15)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden'
              }} className="reveal reveal-right card-hover animate-shimmer bonus-card">

                {/* Precio destacado en la esquina */}
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                  color: 'white',
                  padding: '15px 20px',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
                  zIndex: 3,
                  transform: 'rotate(12deg)',
                  border: '3px solid white'
                }}>
                  <div style={{ fontSize: '14px', opacity: '0.9' }}>Valor</div>
                  <div style={{ fontSize: '24px', lineHeight: '1' }}>$249</div>
                </div>

                {/* Sección de imagen */}
                <div style={{
                  height: '200px',
                  background: 'linear-gradient(135deg, var(--secondary)15, var(--accent)15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Imagen del bono */}
                  <img
                    src="./bonos/Flujo .png"
                    alt="Sistema para Automatizar tu Producción"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.style.cssText = `
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(135deg, var(--secondary)20, var(--accent)20);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 48px;
                        color: var(--secondary);
                      `;
                      fallback.textContent = '🔄';
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />

                  {/* Overlay sutil para mejor legibilidad */}
                  <div style={{
                    position: 'absolute',
                    inset: '0',
                    background: 'linear-gradient(135deg, var(--secondary)05, var(--accent)05)',
                    pointerEvents: 'none'
                  }}></div>
                </div>

                {/* Contenido */}
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    marginBottom: '15px',
                    color: 'var(--theme-text)',
                    lineHeight: '1.2'
                  }}>
                    Sistema para Automatizar tu Producción
                  </h3>

                  <p style={{
                    marginBottom: '25px',
                    color: 'var(--theme-text-secondary)',
                    fontSize: '16px',
                    lineHeight: '1.6'
                  }}>
                    Flujo de trabajo completo para crear y programar contenido con avatares en múltiples plataformas.
                  </p>

                  {/* Precio y ahorro destacado */}
                  <div style={{
                    background: 'linear-gradient(135deg, var(--secondary)10, var(--accent)10)',
                    padding: '20px',
                    borderRadius: '20px',
                    border: '2px solid var(--secondary)',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '15px',
                      marginBottom: '10px'
                    }}>
                      <span style={{
                        fontSize: '20px',
                        color: 'var(--theme-text-secondary)',
                        textDecoration: 'line-through',
                        fontWeight: '600'
                      }}>
                        $249
                      </span>
                      <span style={{
                        fontSize: '32px',
                        fontWeight: '900',
                        color: 'var(--secondary)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        GRATIS
                      </span>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '15px',
                      fontSize: '14px',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      ¡Ahorras $249 HOY!
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Total Value Section */}
            <div style={{
              background: 'linear-gradient(135deg, var(--theme-card-bg) 0%, var(--theme-surface) 100%)',
              borderRadius: '40px',
              position: 'relative',
              overflow: 'hidden',
              border: '4px solid transparent',
              backgroundImage: `
                linear-gradient(var(--theme-card-bg), var(--theme-surface)),
                linear-gradient(135deg, var(--accent), var(--primary), var(--secondary))
              `,
              backgroundOrigin: 'border-box',
              backgroundClip: 'content-box, border-box',
              boxShadow: '0 30px 80px rgba(74, 144, 226, 0.25)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} className="reveal reveal-up">

              {/* Elementos decorativos animados */}
              <div style={{
                position: 'absolute',
                top: '-20%',
                left: '-10%',
                width: '200px',
                height: '200px',
                background: 'linear-gradient(135deg, var(--primary)15, var(--secondary)15)',
                borderRadius: '50%',
                filter: 'blur(60px)',
                animation: 'float 8s ease-in-out infinite',
                zIndex: 0
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-20%',
                right: '-10%',
                width: '150px',
                height: '150px',
                background: 'linear-gradient(135deg, var(--accent)20, var(--tertiary)20)',
                borderRadius: '50%',
                filter: 'blur(40px)',
                animation: 'float 6s ease-in-out infinite reverse',
                zIndex: 0
              }}></div>

              {/* Layout principal con imagen */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'clamp(200px, 30%, 300px) 1fr',
                gap: 'clamp(20px, 4vw, 40px)',
                alignItems: 'center',
                padding: 'clamp(30px, 6vw, 50px)',
                position: 'relative',
                zIndex: 1
              }}>

                {/* Sección de imagen */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Contenedor de imagen con efectos */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '30px',
                    background: 'linear-gradient(135deg, var(--primary)20, var(--secondary)20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '3px solid var(--primary)',
                    boxShadow: '0 20px 40px rgba(74, 144, 226, 0.3)'
                  }}>
                    {/* Imagen de valor de los bonos */}
                    <img
                      src="./bonos/free.png"
                      alt="Valor Total de los Bonos - GRATIS"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '27px',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        filter: 'brightness(1.05) contrast(1.1)'
                      }}
                      onError={(e) => {
                        // Fallback si la imagen no carga
                        e.target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.style.cssText = `
                          width: 100%;
                          height: 100%;
                          background: linear-gradient(135deg, var(--primary)25, var(--secondary)25);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          flex-direction: column;
                          gap: 10px;
                          border-radius: 27px;
                        `;
                        const icon = document.createElement('span');
                        icon.style.fontSize = 'clamp(32px, 6vw, 48px)';
                        icon.textContent = '💎';
                        const text = document.createElement('span');
                        text.style.cssText = `
                          font-size: clamp(10px, 2vw, 12px);
                          font-weight: 600;
                          color: var(--primary);
                          text-align: center;
                        `;
                        text.textContent = 'Valor GRATIS';
                        fallback.appendChild(icon);
                        fallback.appendChild(text);
                        e.target.parentNode.appendChild(fallback);
                      }}
                    />

                    {/* Overlay sutil para mejor integración */}
                    <div style={{
                      position: 'absolute',
                      inset: '0',
                      background: 'linear-gradient(135deg, var(--primary)03, var(--secondary)03)',
                      borderRadius: '27px',
                      pointerEvents: 'none'
                    }}></div>

                    {/* Anillos de pulso */}
                    <div style={{
                      position: 'absolute',
                      inset: '-8px',
                      borderRadius: '35px',
                      border: '2px solid var(--primary)',
                      opacity: '0.4',
                      animation: 'pulse 3s infinite'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      inset: '-16px',
                      borderRadius: '40px',
                      border: '1px solid var(--secondary)',
                      opacity: '0.3',
                      animation: 'pulse 3s infinite 1s'
                    }}></div>
                  </div>
                </div>

                {/* Contenido de texto */}
                <div style={{ textAlign: 'left' }}>
                  {/* Badge superior */}
                  <div style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, var(--accent), var(--primary))',
                    color: 'white',
                    padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
                    borderRadius: '25px',
                    fontSize: 'clamp(12px, 2.5vw, 16px)',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 'clamp(16px, 3vw, 24px)',
                    boxShadow: '0 8px 25px rgba(200, 162, 200, 0.4)'
                  }}>
                    🎁 Valor Exclusivo
                  </div>

                  {/* Título principal */}
                  <h3 style={{
                    fontSize: 'clamp(20px, 4vw, 32px)',
                    fontWeight: '900',
                    color: 'var(--theme-text)',
                    marginBottom: 'clamp(12px, 2vw, 16px)',
                    lineHeight: '1.2'
                  }}>
                    Valor Total de los Bonos:
                  </h3>

                  {/* Precio destacado */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(12px, 3vw, 20px)',
                    marginBottom: 'clamp(20px, 4vw, 30px)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      fontSize: 'clamp(28px, 6vw, 48px)',
                      fontWeight: '900',
                      color: 'var(--theme-text-secondary)',
                      textDecoration: 'line-through',
                      opacity: '0.6'
                    }}>
                      $585
                    </span>
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      padding: 'clamp(8px, 2vw, 12px) clamp(16px, 3vw, 20px)',
                      borderRadius: '20px',
                      fontSize: 'clamp(16px, 3vw, 24px)',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                    }}>
                      ¡Ahorras $585!
                    </div>
                  </div>

                  {/* CTA final */}
                  <div style={{
                    background: 'linear-gradient(135deg, var(--primary)10, var(--secondary)10)',
                    padding: 'clamp(16px, 3vw, 24px)',
                    borderRadius: '25px',
                    border: '2px solid var(--primary)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <p style={{
                      fontSize: 'clamp(16px, 3vw, 22px)',
                      fontWeight: '800',
                      margin: '0',
                      color: 'var(--theme-text)',
                      textAlign: 'center'
                    }}>
                      🎉 Hoy: <span style={{
                        fontSize: 'clamp(20px, 4vw, 28px)',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>GRATIS</span> con tu acceso
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsive: Layout vertical en móviles */}
              <style jsx>{`
                @media (max-width: 768px) {
                  div[style*="gridTemplateColumns"] {
                    grid-template-columns: 1fr !important;
                    text-align: center !important;
                  }
                }
              `}</style>
            </div>
          </div>
        </section>

        {/* Guarantee Section - Completamente Responsiva */}
        <section className="guarantee-section" style={{
          backgroundColor: 'var(--theme-surface)',
          padding: 'clamp(40px, 8vw, 80px) 0'
        }}>
          <div className="container">
            {/* Header de la sección */}
            <div style={{
              textAlign: 'center',
              marginBottom: 'clamp(30px, 6vw, 50px)'
            }}>
              <div style={{
                display: 'inline-block',
                background: '#10b981',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '20px'
              }}>
                🛡️ GARANTÍA TOTAL
              </div>
              <h2 style={{
                fontSize: 'clamp(24px, 6vw, 42px)',
                fontWeight: '800',
                color: 'var(--theme-text)',
                marginBottom: '16px',
                lineHeight: '1.2'
              }}>
                Si no aprendes, <span style={{ color: '#10b981' }}>te reembolsamos</span>
              </h2>
              <p style={{
                fontSize: 'clamp(14px, 3vw, 18px)',
                color: 'var(--theme-text-secondary)',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.6'
              }}>
                Estamos tan seguros de que transformarás tu negocio que te ofrecemos una garantía completa de 30 días.
              </p>
            </div>

            {/* Contenido principal - Diseño moderno y responsivo */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(30px, 6vw, 50px)',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>

              {/* Imagen central de garantía */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 'clamp(20px, 4vw, 30px)'
              }}>
                <div style={{
                  width: 'clamp(200px, 40vw, 300px)',
                  height: 'clamp(200px, 40vw, 300px)',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b98120, var(--primary)20)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid #10b981',
                  boxShadow: '0 20px 40px rgba(16, 185, 129, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <img 
                    src="./bonos/30-dias.png"
                    alt="Garantía de 30 días"
                    style={{
                      width: '90%',
                      height: '90%',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.style.cssText = `
                        text-align: center;
                      `;
                      const icon = document.createElement('div');
                      icon.style.cssText = `
                        font-size: clamp(40px, 8vw, 80px);
                        margin-bottom: 10px;
                      `;
                      icon.textContent = '🛡️';
                      const text = document.createElement('div');
                      text.style.cssText = `
                        font-size: clamp(14px, 3vw, 18px);
                        font-weight: 700;
                        color: #10b981;
                      `;
                      text.textContent = '30 DÍAS';
                      fallback.appendChild(icon);
                      fallback.appendChild(text);
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                </div>
              </div>

              {/* Grid de características responsivo */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'clamp(20px, 4vw, 30px)',
                marginBottom: 'clamp(30px, 6vw, 40px)'
              }}>

                {/* Sin Riesgo */}
                <div style={{
                  background: 'var(--theme-card-bg)',
                  padding: 'clamp(20px, 4vw, 30px)',
                  borderRadius: '16px',
                  border: '2px solid #10b981',
                  textAlign: 'center',
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.1)'
                }}>
                  <div style={{ fontSize: 'clamp(32px, 6vw, 48px)', marginBottom: '16px' }}>✅</div>
                  <h3 style={{
                    fontSize: 'clamp(16px, 3vw, 20px)',
                    fontWeight: '700',
                    marginBottom: '12px',
                    color: '#10b981'
                  }}>
                    Sin Riesgo
                  </h3>
                  <p style={{
                    fontSize: 'clamp(14px, 2.5vw, 16px)',
                    color: 'var(--theme-text-secondary)',
                    margin: '0',
                    lineHeight: '1.5'
                  }}>
                    Tu inversión está 100% protegida. Si no estás satisfecho, te devolvemos tu dinero.
                  </p>
                </div>

                {/* Proceso Rápido */}
                <div style={{
                  background: 'var(--theme-card-bg)',
                  padding: 'clamp(20px, 4vw, 30px)',
                  borderRadius: '16px',
                  border: '2px solid var(--primary)',
                  textAlign: 'center',
                  boxShadow: '0 8px 25px rgba(74, 144, 226, 0.1)'
                }}>
                  <div style={{ fontSize: 'clamp(32px, 6vw, 48px)', marginBottom: '16px' }}>⚡</div>
                  <h3 style={{
                    fontSize: 'clamp(16px, 3vw, 20px)',
                    fontWeight: '700',
                    marginBottom: '12px',
                    color: 'var(--primary)'
                  }}>
                    Proceso Rápido
                  </h3>
                  <p style={{
                    fontSize: 'clamp(14px, 2.5vw, 16px)',
                    color: 'var(--theme-text-secondary)',
                    margin: '0',
                    lineHeight: '1.5'
                  }}>
                    Reembolso procesado en 24-48 horas. Sin complicaciones ni demoras.
                  </p>
                </div>

                {/* Sin Preguntas */}
                <div style={{
                  background: 'var(--theme-card-bg)',
                  padding: 'clamp(20px, 4vw, 30px)',
                  borderRadius: '16px',
                  border: '2px solid var(--secondary)',
                  textAlign: 'center',
                  boxShadow: '0 8px 25px rgba(228, 105, 148, 0.1)'
                }}>
                  <div style={{ fontSize: 'clamp(32px, 6vw, 48px)', marginBottom: '16px' }}>🤝</div>
                  <h3 style={{
                    fontSize: 'clamp(16px, 3vw, 20px)',
                    fontWeight: '700',
                    marginBottom: '12px',
                    color: 'var(--secondary)'
                  }}>
                    Sin Preguntas
                  </h3>
                  <p style={{
                    fontSize: 'clamp(14px, 2.5vw, 16px)',
                    color: 'var(--theme-text-secondary)',
                    margin: '0',
                    lineHeight: '1.5'
                  }}>
                    Proceso simple y directo. Solo necesitas solicitar el reembolso.
                  </p>
                </div>
              </div>

              {/* CTA final */}
              <div style={{
                textAlign: 'center'
              }}>
                <div style={{
                  background: '#10b981',
                  color: 'white',
                  padding: 'clamp(20px, 4vw, 30px)',
                  borderRadius: '20px',
                  maxWidth: '600px',
                  margin: '0 auto',
                  boxShadow: '0 12px 30px rgba(16, 185, 129, 0.3)'
                }}>
                  <p style={{
                    fontSize: 'clamp(16px, 3.5vw, 22px)',
                    fontWeight: '700',
                    margin: '0',
                    letterSpacing: '0.5px'
                  }}>
                    🛡️ Garantía de 30 días - Sin riesgo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* CTA Section */}
        <section id="cta" className="section section-themed" style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <div className="reveal reveal-up" style={{
                marginBottom: 'clamp(30px, 6vw, 50px)',
                position: 'relative'
              }}>
                {/* Decoración de fondo */}
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(255, 59, 48, 0.15) 0%, transparent 70%)',
                  borderRadius: '50%',
                  zIndex: '0'
                }}></div>
                
                {/* Icono de fuego con animación */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF3B30, #FF9500)',
                  boxShadow: '0 10px 25px rgba(255, 59, 48, 0.3)',
                  marginBottom: '20px',
                  position: 'relative',
                  animation: 'pulse 2s infinite'
                }}>
                  <span style={{ fontSize: '30px' }}>🔥</span>
                </div>
                
                <h2 style={{ 
                  fontSize: 'clamp(24px, 5vw, 38px)', 
                  fontWeight: '900', 
                  marginBottom: '15px',
                  background: 'linear-gradient(135deg, #FF3B30, #FF9500)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  lineHeight: '1.2',
                  textShadow: '0 2px 10px rgba(255, 59, 48, 0.1)',
                  position: 'relative',
                  zIndex: '1',
                  padding: '0 clamp(10px, 3vw, 30px)'
                }}>
                  LANZA TU PRIMER AVATAR RENTABLE CON IA
                </h2>
                
                <div style={{
                  fontSize: 'clamp(18px, 3vw, 22px)',
                  fontWeight: '700',
                  color: 'var(--theme-text)',
                  marginBottom: '10px',
                  position: 'relative',
                  zIndex: '1'
                }}>
                  Y EMPIEZA A <span style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: '800'
                  }}>MONETIZAR HOY MISMO</span>
                </div>
                
                {/* Línea decorativa */}
                <div style={{
                  width: '120px',
                  height: '4px',
                  background: 'linear-gradient(90deg, #FF3B30, #FF9500)',
                  margin: '20px auto 0',
                  borderRadius: '2px'
                }}></div>
              </div>

              <div id="en-solo-90-minutos" style={{
                backgroundColor: 'var(--theme-card-bg)',
                border: '2px solid transparent',
                backgroundImage: `
                  linear-gradient(var(--theme-card-bg), var(--theme-card-bg)), 
                  linear-gradient(135deg, var(--primary)40, var(--accent)40)
                `,
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box',
                padding: 'clamp(25px, 5vw, 40px)',
                borderRadius: '20px',
                margin: '0 auto 40px',
                maxWidth: '700px',
                boxShadow: '0 20px 40px var(--theme-shadow), 0 10px 20px rgba(74, 144, 226, 0.08)',
                position: 'relative',
                overflow: 'hidden',
                transform: 'translateY(20px)',
                opacity: '0',
                animation: 'fadeInUp 0.8s ease-out forwards'
              }} className="reveal reveal-up delay-200">
                {/* Elementos decorativos de fondo */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'radial-gradient(circle, rgba(74, 144, 226, 0.08) 0%, transparent 70%)',
                  borderRadius: '50%',
                  zIndex: '0'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(circle, rgba(228, 105, 148, 0.08) 0%, transparent 70%)',
                  borderRadius: '50%',
                  zIndex: '0'
                }}></div>
                
                {/* Contenido con posición relativa para estar por encima de los elementos decorativos */}
                <div style={{ position: 'relative', zIndex: '1' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '25px'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 10px 25px rgba(74, 144, 226, 0.25)',
                      marginRight: '15px'
                    }}>
                      <span style={{ fontSize: '28px', color: 'white' }}>⏱️</span>
                    </div>
                    <p style={{ 
                      textAlign: 'left', 
                      fontSize: 'clamp(18px, 3vw, 22px)', 
                      fontWeight: '800', 
                      color: 'var(--theme-text)',
                      margin: '0',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      EN SOLO 90 MINUTOS
                    </p>
                  </div>
                  
                  <p style={{ 
                    textAlign: 'center', 
                    marginBottom: '25px', 
                    fontSize: 'clamp(16px, 2.5vw, 20px)', 
                    fontWeight: '700', 
                    color: 'var(--theme-text)'
                  }}>
                    TENDRÁS TODO LO NECESARIO PARA:
                  </p>
                  
                  <ul style={{ 
                    textAlign: 'left', 
                    maxWidth: '600px', 
                    margin: '0 auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    padding: '0'
                  }}>
                    <li style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '15px',
                      padding: '12px 15px',
                      borderRadius: '12px',
                      background: 'rgba(74, 144, 226, 0.05)',
                      transition: 'all 0.3s ease',
                      border: '1px solid rgba(74, 144, 226, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(74, 144, 226, 0.1)';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(74, 144, 226, 0.05)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}>
                      <span style={{ 
                        color: 'var(--accent)', 
                        fontWeight: '700', 
                        fontSize: '22px',
                        flexShrink: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '30px',
                        height: '30px',
                        background: 'rgba(228, 105, 148, 0.1)',
                        borderRadius: '50%'
                      }}>✅</span>
                      <span style={{ 
                        fontSize: 'clamp(16px, 2.5vw, 18px)', 
                        lineHeight: '1.5', 
                        color: 'var(--theme-text)'
                      }}>
                        Crear tu avatar profesional con IA, listo para captar la atención.
                      </span>
                    </li>
                    <li style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '15px',
                      padding: '12px 15px',
                      borderRadius: '12px',
                      background: 'rgba(74, 144, 226, 0.05)',
                      transition: 'all 0.3s ease',
                      border: '1px solid rgba(74, 144, 226, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(74, 144, 226, 0.1)';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(74, 144, 226, 0.05)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}>
                      <span style={{ 
                        color: 'var(--accent)', 
                        fontWeight: '700', 
                        fontSize: '22px',
                        flexShrink: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '30px',
                        height: '30px',
                        background: 'rgba(228, 105, 148, 0.1)',
                        borderRadius: '50%'
                      }}>✅</span>
                      <span style={{ 
                        fontSize: 'clamp(16px, 2.5vw, 18px)', 
                        lineHeight: '1.5', 
                        color: 'var(--theme-text)'
                      }}>
                        Dominar estrategias claras para monetizarlo desde el primer día.
                      </span>
                    </li>
                    <li style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '15px',
                      padding: '12px 15px',
                      borderRadius: '12px',
                      background: 'rgba(74, 144, 226, 0.05)',
                      transition: 'all 0.3s ease',
                      border: '1px solid rgba(74, 144, 226, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(74, 144, 226, 0.1)';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(74, 144, 226, 0.05)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}>
                      <span style={{ 
                        color: 'var(--accent)', 
                        fontWeight: '700', 
                        fontSize: '22px',
                        flexShrink: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '30px',
                        height: '30px',
                        background: 'rgba(228, 105, 148, 0.1)',
                        borderRadius: '50%'
                      }}>✅</span>
                      <span style={{ 
                        fontSize: 'clamp(16px, 2.5vw, 18px)', 
                        lineHeight: '1.5', 
                        color: 'var(--theme-text)'
                      }}>
                        Posicionarte y destacar con una herramienta innovadora en el mercado digital.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div style={{ 
                fontSize: '18px', 
                marginBottom: '30px', 
                lineHeight: '1.6', 
                color: 'var(--theme-text)',
                background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.05) 0%, rgba(228, 105, 148, 0.05) 100%)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: 'clamp(20px, 4vw, 30px)',
                border: '1px solid rgba(74, 144, 226, 0.1)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                overflow: 'hidden'
              }} className="reveal reveal-up">
                {/* Elemento decorativo */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(circle, rgba(228, 105, 148, 0.1) 0%, transparent 70%)',
                  borderRadius: '50%',
                  zIndex: '0'
                }}></div>
                
                <div style={{ position: 'relative', zIndex: '1' }}>
                  <p style={{ 
                    marginBottom: '16px',
                    display: 'inline-block',
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, rgba(228, 105, 148, 0.2) 0%, rgba(74, 144, 226, 0.2) 100%)',
                    borderRadius: '30px',
                    fontWeight: '700',
                    fontSize: 'clamp(16px, 2.5vw, 18px)',
                    color: 'var(--accent)',
                    boxShadow: '0 4px 12px rgba(228, 105, 148, 0.1)'
                  }}>
                    💸 Oferta Exclusiva por Tiempo Limitado
                  </p>
                  
                  <div style={{ 
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      marginBottom: '10px'
                    }}>
                      <span style={{ 
                        textDecoration: 'line-through', 
                        color: 'var(--theme-text-secondary)',
                        fontSize: 'clamp(18px, 3vw, 22px)',
                        fontWeight: '500',
                        opacity: '0.7'
                      }}>$100 USD</span>
                      
                      <div style={{
                        width: '40px',
                        height: '2px',
                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                        transform: 'rotate(-10deg)'
                      }}></div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ 
                          fontSize: 'clamp(28px, 5vw, 36px)', 
                          fontWeight: '800', 
                          color: 'var(--accent)',
                          textShadow: '0 2px 10px rgba(228, 105, 148, 0.2)'
                        }}>$30 USD</span>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 14px',
                      background: 'linear-gradient(135deg, var(--accent) 0%, var(--secondary) 100%)',
                      color: 'white',
                      borderRadius: '30px',
                      fontWeight: '700',
                      fontSize: 'clamp(14px, 2vw, 16px)',
                      boxShadow: '0 4px 15px rgba(228, 105, 148, 0.2)',
                      animation: 'pulse 2s infinite'
                    }}>
                      ¡Ahorra 70% Hoy!
                    </div>
                  </div>
                  
                  <p style={{ 
                    marginBottom: '20px',
                    padding: '12px 16px',
                    borderLeft: '3px solid var(--primary)',
                    background: 'rgba(74, 144, 226, 0.05)',
                    borderRadius: '0 8px 8px 0',
                    fontSize: 'clamp(16px, 2.5vw, 18px)'
                  }}>
                    🎁 Incluye <strong>3 Bonos de Acción Rápida</strong> (valorados en $50 USD) + Nuestra <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Garantía Total de Satisfacción</span>.
                  </p>
                  
                  <p style={{ 
                    fontSize: 'clamp(18px, 3vw, 22px)', 
                    fontWeight: '700', 
                    color: 'var(--accent)',
                    textAlign: 'center',
                    padding: '10px',
                    background: 'linear-gradient(135deg, rgba(228, 105, 148, 0.1) 0%, rgba(74, 144, 226, 0.1) 100%)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(228, 105, 148, 0.3)'
                  }}>
                    👉 ¡Asegura Tu Cupo y Empieza a Generar Ingresos con IA!
                  </p>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '40px',
                position: 'relative'
              }} className="reveal reveal-up delay-300">
                {/* Etiqueta de urgencia */}
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #FF3B30, #FF9500)',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '30px',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '0 4px 15px rgba(255, 59, 48, 0.3)',
                  zIndex: '10',
                  whiteSpace: 'nowrap'
                }}>
                  ¡OFERTA POR TIEMPO LIMITADO!
                </div>
                
                <div className="countdown-grid" style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(15px)',
                  padding: 'clamp(20px, 4vw, 30px) clamp(15px, 3vw, 25px)',
                  borderRadius: '20px',
                  boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div className="countdown-item animate-scaleIn delay-400">
                    <div className="countdown-box animate-pulse-highlight" style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.4)', 
                      border: '2px solid var(--primary)',
                      boxShadow: '0 8px 25px rgba(74, 144, 226, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                    }}>
                      <span className="countdown-value" style={{ 
                        color: 'white',
                        textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
                      }}>{timeLeft.days.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="countdown-label" style={{ 
                      color: 'white',
                      fontWeight: '600',
                      fontSize: 'clamp(14px, 2vw, 16px)',
                      textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
                    }}>Días</span>
                  </div>
                  <div className="countdown-item animate-scaleIn delay-500">
                    <div className="countdown-box animate-pulse-highlight" style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.4)', 
                      border: '2px solid var(--secondary)',
                      boxShadow: '0 8px 25px rgba(228, 105, 148, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                    }}>
                      <span className="countdown-value" style={{ 
                        color: 'white',
                        textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
                      }}>{timeLeft.hours.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="countdown-label" style={{ 
                      color: 'white',
                      fontWeight: '600',
                      fontSize: 'clamp(14px, 2vw, 16px)',
                      textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
                    }}>Horas</span>
                  </div>
                  <div className="countdown-item animate-scaleIn delay-600">
                    <div className="countdown-box animate-pulse-highlight" style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.4)', 
                      border: '2px solid var(--tertiary)',
                      boxShadow: '0 8px 25px rgba(154, 218, 251, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                    }}>
                      <span className="countdown-value" style={{ 
                        color: 'white',
                        textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
                      }}>{timeLeft.minutes.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="countdown-label" style={{ 
                      color: 'white',
                      fontWeight: '600',
                      fontSize: 'clamp(14px, 2vw, 16px)',
                      textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
                    }}>Minutos</span>
                  </div>
                  <div className="countdown-item animate-scaleIn delay-700">
                    <div className="countdown-box animate-pulse-highlight" style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.4)', 
                      border: '2px solid var(--accent)',
                      boxShadow: '0 8px 25px rgba(200, 162, 200, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                    }}>
                      <span className="countdown-value" style={{ 
                        color: 'white',
                        textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
                      }}>{timeLeft.seconds.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="countdown-label" style={{ 
                      color: 'white',
                      fontWeight: '600',
                      fontSize: 'clamp(14px, 2vw, 16px)',
                      textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
                    }}>Segundos</span>
                  </div>
                </div>
              </div>

              {/* Ultra-Modern Premium Form */}
              <div id="lead-form" style={{
                maxWidth: '100%',
                width: 'min(800px, 100%)',
                margin: 'clamp(32px, 6vw, 60px) auto 0',
                background: 'var(--theme-form-bg)',
                backdropFilter: 'blur(40px) saturate(180%)',
                padding: 'clamp(32px, 6vw, 60px) clamp(24px, 5vw, 50px)',
                borderRadius: 'clamp(24px, 4vw, 40px)',
                boxShadow: `
                  0 32px 80px var(--theme-shadow),
                  0 8px 32px rgba(74, 144, 226, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1)
                `,
                color: 'var(--theme-form-text)',
                border: '2px solid var(--theme-border)',
                position: 'relative',
                overflow: 'hidden'
              }} className="reveal reveal-up delay-400">

                {/* Theme-Aware Animated Background */}
                <div style={{
                  position: 'absolute',
                  inset: '0',
                  background: `
                    radial-gradient(ellipse at 70% 20%, var(--primary)08 0%, transparent 50%),
                    radial-gradient(ellipse at 20% 80%, var(--secondary)08 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 80%, var(--tertiary)06 0%, transparent 50%)
                  `,
                  animation: 'gradientShift 12s ease-in-out infinite',
                  zIndex: 0,
                  opacity: 'var(--theme-bg) === "#1A202C" ? 0.3 : 0.6'
                }}></div>

                {/* Theme-Aware Floating Elements */}
                <div style={{
                  position: 'absolute',
                  top: '8%',
                  right: '8%',
                  width: 'clamp(24px, 5vw, 48px)',
                  height: 'clamp(24px, 5vw, 48px)',
                  background: 'linear-gradient(135deg, var(--primary)20, var(--secondary)20)',
                  borderRadius: '50%',
                  filter: 'blur(1px)',
                  animation: 'float 8s ease-in-out infinite',
                  zIndex: 0,
                  opacity: '0.4'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '12%',
                  left: '6%',
                  width: 'clamp(16px, 3vw, 32px)',
                  height: 'clamp(16px, 3vw, 32px)',
                  background: 'linear-gradient(45deg, var(--tertiary)30, var(--primary)30)',
                  borderRadius: '30%',
                  transform: 'rotate(45deg)',
                  animation: 'float 10s ease-in-out infinite reverse',
                  zIndex: 0,
                  opacity: '0.3'
                }}></div>
                <div style={{
                  position: 'absolute',
                  top: '60%',
                  right: '3%',
                  width: 'clamp(12px, 2.5vw, 24px)',
                  height: 'clamp(12px, 2.5vw, 24px)',
                  background: 'linear-gradient(135deg, var(--secondary)30, var(--tertiary)30)',
                  borderRadius: '50%',
                  animation: 'float 6s ease-in-out infinite',
                  zIndex: 0,
                  opacity: '0.25'
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  {!formSubmitted ? (
                    <>
                      {/* Premium Form Header */}
                      <div style={{
                        textAlign: 'center',
                        marginBottom: 'clamp(32px, 6vw, 50px)',
                        position: 'relative'
                      }}>
                        {/* Premium Icon Container */}
                        <div style={{
                          position: 'relative',
                          display: 'inline-block',
                          marginBottom: 'clamp(20px, 4vw, 32px)'
                        }}>
                          {/* Theme-Aware Outer glow ring */}
                          <div style={{
                            position: 'absolute',
                            inset: '-12px',
                            borderRadius: '50%',
                            background: `conic-gradient(from 0deg, var(--primary)30, var(--secondary)30, var(--tertiary)30, var(--primary)30)`,
                            filter: 'blur(8px)',
                            opacity: '0.4',
                            animation: 'spin 20s linear infinite'
                          }}></div>

                          {/* Theme-Aware Main icon container */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 'clamp(80px, 15vw, 120px)',
                            height: 'clamp(80px, 15vw, 120px)',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--tertiary) 100%)`,
                            position: 'relative',
                            boxShadow: `
                              0 20px 60px var(--theme-shadow),
                              0 8px 32px rgba(74, 144, 226, 0.2),
                              inset 0 2px 0 rgba(255, 255, 255, 0.2)
                            `
                          }}>
                            {/* Theme-Aware Inner pulse rings */}
                            <div style={{
                              position: 'absolute',
                              inset: '-6px',
                              borderRadius: '50%',
                              border: '3px solid var(--primary)',
                              opacity: '0.3',
                              animation: 'pulse 3s infinite'
                            }}></div>
                            <div style={{
                              position: 'absolute',
                              inset: '-12px',
                              borderRadius: '50%',
                              border: '2px solid var(--secondary)',
                              opacity: '0.15',
                              animation: 'pulse 3s infinite 0.5s'
                            }}></div>

                            {/* Icon */}
                            <span style={{
                              fontSize: 'clamp(32px, 7vw, 56px)',
                              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                              position: 'relative',
                              zIndex: 1
                            }}>🚀</span>
                          </div>
                        </div>

                        {/* Premium Title */}
                        <div style={{ marginBottom: 'clamp(16px, 3vw, 24px)' }}>
                          <h3 style={{
                            fontSize: 'clamp(24px, 5.5vw, 42px)',
                            marginBottom: 'clamp(8px, 2vw, 16px)',
                            textAlign: 'center',
                            fontWeight: '900',
                            color: 'var(--theme-form-text)',
                            lineHeight: '1.1',
                            letterSpacing: '-0.02em',
                            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            ¿Listo para dar el salto digital
                          </h3>
                          <h3 style={{
                            fontSize: 'clamp(20px, 4.5vw, 36px)',
                            background: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--tertiary) 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontWeight: '800',
                            margin: '0',
                            lineHeight: '1.2',
                            letterSpacing: '-0.01em',
                            animation: 'gradientShift 8s ease-in-out infinite'
                          }}>
                            más importante de tu vida?
                          </h3>
                        </div>

                        {/* Enhanced Description */}
                        <p style={{
                          textAlign: 'center',
                          marginBottom: 'clamp(20px, 4vw, 32px)',
                          color: 'var(--theme-text-secondary)',
                          fontSize: 'clamp(15px, 3.2vw, 20px)',
                          lineHeight: '1.6',
                          maxWidth: '600px',
                          margin: '0 auto clamp(20px, 4vw, 32px)',
                          fontWeight: '500'
                        }}>
                          Completa tus datos para recibir información exclusiva sobre el curso.
                          <span style={{
                            color: 'var(--theme-text)',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}>
                            El futuro empieza hoy.
                          </span>
                        </p>

                        {/* Premium Info Badges */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 'clamp(12px, 3vw, 20px)',
                          flexWrap: 'wrap',
                          marginBottom: 'clamp(24px, 5vw, 40px)'
                        }}>
                          {[
                            { icon: '📩', text: 'Información Exclusiva', color: 'var(--primary)' },
                            { icon: '⚡', text: 'Acceso Inmediato', color: 'var(--secondary)' },
                            { icon: '🎯', text: 'Resultados Garantizados', color: 'var(--tertiary)' }
                          ].map((badge, index) => (
                            <div key={index} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 'clamp(6px, 1.5vw, 10px)',
                              background: `linear-gradient(135deg, ${badge.color}15, ${badge.color}08)`,
                              padding: 'clamp(8px, 2vw, 12px) clamp(12px, 2.5vw, 18px)',
                              borderRadius: '50px',
                              border: `1px solid ${badge.color}25`,
                              backdropFilter: 'blur(10px)',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              cursor: 'default'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px) scale(1.05)';
                              e.target.style.boxShadow = `0 8px 25px ${badge.color}20`;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0) scale(1)';
                              e.target.style.boxShadow = 'none';
                            }}
                            >
                              <span style={{ fontSize: 'clamp(14px, 2.8vw, 18px)' }}>{badge.icon}</span>
                              <span style={{
                                fontSize: 'clamp(11px, 2.2vw, 14px)',
                                color: 'var(--theme-text)',
                                fontWeight: '700',
                                letterSpacing: '0.5px'
                              }}>
                                {badge.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Premium Responsive Form */}
                      <form onSubmit={handleSubmit} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'clamp(20px, 4vw, 32px)',
                        width: '100%'
                      }}>
                        {/* Premium Name Field */}
                        <div style={{ position: 'relative' }}>
                          <label htmlFor="name" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'clamp(8px, 2vw, 12px)',
                            marginBottom: 'clamp(8px, 2vw, 12px)',
                            fontWeight: '800',
                            color: 'var(--theme-form-text)',
                            fontSize: 'clamp(14px, 2.8vw, 18px)',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                          }}>
                            <div style={{
                              width: 'clamp(24px, 5vw, 32px)',
                              height: 'clamp(24px, 5vw, 32px)',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 'clamp(12px, 2.5vw, 16px)',
                              boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)'
                            }}>
                              👤
                            </div>
                            Nombre completo
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              placeholder="Escribe tu nombre completo"
                              maxLength={50}
                              style={{
                                width: '100%',
                                padding: 'clamp(16px, 3vw, 20px) clamp(20px, 4vw, 24px)',
                                borderRadius: 'clamp(12px, 2.5vw, 16px)',
                                border: formErrors.name
                                  ? '3px solid #ef4444'
                                  : '3px solid rgba(255, 255, 255, 0.1)',
                                fontSize: 'clamp(15px, 3.2vw, 18px)',
                                background: `
                                  linear-gradient(135deg,
                                    rgba(255, 255, 255, 0.08) 0%,
                                    rgba(255, 255, 255, 0.03) 100%
                                  )
                                `,
                                backdropFilter: 'blur(20px)',
                                color: 'var(--theme-text)',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                outline: 'none',
                                fontFamily: 'inherit',
                                fontWeight: '600',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                              }}
                              onFocus={(e) => {
                                e.target.style.border = '3px solid var(--primary)';
                                e.target.style.boxShadow = '0 0 0 6px rgba(74, 144, 226, 0.15), 0 12px 40px rgba(0, 0, 0, 0.15)';
                                e.target.style.background = `
                                  linear-gradient(135deg,
                                    rgba(255, 255, 255, 0.12) 0%,
                                    rgba(255, 255, 255, 0.06) 100%
                                  )
                                `;
                                e.target.style.transform = 'translateY(-2px)';
                              }}
                              onBlur={(e) => {
                                e.target.style.border = formErrors.name
                                  ? '3px solid #ef4444'
                                  : '3px solid rgba(255, 255, 255, 0.1)';
                                e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                                e.target.style.background = `
                                  linear-gradient(135deg,
                                    rgba(255, 255, 255, 0.08) 0%,
                                    rgba(255, 255, 255, 0.03) 100%
                                  )
                                `;
                                e.target.style.transform = 'translateY(0)';
                              }}
                            />
                            {/* Enhanced Success indicator */}
                            {formData.name && !formErrors.name && (
                              <div style={{
                                position: 'absolute',
                                right: 'clamp(16px, 3vw, 20px)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 'clamp(24px, 5vw, 32px)',
                                height: 'clamp(24px, 5vw, 32px)',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 'clamp(12px, 2.5vw, 16px)',
                                fontWeight: '800',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                                animation: 'successPop 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                          {formErrors.name && (
                            <div style={{
                              marginTop: 'clamp(4px, 1vw, 8px)',
                              padding: 'clamp(6px, 1.5vw, 10px) clamp(10px, 2vw, 14px)',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: 'clamp(6px, 1.5vw, 8px)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span style={{ color: '#ef4444', fontSize: 'clamp(14px, 2.5vw, 16px)' }}>⚠️</span>
                              <p style={{
                                color: '#ef4444',
                                fontSize: 'clamp(12px, 2.5vw, 14px)',
                                margin: 0,
                                fontWeight: '600'
                              }}>
                                {formErrors.name}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Email Field */}
                        <div style={{ position: 'relative' }}>
                          <label htmlFor="email" style={{
                            display: 'block',
                            marginBottom: 'clamp(6px, 1.5vw, 10px)',
                            fontWeight: '700',
                            color: 'var(--theme-form-text)',
                            fontSize: 'clamp(14px, 2.5vw, 16px)',
                            letterSpacing: '0.5px'
                          }}>
                            <span style={{ marginRight: '8px' }}>📧</span>
                            Correo electrónico
                          </label>
                          <div style={{ position: 'relative' }}>
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
                                padding: 'clamp(12px, 2.5vw, 16px) clamp(16px, 3vw, 20px)',
                                borderRadius: 'clamp(8px, 2vw, 12px)',
                                border: formErrors.email
                                  ? '2px solid #ef4444'
                                  : '2px solid rgba(255, 255, 255, 0.1)',
                                fontSize: 'clamp(14px, 3vw, 16px)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                color: 'var(--theme-text)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                outline: 'none',
                                fontFamily: 'inherit'
                              }}
                              onFocus={(e) => {
                                e.target.style.border = '2px solid var(--primary)';
                                e.target.style.boxShadow = '0 0 0 4px rgba(74, 144, 226, 0.1)';
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                              }}
                              onBlur={(e) => {
                                e.target.style.border = formErrors.email
                                  ? '2px solid #ef4444'
                                  : '2px solid rgba(255, 255, 255, 0.1)';
                                e.target.style.boxShadow = 'none';
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }}
                            />
                            {/* Success indicator */}
                            {formData.email && !formErrors.email && (
                              <div style={{
                                position: 'absolute',
                                right: 'clamp(12px, 2.5vw, 16px)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#10b981',
                                fontSize: 'clamp(16px, 3vw, 20px)'
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                          {formErrors.email && (
                            <div style={{
                              marginTop: 'clamp(4px, 1vw, 8px)',
                              padding: 'clamp(6px, 1.5vw, 10px) clamp(10px, 2vw, 14px)',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: 'clamp(6px, 1.5vw, 8px)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span style={{ color: '#ef4444', fontSize: 'clamp(14px, 2.5vw, 16px)' }}>⚠️</span>
                              <p style={{
                                color: '#ef4444',
                                fontSize: 'clamp(12px, 2.5vw, 14px)',
                                margin: 0,
                                fontWeight: '600'
                              }}>
                                {formErrors.email}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Phone Field */}
                        <div style={{ position: 'relative' }}>
                          <label htmlFor="phoneNumber" style={{
                            display: 'block',
                            marginBottom: 'clamp(6px, 1.5vw, 10px)',
                            fontWeight: '700',
                            color: 'var(--theme-form-text)',
                            fontSize: 'clamp(14px, 2.5vw, 16px)',
                            letterSpacing: '0.5px'
                          }}>
                            <span style={{ marginRight: '8px' }}>📱</span>
                            Número de celular
                          </label>
                          <div style={{
                            display: 'flex',
                            gap: 'clamp(8px, 2vw, 12px)',
                            flexDirection: window.innerWidth < 480 ? 'column' : 'row'
                          }}>
                            {/* Country Code Selector */}
                            <div style={{
                              position: 'relative',
                              width: window.innerWidth < 480 ? '100%' : 'clamp(110px, 20vw, 140px)',
                              minWidth: '110px'
                            }}>
                              <select
                                value={formData.phoneCountry.code}
                                onChange={(e) => {
                                  const selectedCountry = countryCodes.find(country => country.code === e.target.value);
                                  handleCountryCodeChange(selectedCountry);
                                }}
                                style={{
                                  width: '100%',
                                  padding: 'clamp(12px, 2.5vw, 16px) clamp(16px, 3vw, 20px) clamp(12px, 2.5vw, 16px) clamp(38px, 8vw, 45px)',
                                  borderRadius: 'clamp(8px, 2vw, 12px)',
                                  border: '2px solid rgba(255, 255, 255, 0.1)',
                                  fontSize: 'clamp(14px, 3vw, 16px)',
                                  appearance: 'none',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  backdropFilter: 'blur(10px)',
                                  color: 'var(--theme-text)',
                                  fontFamily: 'inherit',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  outline: 'none'
                                }}
                                onFocus={(e) => {
                                  e.target.style.border = '2px solid var(--primary)';
                                  e.target.style.boxShadow = '0 0 0 4px rgba(74, 144, 226, 0.1)';
                                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                }}
                                onBlur={(e) => {
                                  e.target.style.border = '2px solid rgba(255, 255, 255, 0.1)';
                                  e.target.style.boxShadow = 'none';
                                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                }}
                              >
                                {countryCodes.map((country) => (
                                  <option
                                    key={country.code}
                                    value={country.code}
                                    style={{
                                      backgroundColor: 'var(--theme-background)',
                                      color: 'var(--theme-text)',
                                      padding: '8px',
                                      fontFamily: 'inherit'
                                    }}
                                  >
                                    {country.flag} {country.code}
                                  </option>
                                ))}
                              </select>

                              {/* Flag and dropdown icon */}
                              <div style={{
                                position: 'absolute',
                                left: 'clamp(12px, 2.5vw, 16px)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                fontSize: 'clamp(14px, 3vw, 18px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {formData.phoneCountry.flag}
                              </div>
                              <div style={{
                                position: 'absolute',
                                right: 'clamp(8px, 2vw, 12px)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                fontSize: 'clamp(10px, 2vw, 12px)',
                                color: 'var(--theme-text-secondary)'
                              }}>
                                ▼
                              </div>
                            </div>

                            {/* Phone Number Input */}
                            <div style={{
                              flex: 1,
                              position: 'relative',
                              minWidth: window.innerWidth < 480 ? '100%' : '200px'
                            }}>
                              <input
                                type="tel"
                                id="phoneNumber"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleInputChange}
                                placeholder="600 000 000"
                                maxLength={15}
                                style={{
                                  width: '100%',
                                  padding: 'clamp(12px, 2.5vw, 16px) clamp(16px, 3vw, 20px)',
                                  borderRadius: 'clamp(8px, 2vw, 12px)',
                                  border: formErrors.phoneNumber
                                    ? '2px solid #ef4444'
                                    : '2px solid rgba(255, 255, 255, 0.1)',
                                  fontSize: 'clamp(14px, 3vw, 16px)',
                                  fontFamily: 'inherit',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  backdropFilter: 'blur(10px)',
                                  color: 'var(--theme-text)',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  outline: 'none'
                                }}
                                onFocus={(e) => {
                                  e.target.style.border = '2px solid var(--primary)';
                                  e.target.style.boxShadow = '0 0 0 4px rgba(74, 144, 226, 0.1)';
                                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                }}
                                onBlur={(e) => {
                                  e.target.style.border = formErrors.phoneNumber
                                    ? '2px solid #ef4444'
                                    : '2px solid rgba(255, 255, 255, 0.1)';
                                  e.target.style.boxShadow = 'none';
                                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                }}
                              />
                              {/* Success indicator */}
                              {formData.phoneNumber && !formErrors.phoneNumber && (
                                <div style={{
                                  position: 'absolute',
                                  right: 'clamp(12px, 2.5vw, 16px)',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: '#10b981',
                                  fontSize: 'clamp(16px, 3vw, 20px)'
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>
                          </div>
                          {formErrors.phoneNumber && (
                            <div style={{
                              marginTop: 'clamp(4px, 1vw, 8px)',
                              padding: 'clamp(6px, 1.5vw, 10px) clamp(10px, 2vw, 14px)',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: 'clamp(6px, 1.5vw, 8px)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span style={{ color: '#ef4444', fontSize: 'clamp(14px, 2.5vw, 16px)' }}>⚠️</span>
                              <p style={{
                                color: '#ef4444',
                                fontSize: 'clamp(12px, 2.5vw, 14px)',
                                margin: 0,
                                fontWeight: '600'
                              }}>
                                {formErrors.phoneNumber}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Consent Checkbox */}
                        <div style={{
                          marginTop: 'clamp(8px, 2vw, 16px)',
                          position: 'relative'
                        }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'clamp(8px, 2vw, 12px)',
                            fontSize: 'clamp(12px, 2.5vw, 14px)',
                            color: 'var(--theme-text-secondary)',
                            cursor: 'pointer',
                            lineHeight: '1.5',
                            padding: 'clamp(12px, 2.5vw, 16px)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 'clamp(8px, 2vw, 12px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }}
                          >
                            {/* Custom Checkbox */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <input
                                type="checkbox"
                                name="consent"
                                checked={formData.consent}
                                onChange={handleInputChange}
                                style={{
                                  opacity: 0,
                                  position: 'absolute',
                                  width: 'clamp(18px, 4vw, 22px)',
                                  height: 'clamp(18px, 4vw, 22px)',
                                  cursor: 'pointer'
                                }}
                              />
                              <div style={{
                                width: 'clamp(18px, 4vw, 22px)',
                                height: 'clamp(18px, 4vw, 22px)',
                                borderRadius: 'clamp(4px, 1vw, 6px)',
                                border: formData.consent
                                  ? '2px solid var(--primary)'
                                  : '2px solid rgba(255, 255, 255, 0.3)',
                                backgroundColor: formData.consent
                                  ? 'var(--primary)'
                                  : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: formData.consent
                                  ? '0 0 0 4px rgba(74, 144, 226, 0.2)'
                                  : 'none'
                              }}>
                                {formData.consent && (
                                  <span style={{
                                    color: 'white',
                                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                                    fontWeight: '800'
                                  }}>
                                    ✓
                                  </span>
                                )}
                              </div>
                            </div>
                            <span style={{ flex: 1 }}>
                              <span style={{ fontWeight: '600', color: 'var(--theme-text)' }}>
                                Acepto recibir información sobre el curso
                              </span>
                              <span style={{ display: 'block', marginTop: '4px', opacity: '0.8' }}>
                                y promociones relacionadas. Puedo darme de baja en cualquier momento.
                              </span>
                            </span>
                          </label>
                          {formErrors.consent && (
                            <div style={{
                              marginTop: 'clamp(4px, 1vw, 8px)',
                              padding: 'clamp(6px, 1.5vw, 10px) clamp(10px, 2vw, 14px)',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: 'clamp(6px, 1.5vw, 8px)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span style={{ color: '#ef4444', fontSize: 'clamp(14px, 2.5vw, 16px)' }}>⚠️</span>
                              <p style={{
                                color: '#ef4444',
                                fontSize: 'clamp(12px, 2.5vw, 14px)',
                                margin: 0,
                                fontWeight: '600'
                              }}>
                                {formErrors.consent}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Hidden Fields */}
                        <input type="hidden" name="purchaseIntent" value={purchaseIntent} />
                        <input
                          type="text"
                          name="website"
                          value=""
                          onChange={() => {}}
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

                        {/* Modern reCAPTCHA Container */}
                        <div style={{
                          marginTop: 'clamp(16px, 3vw, 24px)',
                          position: 'relative'
                        }}>
                          <div style={{
                            padding: 'clamp(12px, 2.5vw, 16px)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 'clamp(8px, 2vw, 12px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'clamp(8px, 2vw, 12px)',
                            marginBottom: 'clamp(16px, 3vw, 24px)'
                          }}>
                            <div style={{
                              width: 'clamp(20px, 4vw, 24px)',
                              height: 'clamp(20px, 4vw, 24px)',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <span style={{
                                color: 'white',
                                fontSize: 'clamp(10px, 2vw, 12px)',
                                fontWeight: '800'
                              }}>
                                🛡️
                              </span>
                            </div>
                            <div>
                              <p style={{
                                margin: 0,
                                fontSize: 'clamp(12px, 2.5vw, 14px)',
                                fontWeight: '600',
                                color: 'var(--theme-text)'
                              }}>
                                Formulario protegido por reCAPTCHA
                              </p>
                              <p style={{
                                margin: 0,
                                fontSize: 'clamp(10px, 2vw, 12px)',
                                color: 'var(--theme-text-secondary)',
                                marginTop: '2px'
                              }}>
                                Tus datos están seguros y protegidos
                              </p>
                            </div>
                          </div>

                          {/* reCAPTCHA invisible - positioned for better integration */}
                          <div id="rc-anchor-alert" style={{
                            position: 'relative',
                            zIndex: 1
                          }}>
                            <ReCAPTCHA
                              ref={recaptchaRef}
                              sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                              size="invisible"
                              onChange={handleRecaptchaChange}
                            />
                          </div>
                        </div>

                        {/* Modern Security Status Indicator */}
                        {securityStatus.message && (
                          <div style={{
                            marginTop: 'clamp(16px, 3vw, 24px)',
                            padding: 'clamp(12px, 2.5vw, 16px) clamp(16px, 3vw, 20px)',
                            backgroundColor: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.backgroundColor,
                            borderColor: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.borderColor,
                            color: getSecurityFeedback(securityStatus.status, securityStatus.message).styles.color,
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderRadius: 'clamp(8px, 2vw, 12px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'clamp(8px, 2vw, 12px)',
                            marginBottom: 'clamp(16px, 3vw, 24px)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(10px)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            {/* Animated background for loading state */}
                            {securityStatus.status === 'loading' && (
                              <div style={{
                                position: 'absolute',
                                top: '0',
                                left: '-100%',
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                animation: 'shimmer 2s infinite'
                              }}></div>
                            )}

                            <div style={{
                              fontSize: 'clamp(16px, 3vw, 20px)',
                              flexShrink: 0,
                              position: 'relative',
                              zIndex: 1
                            }}>
                              {getSecurityFeedback(securityStatus.status, securityStatus.message).styles.icon}
                            </div>
                            <p style={{
                              fontSize: 'clamp(12px, 2.5vw, 14px)',
                              margin: 0,
                              fontWeight: '600',
                              lineHeight: '1.4',
                              position: 'relative',
                              zIndex: 1
                            }}>
                              {securityStatus.message}
                            </p>
                          </div>
                        )}

                        {/* Form Submit Section */}
                        <div style={{
                          marginTop: 'clamp(20px, 4vw, 32px)',
                          textAlign: 'center'
                        }}>
                          {/* Info text */}
                          <div style={{
                            marginBottom: 'clamp(16px, 3vw, 24px)',
                            padding: 'clamp(12px, 2.5vw, 16px)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 'clamp(8px, 2vw, 12px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <p style={{
                              margin: 0,
                              fontSize: 'clamp(12px, 2.5vw, 14px)',
                              color: 'var(--theme-text-secondary)',
                              lineHeight: '1.5'
                            }}>
                              <span style={{ marginRight: '8px' }}>🔒</span>
                              Al hacer clic en el botón, te enviaremos información exclusiva sobre el curso
                            </p>
                          </div>

                          {/* Ultra-Premium Submit Button */}
                          <div style={{ position: 'relative', marginBottom: 'clamp(20px, 4vw, 32px)' }}>
                            {/* Button glow effect */}
                            <div style={{
                              position: 'absolute',
                              inset: '-4px',
                              borderRadius: 'clamp(16px, 3vw, 24px)',
                              background: isSubmitting
                                ? 'none'
                                : `conic-gradient(from 0deg,
                                    var(--accent)60,
                                    var(--primary)60,
                                    var(--secondary)60,
                                    var(--accent)60
                                  )`,
                              filter: 'blur(8px)',
                              opacity: '0.7',
                              animation: isSubmitting ? 'none' : 'spin 8s linear infinite',
                              zIndex: 0
                            }}></div>

                            <button
                              type="submit"
                              className="btn"
                              style={{
                                width: '100%',
                                fontSize: 'clamp(18px, 4vw, 24px)',
                                fontWeight: '900',
                                background: isSubmitting
                                  ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
                                  : `
                                    linear-gradient(135deg,
                                      var(--accent) 0%,
                                      var(--primary) 50%,
                                      var(--secondary) 100%
                                    )
                                  `,
                                color: 'white',
                                padding: 'clamp(18px, 4vw, 28px) clamp(24px, 5vw, 40px)',
                                borderRadius: 'clamp(16px, 3vw, 24px)',
                                border: 'none',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                position: 'relative',
                                overflow: 'hidden',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                boxShadow: isSubmitting
                                  ? 'none'
                                  : `
                                    0 20px 60px rgba(228, 105, 148, 0.4),
                                    0 8px 32px rgba(74, 144, 226, 0.3),
                                    inset 0 2px 0 rgba(255, 255, 255, 0.3)
                                  `,
                                transform: isSubmitting ? 'scale(0.96)' : 'scale(1)',
                                zIndex: 1,
                                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                              }}
                              disabled={isSubmitting}
                              onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                  e.target.style.transform = 'translateY(-4px) scale(1.03)';
                                  e.target.style.boxShadow = `
                                    0 25px 80px rgba(228, 105, 148, 0.5),
                                    0 12px 40px rgba(74, 144, 226, 0.4),
                                    inset 0 2px 0 rgba(255, 255, 255, 0.4)
                                  `;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSubmitting) {
                                  e.target.style.transform = 'translateY(0) scale(1)';
                                  e.target.style.boxShadow = `
                                    0 20px 60px rgba(228, 105, 148, 0.4),
                                    0 8px 32px rgba(74, 144, 226, 0.3),
                                    inset 0 2px 0 rgba(255, 255, 255, 0.3)
                                  `;
                                }
                              }}
                            >
                              {/* Advanced shimmer effect */}
                              {!isSubmitting && (
                                <>
                                  <div style={{
                                    position: 'absolute',
                                    top: '0',
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                    animation: 'shimmer 4s infinite'
                                  }}></div>
                                  <div style={{
                                    position: 'absolute',
                                    top: '0',
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                    animation: 'shimmer 4s infinite 2s'
                                  }}></div>
                                </>
                              )}

                              {/* Enhanced Loading spinner */}
                              {isSubmitting && (
                                <div style={{
                                  position: 'absolute',
                                  left: 'clamp(20px, 4vw, 32px)',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: 'clamp(20px, 4vw, 28px)',
                                  height: 'clamp(20px, 4vw, 28px)',
                                  border: '3px solid rgba(255,255,255,0.3)',
                                  borderTop: '3px solid white',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }}></div>
                              )}

                              {/* Premium button content */}
                              <span style={{
                                position: 'relative',
                                zIndex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'clamp(10px, 2.5vw, 16px)'
                              }}>
                                {!isSubmitting && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <span style={{
                                      fontSize: 'clamp(20px, 4.5vw, 28px)',
                                      animation: 'float 2s ease-in-out infinite'
                                    }}>✨</span>
                                    <span style={{
                                      fontSize: 'clamp(18px, 4vw, 24px)',
                                      animation: 'float 2s ease-in-out infinite 0.5s'
                                    }}>🚀</span>
                                  </div>
                                )}
                                <span style={{
                                  fontWeight: '900',
                                  letterSpacing: '1.5px'
                                }}>
                                  {isSubmitting ? 'PROCESANDO...' : '¡QUIERO SABER MÁS!'}
                                </span>
                              </span>

                              {/* Button inner glow */}
                              <div style={{
                                position: 'absolute',
                                inset: '2px',
                                borderRadius: 'clamp(14px, 2.8vw, 22px)',
                                background: isSubmitting
                                  ? 'none'
                                  : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
                                pointerEvents: 'none',
                                zIndex: 0
                              }}></div>
                            </button>
                          </div>

                          {/* Premium Trust Indicators */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
                            gap: 'clamp(12px, 3vw, 20px)',
                            maxWidth: '600px',
                            margin: '0 auto'
                          }}>
                            {[
                              {
                                icon: '🔒',
                                text: 'Datos Seguros',
                                color: 'var(--primary)',
                                gradient: 'linear-gradient(135deg, #4A90E2, #357ABD)'
                              },
                              {
                                icon: '⚡',
                                text: 'Respuesta Inmediata',
                                color: 'var(--secondary)',
                                gradient: 'linear-gradient(135deg, #E46994, #C8577A)'
                              },
                              {
                                icon: '🎯',
                                text: 'Sin Spam',
                                color: 'var(--accent)',
                                gradient: 'linear-gradient(135deg, #9ADAFB, #7BC3E8)'
                              }
                            ].map((item, index) => (
                              <div key={index} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'clamp(6px, 1.5vw, 10px)',
                                padding: 'clamp(12px, 2.5vw, 18px) clamp(8px, 2vw, 12px)',
                                background: `
                                  linear-gradient(135deg,
                                    rgba(255, 255, 255, 0.08) 0%,
                                    rgba(255, 255, 255, 0.02) 100%
                                  )
                                `,
                                backdropFilter: 'blur(20px)',
                                borderRadius: 'clamp(12px, 2.5vw, 18px)',
                                border: `1px solid ${item.color}20`,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'default',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-3px) scale(1.05)';
                                e.target.style.boxShadow = `0 12px 32px ${item.color}25`;
                                e.target.style.background = `${item.color}08`;
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0) scale(1)';
                                e.target.style.boxShadow = 'none';
                                e.target.style.background = `
                                  linear-gradient(135deg,
                                    rgba(255, 255, 255, 0.08) 0%,
                                    rgba(255, 255, 255, 0.02) 100%
                                  )
                                `;
                              }}
                              >
                                {/* Hover gradient overlay */}
                                <div style={{
                                  position: 'absolute',
                                  inset: '0',
                                  background: item.gradient,
                                  opacity: '0',
                                  transition: 'opacity 0.3s ease',
                                  borderRadius: 'inherit',
                                  pointerEvents: 'none'
                                }}></div>

                                {/* Icon container */}
                                <div style={{
                                  width: 'clamp(28px, 6vw, 40px)',
                                  height: 'clamp(28px, 6vw, 40px)',
                                  borderRadius: '50%',
                                  background: item.gradient,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 'clamp(14px, 3vw, 20px)',
                                  boxShadow: `0 6px 20px ${item.color}30`,
                                  position: 'relative',
                                  zIndex: 1
                                }}>
                                  {item.icon}
                                </div>

                                {/* Text */}
                                <span style={{
                                  fontSize: 'clamp(11px, 2.2vw, 14px)',
                                  color: 'var(--theme-text)',
                                  fontWeight: '700',
                                  textAlign: 'center',
                                  lineHeight: '1.2',
                                  letterSpacing: '0.5px',
                                  position: 'relative',
                                  zIndex: 1
                                }}>
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Additional Security Badge */}
                          <div style={{
                            marginTop: 'clamp(20px, 4vw, 32px)',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 'clamp(8px, 2vw, 12px)',
                              padding: 'clamp(8px, 2vw, 12px) clamp(16px, 3vw, 24px)',
                              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
                              borderRadius: '50px',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              fontSize: 'clamp(11px, 2.2vw, 14px)',
                              color: '#10b981',
                              fontWeight: '700',
                              letterSpacing: '0.5px'
                            }}>
                              <div style={{
                                width: 'clamp(16px, 3vw, 20px)',
                                height: 'clamp(16px, 3vw, 20px)',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'clamp(8px, 1.8vw, 12px)',
                                color: 'white'
                              }}>
                                ✓
                              </div>
                              SSL Certificado • Protección Total de Datos
                            </div>
                          </div>
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
          </div>
        </section>

        {/* FAQ Section */}
        <section className="section section-themed" style={{
          backgroundColor: 'var(--theme-surface)',
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(40px, 8vw, 100px) 0'
        }}>
          {/* Modern Decorative Background Elements */}
          <div style={{
            position: 'absolute',
            top: '5%',
            left: '-10%',
            width: 'clamp(300px, 40vw, 600px)',
            height: 'clamp(300px, 40vw, 600px)',
            background: 'radial-gradient(circle, var(--primary)06, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            zIndex: 0
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '5%',
            right: '-10%',
            width: 'clamp(250px, 35vw, 500px)',
            height: 'clamp(250px, 35vw, 500px)',
            background: 'radial-gradient(circle, var(--secondary)06, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            zIndex: 0
          }}> </div>

          {/* Floating geometric shapes */}
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: '60px',
            height: '60px',
            background: 'linear-gradient(45deg, var(--accent)20, var(--primary)20)',
            borderRadius: '12px',
            transform: 'rotate(45deg)',
            zIndex: 0,
            opacity: '0.3'
          }}></div>fsff
          <div style={{
            position: 'absolute',
            bottom: '30%',
            left: '8%',
            width: '40px',
            height: '40px',
            background: 'linear-gradient(45deg, var(--secondary)25, var(--accent)25)',
            borderRadius: '50%',
            zIndex: 0,
            opacity: '0.4'
          }}></div>

          <div className="container" id ="dudas" style={{
            position: 'relative',
            zIndex: 1,
            padding: '0 clamp(16px, 4vw, 40px)'
          }}>
            {/* Modern Header Section */}
            <div style={{
              textAlign: 'center',
              maxWidth: '100%',
              margin: '0 auto clamp(40px, 8vw, 80px)',
              position: 'relative'
            }}>
              {/* Floating Question Icon */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'clamp(60px, 12vw, 90px)',
                height: 'clamp(60px, 12vw, 90px)',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                marginBottom: 'clamp(20px, 4vw, 40px)',
                boxShadow: '0 10px 40px rgba(74, 144, 226, 0.25)',
                position: 'relative'
              }} className="reveal reveal-up">
                {/* Pulse animation ring */}
                <div style={{
                  position: 'absolute',
                  inset: '-8px',
                  borderRadius: '50%',
                  border: '2px solid var(--primary)',
                  opacity: '0.3',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span style={{
                  fontSize: 'clamp(24px, 5vw, 40px)',
                  color: 'white',
                  fontWeight: '800'
                }}>❓</span>
              </div>

              <h2 style={{
                fontSize: 'clamp(24px, 6vw, 48px)',
                marginBottom: 'clamp(15px, 3vw, 30px)',
                fontWeight: '800',
                color: 'var(--theme-text)',
                lineHeight: '1.1',
                letterSpacing: '-0.02em'
              }} className="reveal reveal-up">
                ¿Tienes dudas?
              </h2>

              <p style={{
                fontSize: 'clamp(18px, 4vw, 32px)',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: '700',
                marginBottom: 'clamp(30px, 6vw, 50px)',
                lineHeight: '1.2',
                letterSpacing: '-0.01em'
              }} className="reveal reveal-up delay-100">
                Te respondemos todo lo que necesitas saber
              </p>

              {/* Modern "Esto es para ti" Section */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                padding: 'clamp(24px, 5vw, 50px) clamp(20px, 4vw, 40px)',
                borderRadius: 'clamp(16px, 3vw, 32px)',
                marginBottom: 'clamp(40px, 8vw, 70px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }} className="reveal reveal-up delay-200">

                {/* Modern decorative elements */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'conic-gradient(from 0deg, var(--primary)30, var(--secondary)30, var(--accent)30, var(--primary)30)',
                  borderRadius: '50%',
                  filter: 'blur(20px)',
                  opacity: '0.3'
                }}></div>

                <div style={{
                  textAlign: 'center',
                  marginBottom: 'clamp(24px, 5vw, 40px)'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: 'clamp(12px, 2.5vw, 20px) clamp(20px, 4vw, 32px)',
                    borderRadius: '50px',
                    border: '1px solid var(--primary)25',
                    marginBottom: 'clamp(16px, 3vw, 24px)'
                  }}>
                    <span style={{ fontSize: 'clamp(20px, 4vw, 28px)' }}>🎯</span>
                    <h3 style={{
                      fontSize: 'clamp(16px, 3.5vw, 24px)',
                      color: 'var(--primary)',
                      margin: '0',
                      fontWeight: '700',
                      letterSpacing: '-0.01em'
                    }}>
                      Perfecto para ti si:
                    </h3>
                  </div>
                </div>

                {/* Enhanced responsive grid with 2 rows design */}
                <div id="iconos" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gridTemplateRows: 'repeat(2, 1fr)',
                  gap: 'clamp(20px, 4vw, 30px)',
                  maxWidth: '100%',
                  padding: 'clamp(20px, 4vw, 30px) 0'
                }}>
                  {[
                    {
                      icon: '🔰',
                      text: 'No sabes nada de tecnología',
                      subtitle: 'Empezamos desde cero',
                      color: 'var(--primary)',
                      gradient: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                      bgGradient: 'linear-gradient(135deg, #4A90E210, #357ABD10)'
                    },
                    {
                      icon: '🎓',
                      text: 'Nunca hiciste un taller online',
                      subtitle: 'Te guiamos paso a paso',
                      color: 'var(--secondary)',
                      gradient: 'linear-gradient(135deg, #E46994, #C8577A)',
                      bgGradient: 'linear-gradient(135deg, #E4699410, #C8577A10)'
                    },
                    {
                      icon: '⚡',
                      text: 'Quieres resultados rápidos',
                      subtitle: 'Resultados en 90 minutos',
                      color: 'var(--tertiary)',
                      gradient: 'linear-gradient(135deg, #9ADAFB, #7BC3E8)',
                      bgGradient: 'linear-gradient(135deg, #9ADAFB10, #7BC3E810)'
                    },
                    {
                      icon: '💰',
                      text: 'Buscas generar ingresos',
                      subtitle: 'Monetiza desde el día 1',
                      color: '#10b981',
                      gradient: 'linear-gradient(135deg, #10b981, #059669)',
                      bgGradient: 'linear-gradient(135deg, #10b98110, #05966910)'
                    }
                  ].map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 'clamp(16px, 3vw, 20px)',
                      padding: 'clamp(24px, 5vw, 32px)',
                      background: 'var(--theme-card-bg)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 'clamp(16px, 3vw, 24px)',
                      border: `2px solid ${item.color}20`,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'default',
                      boxShadow: `0 8px 32px ${item.color}15`,
                      minHeight: 'clamp(200px, 25vw, 250px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                      e.currentTarget.style.boxShadow = `0 20px 60px ${item.color}25`;
                      e.currentTarget.style.background = item.bgGradient;
                      e.currentTarget.style.borderColor = `${item.color}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = `0 8px 32px ${item.color}15`;
                      e.currentTarget.style.background = 'var(--theme-card-bg)';
                      e.currentTarget.style.borderColor = `${item.color}20`;
                    }}
                    >
                      {/* Decorative background elements */}
                      <div style={{
                        position: 'absolute',
                        top: '-20%',
                        right: '-20%',
                        width: '60%',
                        height: '60%',
                        background: item.gradient,
                        borderRadius: '50%',
                        opacity: '0.05',
                        filter: 'blur(20px)',
                        transition: 'all 0.4s ease'
                      }}></div>

                      {/* Icon container with enhanced design */}
                      <div style={{
                        position: 'relative',
                        marginBottom: 'clamp(12px, 2.5vw, 16px)'
                      }}>
                        {/* Icon background ring */}
                        <div style={{
                          position: 'absolute',
                          inset: '-8px',
                          borderRadius: '50%',
                          background: `conic-gradient(from 0deg, ${item.color}, ${item.color}80, ${item.color})`,
                          opacity: '0.3',
                          animation: 'spin 15s linear infinite'
                        }}></div>

                        {/* Main icon container */}
                        <div style={{
                          fontSize: 'clamp(32px, 6vw, 48px)',
                          width: 'clamp(60px, 12vw, 80px)',
                          height: 'clamp(60px, 12vw, 80px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          background: item.gradient,
                          boxShadow: `0 8px 32px ${item.color}30, 0 4px 16px ${item.color}20`,
                          position: 'relative',
                          zIndex: 1,
                          border: '3px solid white',
                          transition: 'all 0.4s ease'
                        }}>
                          {item.icon}
                        </div>
                      </div>

                      {/* Text content */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 'clamp(8px, 1.5vw, 12px)',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <h4 style={{
                          fontSize: 'clamp(16px, 3.5vw, 20px)',
                          color: 'var(--theme-text)',
                          fontWeight: '700',
                          lineHeight: '1.3',
                          margin: '0',
                          textAlign: 'center'
                        }}>
                          {item.text}
                        </h4>
                        <p style={{
                          fontSize: 'clamp(12px, 2.5vw, 14px)',
                          color: 'var(--theme-text-secondary)',
                          fontWeight: '500',
                          lineHeight: '1.4',
                          margin: '0',
                          textAlign: 'center',
                          opacity: '0.8'
                        }}>
                          {item.subtitle}
                        </p>
                      </div>

                      {/* Bottom accent line */}
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60%',
                        height: '3px',
                        background: item.gradient,
                        borderRadius: '2px 2px 0 0',
                        opacity: '0.6'
                      }}></div>
                    </div>
                  ))}
                </div>

                {/* Enhanced bottom accent with multiple badges */}
                <div style={{
                  marginTop: 'clamp(30px, 6vw, 40px)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'clamp(16px, 3vw, 20px)'
                }}>
                  {/* Main badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'clamp(8px, 2vw, 12px)',
                    padding: 'clamp(12px, 2.5vw, 16px) clamp(20px, 4vw, 28px)',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '50px',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    color: 'white',
                    fontWeight: '700',
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Shimmer effect */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: 'shimmer 3s infinite'
                    }}></div>
                    <span style={{ fontSize: 'clamp(16px, 3.5vw, 20px)', position: 'relative', zIndex: 1 }}>✨</span>
                    <span style={{ position: 'relative', zIndex: 1 }}>Sin experiencia previa necesaria</span>
                  </div>

                  {/* Secondary badges */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 'clamp(12px, 3vw, 20px)',
                    flexWrap: 'wrap'
                  }}>
                    {[
                      { icon: '🎯', text: '100% Práctico', color: 'var(--primary)' },
                      { icon: '⚡', text: 'Resultados Inmediatos', color: 'var(--secondary)' },
                      { icon: '🚀', text: 'Fácil de Seguir', color: 'var(--tertiary)' }
                    ].map((badge, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2.5vw, 16px)',
                        background: `${badge.color}10`,
                        border: `1px solid ${badge.color}20`,
                        borderRadius: '20px',
                        fontSize: 'clamp(11px, 2vw, 13px)',
                        color: 'var(--theme-text)',
                        fontWeight: '600'
                      }}>
                        <span style={{ fontSize: 'clamp(12px, 2.5vw, 14px)' }}>{badge.icon}</span>
                        {badge.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
   </div> 

      <div class="container" id="preguntas-Freceuntes" >
          <div >
            {/* Modern FAQ Container */}
            <div style={{
              maxWidth: '100%',
              margin: '0 auto',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              padding: 'clamp(24px, 5vw, 60px) clamp(16px, 4vw, 50px)',
              borderRadius: 'clamp(20px, 4vw, 40px)',
              position: 'relative',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }} className="reveal reveal-up delay-300">

              {/* Modern decorative mesh gradient */}
              <div style={{
                position: 'absolute',
                inset: '0',
                background: `
                  radial-gradient(circle at 20% 20%, var(--primary)03 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, var(--secondary)03 0%, transparent 50%),
                  radial-gradient(circle at 40% 60%, var(--accent)02 0%, transparent 50%)
                `,
                zIndex: 0
              }}></div>

              {/* Floating geometric decorations */}
              <div style={{
                position: 'absolute',
                top: '10%',
                right: '5%',
                width: 'clamp(30px, 6vw, 60px)',
                height: 'clamp(30px, 6vw, 60px)',
                background: 'linear-gradient(45deg, var(--primary)15, var(--secondary)15)',
                borderRadius: '30%',
                transform: 'rotate(45deg)',
                zIndex: 0,
                opacity: '0.6'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '15%',
                left: '3%',
                width: 'clamp(20px, 4vw, 40px)',
                height: 'clamp(20px, 4vw, 40px)',
                background: 'linear-gradient(45deg, var(--accent)20, var(--primary)20)',
                borderRadius: '50%',
                zIndex: 0,
                opacity: '0.5'
              }}></div>
        <div></div> 


              {/* Modern FAQ Header */}
              <div style={{
                textAlign: 'center',
                marginBottom: 'clamp(30px, 6vw, 50px)',
                position: 'relative',
                zIndex: 1
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'clamp(8px, 2vw, 16px)',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: 'white',
                  padding: 'clamp(12px, 2.5vw, 20px) clamp(20px, 4vw, 36px)',
                  borderRadius: '50px',
                  fontSize: 'clamp(14px, 3vw, 20px)',
                  fontWeight: '700',
                  boxShadow: '0 8px 32px rgba(74, 144, 226, 0.25)',
                  marginBottom: 'clamp(16px, 3vw, 24px)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Shimmer effect */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: 'shimmer 3s infinite'
                  }}></div>
                  <span style={{ fontSize: 'clamp(18px, 4vw, 28px)', position: 'relative', zIndex: 1 }}>💬</span>
                  <span style={{ position: 'relative', zIndex: 1 }}>Preguntas Frecuentes</span>
                </div>
                <p style={{
                  fontSize: 'clamp(14px, 3vw, 18px)',
                  color: 'var(--theme-text-secondary)',
                  maxWidth: '100%',
                  margin: '0 auto',
                  lineHeight: '1.6',
                  padding: '0 clamp(16px, 4vw, 32px)'
                }}>
                  Resolvemos las dudas más comunes para que tomes la mejor decisión
                </p>
              </div>

              {/* FAQ Accordion with enhanced styling */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <FaqAccordion
                  faqs={[
                    {
                      question: "🎬 ¿Necesito experiencia previa en edición de video?",
                      answer: "¡Para nada! El taller está diseñado especialmente para principiantes. Comenzamos desde cero y avanzamos paso a paso. Todas las herramientas y técnicas son explicadas de manera simple y práctica. Si sabes usar un navegador web, ya tienes todo lo necesario para empezar."
                    },
                    {
                      question: "💻 ¿Qué equipo necesito para crear avatares hiperrealistas?",
                      answer: "Solo necesitas una computadora básica con conexión a internet. No se requiere hardware especializado, cámaras profesionales ni software costoso. Todas las herramientas que utilizamos son accesibles desde navegadores web o tienen requisitos mínimos de sistema. ¡Es más simple de lo que imaginas!"
                    },
                    {
                      question: "⏰ ¿Cuánto tiempo toma dominar la creación de avatares?",
                      answer: "¡Podrás crear tu primer avatar durante la misma clase! Nuestro taller de 90 minutos está diseñado para que salgas con tu avatar listo y funcionando. Para dominar completamente la técnica, con práctica regular puedes desarrollar habilidades profesionales en 30 días siguiendo nuestro programa."
                    },
                    {
                      question: "💰 ¿Cómo puedo monetizar mis avatares una vez creados?",
                      answer: "¡Las oportunidades son infinitas! El taller incluye estrategias de monetización + bonos exclusivos con guías detalladas. Algunas opciones: creación de contenido para redes sociales, servicios a empresas, marketing de afiliados, cursos propios, consultoría digital, y mucho más. Además, tendrás acceso a nuestro grupo exclusivo donde compartimos oportunidades reales de negocio."
                    },
                    {
                      question: "📚 ¿Por cuánto tiempo tendré acceso al contenido del taller?",
                      answer: "Tendrás acceso completo durante 1 mes a todo el material. Una vez impartido el taller en vivo, el video completo será subido a nuestra plataforma exclusiva donde podrás acceder cuando quieras y repetir las lecciones tantas veces como necesites. ¡Aprendes a tu ritmo!"
                    },
                    {
                      question: "🛡️ ¿Qué pasa si no logro crear mi avatar?",
                      answer: "¡Tienes nuestra garantía total! Si sigues el programa completo y no logras crear tu primer avatar, te devolvemos el 100% de tu inversión sin preguntas. Además, tendrás soporte directo durante todo el proceso. Tu éxito es nuestro compromiso."
                    }
                  ]}
                />
              </div>
              </div>
             <div id ="empezar-transformación ">
              {/* Modern Call to Action */}
              <div style={{
                marginTop: 'clamp(30px, 6vw, 50px)',
                textAlign: 'center',
                padding: 'clamp(24px, 5vw, 40px) clamp(20px, 4vw, 32px)',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(15px)',
                borderRadius: 'clamp(16px, 3vw, 28px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                zIndex: 1,
                overflow: 'hidden'
              }}>
                {/* Animated gradient background */}
                <div style={{
                  position: 'absolute',
                  inset: '0',
                  background: `
                    linear-gradient(45deg, var(--primary)05, var(--secondary)05, var(--accent)05, var(--primary)05),
                    radial-gradient(circle at 30% 30%, var(--primary)08 0%, transparent 50%),
                    radial-gradient(circle at 70% 70%, var(--secondary)08 0%, transparent 50%)
                  `,
                  animation: 'gradientShift 8s ease-in-out infinite',
                  zIndex: -1
                }}></div>

                {/* Floating particles */}
                <div style={{
                  position: 'absolute',
                  top: '20%',
                  left: '10%',
                  width: '4px',
                  height: '4px',
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  opacity: '0.6',
                  animation: 'float 6s ease-in-out infinite'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '30%',
                  right: '15%',
                  width: '6px',
                  height: '6px',
                  background: 'var(--secondary)',
                  borderRadius: '50%',
                  opacity: '0.4',
                  animation: 'float 8s ease-in-out infinite reverse'
                }}></div>

                <div style={{
                  position: 'relative',
                  zIndex: 1
                }}>
                  {/* Hero Image Section */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: 'clamp(24px, 5vw, 40px)',
                    position: 'relative'
                  }}>
                    {/* Main Hero Image Container */}
                    <div style={{
                      position: 'relative',
                      width: 'clamp(200px, 40vw, 350px)',
                      height: 'clamp(200px, 40vw, 350px)',
                      marginBottom: 'clamp(20px, 4vw, 30px)'
                    }}>
                      {/* Background decorative rings */}
                      <div style={{
                        position: 'absolute',
                        inset: '-20px',
                        borderRadius: '50%',
                        background: 'conic-gradient(from 0deg, var(--primary)20, var(--secondary)20, var(--tertiary)20, var(--primary)20)',
                        animation: 'spin 20s linear infinite',
                        opacity: '0.3'
                      }}></div>
                      <div style={{
                        position: 'absolute',
                        inset: '-10px',
                        borderRadius: '50%',
                        border: '2px solid var(--primary)',
                        opacity: '0.2',
                        animation: 'pulse 3s infinite'
                      }}></div>

                      {/* Main image placeholder */}
                      <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary)15, var(--secondary)15)',
                        border: '4px solid var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(74, 144, 226, 0.3)'
                      }}>
                        {/* Placeholder for actual image */}
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <span style={{
                            fontSize: 'clamp(40px, 8vw, 80px)',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                          }}>🚀</span>

                        </div>
                      </div>

                      {/* Floating achievement badges */}
                      <div style={{
                        position: 'absolute',
                        top: '10%',
                        right: '-10%',
                        background: '#10b981',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        fontSize: 'clamp(10px, 2vw, 12px)',
                        fontWeight: '700',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                        animation: 'float 3s ease-in-out infinite'
                      }}>
                        ✨ Experto IA
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: '15%',
                        left: '-15%',
                        background: 'var(--secondary)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        fontSize: 'clamp(10px, 2vw, 12px)',
                        fontWeight: '700',
                        boxShadow: '0 8px 20px rgba(228, 105, 148, 0.4)',
                        animation: 'float 3s ease-in-out infinite 1s'
                      }}>
                        🎯 Resultados
                      </div>
                    </div>
                  </div>

                  <h3 style={{
                    fontSize: 'clamp(18px, 4vw, 28px)',
                    fontWeight: '800',
                    color: 'var(--theme-text)',
                    marginBottom: 'clamp(12px, 2.5vw, 20px)',
                    lineHeight: '1.2',
                    letterSpacing: '-0.01em'
                  }}>
                    ¿Listo para empezar tu
                    <span style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      display: 'block',
                      marginTop: '4px'
                    }}>
                      transformación digital?
                    </span>
                  </h3>

                  <p style={{
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    color: 'var(--theme-text-secondary)',
                    marginBottom: 'clamp(20px, 4vw, 32px)',
                    lineHeight: '1.6',
                    maxWidth: '500px',
                    margin: '0 auto clamp(20px, 4vw, 32px)'
                  }}>
                    No dejes que las dudas te detengan. ¡Únete ahora y descubre todo lo que puedes lograr!
                  </p>

                  <a
                    href="#lead-form"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'clamp(8px, 2vw, 12px)',
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      color: 'white',
                      padding: 'clamp(12px, 2.5vw, 18px) clamp(24px, 5vw, 40px)',
                      borderRadius: '50px',
                      fontSize: 'clamp(14px, 3vw, 20px)',
                      fontWeight: '700',
                      textDecoration: 'none',
                      boxShadow: '0 8px 32px rgba(74, 144, 226, 0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-3px) scale(1.02)';
                      e.target.style.boxShadow = '0 12px 40px rgba(74, 144, 226, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0) scale(1)';
                      e.target.style.boxShadow = '0 8px 32px rgba(74, 144, 226, 0.3)';
                    }}
                  >
                    {/* Button shimmer effect */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: 'shimmer 3s infinite'
                    }}></div>
                    <span style={{
                      fontSize: 'clamp(16px, 3.5vw, 24px)',
                      position: 'relative',
                      zIndex: 1
                    }}>✨</span>
                    <span style={{ position: 'relative', zIndex: 1 }}>¡Acceder Ahora!</span>
                  </a>

                  {/* Trust indicators */}
                  <div style={{
                    marginTop: 'clamp(20px, 4vw, 32px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 'clamp(16px, 4vw, 32px)',
                    flexWrap: 'wrap'
                  }}>
                    {[
                      { icon: '🔒', text: 'Pago Seguro' },
                      { icon: '⚡', text: 'Acceso Inmediato' },
                      { icon: '🛡️', text: 'Garantía 30 días' }
                    ].map((item, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: 'clamp(12px, 2.5vw, 14px)',
                        color: 'var(--theme-text-secondary)',
                        fontWeight: '600'
                      }}>
                        <span style={{ fontSize: 'clamp(14px, 3vw, 16px)' }}>{item.icon}</span>
                        {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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













