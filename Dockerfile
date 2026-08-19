# --- Etapa 1: Base (Skeleton) ---
FROM node:22.16-alpine AS base
# Habilitar pnpm mediante corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# --- Etapa 2: Construcción (SDK Stage) ---
FROM base AS builder
WORKDIR /app

# 1. Copiar dependencias y schema de Prisma
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 2. Instalar todas las dependencias usando caché de red de Docker BuildKit
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# 3. Copiar código fuente y construir
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# 4. Limpiar módulos para dejar solo los de producción
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# --- Etapa 3: Producción (Runtime Stage) ---
FROM node:22.16-alpine AS runner
WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma y seguridad
RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production

# Crear usuario sin privilegios
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copiar artefactos compilados y dependencias desde el builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Copiar y dar permisos al entrypoint
COPY --chown=nestjs:nodejs entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Cambiar al usuario seguro
USER nestjs

EXPOSE 3000

# dumb-init maneja correctamente las señales del sistema (SIGTERM, SIGINT)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["./entrypoint.sh"]