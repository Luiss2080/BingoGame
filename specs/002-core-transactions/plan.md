# Plan Técnico: 002 Transacciones Core (Venta y Reserva)

## Objetivo
Migrar la lógica crítica de venta y reserva de `CartonesService` hacia los nuevos casos de uso `ReservarCartonUseCase` y `VenderCartonUseCase` en la capa de aplicación.

## Estrategia
1. **Application:** Crear `ReservarCartonUseCase.ts` y `VenderCartonUseCase.ts` utilizando inyección de dependencias con `ICartonRepository`.
2. **Domain:** Extender o validar el método `marcarComoVendido` en la entidad `Carton` para asegurar el cumplimiento de las reglas.
3. **Tests (TDD):** Probar intensamente ambos casos de uso con `jest` simulando el repositorio para forzar estados inválidos (ej. vender cartón vendido).
4. **Infraestructura:** Reemplazar el código en `CartonesController` para que delegue la lógica a estos nuevos casos de uso.
