# Stage 1: Build static files with Node
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files from the build context
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY . .

# Run Vite build (outputs to /app/dist based on outDir: '../dist')
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Fix: Copy from /app/dist instead of /dist
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]