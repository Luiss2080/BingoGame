# Especificaciones de Nuevas Funcionalidades Detallada

## 1. Notificaciones en Tiempo Real (WebSockets / SSE)

### 1.1 Descripción del Problema
Cuando hay ~500 vendedores activos, la disponibilidad de los cartones cambia a cada segundo. Si se usa polling (peticiones cada X segundos), se sobrecarga el backend o se presenta información desactualizada, causando fricción (vendedores intentando comprar el mismo cartón).

### 1.2 Implementación Técnica
- **Tecnología Recomendada:** Server-Sent Events (SSE) o Socket.io en NestJS (`@nestjs/platform-socket.io`).
- **Arquitectura de Eventos:**
  - El Backend emite eventos tipo `carton:reservado`, `carton:vendido`, `carton:liberado` con el ID del cartón.
  - El Frontend PWA escucha este canal. Al recibir el evento, **solo actualiza localmente** el estado de ese cartón específico en su caché (React Query), evitando recargar toda la lista.
- **Bloqueo Cooperativo (Pessimistic Locking Suave):**
  - Si un vendedor hace tap en un cartón para examinarlo, se emite un `carton:bloqueado_temporal` (con TTL de 15 segundos en Redis). A los demás vendedores se les muestra con un candado o deshabilitado.

---

## 2. Dashboard y Analíticas Avanzadas (Admin)

### 2.1 Vista Resumen (Overview)
- **Gráficos:** Integración de librerías como Recharts o Chart.js.
- **Métricas Clave:**
  - Ventas por hora/minuto durante el pico del evento (línea temporal).
  - Ranking Top 10 Vendedores por volumen de cartones.
  - Ingresos brutos generados (cálculo monto * cartones).
  - Ratio de éxito del procesamiento de PDFs (Worker Stats).

### 2.2 Integración con bull-board
- Incrustar la vista de colas de procesamiento de BullMQ dentro del panel de administrador del frontend de forma fluida, o mantenerlo como un enlace externo protegido, de manera que soporte la monitorización en vivo del worker.

---

## 3. Reportes y Exportación de Datos

### 3.1 Generación de Documentos
Los administradores del bingo requieren auditorías precisas al finalizar el evento.
- **Exportación Excel (XLSX):** 
  - Usar la librería `exceljs` en el backend para generar un archivo con múltiples hojas: Ventas por Vendedor, Detalle de Cartones (vendidos vs no vendidos), Log de auditoría.
- **Exportación PDF:**
  - Generación de reportes resumidos mediante plantillas HTML convertidas a PDF con librerías como `puppeteer` o nativas ligeras si no requiere gráficos.

---

## 4. Auditoría Transaccional (Audit Trails)

### 4.1 Historial de Cambios
- **Modelo Prisma:** Crear un modelo `AuditLog` que almacene `(userId, action, entityId, oldState, newState, timestamp)`.
- **Casos de Uso:** Registrar quién anuló un cartón vendido, quién cambió el precio o quién eliminó un usuario. Esto es vital para sistemas que manejan ventas y dinero, proveyendo transparencia total al administrador.
