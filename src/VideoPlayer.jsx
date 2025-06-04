import { useEffect, useRef, useState } from 'react';

function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasAutoplayedOnce, setHasAutoplayedOnce] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(false);

  // Manejar el evento de finalización del video
  const handleVideoEnd = () => {
    setVideoEnded(true);
    setIsPaused(true);
  };

  // Manejar el evento de pausa del video
  const handlePause = () => {
    setIsPaused(true);
  };

  // Manejar el evento de reproducción del video
  const handlePlay = () => {
    setIsPaused(false);
    setVideoEnded(false);
  };

  // Reproducir o pausar el video cuando el usuario lo solicita
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoEnded) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // Error al reproducir el video
        });
        setVideoEnded(false);
        setIsPaused(false);
      } else if (isPaused) {
        videoRef.current.play().catch(() => {
          // Error al reproducir el video
        });
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  // Manejar cambios en el volumen
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  // Reproducir el video cuando el usuario lo solicita (para el botón central)
  const handleReplay = () => {
    if (videoRef.current) {
      if (videoEnded) {
        videoRef.current.currentTime = 0;
      }
      videoRef.current.play().catch(() => {
        // Error al reproducir el video
      });
      setVideoEnded(false);
      setIsPaused(false);
    }
  };

  // Asegurarse de que el video se reproduzca automáticamente con sonido al cargar la página
  // pero solo una vez
  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement && !hasAutoplayedOnce) {
      // Asegurarnos de que el video no esté silenciado
      videoElement.muted = false;

      // Función para intentar reproducir el video con sonido
      const attemptAutoplayWithSound = () => {
        // Solo intentar reproducir automáticamente si no se ha hecho antes
        if (hasAutoplayedOnce) return;

        // Asegurarnos de que el volumen esté al máximo
        videoElement.volume = 1.0;

        // Intentar reproducir con sonido
        videoElement.play().catch(error => {
          // Si falla, intentamos una estrategia alternativa
          if (error.name === 'NotAllowedError') {
            // Crear un evento de interacción de usuario simulado
            const userInteraction = () => {
              // Solo intentar reproducir si no se ha hecho antes
              if (hasAutoplayedOnce) return;

              // Quitar el silencio y reproducir
              videoElement.muted = false;
              videoElement.play().then(() => {
                setHasAutoplayedOnce(true);
              }).catch(() => {
                // No se pudo reproducir después de la interacción
              });

              // Eliminar los event listeners una vez que se ha reproducido
              document.removeEventListener('click', userInteraction);
              document.removeEventListener('touchstart', userInteraction);
              document.removeEventListener('keydown', userInteraction);
            };

            // Agregar event listeners para capturar la primera interacción del usuario
            document.addEventListener('click', userInteraction, { once: true });
            document.addEventListener('touchstart', userInteraction, { once: true });
            document.addEventListener('keydown', userInteraction, { once: true });

            // Mientras tanto, reproducir en silencio
            videoElement.muted = true;
            videoElement.play().then(() => {
              setHasAutoplayedOnce(true);
            }).catch(() => {
              // Error al reproducir el video incluso en silencio
            });
          }
        });
      };

      // Intentar reproducir inmediatamente
      attemptAutoplayWithSound();

      // Escuchar el evento loadeddata para asegurarse de que el video está listo
      videoElement.addEventListener('loadeddata', attemptAutoplayWithSound);

      // Intentar reproducir después de un breve retraso (a veces ayuda)
      setTimeout(attemptAutoplayWithSound, 1000);
    }

    return () => {
      // Limpiar al desmontar
      if (videoElement) {
        videoElement.pause();
        videoElement.removeEventListener('loadeddata', () => {});
      }
    };
  }, [hasAutoplayedOnce]);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted={false}
        preload="auto"
        onEnded={handleVideoEnd}
        onPause={handlePause}
        onPlay={handlePlay}
        onClick={handlePlayPause}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: 'black',
          maxWidth: '100%', /* Asegura que el video no se desborde */
          borderRadius: '4px', /* Bordes redondeados para mejor apariencia */
          cursor: 'pointer' /* Indica que se puede hacer clic */
        }}
      />

      {/* Mostrar el botón de reproducción cuando el video está pausado o ha terminado */}
      {(isPaused || videoEnded) && (
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.3s ease',
              animation: 'pulse 2s infinite'
            }}
            onClick={handleReplay}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(145, 182, 182, 0.8)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div
              style={{
                width: '0',
                height: '0',
                borderTop: '15px solid transparent',
                borderBottom: '15px solid transparent',
                borderLeft: '25px solid white',
                marginLeft: '5px', // Ajustado para centrar mejor el triángulo
                filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))'
              }}
            />
          </div>
        </div>
      )}

      {/* Controles personalizados que aparecen al pasar el mouse */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20,
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
            transition: 'opacity 0.3s ease'
          }}
        >
          {/* Botón de reproducción/pausa */}
          <button
            onClick={handlePlayPause}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '10px'
            }}
          >
            {isPaused ? '▶' : '❚❚'}
          </button>

          {/* Control de volumen */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: 'white', marginRight: '5px', fontSize: '16px' }}>
              {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              style={{
                width: '80px',
                accentColor: 'var(--primary, #91b6b6)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
