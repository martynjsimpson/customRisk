FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# Copy the Prisma-generated client from the build stage.
# --ignore-scripts skips the @prisma/client postinstall that would normally generate it.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./public

EXPOSE 3000

CMD ["node", "backend/dist/server.js"]
