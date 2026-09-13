# Especificaciones de Frontend (React PWA) Detallada

La migración desde una App Android a una PWA requiere alcanzar un alto nivel de rendimiento, sensación de aplicación nativa, e interacción dinámica. 

## 1. Patrones de Diseño y UX/UI (Aesthetics)
El diseño debe generar un efecto "WOW". Para ello, nos alejaremos de interfaces planas básicas.

### 1.1 Sistema de Diseño Moderno
- **TailwindCSS (V4/V3):** Adoptar Tailwind para lograr consistencia, con una paleta de colores cuidadosamente seleccionada (tonos oscuros elegantes, acentos vibrantes tipo neón para botones de acción principal).
- **Tipografía Premium:** Utilizar fuentes modernas de Google Fonts, por ejemplo, *Inter* para interfaz general y *Outfit* o *Poppins* para encabezados y números destacados de los cartones.
- **Glassmorphism:** Implementar efectos de desenfoque de fondo en modales y barras de navegación (`backdrop-blur`) para un diseño elegante.
- **Modo Oscuro como estándar:** Diseñar *Dark Mode First*, ideal para uso prolongado en eventos de bingo, reduciendo la fatiga visual de los vendedores.

### 1.2 Micro-Animaciones
- **Framer Motion:** Integrar framer-motion para transiciones suaves de página y micro-animaciones.
- Ejemplos concretos:
  - Al seleccionar un cartón para reserva, el cartón debe elevarse ligeramente con una sombra dinámica.
  - El botón de pago debe tener retroalimentación de carga visual integrada.
  - Notificaciones *toast* estilizadas que se deslizan suavemente.

---

## 2. Optimistic UI Updates (Gestión de Estado)
La velocidad percibida es crucial para los vendedores. Si un vendedor hace tap en "Vender", la interfaz debe reaccionar en milisegundos.

### 2.1 Implementación con React Query / SWR
- **Mutaciones Optimistas:** Cuando el vendedor confirma la venta, React Query actualizará la caché local (haciendo que el cartón se vea "Vendido" inmediatamente) y hará la petición al backend en segundo plano.
- **Rollback:** Si la petición HTTP falla (ej. pérdida de conexión), el estado se revierte y se muestra un error localizado.

### 2.2 Sincronización Background
- Uso de polling inteligente o WebSockets (ver spec de funcionalidades) para re-validar la vista de cartones disponibles sin recargar la página.

---

## 3. Progressive Web App (PWA) de Alto Rendimiento
La aplicación debe instalarse en el dispositivo y sentirse local.

### 3.1 Service Worker Completo
- **Cacheo de Assets Estáticos:** Estrategia *Cache First* para JS, CSS, fuentes e imágenes del framework.
- **Cacheo de API (Lecturas):** Estrategia *Stale-While-Revalidate* para la lista de grupos o catálogos, permitiendo abrir la app incluso con mala conexión.
- **Modo Offline Básico:** Mostrar un banner sutil de "Sin conexión" cuando el vendedor pierda señal, bloqueando acciones destructivas que no puedan manejarse con eventual consistencia.

### 3.2 Manifiesto PWA Refinado
- Definir un `manifest.webmanifest` con iconos de alta resolución (192x192, 512x512).
- Configurarlo en modo `standalone` o `fullscreen` para ocultar la barra del navegador.
- Definir el `theme_color` acorde a la paleta del diseño.
