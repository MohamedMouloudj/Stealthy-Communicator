# Step 1: Build the app
FROM node:20 AS builder

WORKDIR /app

# Copy only package files first for better cache
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY vite.config.* ./
COPY tailwind.config.* ./

RUN npm install

# Copy the rest of the app
COPY . .

# Build the app
RUN npm run build

# Step 2: Serve with nginx
FROM nginx:alpine

# Copy build output to nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove default nginx config and use custom one (optional)
COPY nginx.conf /etc/nginx/nginx.conf

# Expose the default port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
