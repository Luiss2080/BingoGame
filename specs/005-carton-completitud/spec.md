# Especificación: 005 Completitud del Dominio Cartón

## Requerimientos (Notación EARS)
- **The system shall** proveer la capacidad de liberar un cartón (revertirlo al estado `disponible`), limpiando comprador, precio y vendedor.
- **The system shall** proveer la capacidad de eliminar físicamente un cartón de la base de datos.
- **When** se intenta eliminar un cartón, **if** su estado es `vendido`, **the system shall** denegar la operación y arrojar una excepción.

## Glosario
- **Liberar:** Acción que revierte un cartón reservado a disponible.
- **Eliminar:** Borrado físico del registro en la base de datos (DELETE).
