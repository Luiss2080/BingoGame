# Constitución del Proyecto (Bingo Imperial)

## Principios Generales
1. **Verdad Única:** Las especificaciones (`specs/`) y el código deben decir la misma verdad. Si el código cambia, la especificación debe cambiar primero o al mismo tiempo.
2. **Spec-Driven Development (SDD):** El desarrollo se guía estrictamente por las fases de SDD: Constitución → Spec → Plan → Tareas → Implementación → Validación.
3. **Calidad de Código:** Escribir código limpio, mantenible y testeable. Priorizar la Inversión de Dependencias (Clean Architecture).

## Reglas de Desarrollo Backend (NestJS)
- **Framework:** NestJS.
- **Base de Datos:** PostgreSQL con Prisma ORM.
- **Arquitectura:** Clean Architecture.
  - El dominio (`src/core/domain`) no tiene dependencias de NestJS ni de Prisma.
  - La infraestructura (`src/infrastructure`) envuelve Prisma y módulos de NestJS.
  - La lógica de negocio reside en `src/core/application`.
- **Testing:** Escribir tests unitarios con Jest (usando mocks para Prisma y dependencias externas) ANTES de implementar la lógica (TDD).

## Reglas de Desarrollo Frontend (React PWA)
- **Framework:** Vite + React.
- **Estilos:** Diseño oscuro por defecto, CSS vainilla organizado en tokens, o TailwindCSS (si está configurado).
- **Gestor de Estado:** React Query para mutaciones optimistas y UI rápida.
- **Componentes:** Testing con Vitest y React Testing Library.

## Reglas de Tareas (Agent Tasks)
- Una tarea se considera terminada solo cuando los tests pasan y la funcionalidad está verificada (Validación).
- Si surge un nuevo requerimiento durante la implementación, se debe pausar y actualizar la Especificación correspondiente antes de escribir código.
