# Migración desde el sistema Flask + guía de corte

Importa la base SQLite del sistema anterior a PostgreSQL y explica cómo hacer el
cambio con la mínima interrupción para los vendedores.

## 1. Ensayo previo (días antes del corte)

Haz una copia de `bingo.db` y de las carpetas de archivos, y prueba la migración
completa en el entorno de staging. Así el día del corte no hay sorpresas.

## 2. El día del corte (ventana de ~30–60 min, en horario de baja actividad)

1. **Congelar el sistema viejo**: detén el contenedor Flask en Coolify (deja de
   aceptar ventas). Esto evita doble escritura entre SQLite y PostgreSQL.

2. **Copiar la base y los archivos** desde el servidor viejo:
   - `bingo.db`
   - `imagenes_generadas/` → volumen `media` en `/data/imagenes/`
   - `uploads/` → `/data/uploads/` (y `uploads/banners/` → `/data/banners/`)

   En Coolify, para copiar archivos al volumen `media` monta el volumen en un
   contenedor temporal o usa `docker cp` al contenedor `api`:
   ```bash
   docker cp imagenes_generadas/. <api_container>:/data/imagenes/
   docker cp uploads/.            <api_container>:/data/uploads/
   docker cp uploads/banners/.    <api_container>:/data/banners/
   ```

3. **Correr la migración de datos** (el nuevo stack ya debe estar desplegado y
   con las migraciones Prisma aplicadas):
   ```bash
   SQLITE_PATH=/ruta/a/bingo.db \
   DATABASE_URL=postgresql://bingo:PASSWORD@postgres:5432/bingo \
   NEW_DATA_DIR=/data \
   pnpm --filter migrate-sqlite migrate
   ```
   El script preserva IDs, resetea las secuencias, reescribe las rutas de archivo
   y verifica los conteos. Es idempotente (se puede re-ejecutar sin duplicar).

   > Nota: el script usa el SQLite integrado de Node 22 (`node:sqlite`), así que
   > el contenedor/host que lo ejecute debe tener Node 22+. No hay módulos nativos.

4. **Smoke test**: entra a la PWA con un usuario vendedor real, confirma que ve
   sus cartones y sus imágenes, vende uno de prueba y libéralo.

5. **Avisar a los vendedores** (WhatsApp) con el link de la PWA y la instrucción
   de "Añadir a pantalla de inicio". Sus credenciales son las mismas de antes.

## 3. Después del corte

- Deja el sistema Flask **apagado pero sin borrar** durante ~2 semanas. Si algo
  sale mal, el rollback es re-encenderlo.
- Los hashes de contraseña werkzeug migrados funcionan tal cual: el primer login
  de cada usuario los re-cifra a argon2 automáticamente.

## Verificación de contraseñas

Ya probado end-to-end: hashes werkzeug **pbkdf2** y **scrypt** verifican
correctamente en el nuevo backend y se re-cifran a argon2 en el primer login.
