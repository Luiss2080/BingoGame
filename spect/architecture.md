# Especificaciones de Arquitectura Detallada

## 1. Migración a Clean Architecture (Hexagonal) en NestJS
El objetivo es desacoplar las reglas de negocio de los detalles de infraestructura (base de datos, frameworks web, colas). Esto permite que la aplicación sea altamente testeable y fácil de mantener a medida que crece.

### 1.1 Estructura de Directorios Propuesta
Refactorizaremos la carpeta `backend/src/` para seguir un enfoque guiado por el dominio (Domain-Driven Design):
```text
backend/src/
├── core/
│   ├── domain/               # Entidades de negocio, Value Objects, Interfaces de Repositorios (Puertos). No debe importar nada de NestJS ni dependencias externas.
│   │   ├── entities/         # Ej: Carton.ts, Vendedor.ts, Sorteo.ts
│   │   ├── repositories/     # Ej: ICartonRepository.ts, IVentaRepository.ts
│   │   └── exceptions/       # Excepciones propias del dominio (Ej: CartonYaVendidoException.ts)
│   ├── application/          # Casos de uso (Servicios). Orquestan el dominio y usan los puertos.
│   │   ├── use-cases/        # Ej: VenderCartonUseCase.ts, ProcesarPDFUseCase.ts
│   │   └── dtos/             # Data Transfer Objects para entrada/salida de casos de uso.
├── infrastructure/           # Implementaciones técnicas (Adaptadores).
│   ├── database/             # Implementación de los repositorios usando Prisma (Ej: PrismaCartonRepository.ts).
│   ├── http/                 # Controladores de NestJS (Ej: CartonController.ts), Guards, Interceptors.
│   ├── queue/                # Productores y consumidores de BullMQ.
│   └── config/               # Variables de entorno y configuración de módulos.
└── main.ts                   # Punto de entrada.
```

### 1.2 Inversión de Dependencias
- Los controladores HTTP (capa de infraestructura) inyectarán los Casos de Uso (capa de aplicación).
- Los Casos de Uso inyectarán interfaces de repositorios (capa de dominio).
- En el módulo de NestJS, usaremos proveedores personalizados para inyectar la implementación de Prisma (infraestructura) donde se solicita la interfaz del dominio.

---

## 2. Optimización y Resiliencia en Colas (BullMQ)
Actualmente, el sistema usa BullMQ para encolar el procesamiento de PDFs que luego consume un worker en Python. Mejoraremos su robustez.

### 2.1 Estrategias de Retries (Reintentos)
- Configurar jobs con `attempts: 3` y una estrategia de `backoff` exponencial para evitar saturar el worker si hay picos de CPU o caídas en Redis.
- **Dead Letter Queue (DLQ):** Los jobs que fallen repetidamente serán movidos a un estado de error persistente para su revisión manual.

### 2.2 Monitoreo de Colas (bull-board)
- Integrar la librería `@bull-board/api` y `@bull-board/nestjs`.
- Exponer una interfaz gráfica en `backend/src/infrastructure/http/board` bajo la ruta `/admin/queues` protegida por autenticación y roles (`@Roles('admin')`).
- Permitir al administrador ver jobs procesados, fallidos, reintentar fallos y limpiar la cola directamente desde la UI.

---

## 3. Estrategia de Caché Avanzada con Redis
Para soportar ~500 vendedores concurrentes, debemos reducir la carga de lectura en PostgreSQL.

### 3.1 Cacheo de Datos de Configuración
- Los grupos, configuraciones del bingo y metadatos que cambian poco se mantendrán en Redis.
- Configurar un TTL (Time-To-Live) apropiado o usar un patrón de *Cache Invalidation* donde las mutaciones limpien las llaves de Redis.

### 3.2 Implementación
- Uso del `CacheModule` global de NestJS configurado con `cache-manager-redis-yet`.
- Aplicar decoradores `@CacheKey()` y `@CacheTTL()` en controladores específicos.
- Usar un Interceptor personalizado para manejar la invalidación de caché basándose en las mutaciones realizadas.
