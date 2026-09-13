# Bingo Imperial

Sistema de venta de cartones de bingo. Reescritura del sistema Android+Flask a un
monorepo TypeScript con arquitectura escalable (~500 vendedores concurrentes).

- **backend/** — API NestJS (HTTP), Prisma + PostgreSQL, cola BullMQ (producer)
- **worker/** — Worker Python que procesa los PDFs fuera de la API (PyMuPDF+Pillow)
- **frontend/** — PWA React (reemplaza la app Android; instalable desde el navegador)
- **libs/common/** — Tipos y schemas Zod compartidos backend↔frontend
- **docker/** — Compose de desarrollo y de producción (Coolify)

Por qué esta arquitectura: en el sistema anterior el procesamiento de PDFs corría
dentro del proceso web y colgaba el servidor. Aquí el worker corre en su propio
contenedor y consume una cola: subir varios PDFs no afecta la latencia de la API.

## Desarrollo local

Requisitos: Node 22, pnpm 10, Python 3.12, Docker.

```bash
pnpm install
pnpm infra:up                      # postgres + redis en Docker (puerto 5433)
pnpm --filter @bingo/common build
pnpm --filter backend prisma:migrate
pnpm --filter backend seed         # admin/admin1234 + permisos por defecto

# 3 procesos (en terminales separadas):
pnpm dev:api                       # API en http://localhost:4000
pnpm dev:web                       # PWA en http://localhost:5180 (proxya /api)
cd worker && python worker.py      # worker (usa DATABASE_URL/REDIS_URL del entorno)
```

## Despliegue en Coolify

1. Crea un recurso **Docker Compose** apuntando a `docker/docker-compose.prod.yml`.
2. Configura estas variables de entorno (Coolify → Environment):
   - `POSTGRES_PASSWORD` — contraseña de la base de datos (obligatoria)
   - `JWT_SECRET` — secreto para firmar los tokens (obligatoria, larga y aleatoria)
   - `ADMIN_PASSWORD` — contraseña del admin inicial (opcional, default `admin1234`)
   - `POSTGRES_USER`, `POSTGRES_DB` — opcionales (default `bingo`)
3. Expón **solo** el servicio `frontend` con tu dominio. nginx sirve la PWA y
   proxya `/api` al contenedor `api` (un solo dominio, sin CORS).
4. Al desplegar: la API aplica migraciones (`prisma migrate deploy`) y crea el
   admin automáticamente en el primer arranque.

El volumen `media` se comparte entre `api` y `worker` (PDFs subidos, imágenes de
cartón, banners). Los volúmenes `pgdata`, `redisdata` y `media` persisten datos.

### Escalar el procesamiento

Si el procesamiento de PDFs es un cuello de botella, aumenta las réplicas del
servicio `worker` (cada una toma un PDF de la cola). Mantén **una sola** réplica
de `api` para que las migraciones no compitan al desplegar.

## Migración desde el sistema Flask

Ver `tools/migrate-sqlite/` para el script que importa la base SQLite anterior
(usuarios, grupos, cartones, PDFs) preservando las contraseñas existentes.
