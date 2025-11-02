# client/Dockerfile
# Multi-stage build for React frontend (No Nginx)

# ==========================================
# Build Stage
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY client/src ./src
COPY client/public ./public

# Build React app
RUN npm run build

# ==========================================
# Production Stage - Node HTTP Server
# ==========================================
FROM node:18-alpine

WORKDIR /app

# Install serve to serve static files and wget for health checks
RUN npm install -g serve && apk add --no-cache wget

# Copy built app from builder
COPY --from=builder /app/build ./build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Start serving static files on all interfaces (0.0.0.0) for containerized environments
CMD ["serve", "-s", "build", "--listen", "0.0.0.0:3000"]