# ---------- Build stage ----------
# Installs dependencies and generates the Prisma client.
# Debian slim (glibc), NOT Alpine: Prisma's native engines don't load on
# musl/Alpine ("Could not parse schema engine response" + OpenSSL errors).
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
# Needed before `npm ci` because the postinstall hook runs `prisma generate`.
COPY prisma ./prisma

RUN npm ci

# ---------- Production stage ----------
FROM node:20-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# openssl: required by the Prisma engine.
# (node:20-slim ships with openssl, but install explicitly to be safe.)
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

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

# Uses Node's built-in fetch (no wget/curl needed on slim).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Book files / covers uploaded at runtime live here.
VOLUME ["/app/storage"]

CMD ["./entrypoint.sh"]
