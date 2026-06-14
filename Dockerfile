# Multi-stage build: compile TypeScript in a build stage, ship only the
# compiled output plus production dependencies in the runtime image.

# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Install all deps (incl. dev) for the TypeScript build.
COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies in the final image.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

# Drop root for runtime.
USER node

EXPOSE 8080
CMD ["node", "dist/index.js"]
