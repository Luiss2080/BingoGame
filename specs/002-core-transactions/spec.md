# Especificación: 002 Transacciones Core (Venta y Reserva)

## Requerimientos (Notación EARS)
- **When** un vendedor solicita reservar un cartón, **the system shall** verificar que el cartón se encuentre en estado `disponible`.
- **If** el cartón no está `disponible`, **the system shall** rechazar la reserva con un error claro.
- **When** un vendedor confirma la venta de un cartón, **the system shall** asignarle el `vendedorId`, nombre del comprador, precio, y cambiar el estado a `vendido`.
- **If** el cartón ya estaba `vendido`, **the system shall** bloquear la transacción para evitar ventas duplicadas (race condition protection a nivel de lógica, respaldado por base de datos posteriormente).

## Glosario
- **Reserva temporal:** Acción previa a la venta para bloquear el cartón en la UI mientras el comprador decide.
- **Venta confirmada:** Transacción final donde el cartón queda asociado a un usuario (vendedor).
