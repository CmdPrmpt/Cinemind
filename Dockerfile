FROM node:22-alpine

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy dependency definitions (lockfile for reproducible build)
COPY package.json package-lock.json ./

# Install dependencies (ci for exact versions)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Drop to non-root
USER app

# Start the application
CMD ["node", "src/index.js"]