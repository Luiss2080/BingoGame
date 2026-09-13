# Tareas: 001 Clean Architecture Base

- [x] **Tarea 1**: Crear la estructura de carpetas (`core/domain`, `core/application`, `infrastructure/database`, `infrastructure/http`) en `backend/src/`.
- [x] **Tarea 2**: Definir la entidad `Carton` y el puerto `ICartonRepository` en `domain`.
- [ ] **Tarea 3**: Escribir los tests unitarios (fallidos) para `GetCartonUseCase` en `application` usando un mock del repositorio.
- [ ] **Tarea 4**: Implementar la lógica en `GetCartonUseCase` para que pasen los tests.
- [ ] **Tarea 5**: Implementar `PrismaCartonRepository` en `infrastructure/database`.
- [ ] **Tarea 6**: Actualizar `CartonModule` para configurar la inyección de dependencias con NestJS y refactorizar/crear el `CartonController` para que use el Caso de Uso en lugar del servicio antiguo.
- [ ] **Tarea 7**: Ejecutar los tests (unitarios y e2e) de la API para validar la correcta integración de la nueva arquitectura.
