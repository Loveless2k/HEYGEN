const PricingOfferSection = () => {
  return (
    <section className="pricing-offer-section reveal reveal-up" style={{
      position: 'relative',
      marginBottom: 'clamp(40px, 8vw, 60px)',
      padding: 'clamp(10px, 3vw, 20px)'
    }}>

      {/* Contenedor principal moderno y responsivo */}
      <div className="pricing-offer-container" style={{
        background: `
          linear-gradient(135deg,
            rgba(74, 144, 226, 0.12) 0%,
            rgba(228, 105, 148, 0.12) 50%,
            rgba(154, 218, 251, 0.12) 100%
          )
        `,
        backdropFilter: 'blur(25px) saturate(200%)',
        borderRadius: 'clamp(20px, 5vw, 40px)',
        padding: 'clamp(24px, 6vw, 56px)',
        border: '3px solid rgba(255, 255, 255, 0.15)',
        boxShadow: `
          0 30px 60px rgba(0, 0, 0, 0.12),
          0 12px 40px rgba(74, 144, 226, 0.2),
          inset 0 2px 0 rgba(255, 255, 255, 0.25),
          0 0 0 1px rgba(74, 144, 226, 0.1)
        `,
        position: 'relative',
        overflow: 'hidden',
        maxWidth: '900px',
        margin: '0 auto'
      }}>

        {/* Elementos decorativos modernos y responsivos */}
        <div className="decorative-element-top" style={{
          position: 'absolute',
          top: 'clamp(-20px, -4vw, -30px)',
          right: 'clamp(-20px, -4vw, -30px)',
          width: 'clamp(100px, 20vw, 180px)',
          height: 'clamp(100px, 20vw, 180px)',
          background: 'conic-gradient(from 0deg, var(--primary)25, var(--secondary)25, var(--tertiary)25, var(--primary)25)',
          borderRadius: '50%',
          filter: 'blur(clamp(15px, 4vw, 25px))',
          animation: 'spin 20s linear infinite',
          zIndex: '0'
        }}></div>

        <div className="decorative-element-bottom" style={{
          position: 'absolute',
          bottom: 'clamp(-15px, -3vw, -25px)',
          left: 'clamp(-15px, -3vw, -25px)',
          width: 'clamp(80px, 15vw, 120px)',
          height: 'clamp(80px, 15vw, 120px)',
          background: 'radial-gradient(circle, var(--accent)20 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(clamp(10px, 3vw, 18px))',
          animation: 'float 8s ease-in-out infinite',
          zIndex: '0'
        }}></div>

        {/* Partículas flotantes adicionales */}
        <div className="floating-particles">
          <div className="particle particle-1" style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '6px',
            height: '6px',
            background: 'var(--primary)',
            borderRadius: '50%',
            animation: 'float 4s ease-in-out infinite',
            opacity: '0.6'
          }}></div>
          <div className="particle particle-2" style={{
            position: 'absolute',
            top: '60%',
            right: '15%',
            width: '4px',
            height: '4px',
            background: 'var(--secondary)',
            borderRadius: '50%',
            animation: 'float 6s ease-in-out infinite reverse',
            opacity: '0.4'
          }}></div>
          <div className="particle particle-3" style={{
            position: 'absolute',
            bottom: '30%',
            left: '70%',
            width: '5px',
            height: '5px',
            background: 'var(--tertiary)',
            borderRadius: '50%',
            animation: 'float 5s ease-in-out infinite',
            opacity: '0.5'
          }}></div>
        </div>

        {/* Contenido principal */}
        <div style={{ position: 'relative', zIndex: '2' }}>

          {/* Badge de oferta moderno y responsivo */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 'clamp(28px, 6vw, 40px)'
          }}>
            <div className="offer-badge-modern" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'clamp(8px, 2vw, 16px)',
              padding: 'clamp(12px, 3vw, 18px) clamp(20px, 5vw, 32px)',
              background: `
                linear-gradient(135deg,
                  var(--accent) 0%,
                  var(--secondary) 50%,
                  var(--primary) 100%
                )
              `,
              borderRadius: '60px',
              color: 'white',
              fontWeight: '900',
              fontSize: 'clamp(20px, 4vw, 28px)',
              boxShadow: `
                0 12px 30px rgba(228, 105, 148, 0.4),
                0 4px 15px rgba(74, 144, 226, 0.3),
                inset 0 2px 0 rgba(255, 255, 255, 0.3)
              `,
              border: '3px solid rgba(255, 255, 255, 0.25)',
              animation: 'pulse 2s infinite',
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}>
              {/* Efecto de brillo interno */}
              <div style={{
                position: 'absolute',
                top: '0',
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 3s infinite',
                zIndex: '1'
              }}></div>

              <span style={{
                fontSize: 'clamp(24px, 5vw, 32px)',
                position: 'relative',
                zIndex: '2'
              }}>⚡</span>
              <span className="offer-text" style={{
                position: 'relative',
                zIndex: '2',
                textShadow: '0 10px 10px rgba(0, 0, 0, 0.3)'
              }}>Oferta Exclusiva por Tiempo Limitado</span>
              <span style={{
                fontSize: 'clamp(24px, 5vw, 32px)',
                position: 'relative',
                zIndex: '2'
              }}>🔥</span>
            </div>
          </div>

          {/* Sección de precios moderna y responsiva */}
          <div className="pricing-section-modern" style={{
            textAlign: 'center',
            marginBottom: 'clamp(36px, 7vw, 48px)',
            padding: 'clamp(28px, 6vw, 40px)',
            background: `
              linear-gradient(135deg,
                rgba(255, 255, 255, 0.08) 0%,
                rgba(74, 144, 226, 0.08) 100%
              )
            `,
            borderRadius: 'clamp(20px, 4vw, 32px)',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            boxShadow: `
              0 15px 35px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `,
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Efecto de fondo sutil */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'radial-gradient(circle at center, rgba(74, 144, 226, 0.05) 0%, transparent 70%)',
              zIndex: '0'
            }}></div>

            {/* Contenido de precios */}
            <div style={{ position: 'relative', zIndex: '1' }}>
              {/* Precio tachado mejorado */}
              <div style={{
                marginBottom: '20px'
              }}>
                <span style={{
                  fontSize: 'clamp(28px, 6vw, 38px)',
                  color: 'var(--theme-text-secondary)',
                  textDecoration: 'line-through',
                  fontWeight: '700',
                  opacity: '0.6',
                  position: 'relative'
                }}>
                  $100 USD
                  <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-25px',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '15px',
                    fontSize: 'clamp(14px, 2.5vw, 18px)',
                    fontWeight: '800',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                  }}>
                    ANTES
                  </span>
                </span>
              </div>

              {/* Precio actual destacado moderno */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '24px',
                position: 'relative'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 50%, var(--secondary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: 'clamp(64px, 14vw, 96px)',
                  fontWeight: '900',
                  lineHeight: '0.9',
                  textShadow: '0 6px 25px rgba(74, 144, 226, 0.4)',
                  position: 'relative',
                  filter: 'drop-shadow(0 4px 8px rgba(74, 144, 226, 0.3))'
                }}>
                  $30
                  <span style={{
                    fontSize: 'clamp(32px, 7vw, 44px)',
                    color: 'var(--theme-text)',
                    fontWeight: '700',
                    marginLeft: '8px'
                  }}>
                    USD
                  </span>

                  {/* Badge de descuento mejorado */}
                  <div style={{
                    position: 'absolute',
                    top: 'clamp(-15px, -3vw, -20px)',
                    right: 'clamp(-30px, -6vw, -50px)',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 20px)',
                    borderRadius: '25px',
                    fontSize: 'clamp(18px, 4vw, 24px)',
                    fontWeight: '900',
                    boxShadow: `
                      0 6px 20px rgba(16, 185, 129, 0.5),
                      0 2px 8px rgba(16, 185, 129, 0.3)
                    `,
                    animation: 'bounce 2s infinite',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                  }}>
                    -70%
                  </div>
                </div>
              </div>

              {/* Mensaje de ahorro mejorado */}
              <div style={{
                display: 'inline-block',
                padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 32px)',
                background: `
                  linear-gradient(135deg,
                    rgba(200, 162, 200, 0.2) 0%,
                    rgba(74, 144, 226, 0.2) 100%
                  )
                `,
                borderRadius: '30px',
                border: '3px solid var(--tertiary)',
                color: 'var(--theme-text)',
                fontWeight: '800',
                fontSize: 'clamp(20px, 5vw, 28px)',
                boxShadow: `
                  0 8px 20px rgba(200, 162, 200, 0.3),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2)
                `,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                💰 ¡Ahorras $70 USD Hoy!
              </div>
            </div>
          </div>

          {/* Beneficios incluidos modernos */}
          <div className="benefits-section-modern" style={{
            background: `
              linear-gradient(135deg,
                rgba(74, 144, 226, 0.08) 0%,
                rgba(154, 218, 251, 0.08) 100%
              )
            `,
            borderRadius: 'clamp(20px, 4vw, 28px)',
            padding: 'clamp(24px, 5vw, 36px)',
            border: '3px solid var(--primary)',
            marginBottom: 'clamp(28px, 6vw, 40px)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `
              0 12px 30px rgba(74, 144, 226, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `
          }}>

            {/* Efecto de fondo sutil */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'radial-gradient(circle at top right, rgba(154, 218, 251, 0.1) 0%, transparent 50%)',
              zIndex: '0'
            }}></div>

            {/* Icono de regalo mejorado */}
            <div style={{
              position: 'absolute',
              top: '-1px',
              left: '24px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white',
              padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
              borderRadius: '25px',
              fontSize: 'clamp(12px, 2.5vw, 16px)',
              fontWeight: '800',
              boxShadow: `
                0 6px 18px rgba(74, 144, 226, 0.4),
                0 2px 8px rgba(74, 144, 226, 0.2)
              `,
              border: '2px solid rgba(255, 255, 255, 0.3)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              🎁 BONOS INCLUIDOS
            </div>

            <div style={{
              marginTop: '20px',
              fontSize: 'clamp(16px, 4vw, 22px)',
              lineHeight: '1.6',
              color: 'var(--theme-text)',
              position: 'relative',
              zIndex: '1'
            }}>
              <strong style={{ fontWeight: '800' }}>3 Bonos de Acción Rápida</strong>
              <span style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: 'clamp(12px, 2.5vw, 16px)',
                fontWeight: '700',
                marginLeft: '8px',
                marginRight: '8px'
              }}>
                valorados en $50 USD
              </span> +
              <span style={{
                color: 'var(--primary)',
                fontWeight: '800',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 1px 2px rgba(74, 144, 226, 0.3)'
              }}>
                {' '}Garantía Total de Satisfacción
              </span>
            </div>
          </div>

          {/* Call to action moderno y atractivo */}
          <div className="cta-section-modern" style={{
            textAlign: 'center',
            padding: 'clamp(24px, 5vw, 36px)',
            background: `
              linear-gradient(135deg,
                rgba(228, 105, 148, 0.15) 0%,
                rgba(74, 144, 226, 0.15) 50%,
                rgba(154, 218, 251, 0.15) 100%
              )
            `,
            borderRadius: 'clamp(20px, 4vw, 28px)',
            border: '3px dashed var(--accent)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `
              0 15px 35px rgba(228, 105, 148, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `
          }}>

            {/* Efecto de brillo mejorado */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 4s infinite',
              zIndex: '1'
            }}></div>

            {/* Partículas decorativas */}
            <div style={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              width: '8px',
              height: '8px',
              background: 'var(--accent)',
              borderRadius: '50%',
              animation: 'float 3s ease-in-out infinite',
              opacity: '0.6'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '70%',
              right: '15%',
              width: '6px',
              height: '6px',
              background: 'var(--primary)',
              borderRadius: '50%',
              animation: 'float 4s ease-in-out infinite reverse',
              opacity: '0.5'
            }}></div>

            <div style={{
              position: 'relative',
              zIndex: '2',
              fontSize: 'clamp(22px, 5vw, 32px)',
              fontWeight: '900',
              color: 'var(--accent)',
              textShadow: '0 3px 12px rgba(228, 105, 148, 0.4)',
              lineHeight: '1.3'
            }}>
              🚀 ¡Asegura Tu Cupo y Empieza a Generar Ingresos con IA!
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default PricingOfferSection;
