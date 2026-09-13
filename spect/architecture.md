# Especificaciones de Arquitectura

## 1. Clean Architecture en NestJS
- **Objetivo**: Separar la lógica de negocio, los casos de uso y la infraestructura (controladores HTTP, repositorios de Prisma).
- **Estructura**:
  - `domain/`: Entidades y puertos (interfaces)
  - `application/`: Casos de uso (servicios)
  - `infrastructure/`: Implementaciones de repositorios, controladores, configuración de BullMQ.
- **Beneficio**: Facilita el testing unitario y el reemplazo de tecnologías.

## 2. Optimización de BullMQ
- **Objetivo**: Manejo resiliente de la cola de procesamiento de PDFs.
- **Implementación**:
  - Configurar reintentos automáticos (retry) con backoff exponencial.
  - Habilitar `bull-board` en una ruta protegida para monitoreo de jobs.

## 3. Caché con Redis
- **Objetivo**: Aliviar la base de datos PostgreSQL.
- **Implementación**:
  - Uso de `CacheModule` de NestJS con Redis store.
  - Cacheo de consultas críticas: lista de grupos, configuración general del bingo.
