# Plan Técnico: 005 Completitud del Dominio Cartón

## Objetivo
Finalizar la migración de `CartonesController` a Clean Architecture, eliminando la dependencia de `CartonesService` para las acciones de liberar y eliminar.

## Estrategia
1. **ICartonRepository**: Añadir el método `delete(id: number): Promise<void>`.
2. **PrismaCartonRepository**: Implementar el método `delete` con Prisma.
3. **Casos de Uso**: Crear `LiberarCartonUseCase` y `EliminarCartonUseCase`. Ambos usarán lógica de dominio estricta.
4. **Testing**: Escribir pruebas unitarias aisladas (`.spec.ts`) para los UseCases.
5. **Controlador**: Inyectar los casos de uso y reemplazar los endpoints correspondientes en `CartonesController`.
