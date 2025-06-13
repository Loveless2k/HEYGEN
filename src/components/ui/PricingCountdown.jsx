import { useCountdown } from '../../hooks/useCountdown';

const PricingCountdown = () => {
  // Fecha límite: 10 de junio de 2025 a las 11:59 (horario Chile)
  const targetDate = new Date('2025-06-20T23:59:00-04:00'); // UTC-4 para Chile
  const timeLeft = useCountdown(targetDate);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      marginBottom: '40px',
      position: 'relative'
    }} className="reveal reveal-up delay-300">
      {/* Etiqueta de urgencia */}
      <div style={{
        position: 'absolute',
        top: '-15px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #FF3B30, #FF9500)',
        color: 'white',
        padding: '6px 16px',
        borderRadius: '30px',
        fontSize: '14px',
        fontWeight: '700',
        boxShadow: '0 4px 15px rgba(255, 59, 48, 0.3)',
        zIndex: '10',
        whiteSpace: 'nowrap'
      }}>
        ¡OFERTA POR TIEMPO LIMITADO!
      </div>
      
      <div className="countdown-grid" style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(15px)',
        padding: 'clamp(20px, 4vw, 30px) clamp(15px, 3vw, 25px)',
        borderRadius: '20px',
        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div className="countdown-item animate-scaleIn delay-400">
          <div className="countdown-box animate-pulse-highlight" style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.4)', 
            border: '2px solid var(--primary)',
            boxShadow: '0 8px 25px rgba(74, 144, 226, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <span className="countdown-value" style={{ 
              color: 'white',
              textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
            }}>{timeLeft.days.toString().padStart(2, '0')}</span>
          </div>
          <span className="countdown-label" style={{ 
            color: 'white',
            fontWeight: '600',
            fontSize: 'clamp(14px, 2vw, 16px)',
            textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
          }}>Días</span>
        </div>
        <div className="countdown-item animate-scaleIn delay-500">
          <div className="countdown-box animate-pulse-highlight" style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.4)', 
            border: '2px solid var(--secondary)',
            boxShadow: '0 8px 25px rgba(228, 105, 148, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <span className="countdown-value" style={{ 
              color: 'white',
              textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
            }}>{timeLeft.hours.toString().padStart(2, '0')}</span>
          </div>
          <span className="countdown-label" style={{ 
            color: 'white',
            fontWeight: '600',
            fontSize: 'clamp(14px, 2vw, 16px)',
            textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
          }}>Horas</span>
        </div>
        <div className="countdown-item animate-scaleIn delay-600">
          <div className="countdown-box animate-pulse-highlight" style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.4)', 
            border: '2px solid var(--tertiary)',
            boxShadow: '0 8px 25px rgba(154, 218, 251, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <span className="countdown-value" style={{ 
              color: 'white',
              textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
            }}>{timeLeft.minutes.toString().padStart(2, '0')}</span>
          </div>
          <span className="countdown-label" style={{ 
            color: 'white',
            fontWeight: '600',
            fontSize: 'clamp(14px, 2vw, 16px)',
            textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
          }}>Minutos</span>
        </div>
        <div className="countdown-item animate-scaleIn delay-700">
          <div className="countdown-box animate-pulse-highlight" style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.4)', 
            border: '2px solid var(--accent)',
            boxShadow: '0 8px 25px rgba(200, 162, 200, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <span className="countdown-value" style={{ 
              color: 'white',
              textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
            }}>{timeLeft.seconds.toString().padStart(2, '0')}</span>
          </div>
          <span className="countdown-label" style={{ 
            color: 'white',
            fontWeight: '600',
            fontSize: 'clamp(14px, 2vw, 16px)',
            textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)'
          }}>Segundos</span>
        </div>
      </div>
    </div>
  );
};

export default PricingCountdown;
