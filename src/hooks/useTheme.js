import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Función para detectar el tema actual
    const detectTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const documentTheme = document.documentElement.getAttribute('data-theme');
      
      // Priorizar el tema del documento, luego localStorage
      const currentTheme = documentTheme || savedTheme;
      setIsDarkMode(currentTheme === 'dark');
    };

    // Detectar tema inicial
    detectTheme();

    // Observar cambios en el atributo data-theme del documento
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          detectTheme();
        }
      });
    });

    // Iniciar observación
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // Escuchar cambios en localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        detectTheme();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { isDarkMode };
};
