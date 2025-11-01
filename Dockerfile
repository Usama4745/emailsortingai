# Dockerfile (Root)
# Multi-stage build for Express backend

# ==========================================
# Build Stage
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --only=production

# ==========================================
# Production Stage
# ==========================================
FROM node:18-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init curl

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy server application code
COPY server/src ./src
COPY server/src/app.js ./src/app.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/app.js"]