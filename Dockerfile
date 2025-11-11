FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["bun", "run", "src/index.ts"]
