# Especificación: 003 Frontend UX/UI y PWA

## Requerimientos (Notación EARS)
- **When** el usuario navega por la aplicación, **the system shall** renderizar una interfaz moderna con tema oscuro, utilizando una paleta de colores cohesiva y tipografías premium.
- **When** el usuario interactúa con un cartón (reservar o vender), **the system shall** aplicar micro-animaciones (feedback visual) y actualizar el estado de manera optimista antes de la confirmación del servidor.
- **If** la conexión es inestable, **the system shall** mantener la aplicación utilizable mediante estrategias de Service Worker (Progressive Web App).
- **The system shall** utilizar TailwindCSS para estandarizar el diseño visual.

## Glosario
- **Optimistic UI:** Técnica donde la UI asume el éxito de una mutación (ej. reservar cartón) para dar respuesta instantánea al usuario.
- **PWA:** Aplicación Web Progresiva, permite instalación local y cache offline.
- **TailwindCSS:** Framework CSS de utilidades que usaremos para construir el UI premium.
