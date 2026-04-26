# ═══ Stage 1: Build ═══
FROM node:22-alpine AS build
WORKDIR /app

# Install pnpm (pin to v10 for reproducibility)
RUN npm install -g pnpm@10.8.0

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ═══ Stage 2: Serve ═══
FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/.output ./.output

ENV PORT=8080
ENV NITRO_PORT=8080
EXPOSE 8080

# Deploy trigger: remove legacy Cloud Build trigger to prevent overwrite
CMD ["node", ".output/server/index.mjs"]
