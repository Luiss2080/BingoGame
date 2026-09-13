# Plan Técnico: 001 Clean Architecture Base

## Objetivo
Reestructurar la base del backend (`backend/src`) para adoptar Clean Architecture, sentando las bases para que futuras funcionalidades (como optimización de BullMQ o WebSockets) se implementen sobre un núcleo de dominio sólido.

## Estrategia de Refactorización
En esta fase inicial no refactorizaremos todo el proyecto de golpe, sino que estableceremos el esqueleto de directorios y migraremos **una entidad/caso de uso inicial** (por ejemplo, Cartón) para validar la estructura.

### Estructura de Directorios
Crearemos la siguiente estructura bajo `backend/src`:
- `core/domain/` (interfaces, entidades base)
- `core/application/` (casos de uso)
- `infrastructure/database/` (repositorios Prisma)
- `infrastructure/http/` (controladores)

### Componente a Refactorizar: Cartón
1. Definiremos `ICartonRepository.ts` en `domain`.
2. Definiremos `GetCartonUseCase.ts` en `application`.
3. Implementaremos `PrismaCartonRepository.ts` en `infrastructure/database`.
4. Crearemos `CartonController.ts` en `infrastructure/http`.
5. Configuraremos `CartonModule.ts` para proveer `PrismaCartonRepository` bajo el token `ICartonRepository`.

## Testing Strategy
- **Unit Testing:** Crear un `MockCartonRepository` y probar `GetCartonUseCase.ts`. Validar que el caso de uso devuelve los datos correctos y maneja errores sin tocar la base de datos real.
