import { useEffect, useState } from 'react';

function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Cargar tema guardado al inicializar
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light'); // Asegurar que el tema claro esté guardado
    }
  }, []);

  // Cambiar tema
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    if (newTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      {/* Interruptor animado */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'relative',
          width: '80px',
          height: '40px',
          backgroundColor: isDarkMode ? '#4a5568' : '#e2e8f0',
          border: 'none',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '4px',
          boxShadow: isDarkMode
            ? 'inset 0 3px 6px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)'
            : 'inset 0 3px 6px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
          outline: 'none',
          background: isDarkMode
            ? 'linear-gradient(145deg, #4a5568, #2d3748)'
            : 'linear-gradient(145deg, #f7fafc, #e2e8f0)',
          borderTop: isDarkMode ? '1px solid #718096' : '1px solid #ffffff',
          borderLeft: isDarkMode ? '1px solid #718096' : '1px solid #ffffff',
          borderRight: isDarkMode ? '1px solid #2d3748' : '1px solid #cbd5e0',
          borderBottom: isDarkMode ? '1px solid #2d3748' : '1px solid #cbd5e0'
        }}
        title={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05) translateY(-1px)';
          e.target.style.boxShadow = isDarkMode
            ? 'inset 0 3px 6px rgba(0, 0, 0, 0.4), 0 6px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)'
            : 'inset 0 3px 6px rgba(0, 0, 0, 0.15), 0 6px 16px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1) translateY(0px)';
          e.target.style.boxShadow = isDarkMode
            ? 'inset 0 3px 6px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)'
            : 'inset 0 3px 6px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)';
        }}
      >
        {/* Círculo deslizante */}
        <div
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isDarkMode ? 'translateX(40px)' : 'translateX(0px)',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
            position: 'relative',
            zIndex: 1,
            background: 'linear-gradient(145deg, #ffffff, #f1f5f9)',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          {isDarkMode ? '🌙' : '☀️'}
        </div>

        {/* Indicadores de fondo */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '10px',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          opacity: isDarkMode ? 0.3 : 0.7,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }}>
          ☀️
        </div>
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '10px',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          opacity: isDarkMode ? 0.7 : 0.3,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }}>
          🌙
        </div>
      </button>
    </div>
  );
}

export default ThemeToggle;
