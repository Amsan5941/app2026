# ============================================================
# GrindApp – Frontend (Expo Web) Dockerfile
# Used by docker-compose for local development.
# ============================================================

FROM node:22-slim

WORKDIR /app

# Install system dependencies needed by some native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (--legacy-peer-deps matches local dev setup)
RUN npm ci --legacy-peer-deps

# Copy the rest of the source
COPY . .

# Expo web dev server
EXPOSE 8081

# Start Expo in web-only mode, binding to 0.0.0.0 so Docker can forward the port
CMD ["npx", "expo", "start", "--web", "--port", "8081", "--host", "0.0.0.0"]
