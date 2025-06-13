import { useCountdown } from '../../hooks/useCountdown';

const CountdownTimer = ({ targetDate }) => {
  const timeLeft = useCountdown(targetDate);

  return (
    <div className="countdown-container animate-fadeInUp delay-300">
      <h3 className="countdown-title" style={{ fontWeight: '700' }}>⏳ El mundo digital no espera. ¿Y tú?</h3>
      <p style={{ marginBottom: '15px' }}>Accede a este taller solo por tiempo limitado.<br />Da el primer paso hoy y evita quedarte atrás.</p>
      <p style={{ fontWeight: '600', marginBottom: '10px' }}>El acceso cierra en:</p>
      <div className="countdown-grid">
        <div className="countdown-item animate-scaleIn delay-400">
          <div className="countdown-box animate-pulse-highlight">
            <span className="countdown-value">{timeLeft.days.toString().padStart(2, '0')}</span>
          </div>
          <span className="countdown-label">Días</span>
        </div>
        <div className="countdown-item animate-scaleIn delay-500">
          <div className="countdown-box animate-pulse-highlight">
            <span className="countdown-value">{timeLeft.hours.toString().padStart(2, '0')}</span>
          </div>
          <span className="countdown-label">Horas</span>
        </div>
        <div className="countdown-item animate-scaleIn delay-600">
          <div className="countdown-box animate-pulse-highlight">
            <span className="countdown-value">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          </div>
          <span className="countdown-label">Minutos</span>
        </div>
        <div className="countdown-item animate-scaleIn delay-700">
          <div className="countdown-box animate-pulse-highlight">
            <span className="countdown-value">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          </div>
          <span className="countdown-label">Segundos</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
