import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Inicializar el tema al montar el componente
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      const root = document.documentElement;

      if (savedTheme === 'dark') {
        setIsDarkMode(true);
        root.setAttribute('data-theme', 'dark');
      } else {
        setIsDarkMode(false);
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
    } catch (error) {
      // Fallback al tema claro
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // Aplicar el tema cuando cambie
  useEffect(() => {
    try {
      const root = document.documentElement;

      if (isDarkMode) {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
    } catch (error) {
      // Error aplicando tema
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
