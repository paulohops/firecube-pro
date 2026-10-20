# ==============================================================================
# FireCube Pro - Production Dockerfile for Portainer & Docker
# Lightweight Node.js image with persistent database volume support
# ==============================================================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy application files
COPY package.json ./
COPY . .

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Expose default HTTP port
EXPOSE 8080

# Persistent volume for JSON database (users, solves, leaderboards)
VOLUME ["/app/data"]

# Healthcheck to verify the server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/ || exit 1

# Start the application
CMD ["node", "server.js"]
