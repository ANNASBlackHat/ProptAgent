FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install all dependencies including devDependencies (needed for typescript build)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the Next.js app
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose the port Next.js runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
