const PricingOfferSection = () => {
  return (
    <div style={{
      position: 'relative',
      marginBottom: 'clamp(40px, 8vw, 60px)',
      padding: '0'
    }} className="reveal reveal-up">

      {/* Contenedor principal con diseño mejorado */}
      <div style={{
        background: `
          linear-gradient(135deg,
            rgba(74, 144, 226, 0.08) 0%,
            rgba(228, 105, 148, 0.08) 50%,
            rgba(154, 218, 251, 0.08) 100%
          )
        `,
        backdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 'clamp(20px, 4vw, 32px)',
        padding: 'clamp(32px, 6vw, 48px)',
        border: '2px solid rgba(255, 255, 255, 0.1)',
        boxShadow: `
          0 25px 50px rgba(0, 0, 0, 0.1),
          0 8px 32px rgba(74, 144, 226, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.2)
        `,
        position: 'relative',
        overflow: 'hidden'
      }}>

        {/* Elementos decorativos mejorados */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '150px',
          height: '150px',
          background: 'conic-gradient(from 0deg, var(--primary)20, var(--secondary)20, var(--tertiary)20, var(--primary)20)',
          borderRadius: '50%',
          filter: 'blur(20px)',
          animation: 'spin 20s linear infinite',
          zIndex: '0'
        }}></div>

        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '-20px',
          width: '100px',
          height: '100px',
          background: 'radial-gradient(circle, var(--accent)15 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(15px)',
          animation: 'float 8s ease-in-out infinite',
          zIndex: '0'
        }}></div>

        {/* Contenido principal */}
        <div style={{ position: 'relative', zIndex: '2' }}>

          {/* Badge de oferta mejorado */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 'clamp(24px, 5vw, 32px)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--secondary) 100%)',
              borderRadius: '50px',
              color: 'white',
              fontWeight: '800',
              fontSize: 'clamp(16px, 3vw, 20px)',
              boxShadow: '0 8px 25px rgba(228, 105, 148, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              animation: 'pulse 2s infinite'
            }}>
              <span style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}>�</span>
              <span>Oferta Exclusiva por Tiempo Limitado</span>
              <span style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}>🔥</span>
            </div>
          </div>

          {/* Sección de precios mejorada */}
          <div style={{
            textAlign: 'center',
            marginBottom: 'clamp(32px, 6vw, 40px)',
            padding: 'clamp(24px, 5vw, 32px)',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'clamp(16px, 3vw, 24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>

            {/* Precio tachado */}
            <div style={{
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: 'clamp(20px, 4vw, 28px)',
                color: 'var(--theme-text-secondary)',
                textDecoration: 'line-through',
                fontWeight: '600',
                opacity: '0.7',
                position: 'relative'
              }}>
                $100 USD
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-20px',
                  background: '#ef4444',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  ANTES
                </span>
              </span>
            </div>

            {/* Precio actual destacado */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: 'clamp(48px, 10vw, 72px)',
                fontWeight: '900',
                lineHeight: '1',
                textShadow: '0 4px 20px rgba(74, 144, 226, 0.3)',
                position: 'relative'
              }}>
                $30
                <span style={{
                  fontSize: 'clamp(24px, 5vw, 32px)',
                  color: 'var(--theme-text)',
                  fontWeight: '600'
                }}>
                  USD
                </span>

                {/* Badge de descuento */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-40px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: 'clamp(14px, 2.5vw, 18px)',
                  fontWeight: '800',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                  animation: 'bounce 2s infinite'
                }}>
                  -70%
                </div>
              </div>
            </div>

            {/* Mensaje de ahorro */}
            <div style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, var(--tertiary)20, var(--primary)20)',
              borderRadius: '25px',
              border: '2px solid var(--tertiary)',
              color: 'var(--theme-text)',
              fontWeight: '700',
              fontSize: 'clamp(16px, 3vw, 20px)'
            }}>
              💰 ¡Ahorras $70 USD Hoy!
            </div>
          </div>

          {/* Beneficios incluidos mejorados */}
          <div style={{
            background: 'rgba(74, 144, 226, 0.05)',
            borderRadius: 'clamp(16px, 3vw, 20px)',
            padding: 'clamp(20px, 4vw, 28px)',
            border: '2px solid var(--primary)',
            marginBottom: 'clamp(24px, 5vw, 32px)',
            position: 'relative'
          }}>

            {/* Icono de regalo */}
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '20px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)'
            }}>
              🎁 BONOS INCLUIDOS
            </div>

            <div style={{
              marginTop: '16px',
              fontSize: 'clamp(16px, 3vw, 20px)',
              lineHeight: '1.6',
              color: 'var(--theme-text)'
            }}>
              <strong>3 Bonos de Acción Rápida</strong> (valorados en $50 USD) +
              <span style={{
                color: 'var(--primary)',
                fontWeight: '700',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {' '}Garantía Total de Satisfacción
              </span>
            </div>
          </div>

          {/* Call to action mejorado */}
          <div style={{
            textAlign: 'center',
            padding: 'clamp(20px, 4vw, 28px)',
            background: `
              linear-gradient(135deg,
                rgba(228, 105, 148, 0.1) 0%,
                rgba(74, 144, 226, 0.1) 100%
              )
            `,
            borderRadius: 'clamp(16px, 3vw, 20px)',
            border: '2px dashed var(--accent)',
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Efecto de brillo */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              animation: 'shimmer 3s infinite',
              zIndex: '1'
            }}></div>

            <div style={{
              position: 'relative',
              zIndex: '2',
              fontSize: 'clamp(20px, 4vw, 28px)',
              fontWeight: '800',
              color: 'var(--accent)',
              textShadow: '0 2px 10px rgba(228, 105, 148, 0.3)'
            }}>
              � ¡Asegura Tu Cupo y Empieza a Generar Ingresos con IA!
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PricingOfferSection;
