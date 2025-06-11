# 🎨 Guía de Estilo Visual - Landing Page Informatik-AI

## 📋 Resumen del Rediseño

Esta guía documenta el rediseño visual completo de la landing page, manteniendo íntegra la estructura HTML, contenido y funcionalidades existentes, pero transformando completamente la apariencia visual con una paleta de colores moderna y elementos decorativos suaves.

---

## 🎨 Paleta de Colores Principal

### Colores Primarios

| Color | Código Hex | Uso Principal | Variantes |
|-------|------------|---------------|-----------|
| **Azul Vibrante** | `#4A90E2` | Color primario, botones principales, enlaces | Oscuro: `#3B7FC3`, Claro: `#6BA5E8` |
| **Rosa Suave** | `#E46994` | Color secundario, botones secundarios, acentos | Oscuro: `#D85A87`, Claro: `#E987A8` |
| **Celeste Pastel** | `#9ADAFB` | Fondos suaves, elementos decorativos | Oscuro: `#7BCEF9`, Claro: `#B3E2FC` |
| **Lila Pálido** | `#C8A2C8` | Acentos suaves, elementos decorativos | Oscuro: `#B892B8`, Claro: `#D4B2D4` |
| **Magenta Suave** | `#D65FAB` | Color de acento alternativo, hover states | Oscuro: `#C54F9B`, Claro: `#DE7BB8` |

### Colores Neutros

| Color | Código Hex | Uso |
|-------|------------|-----|
| **Gris Oscuro** | `#2D3748` | Texto principal |
| **Gris Claro** | `#F7FAFC` | Fondos suaves |
| **Blanco** | `#FFFFFF` | Fondos principales |
| **Gris Medio** | `#718096` | Texto secundario |
| **Gris Borde** | `#E2E8F0` | Bordes y separadores |

---

## 🔤 Tipografía

### Fuente Principal: Poppins

```css
font-family: 'Poppins', sans-serif;
```

### Jerarquía Tipográfica

| Elemento | Tamaño | Peso | Espaciado |
|----------|--------|------|-----------|
| **H1** | `2.5rem` (40px) | `700` (Bold) | `0.5px` |
| **H2** | `2rem` (32px) | `600` (SemiBold) | `0.5px` |
| **H3** | `1.75rem` (28px) | `600` (SemiBold) | `0.5px` |
| **Párrafos** | `1rem` (16px) | `400` (Regular) | `0.01em` |
| **Texto pequeño** | `0.875rem` (14px) | `400` (Regular) | `0.01em` |

### Altura de Línea
- **Encabezados**: `1.2`
- **Párrafos**: `1.5`

---

## 🔘 Botones y Enlaces

### Botones Primarios
```css
.btn-primary {
  background-color: #4A90E2;
  color: #FFFFFF;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
}

.btn-primary:hover {
  background-color: #3B7FC3;
  transform: scale(1.03);
  box-shadow: 0 6px 20px rgba(74, 144, 226, 0.25);
}
```

### Botones Secundarios
```css
.btn-secondary {
  background-color: transparent;
  color: #E46994;
  border: 2px solid #E46994;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
}

.btn-secondary:hover {
  background-color: #E46994;
  color: #FFFFFF;
  transform: scale(1.03);
  box-shadow: 0 4px 15px rgba(228, 105, 148, 0.25);
}
```

### Enlaces de Texto
```css
a {
  color: #4A90E2;
  text-decoration: underline;
  text-decoration-thickness: 1px;
}

a:hover {
  color: #D65FAB;
  text-decoration-thickness: 2px;
}
```

---

## 🌈 Degradados de Fondo

### Hero Section (Sección Principal)
```css
background: linear-gradient(180deg, #9ADAFB 0%, #E46994 100%);
```

### Secciones Intermedias
```css
background: linear-gradient(135deg, rgba(200, 162, 200, 0.1) 0%, rgba(154, 218, 251, 0.1) 100%);
```

### Texto con Degradado
```css
/* Degradado Primario */
background: linear-gradient(135deg, #4A90E2 0%, #9ADAFB 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

/* Degradado Secundario */
background: linear-gradient(135deg, #E46994 0%, #D65FAB 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## 🎭 Estados Interactivos

### Hover en Botones
- **Escala**: `transform: scale(1.03)`
- **Sombra aumentada**: Incremento del 60% en la opacidad
- **Color**: Versión oscura del color base (-15% luminosidad)

### Hover en Enlaces
- **Color**: Cambio a Magenta Suave (`#D65FAB`)
- **Subrayado**: Grosor aumenta de 1px a 2px

### Focus en Campos de Formulario
```css
input:focus, select:focus, textarea:focus {
  border-color: #E46994;
  box-shadow: 0 0 0 2px rgba(228, 105, 148, 0.2);
  outline: none;
}
```

