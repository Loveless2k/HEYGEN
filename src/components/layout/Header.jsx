import ThemeToggle from '../../ThemeToggle';
import { useTheme } from '../../hooks/useTheme';

const Header = () => {
  const { isDarkMode } = useTheme();

  // Seleccionar el logo según el tema
  const logoSrc = isDarkMode ? './logoInformatik-ai2.png' : './logoInformatik-ai.png';

  return (
    <header>
      <div className="container header-container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={logoSrc}
            alt="InformatiK-AI Logo"
            style={{
              height: '50px',
              marginTop: '5px',
              transition: 'all 0.3s ease' // Transición suave al cambiar
            }}
            className="animate-fadeIn"
          />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
