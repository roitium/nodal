FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json ./
# Note: If you want to respect the root lockfile in a monorepo, 
# you might need to adjust the build context and copy the root bun.lock
RUN bun install --production --no-cache

# Copy configuration files
COPY tsconfig.json ./

# Copy source code
COPY src ./src
COPY drizzle ./drizzle

# Set environment variables
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 5000

# Start the application
CMD ["bun", "src/index.ts"]
