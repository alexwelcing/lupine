FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add custom config
COPY default.conf /etc/nginx/conf.d/

# Copy static files
COPY public /usr/share/nginx/html

# Expose port (Cloud Run will override if needed, but we tell it to use 8080)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
