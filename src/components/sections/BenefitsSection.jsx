const BenefitsSection = () => {
  return (
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
  );
};

export default BenefitsSection;
