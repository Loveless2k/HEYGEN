// Función para reproducir un sonido al hacer hover sobre el botón
document.addEventListener('DOMContentLoaded', () => {
  // Crear un elemento de audio
  const hoverSound = new Audio();
  hoverSound.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADwAD///////////////////////////////////////////8AAAA8TEFNRTMuMTAwAc0AAAAAAAAAABSAJAJAQgAAgAAAA8DcWTzUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
  hoverSound.volume = 0.3; // Ajustar volumen

  // Función para reproducir el sonido
  function playHoverSound() {
    hoverSound.currentTime = 0;
    hoverSound.play().catch(() => {
      // Error al reproducir sonido
    });
  }

  // Agregar el evento de hover al botón
  function setupHoverSound() {
    const floatingBtn = document.querySelector('.btn-animated');
    if (floatingBtn) {
      floatingBtn.addEventListener('mouseenter', playHoverSound);
    } else {
      // Si el botón aún no existe, intentar de nuevo en 500ms
      setTimeout(setupHoverSound, 500);
    }
  }

  // Iniciar la configuración
  setupHoverSound();
});
