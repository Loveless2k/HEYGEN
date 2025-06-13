import ThemeToggle from '../../ThemeToggle';

const Header = () => {
  return (
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
  );
};

export default Header;