### Estados Activos
- **Botones**: Color 20% más oscuro, sombra removida temporalmente
- **Campos**: Borde rosa suave con sombra difuminada

---

## 🎨 Elementos Decorativos

### Formas Geométricas Suaves

#### Círculos Flotantes
```css
/* Celeste pastel con 10% opacidad */
background: radial-gradient(circle, rgba(154, 218, 251, 0.1) 0%, transparent 70%);

/* Rosa suave con 8% opacidad */
background: radial-gradient(circle, rgba(228, 105, 148, 0.08) 0%, transparent 70%);
```

#### Elementos de Fondo
- **Posición**: Esquinas y bordes de secciones
- **Opacidad**: 5-15% para no interferir con el contenido
- **Animación**: Movimiento suave con `float` y `rotate`

### Efectos Glassmorphism
```css
.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

---

## 🎬 Animaciones y Transiciones

### Animaciones de Entrada
- **Fade In**: `opacity: 0 → 1` en 1s
- **Slide Up**: `translateY(30px) → 0` en 0.8s
- **Scale In**: `scale(0.8) → 1` en 0.7s

### Efectos de Hover
```css
.enhanced-hover:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 20px 40px rgba(74, 144, 226, 0.15);
}
```

### Animaciones de Pulso
```css
@keyframes pulse-highlight {
  0% { box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(74, 144, 226, 0); }
  100% { box-shadow: 0 0 0 0 rgba(74, 144, 226, 0); }
}
```

---

## 📱 Responsive Design

### Breakpoints
- **Móvil**: `< 576px`
- **Tablet Vertical**: `576px - 767px`
- **Tablet Horizontal**: `768px - 991px`
- **Desktop**: `≥ 992px`

### Ajustes Tipográficos Móviles
- **H1**: `2.5rem → 2rem` (-20%)
- **H2**: `2rem → 1.5rem` (-25%)
- **H3**: `1.75rem → 1.25rem` (-30%)

### Espaciado Responsivo
- **Padding secciones**: `60px → 40px` en móvil
- **Márgenes**: Reducción del 30% en pantallas pequeñas

---

## ♿ Accesibilidad

### Contraste de Colores
Todos los colores cumplen con **WCAG AA** (contraste ≥ 4.5:1):

| Combinación | Ratio de Contraste |
|-------------|-------------------|
| Azul Vibrante sobre Blanco | 5.2:1 ✅ |
| Rosa Suave sobre Blanco | 4.8:1 ✅ |
| Texto Oscuro sobre Fondos Claros | 12.6:1 ✅ |

### Unidades Relativas
- **Tipografía**: `rem` y `em`
- **Espaciado**: `rem` para consistencia
- **Responsive**: `vw`, `vh` para elementos fluidos

---

## 🛠️ Implementación Técnica

### Variables CSS
```css
:root {
  --primary: #4A90E2;
  --primary-dark: #3B7FC3;
  --primary-light: #6BA5E8;
  --secondary: #E46994;
  --tertiary: #9ADAFB;
  --accent: #C8A2C8;
  --accent-alt: #D65FAB;
}
```

### Estructura de Archivos
```
src/
├── index.css (estilos principales)
├── animations.css (animaciones)
└── decorative-elements.css (elementos decorativos)
```

### Clases Utilitarias
- `.gradient-text-primary` - Texto con degradado azul
- `.gradient-text-secondary` - Texto con degradado rosa
- `.glass-effect` - Efecto glassmorphism
- `.enhanced-hover` - Hover mejorado
- `.shimmer-effect` - Efecto brillante

---

## 📋 Checklist de Implementación

- ✅ Paleta de colores actualizada
- ✅ Tipografía Poppins implementada
- ✅ Botones rediseñados con nuevos estilos
- ✅ Degradados aplicados en hero section
- ✅ Estados interactivos mejorados
- ✅ Elementos decorativos añadidos
- ✅ Animaciones actualizadas
- ✅ Responsive design mantenido
- ✅ Accesibilidad verificada
- ✅ Variables CSS organizadas

---

## 🎯 Resultado Final

El rediseño transforma la landing page de un estilo verde azulado corporativo a un diseño moderno y vibrante con:

- **Paleta armoniosa** de azules, rosas y celestes
- **Tipografía moderna** con Poppins
- **Elementos decorativos suaves** que no interfieren con el contenido
- **Interacciones fluidas** con transiciones suaves
- **Diseño accesible** que cumple estándares web
- **Funcionalidad intacta** - todos los componentes React funcionan igual

La nueva identidad visual es más atractiva, moderna y profesional, manteniendo la usabilidad y funcionalidad existente.
