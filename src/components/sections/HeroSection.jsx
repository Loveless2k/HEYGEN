import CountdownTimer from '../ui/CountdownTimer';
import VideoPlayer from '../../VideoPlayer';

const HeroSection = () => {
  // Fecha límite: 10 de junio de 2025 a las 11:59 (horario Chile)
  const targetDate = new Date('2025-06-10T23:59:00-04:00'); // UTC-4 para Chile

  return (
    <section className="hero">
      {/* Elementos decorativos tecnológicos */}
      <div className="tech-particles">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
        <div className="particle particle-5"></div>
      </div>

      {/* Líneas de código flotantes */}
      <div className="floating-code">
        <div className="code-line code-line-1">{'<AI avatar="true" />'}</div>
        <div className="code-line code-line-2">{'function createAvatar() {'}</div>
        <div className="code-line code-line-3">{'  return magic;'}</div>
        <div className="code-line code-line-4">{'}'}</div>
      </div>

      {/* Grid de fondo tecnológico */}
      <div className="tech-grid"></div>

      <div className="container">
        <div className="hero-grid">
          <div>
            <span className="hero-badge-tech animate-fadeIn">
              <span className="badge-icon">🚀</span>
              ACCESO LIMITADO ¡SOLO POR POCOS DÍAS!
              <span className="badge-glow"></span>
            </span>

            <h1 className="hero-title-tech animate-fadeInUp">
              Convierte <span className="text-gradient">minutos</span> de tu tiempo en una nueva
              <span className="text-highlight"> habilidad digital</span> que puedes
              <span className="text-gradient">monetizar</span>
            </h1>

            <p className="hero-description-tech animate-fadeInUp delay-200">
              Aprende a crear tu propio <span className="tech-highlight">avatar con inteligencia artificial</span>,
              <strong>sin ser técnico ni experto</strong>. Usa esta herramienta para vender más, ahorrar en producción y destacar en el mundo digital.
              <strong>Cientos de personas como tú</strong> ya están generando contenido y creando nuevas fuentes de ingreso.
            </p>

            <CountdownTimer targetDate={targetDate} />
          </div>

          <div style={{ position: 'relative', marginRight: { xs: '0', md: '100px' } }} className="video-section-tech">
            {/* Efectos holográficos alrededor del video */}
            <div className="hologram-effect">
              <div className="holo-ring holo-ring-1"></div>
              <div className="holo-ring holo-ring-2"></div>
              <div className="holo-ring holo-ring-3"></div>
            </div>

            <div className="video-container-tech animate-fadeInRight">
              {/* Efecto de escaneo */}
              <div className="scan-line"></div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                position: 'relative',
                zIndex: 2
              }}>
                {/* Barra superior estilo Instagram mejorada */}
                <div style={{
                  width: '100%',
                  padding: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(74, 144, 226, 0.3)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)'
                }} className="animate-fadeIn delay-800">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #4A90E2, #9ADAFB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '8px',
                      padding: '2px',
                      overflow: 'hidden',
                      boxShadow: '0 0 15px rgba(74, 144, 226, 0.5)'
                    }} className="animate-scaleIn delay-900 tech-avatar">
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
                    <span style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      textShadow: '0 0 10px rgba(74, 144, 226, 0.5)'
                    }} className="animate-fadeInRight delay-1000">informatik_ai</span>
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      background: 'linear-gradient(45deg, #4A90E2, #E46994)',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>AI</span>
                  </div>
                  <div style={{
                    color: '#4A90E2',
                    fontSize: '18px',
                    filter: 'drop-shadow(0 0 5px #4A90E2)'
                  }} className="animate-fadeIn delay-1000">⚡</div>
                </div>

                {/* Área principal del video con efectos */}
                <div style={{
                  flex: 1,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {/* Efectos de partículas en el video */}
                  <div className="video-particles">
                    <div className="video-particle video-particle-1"></div>
                    <div className="video-particle video-particle-2"></div>
                    <div className="video-particle video-particle-3"></div>
                  </div>
                  <VideoPlayer src="./Demo.mp4" />
                </div>

                {/* Barra inferior estilo Instagram mejorada */}
                <div style={{
                  width: '100%',
                  padding: '10px',
                  borderTop: '1px solid rgba(74, 144, 226, 0.3)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <span style={{
                        color: '#E46994',
                        fontSize: '18px',
                        filter: 'drop-shadow(0 0 5px #E46994)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }} className="tech-icon">💖</span>
                      <span style={{
                        color: '#9ADAFB',
                        fontSize: '18px',
                        filter: 'drop-shadow(0 0 5px #9ADAFB)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }} className="tech-icon">💬</span>
                      <span style={{
                        color: '#4A90E2',
                        fontSize: '18px',
                        filter: 'drop-shadow(0 0 5px #4A90E2)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }} className="tech-icon">🚀</span>
                    </div>
                    <span style={{
                      color: '#C8A2C8',
                      fontSize: '18px',
                      filter: 'drop-shadow(0 0 5px #C8A2C8)'
                    }}>⭐</span>
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '4px',
                    textShadow: '0 0 10px rgba(74, 144, 226, 0.5)'
                  }}>
                    <span className="animate-countUp">2,845</span> likes
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '13px',
                    display: 'flex',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      marginRight: '4px',
                      color: '#4A90E2',
                      textShadow: '0 0 5px rgba(74, 144, 226, 0.5)'
                    }}>informatik_ai</span>
                    <span>Crea tu propio avatar hiperrealista y genera contenido en minutos ✨🤖</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenedor para los badges estadísticos tecnológicos */}
            <div className="stats-badges-container-tech" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              alignItems: 'flex-start',
              position: 'relative',
              zIndex: 10,
              marginTop: '20px'
            }}>
              {/* Primer badge tecnológico */}
              <div className="stat-badge-tech animate-pulse-highlight" style={{
                position: 'relative',
                margin: 0,
                width: '100%',
                maxWidth: '220px'
              }}>
                <div className="badge-tech-glow"></div>
                <div className="badge-tech-content">
                  <div className="badge-icon-tech">⏱️</div>
                  <div>
                    <p className="stat-value-tech">90 min</p>
                    <p className="stat-label-tech">Duración del Taller</p>
                  </div>
                </div>
                <div className="badge-tech-border"></div>
              </div>

              {/* Segundo badge tecnológico */}
              <div className="stat-badge-tech animate-pulse-highlight" style={{
                position: 'relative',
                margin: 0,
                width: '100%',
                maxWidth: '220px',
                animationDelay: '0.5s'
              }}>
                <div className="badge-tech-glow"></div>
                <div className="badge-tech-content">
                  <div className="badge-icon-tech">🛡️</div>
                  <div>
                    <p className="stat-value-tech">100%</p>
                    <p className="stat-label-tech">Garantía de Satisfacción</p>
                  </div>
                </div>
                <div className="badge-tech-border"></div>
              </div>

              {/* Badge adicional tecnológico */}
              <div className="stat-badge-tech animate-pulse-highlight" style={{
                position: 'relative',
                margin: 0,
                width: '100%',
                maxWidth: '220px',
                animationDelay: '1s'
              }}>
                <div className="badge-tech-glow"></div>
                <div className="badge-tech-content">
                  <div className="badge-icon-tech">🤖</div>
                  <div>
                    <p className="stat-value-tech">AI</p>
                    <p className="stat-label-tech">Powered Technology</p>
                  </div>
                </div>
                <div className="badge-tech-border"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
