FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json server.mjs ./
COPY public ./public

EXPOSE 8080
CMD ["node", "server.mjs"]
