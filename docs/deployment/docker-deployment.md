# Docker Deployment Guide

## Overview

This guide covers containerized deployment of the BIM Wall System using Docker and Docker Compose. It includes development, production, and multi-service configurations.

## Basic Docker Setup

### Dockerfile for BIM Wall System

```dockerfile
# Multi-stage Dockerfile for BIM Wall System
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    postgresql-client \
    curl \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S bim && \
    adduser -S bim -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/cache && \
    chown -R bim:bim /app

# Switch to non-root user
USER bim

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
```

### Development Dockerfile

```dockerfile
# Development Dockerfile with hot reload
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    postgresql-client \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/cache

# Expose port
EXPOSE 3000

# Start development server with hot reload
CMD ["npm", "run", "dev"]
```

## Docker Compose Configurations

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  bim-app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - bim_data:/app/data
      - bim_logs:/app/logs
    environment:
      - NODE_ENV=development
      - DB_TYPE=sqlite
      - DB_PATH=/app/data/bim-walls-dev.db
      - BIM_CACHE_SIZE=100
      - BIM_ENABLE_DEBUG_LOGGING=true
    depends_on:
      - postgres-dev
    networks:
      - bim-network

  postgres-dev:
    image: postgis/postgis:14-3.2
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: bim_walls_dev
      POSTGRES_USER: bim_user
      POSTGRES_PASSWORD: dev_password
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - bim-network

  redis-dev:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    networks:
      - bim-network

volumes:
  bim_data:
  bim_logs:
  postgres_dev_data:
  redis_dev_data:

networks:
  bim-network:
    driver: bridge
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - bim-app
    networks:
      - frontend
    restart: unless-stopped

  bim-app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DB_TYPE=postgres
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=bim_walls
      - DB_USERNAME=bim_user
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - BIM_CACHE_SIZE=10000
      - BIM_ENABLE_DEBUG_LOGGING=false
    volumes:
      - bim_data:/app/data
      - bim_logs:/app/logs
      - bim_cache:/app/cache
    secrets:
      - db_password
      - jwt_secret
    depends_on:
      - postgres
      - redis
    networks:
      - frontend
      - backend
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'

  postgres:
    image: postgis/postgis:14-3.2
    environment:
      POSTGRES_DB: bim_walls
      POSTGRES_USER: bim_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-prod-db.sql:/docker-entrypoint-initdb.d/init-db.sql
      - postgres_logs:/var/log/postgresql
    secrets:
      - db_password
    networks:
      - backend
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - backend
    restart: unless-stopped

  backup:
    image: postgres:14-alpine
    environment:
      PGPASSWORD_FILE: /run/secrets/db_password
    volumes:
      - backup_data:/backups
      - ./scripts/backup.sh:/backup.sh:ro
    secrets:
      - db_password
    networks:
      - backend
    command: |
      sh -c "
        echo '0 2 * * * /backup.sh' | crontab -
        crond -f
      "
    restart: unless-stopped

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt

volumes:
  bim_data:
  bim_logs:
  bim_cache:
  postgres_data:
  postgres_logs:
  redis_data:
  nginx_logs:
  backup_data:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

### High Availability Setup

