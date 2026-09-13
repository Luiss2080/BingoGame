# Especificaciones de Frontend (React PWA)

## 1. Diseño y UX/UI
- **Sistema de diseño**: Mantener Vanilla CSS pero organizar en tokens (variables CSS para colores, espaciados, tipografías) o migrar a TailwindCSS de ser aprobado.
- **Modo Oscuro**: Implementar soporte nativo detectando preferencias del sistema y permitiendo un toggle manual.
- **Feedback visual**: Skeleton loaders durante la carga de datos inicial y estados de "guardando" en los botones.

## 2. Optimistic UI Updates
- **Herramienta**: Integración con React Query (o la solución actual de data fetching).
- **Flujo**: Al interactuar con el cartón (ej. reservar), la interfaz se actualiza inmediatamente asumiendo el éxito, mientras se envía la petición en background.

## 3. Mejoras PWA
- **Service Worker**: Cache de assets estáticos (fuentes, iconos, JS/CSS).
- **Notificaciones**: (Opcional a futuro) Notificaciones Push para alertas de sorteos.
