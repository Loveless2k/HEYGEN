import { useState, useEffect } from 'react';

export const useCountdown = (targetDate) => {
  // Estado para el tiempo restante
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Inicializar el tiempo restante
  useEffect(() => {
    // Función para calcular el tiempo restante hasta la fecha límite
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate - now;

      // Si la fecha ya pasó, devolver todos ceros
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      // Calcular días, horas, minutos y segundos
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    // Establecer el tiempo inicial
    setTimeLeft(calculateTimeLeft());

    // Actualizar cada segundo
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(timer);
  }, [targetDate.getTime()]); // Usar getTime() para obtener un valor primitivo estable

  return timeLeft;
};
