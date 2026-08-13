# ---------- Build stage ----------
# Installs dependencies and generates the Prisma client.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# Needed before `npm ci` because the postinstall hook runs `prisma generate`.
COPY prisma ./prisma

RUN npm ci

# ---------- Production stage ----------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# libc6-compat: required by the Prisma engine on Alpine/musl.
# wget: used by the HEALTHCHECK below.
RUN apk add --no-cache libc6-compat wget

# Dependencies (full copy: includes the prisma CLI, used by the entrypoint
# for `prisma db push` at startup).
COPY --from=build /app/node_modules ./node_modules
COPY package.json package-lock.json ./

COPY prisma ./prisma
COPY src ./src
COPY public ./public

COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Book files / covers uploaded at runtime live here.
VOLUME ["/app/storage"]

CMD ["./entrypoint.sh"]