```yaml
# docker-compose.ha.yml
version: '3.8'

services:
  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/load-balancer.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - bim-app-1
      - bim-app-2
    networks:
      - frontend
    restart: unless-stopped

  bim-app-1:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=app-1
      - DB_HOST=postgres-primary
    volumes:
      - bim_data_1:/app/data
      - bim_logs_1:/app/logs
    networks:
      - frontend
      - backend
    restart: unless-stopped

  bim-app-2:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=app-2
      - DB_HOST=postgres-primary
    volumes:
      - bim_data_2:/app/data
      - bim_logs_2:/app/logs
    networks:
      - frontend
      - backend
    restart: unless-stopped

  postgres-primary:
    image: postgis/postgis:14-3.2
    environment:
      POSTGRES_DB: bim_walls
      POSTGRES_USER: bim_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPLICATION_PASSWORD}
    volumes:
      - postgres_primary_data:/var/lib/postgresql/data
      - ./scripts/setup-replication.sh:/docker-entrypoint-initdb.d/setup-replication.sh
    networks:
      - backend
    restart: unless-stopped

  postgres-replica:
    image: postgis/postgis:14-3.2
    environment:
      PGUSER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_MASTER_SERVICE: postgres-primary
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPLICATION_PASSWORD}
    volumes:
      - postgres_replica_data:/var/lib/postgresql/data
    networks:
      - backend
    restart: unless-stopped
    depends_on:
      - postgres-primary

volumes:
  bim_data_1:
  bim_data_2:
  bim_logs_1:
  bim_logs_2:
  postgres_primary_data:
  postgres_replica_data:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

## Nginx Configuration

### Load Balancer Configuration

```nginx
# nginx/load-balancer.conf
upstream bim_backend {
    least_conn;
    server bim-app-1:3000 max_fails=3 fail_timeout=30s;
    server bim-app-2:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://bim_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        access_log off;
        proxy_pass http://bim_backend;
        proxy_set_header Host $host;
    }

    location /static/ {
        alias /app/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Container Management Scripts

### Deployment Script

```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"

echo "Deploying BIM Wall System to $ENVIRONMENT environment..."

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found"
    exit 1
fi

# Pull latest images
echo "Pulling latest images..."
docker-compose -f "$COMPOSE_FILE" pull

# Build application image
echo "Building application image..."
docker-compose -f "$COMPOSE_FILE" build --no-cache bim-app

# Run database migrations
echo "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" run --rm bim-app npm run migrate

# Start services with zero-downtime deployment
echo "Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
timeout 300 bash -c '
    while ! docker-compose -f "'$COMPOSE_FILE'" ps | grep -q "Up (healthy)"; do
        echo "Waiting for services to be healthy..."
        sleep 10
    done
'

# Clean up old images
echo "Cleaning up old images..."
docker image prune -f

echo "Deployment completed successfully!"

# Show service status
docker-compose -f "$COMPOSE_FILE" ps
```

### Backup Script

```bash
#!/bin/bash
# backup.sh - Database backup script for Docker

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="postgres"
DB_NAME="bim_walls"
DB_USER="bim_user"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."

# Create database backup
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_DIR/bim_walls_${TIMESTAMP}.backup"

# Compress backup
gzip "$BACKUP_DIR/bim_walls_${TIMESTAMP}.backup"

# Clean up old backups (keep last 30 days)
find "$BACKUP_DIR" -name "bim_walls_*.backup.gz" -mtime +30 -delete

echo "Backup completed: bim_walls_${TIMESTAMP}.backup.gz"

# Upload to cloud storage (if configured)
if [ -n "$AWS_S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_DIR/bim_walls_${TIMESTAMP}.backup.gz" "s3://$AWS_S3_BUCKET/backups/"
    echo "Backup uploaded to S3"
fi
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh - Comprehensive health check for Docker services

set -e

COMPOSE_FILE=${1:-docker-compose.prod.yml}

echo "Performing health check on BIM Wall System..."

# Check if all services are running
echo "Checking service status..."
docker-compose -f "$COMPOSE_FILE" ps

# Check application health endpoint
echo "Checking application health..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✓ Application health check passed"
else
    echo "✗ Application health check failed"
    exit 1
fi

# Check database connectivity
echo "Checking database connectivity..."
if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U bim_user > /dev/null 2>&1; then
    echo "✓ Database connectivity check passed"
else
    echo "✗ Database connectivity check failed"
    exit 1
fi

# Check Redis connectivity
echo "Checking Redis connectivity..."
if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis connectivity check passed"
else
    echo "✗ Redis connectivity check failed"
    exit 1
fi

# Check disk space
echo "Checking disk space..."
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    echo "✓ Disk space check passed ($DISK_USAGE% used)"
else
    echo "✗ Disk space check failed ($DISK_USAGE% used)"
    exit 1
fi

# Check memory usage
echo "Checking memory usage..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -lt 90 ]; then
    echo "✓ Memory usage check passed ($MEMORY_USAGE% used)"
else
    echo "✗ Memory usage check failed ($MEMORY_USAGE% used)"
    exit 1
fi

echo "All health checks passed!"
```

## Docker Security Best Practices

### Security Configuration

```dockerfile
# Security-hardened Dockerfile
FROM node:18-alpine AS base

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S bim && \
    adduser -S bim -u 1001 -G bim

FROM base AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS runtime

# Copy application files
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=bim:bim . .

# Set file permissions
RUN chmod -R 755 /app && \
    chmod -R 700 /app/data /app/logs

# Switch to non-root user
USER bim

# Remove unnecessary packages
RUN apk del --purge

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

### Docker Compose Security

```yaml
# Security-focused docker-compose.yml
version: '3.8'

services:
  bim-app:
    build: .
    user: "1001:1001"
    read_only: true
    tmpfs:
      - /tmp
      - /app/logs
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.enable_icc: "false"
```

## Monitoring and Logging

### Container Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
```

### Log Aggregation

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - logging

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logging/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    networks:
      - logging
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - logging
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:

networks:
  logging:
    driver: bridge
```

This comprehensive Docker deployment guide provides all the necessary configurations and scripts for containerized deployment of the BIM Wall System in various environments.