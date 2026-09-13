# ── build ────────────────────────────────────────────────────
FROM node:22-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# Instalar deps con el lockfile del workspace
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY libs/common/package.json ./libs/common/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile

# Código
COPY libs/common ./libs/common
COPY backend ./backend
RUN pnpm --filter @bingo/common build \
    && pnpm --filter backend prisma:generate \
    && pnpm --filter backend build

# Podar dev-deps para la imagen final
RUN pnpm --filter backend --prod --legacy deploy /app/out
# pnpm deploy no copia el cliente Prisma generado: regenerarlo dentro del deploy
RUN cp -r backend/prisma /app/out/prisma \
    && cd /app/out && node_modules/.bin/prisma generate

# ── runtime ──────────────────────────────────────────────────
FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/out/node_modules ./node_modules
COPY --from=build /repo/backend/dist ./dist
COPY --from=build /repo/backend/prisma ./prisma

EXPOSE 3000
# Aplica migraciones pendientes (prisma local, sin descargar de la red) y arranca la API
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
