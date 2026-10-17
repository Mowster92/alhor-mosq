FROM node:22-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY apps/vrijdagpreek/package.json apps/vrijdagpreek/package-lock.json ./
RUN npm ci --ignore-scripts
COPY apps/vrijdagpreek ./
EXPOSE 8080
CMD ["node", "server.mjs"]
