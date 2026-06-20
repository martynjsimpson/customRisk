# Run npm ci and the full build on the host's native platform to avoid
# QEMU emulation crashes (signal 4 illegal instruction) on arm64 runners.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci

COPY . .

RUN npm run build

# Compile the seed script separately so it can run at container start without tsx.
RUN npx tsc --project backend/tsconfig.seed.json

# Install production dependencies on the native platform for the same reason.
# node_modules for pure-JS packages are platform-independent; the Prisma
# engine binary is handled separately via binaryTargets in schema.prisma.
FROM --platform=$BUILDPLATFORM node:24-alpine AS runtime-deps

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache openssl ca-certificates

# Copy natively-installed production node_modules.
COPY --from=runtime-deps /app/node_modules ./node_modules

# Copy the Prisma-generated client from the build stage.
# binaryTargets in schema.prisma ensures the arm64 engine binary is included
# even though the build ran on amd64.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/dist-seed ./backend/dist-seed
COPY --from=build /app/frontend/dist ./public

# Prisma migrations, schema, and config are needed by `prisma migrate deploy` in the entrypoint.
COPY --from=build /app/backend/prisma/schema.prisma ./backend/prisma/schema.prisma
COPY --from=build /app/backend/prisma/migrations ./backend/prisma/migrations
COPY --from=build /app/backend/prisma.config.ts ./backend/prisma.config.ts

COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
