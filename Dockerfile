# ─── Production dependencies ───
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json ./

# Windows lockfile causes musl/glibc mismatch — rebuild from package.json only
RUN rm -f package-lock.json && npm install --omit=dev --ignore-scripts

# ─── Build (full deps for tsc + vite) ───
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./

RUN rm -f package-lock.json && npm install --ignore-scripts

COPY . .
RUN rm -f package-lock.json && npm run build

# ─── Production image ───
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/src/db/migrations ./dist/db/migrations

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

CMD ["node", "dist/server.js"]
