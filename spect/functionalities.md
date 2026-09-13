# Especificaciones de Nuevas Funcionalidades

## 1. Dashboard de Analíticas
- **Rol requerido**: Administrador.
- **Métricas**: 
  - Total de cartones vendidos por vendedor.
  - Estado del sistema (tamaño de la cola de procesamiento en BullMQ).
  - Recaudación total.

## 2. Exportación de Reportes
- **Formato**: CSV / Excel o PDF.
- **Contenido**: Listado consolidado de ventas y disponibilidad, útil para los organizadores del evento de bingo.

## 3. Real-Time (WebSockets / SSE)
- **Objetivo**: Mejorar la experiencia colaborativa.
- **Casos de uso**:
  - Informar al cliente PWA inmediatamente cuando el worker termine de procesar el PDF, sin necesidad de recargar la página.
  - Bloquear un cartón en tiempo real si otro vendedor lo está reservando.
