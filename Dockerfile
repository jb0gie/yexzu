# Build stage
FROM node:22.11.0-alpine AS builder
WORKDIR /app

# Install Python and build dependencies for native modules
RUN apk add --no-cache python3 make g++ sqlite-dev

# Copy package.json and package-lock.json to leverage layer caching
COPY package.json package-lock.json ./
RUN npm install

# Copy all source files and build
COPY . .
RUN npm run build

# Production stage
FROM node:22.11.0-alpine AS production
WORKDIR /app

# Add curl for healthcheck, and bash/libc6-compat for Dojo
RUN apk add --no-cache curl bash libc6-compat && \
    adduser -S nodeuser -u 1001

# Install Dojo toolchain (disabled until Dojo integration is complete)
# RUN curl -L https://install.dojoengine.org | bash && \
#     /root/.dojo/bin/dojoup && \
#     cp /root/.dojo/bin/* /usr/local/bin/ && \
#     rm -rf /root/.dojo

# Copy only necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/scripts ./scripts
# Copy Dojo scripts (disabled until Dojo integration is complete)
# COPY --from=builder /app/examples/dojo-integration/*.sh ./dojo-scripts/
# RUN chmod +x ./dojo-scripts/*.sh

# Set build argument and environment variable
ARG COMMIT_HASH=local
ENV COMMIT_HASH=${COMMIT_HASH:-local} \
    NODE_ENV=production

# Expose the port
EXPOSE 3000 5050 8080

# Healthcheck
HEALTHCHECK --interval=2s --timeout=10s --start-period=5s --retries=5 \
  CMD curl -f http://localhost:3000/status || exit 1

# Start the application
CMD ["npm", "run", "start"]
