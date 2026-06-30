# PairPad backend — build from the repo root:
#   docker build -f apps/server/Dockerfile -t pairpad-server .
#
# The server spawns sibling execution containers via the host Docker daemon,
# so run it with the Docker socket mounted:
#   docker run -d --name pairpad-server -p 4000:4000 \
#     -e FRONTEND_URL=https://your-app.vercel.app \
#     -v /var/run/docker.sock:/var/run/docker.sock \
#     pairpad-server

# ─── Build stage ───
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/server/package.json ./apps/server/package.json
RUN npm ci --workspace=apps/server
COPY apps/server ./apps/server
RUN npm run build --workspace=apps/server

# ─── Production stage ───
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
RUN npm ci --workspace=apps/server --omit=dev
COPY --from=build /app/apps/server/dist ./apps/server/dist
EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
