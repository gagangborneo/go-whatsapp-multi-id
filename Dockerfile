# API Gateway Dockerfile - Using debian base for glibc compatibility
FROM node:24-slim

# Build args to handle arch-aware download of WhatsApp binary
ARG TARGETARCH
ARG WHATSAPP_VERSION=7.8.0

# Declare ARGs again to make them available in RUN
ARG TARGETARCH
ARG WHATSAPP_VERSION

# Install system dependencies including unzip and wget for binary download
RUN apt-get update && apt-get install -y \
    docker.io \
    curl \
    bash \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app


# Copy package files e tsconfig
COPY package*.json ./
COPY tsconfig.json ./


# Instala dependências (inclui devDependencies para build)
RUN npm ci

# Download and setup go-whatsapp-web-multidevice binary (arch-aware)
# TARGETARCH values are typically: amd64 | arm64
RUN set -eux; \
    WHATSAPP_VERSION="7.8.0"; \
    if [ "$TARGETARCH" = "arm64" ]; then \
        ARCH_SUFFIX="arm64"; \
        FOLDER_NAME="linux-arm64"; \
    else \
        ARCH_SUFFIX="amd64"; \
        FOLDER_NAME="linux-amd64"; \
    fi; \
    echo "Downloading WhatsApp binary for architecture: $TARGETARCH (${ARCH_SUFFIX})"; \
    wget -O whatsapp_linux_${ARCH_SUFFIX}.zip \
      "https://github.com/aldinokemal/go-whatsapp-web-multidevice/releases/download/v${WHATSAPP_VERSION}/whatsapp_${WHATSAPP_VERSION}_linux_${ARCH_SUFFIX}.zip"; \
    unzip whatsapp_linux_${ARCH_SUFFIX}.zip; \
    mv ${FOLDER_NAME} whatsapp; \
    chmod +x whatsapp; \
    rm -f whatsapp_linux_${ARCH_SUFFIX}.zip readme.md

COPY src ./src
COPY openapi.yaml ./openapi.yaml
COPY docs ./docs


# Build TypeScript
RUN npm run build

# Remove devDependencies para imagem final enxuta
RUN npm prune --production

# Copy schema.sql to dist (garantido pelo postbuild)

# Create necessary directories
RUN mkdir -p /app/data/volumes /app/data/sessions /app/logs

# Create non-root user
RUN groupadd -g 1001 gateway && \
    useradd -u 1001 -g gateway -d /app -s /bin/bash gateway

# Set ownership and ensure binary is executable
RUN chown -R gateway:gateway /app && \
    chmod +x /app/whatsapp

# Switch to non-root user
USER gateway

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV API_PORT=3000
ENV BIN_PATH=/app/whatsapp
ENV SESSIONS_DIR=/app/data/sessions
ENV VOLUMES_DIR=/app/data/volumes
ENV APP_BASE_DIR=/app

# Start command (TypeScript build)
CMD ["node", "dist/server.js"]