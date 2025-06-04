// Lista de códigos de país para el selector de teléfono
export const countryCodes = [
  // Países hispanohablantes primero (ordenados por relevancia)
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+1', country: 'Estados Unidos/Canadá', flag: '🇺🇸' },

  // Otros países relevantes
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+39', country: 'Italia', flag: '🇮🇹' },
  { code: '+33', country: 'Francia', flag: '🇫🇷' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+49', country: 'Alemania', flag: '🇩🇪' },
  { code: '+31', country: 'Países Bajos', flag: '🇳🇱' },
  { code: '+32', country: 'Bélgica', flag: '🇧🇪' },
  { code: '+41', country: 'Suiza', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+46', country: 'Suecia', flag: '🇸🇪' },
  { code: '+47', country: 'Noruega', flag: '🇳🇴' },
  { code: '+45', country: 'Dinamarca', flag: '🇩🇰' },
  { code: '+358', country: 'Finlandia', flag: '🇫🇮' },
  { code: '+30', country: 'Grecia', flag: '🇬🇷' },
  { code: '+48', country: 'Polonia', flag: '🇵🇱' },
  { code: '+420', country: 'República Checa', flag: '🇨🇿' },
  { code: '+36', country: 'Hungría', flag: '🇭🇺' },
  { code: '+7', country: 'Rusia', flag: '🇷🇺' },
  { code: '+380', country: 'Ucrania', flag: '🇺🇦' },
  { code: '+40', country: 'Rumania', flag: '🇷🇴' },
  { code: '+90', country: 'Turquía', flag: '🇹🇷' },
];

// Función para obtener el código de país por defecto (España)
export const getDefaultCountryCode = () => {
  return countryCodes.find(country => country.code === '+34') || countryCodes[0];
};
