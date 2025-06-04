import { useEffect } from 'react';

function ScrollReveal() {
  useEffect(() => {
    // Función para manejar la animación de elementos al hacer scroll
    const handleScrollAnimation = () => {
      const reveals = document.querySelectorAll('.reveal');
      
      for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        const elementTop = reveals[i].getBoundingClientRect().top;
        const elementVisible = 150; // Distancia en px desde donde se activa la animación
        
        if (elementTop < windowHeight - elementVisible) {
          reveals[i].classList.add('active');
        }
      }
    };
    
    // Ejecutar la función al cargar la página
    handleScrollAnimation();
    
    // Agregar event listener para el scroll
    window.addEventListener('scroll', handleScrollAnimation);
    
    // Limpiar event listener al desmontar
    return () => {
      window.removeEventListener('scroll', handleScrollAnimation);
    };
  }, []);
  
  return null; // Este componente no renderiza nada
}

export default ScrollReveal;
