# Especificación: 001 Clean Architecture Base

## Requerimientos (Notación EARS)
- **When** se desarrolla una nueva funcionalidad o servicio en el backend, **the system shall** aislar la lógica de negocio en la capa de aplicación (Casos de Uso) separada de la infraestructura (Controladores, Prisma).
- **The system shall** implementar Inversión de Dependencias (Dependency Injection) de forma que los Casos de Uso dependan de interfaces de repositorio, y no de implementaciones concretas de base de datos.
- **When** se ejecutan los tests unitarios de los Casos de Uso, **the system shall** poder ejecutarlos completamente sin conexión a base de datos, usando implementaciones Mock de las interfaces del repositorio.

## Glosario
- **Domain:** Capa interna con entidades de negocio (e.g., Carton, User).
- **Application:** Capa con Casos de Uso (e.g., ReservarCartonUseCase) que orquesta reglas de negocio.
- **Infrastructure:** Capa externa que adapta el mundo exterior al dominio (Controladores HTTP, Repositorios Prisma).
- **Port:** Interfaz en el dominio (e.g., `ICartonRepository`).
- **Adapter:** Implementación en la infraestructura (e.g., `PrismaCartonRepository`).
