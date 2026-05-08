FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci

COPY . .

RUN npm run build

# Compile the seed script separately so it can run at container start without tsx.
RUN npx tsc --project backend/tsconfig.seed.json

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# Copy the Prisma-generated client from the build stage.
# --ignore-scripts skips the @prisma/client postinstall that would normally generate it.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/dist-seed ./backend/dist-seed
COPY --from=build /app/frontend/dist ./public

# Prisma migrations and schema are needed by `prisma migrate deploy` in the entrypoint.
COPY --from=build /app/backend/prisma/schema.prisma ./backend/prisma/schema.prisma
COPY --from=build /app/backend/prisma/migrations ./backend/prisma/migrations

COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
