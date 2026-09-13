# Plan Técnico: 003 Frontend UX/UI y PWA

## Objetivo
Transformar el frontend React actual en una experiencia visual premium ("WOW effect") usando TailwindCSS y optimizar las interacciones críticas con React Query.

## Estrategia
1. **Configuración Base:** Instalar e inicializar TailwindCSS en el proyecto de Vite (frontend). Configurar el `tailwind.config.js` con el tema oscuro, fuentes y colores (acentos neón/vibrantes).
2. **Refactorización de Componentes:** Migrar el CSS vainilla crítico a clases de Tailwind, implementando `framer-motion` para transiciones si es necesario.
3. **Gestión de Estado (React Query):** Envolver la mutación de `vender` y `reservar` en hooks de React Query, aplicando `onMutate` para alterar la caché local de la lista de cartones inmediatamente.
4. **PWA:** Revisar `vite-plugin-pwa` para asegurar que las configuraciones del manifest tengan los íconos adecuados y modo standalone.
