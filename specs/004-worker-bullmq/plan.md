# Plan Técnico: 004 Arquitectura del Worker (BullMQ)

## Objetivo
Reemplazar cualquier procesamiento en crudo o bloqueante del backend implementando un ecosistema de colas con `@nestjs/bullmq` e integrando Redis, garantizando cero caídas en la API principal.

## Estrategia
1. **Instalación:** Agregar las dependencias `@nestjs/bullmq`, `bullmq` y `ioredis`.
2. **Configuración del Módulo:** Crear el `QueueModule` que configure globalmente la conexión a Redis (con tolerancia a fallos/reconexión).
3. **Productores y Consumidores:** Crear un caso de uso de prueba (o adaptar uno real) para enviar un trabajo a la cola y un Processor que lo procese.
4. **Testing Riguroso:** Ejecutar `npm run build` y `npm run test` (unitarios) de todo el backend para confirmar que no se haya roto nada de la Clean Architecture implementada en Specs anteriores, y testear la inyección de las colas.
