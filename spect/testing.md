# Especificaciones de Testing Detallada

Para asegurar la estabilidad en un entorno de ~500 vendedores concurrentes manejando dinero, se implementará una pirámide de pruebas estricta, desde pruebas unitarias rápidas hasta pruebas E2E robustas.

## 1. Testing Backend (NestJS + Prisma)

### 1.1 Tests Unitarios
- **Herramienta:** Jest (ya integrado con NestJS).
- **Enfoque:** Validar los *Casos de Uso* (Capa de aplicación) y las reglas de negocio aisladamente.
- **Estrategia de Mocking:**
  - Crearemos un mock profundo de los repositorios usando `jest.mock()`.
  - Prisma no se tocará en estos tests. Utilizaremos librerías como `jest-mock-extended` para simular las interfaces de los repositorios inyectados en los servicios.
- **Cobertura Mínima:** 80% en lógica de negocio crítica (validaciones de disponibilidad de cartones, cálculos de montos, verificación de permisos).

### 1.2 Tests de Integración
- **Herramienta:** Jest + base de datos de test (PostgreSQL en Docker).
- **Enfoque:** Validar que los Repositorios y Prisma interactúan correctamente con la base de datos real.
- **Lifecycle:** 
  - Antes de cada suite, correr migraciones `prisma db push` a una BD de prueba.
  - Insertar seeds conocidos y ejecutar consultas complejas.
  - Al final, limpiar o truncar tablas.

### 1.3 Tests E2E (End-to-End) de API
- **Herramienta:** Supertest.
- **Enfoque:** Lanzar la aplicación NestJS, realizar peticiones HTTP a los Controladores (rutas `/api/...`) y validar los códigos de estado, headers y la estructura de los JSON (validando contra schemas Zod de la carpeta compartida).

---

## 2. Component Testing (Frontend React)

### 2.1 Pruebas de Componentes Aislados
- **Herramienta:** Vitest + React Testing Library (RTL).
- **Enfoque:** Renderizar componentes individuales sin necesidad de levantar el navegador completo ni la API.
- **Patrones:** 
  - Simular interacciones de usuario (clicks, typing) con `@testing-library/user-event`.
  - Validar accesibilidad básica (roles ARIA, etiquetas).
  - Mockear los hooks de llamadas a API (ej. `useQuery` de React Query) para forzar estados de `loading`, `error` o `success` y validar que la UI renderiza el *skeleton loader*, el mensaje de error, o los datos correctamente.

---

## 3. E2E General (Frontend + Backend)

### 3.1 Pruebas de Flujos de Usuario
- **Herramienta:** Playwright.
- **Enfoque:** Correr navegadores reales headless (Chromium, WebKit, Firefox) conectándose a un entorno de staging local completo (Frontend PWA + Backend API + DB).
- **Flujos Críticos Mínimos a Cubrir:**
  1. **Autenticación:** Login de administrador y login de vendedor. Flujo de token expirado o credenciales inválidas.
  2. **Ciclo de Venta:** Un vendedor inicia sesión, visualiza los cartones, selecciona uno libre, confirma la venta, y el sistema valida que el cartón queda asignado a él y descontado del pool.
  3. **Concurrencia Básica:** Dos vendedores abriendo el mismo cartón a la vez (simular llamadas a red paralelas) para asegurar que el sistema rechaza a uno por conflicto (race condition).
