# ── build ────────────────────────────────────────────────────
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY libs/common/package.json ./libs/common/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

COPY libs/common ./libs/common
COPY frontend ./frontend
RUN pnpm --filter @bingo/common build && pnpm --filter frontend build

# ── runtime (nginx sirve el estático y proxya /api) ──────────
FROM nginx:alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
EXPOSE 80
