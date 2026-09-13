# Especificación: 004 Arquitectura del Worker (BullMQ)

## Requerimientos (Notación EARS)
- **The system shall** utilizar colas de mensajes (BullMQ) gestionadas por Redis para delegar procesos intensivos en segundo plano (ej. generación masiva de PDFs/Imágenes).
- **When** un trabajo pesado es encolado, **the system shall** retornar una respuesta rápida al cliente sin bloquear el hilo principal de Node.js.
- **If** Redis no está disponible temporalmente, **the system shall** intentar reconectar sin hacer colapsar la API HTTP principal (graceful degradation).

## Glosario
- **BullMQ:** Sistema de colas robusto sobre Redis para Node.js.
- **Worker:** Proceso secundario que toma trabajos (jobs) de la cola y los ejecuta asíncronamente.
