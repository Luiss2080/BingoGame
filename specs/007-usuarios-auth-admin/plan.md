# Plan Técnico: 007 Refactorización de Usuarios, Auth y Admin

## Estrategia
1. **Dominio de Usuario (User)**:
   - Crear Entidad de Dominio `User`.
   - Crear Interfaz `IUserRepository` y clase `PrismaUserRepository`.
2. **Dominio de Auth**:
   - Mover la lógica de validación de contraseñas a un `LoginUseCase` y el perfil a `GetPerfilUseCase`.
   - Refactorizar `AuthController`.
3. **Casos de Uso de Usuarios**:
   - Crear `ListarUsuariosUseCase`, `CrearUsuarioUseCase`, etc. (Migrando lo que hay en `UsersService`).
4. **Dominio de Admin**:
   - Crear `ResetDatabaseUseCase` y `RegenerarImagenesUseCase`.
   - Inyectar en `AdminController`.
5. **Validación**:
   - Ejecutar `nest build` para certificar que todo compila 100% Ok.
