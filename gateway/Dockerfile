FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy SSL certificates (will be mounted in docker-compose)
# The certificates should be copied from the certs directory

# Copy Angular build (if available)
RUN mkdir -p /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
