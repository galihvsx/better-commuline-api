FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Set environment variable for port
ENV PORT=8917

# Expose port
EXPOSE 8917

# Start application
CMD ["bun", "run", "src/index.ts"]
