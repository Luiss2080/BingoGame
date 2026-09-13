# Especificaciones de Testing

## 1. Unit Testing y de Integración (Backend)
- **Framework**: Jest.
- **Alcance**: 
  - Probar los casos de uso principales aislando Prisma a través de Mocks (`prisma-mock`).
  - Cobertura de cálculos y validación de reglas de negocio.
- **E2E Backend**: Uso de Supertest para validar respuestas HTTP reales conectando a una base de datos de test temporal.

## 2. Component Testing (Frontend)
- **Framework**: Vitest + React Testing Library.
- **Alcance**: 
  - Probar renderizado y eventos de usuario (clicks) de componentes críticos (Cartones, Modal de pago).

## 3. End-to-End (E2E) Completo
- **Framework**: Playwright.
- **Flujos Críticos a probar**:
  - Autenticación de vendedor.
  - Venta de cartón.
  - Subida de PDF y procesamiento en background.
