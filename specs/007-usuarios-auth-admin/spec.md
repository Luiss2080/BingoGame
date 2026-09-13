# Especificación: 007 Refactorización de Usuarios, Auth y Admin

## Requerimientos (Notación EARS)
- **The system shall** gestionar el dominio de usuarios (`User`) mediante una entidad pura, independiente de Prisma.
- **The system shall** gestionar el login y perfil mediante casos de uso (`LoginUseCase`, `GetPerfilUseCase`), encapsulando las lógicas criptográficas (ej. hashes Werkzeug legacy y Argon2).
- **The system shall** utilizar casos de uso en el `AdminController` para las acciones globales (como purgar base de datos o encolar regeneración masiva).

## Glosario
- **Hash Werkzeug:** Sistema de contraseñas legacy de Python que convive con el nuevo Argon2 de Node.js.
- **Casos de Uso (Use Cases):** Intermediarios de la Clean Architecture que orquestan las acciones de dominio aislando el framework.
