FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose API port
EXPOSE 4000

# Start server
CMD ["npm", "start"]
