# Floor Plan Editor - Deployment Guide

This comprehensive guide covers deployment preparation, testing, and production deployment of the Floor Plan Editor application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Testing](#pre-deployment-testing)
3. [Docker Deployment](#docker-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Production Deployment](#production-deployment)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM
- 1GB disk space
- Network access for container registry

**Recommended Requirements:**
- Docker 24.0+
- Docker Compose 2.20+
- 4GB RAM
- 5GB disk space
- SSD storage for better performance

### Software Dependencies

```bash
# Check Docker installation
docker --version
docker-compose --version

# Verify Docker is running
docker info

# Check available resources
docker system df
```

## Pre-Deployment Testing

### 1. Run Complete Test Suite

```bash
# Unit and integration tests
npm run test:all

# End-to-end tests
npm run test:e2e

# Visual regression tests
npm run test:visual

# Performance tests
npm run test:performance
```

### 2. Requirements Validation

Run the comprehensive requirements validation:

```bash
# Run requirements validation tests
npm test -- --run src/test/integration/requirements-validation.test.tsx

# Run complete workflow tests
npm test -- --run src/test/integration/complete-workflow.test.tsx

# Run browser compatibility tests
npm test -- --run src/test/integration/browser-compatibility.test.tsx
```

### 3. Docker Deployment Testing

```bash
# Run Docker deployment tests
node test-docker-deployment.js

# This will test:
# - Image building
# - Container deployment
# - Health checks
# - Resource usage
# - Multi-environment compatibility
```

### 4. Cross-Browser Testing

```bash
# Run Cypress tests in different browsers
npx cypress run --browser chrome
npx cypress run --browser firefox
npx cypress run --browser edge
```

## Docker Deployment

### Development Deployment

```bash
# Using Docker Compose
docker-compose up -d floor-plan-editor-dev

# Or using Docker directly
docker build -t floor-plan-editor:dev -f Dockerfile.dev .
docker run -d -p 5173:5173 \
  -v $(pwd):/app \
  -v /app/node_modules \
  --name floor-plan-editor-dev \
  floor-plan-editor:dev
```

**Development Features:**
- Hot reload enabled
- Source maps available
- Development tools accessible
- Volume mounting for live changes

### Production Deployment

```bash
# Using Docker Compose
docker-compose up -d floor-plan-editor

# Or using Docker directly
docker build -t floor-plan-editor:latest .
docker run -d -p 3000:3000 \
  --name floor-plan-editor \
  --restart unless-stopped \
  floor-plan-editor:latest
```

**Production Features:**
- Optimized build
- Minified assets
- Production error handling
- Health checks enabled
- Automatic restart policy

### Using Deployment Scripts

**Windows:**
```cmd
# Production deployment
docker-deploy.bat prod

# Development deployment
docker-deploy.bat dev

# Both environments
docker-deploy.bat both

# Stop all containers
docker-deploy.bat stop

# View status
docker-deploy.bat status
```

**Linux/macOS:**
```bash
# Make script executable
chmod +x docker-deploy.sh

# Production deployment
./docker-deploy.sh prod

# Development deployment
./docker-deploy.sh dev

# Both environments
./docker-deploy.sh both

# Stop all containers
./docker-deploy.sh stop

# View status
./docker-deploy.sh status
```

## Environment Configuration

### Environment Variables

Create a `.env` file for configuration:

```env
# Port configuration
PROD_PORT=3000
DEV_PORT=5173

# Application settings
NODE_ENV=production
APP_NAME=Floor Plan Editor
APP_VERSION=1.0.0

# Performance settings
VITE_HOST=0.0.0.0
VITE_PORT=5173

# Security settings (production only)
SECURE_HEADERS=true
HTTPS_REDIRECT=false

# Monitoring settings
ENABLE_METRICS=true
LOG_LEVEL=info
```

### Docker Environment Variables

```bash
# Production deployment with custom environment
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e APP_NAME="Floor Plan Editor" \
  -e LOG_LEVEL=info \
  --name floor-plan-editor \
  floor-plan-editor:latest
```

### Docker Compose Environment

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  floor-plan-editor:
    environment:
      - NODE_ENV=production
      - APP_NAME=Floor Plan Editor
      - LOG_LEVEL=info
      - ENABLE_METRICS=true
    ports:
      - "80:3000"  # Map to port 80 for production
```

## Production Deployment

### 1. Pre-Production Checklist

- [ ] All tests passing
- [ ] Docker images built successfully
- [ ] Environment variables configured
- [ ] SSL certificates ready (if using HTTPS)
- [ ] Monitoring tools configured
- [ ] Backup strategy in place
- [ ] Rollback plan prepared

### 2. Staging Deployment

```bash
# Deploy to staging environment
docker-compose -f docker-compose.staging.yml up -d

# Run smoke tests
curl -f http://staging.example.com/health

# Run full test suite against staging
CYPRESS_BASE_URL=http://staging.example.com npm run test:e2e
```

### 3. Production Deployment

```bash
# Pull latest images
docker-compose pull

# Deploy with zero downtime
docker-compose up -d --no-deps --build floor-plan-editor

# Verify deployment
docker-compose ps
docker-compose logs floor-plan-editor

# Run health checks
curl -f http://production.example.com/health
```

### 4. Load Balancer Configuration

**Nginx Configuration:**
```nginx
upstream floor_plan_editor {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001 backup;
}

server {
    listen 80;
    server_name example.com;
    
    location / {
        proxy_pass http://floor_plan_editor;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        proxy_pass http://floor_plan_editor/health;
        access_log off;
    }
}
```

### 5. SSL/TLS Configuration

```bash
# Using Let's Encrypt with Certbot
certbot --nginx -d example.com

# Or using custom certificates
docker run -d \
  -p 443:443 \
  -v /path/to/certs:/etc/ssl/certs \
  -e HTTPS_REDIRECT=true \
  floor-plan-editor:latest
```

## Monitoring and Maintenance

### Health Checks

The application includes built-in health checks:

```bash
# Check application health
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Container Monitoring

```bash
# Monitor container resources
docker stats floor-plan-editor

# View container logs
docker logs -f floor-plan-editor

# Check container health
docker inspect --format='{{.State.Health.Status}}' floor-plan-editor
```

### Application Metrics

The application exposes metrics for monitoring:

- **Performance Metrics**: FPS, frame time, memory usage
- **Error Metrics**: Error count, error types, recovery attempts
- **Usage Metrics**: Active users, feature usage, canvas operations

### Log Management

```bash
# Configure log rotation
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  floor-plan-editor:latest

# Centralized logging with ELK stack
docker run -d \
  --log-driver gelf \
  --log-opt gelf-address=udp://logstash:12201 \
  floor-plan-editor:latest
```

### Backup Strategy

```bash
# Backup container volumes (if any)
docker run --rm \
  -v floor_plan_editor_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data

# Backup configuration files
tar czf config-backup.tar.gz .env docker-compose.yml
```

## Troubleshooting

### Common Issues

**1. Container Won't Start**
```bash
# Check container logs
docker logs floor-plan-editor

# Check container configuration
docker inspect floor-plan-editor

# Verify image integrity
docker images floor-plan-editor
```

**2. Port Conflicts**
```bash
# Check what's using the port
netstat -tulpn | grep :3000

# Use different port
docker run -p 3001:3000 floor-plan-editor:latest
```

**3. Memory Issues**
```bash
# Check container memory usage
docker stats --no-stream floor-plan-editor

# Increase memory limit
docker run -m 1g floor-plan-editor:latest
```

**4. Performance Issues**
```bash
# Enable performance monitoring
docker run -e ENABLE_METRICS=true floor-plan-editor:latest

# Check resource constraints
docker system df
docker system prune
```

### Debug Mode

```bash
# Run container in debug mode
docker run -it --rm \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  floor-plan-editor:latest

# Access container shell
docker exec -it floor-plan-editor /bin/sh
```

### Performance Tuning

```bash
# Optimize for production
docker run -d \
  --memory=1g \
  --cpus=2 \
  --restart=unless-stopped \
  -e NODE_ENV=production \
  floor-plan-editor:latest
```

## Rollback Procedures

### Quick Rollback

```bash
# Stop current version
docker stop floor-plan-editor

# Start previous version
docker run -d \
  --name floor-plan-editor \
  -p 3000:3000 \
  floor-plan-editor:previous

# Or using tags
docker run -d \
  --name floor-plan-editor \
  -p 3000:3000 \
  floor-plan-editor:v1.0.0
```

### Blue-Green Deployment

```bash
# Deploy new version to green environment
docker run -d \
  --name floor-plan-editor-green \
  -p 3001:3000 \
  floor-plan-editor:latest

# Test green environment
curl -f http://localhost:3001/health

# Switch traffic (update load balancer)
# If issues occur, switch back to blue

# Clean up old version
docker stop floor-plan-editor-blue
docker rm floor-plan-editor-blue
```

### Database Rollback (if applicable)

```bash
# Restore from backup
docker run --rm \
  -v floor_plan_editor_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/backup.tar.gz -C /
```

## Security Considerations

### Container Security

```bash
# Run as non-root user
docker run --user 1001:1001 floor-plan-editor:latest

# Use read-only filesystem
docker run --read-only floor-plan-editor:latest

# Limit capabilities
docker run --cap-drop=ALL floor-plan-editor:latest
```

### Network Security

```bash
# Use custom network
docker network create floor-plan-network
docker run --network floor-plan-network floor-plan-editor:latest

# Restrict network access
docker run --network none floor-plan-editor:latest
```

### Image Security

```bash
# Scan image for vulnerabilities
docker scan floor-plan-editor:latest

# Use minimal base images
# Already using node:24-alpine for smaller attack surface
```

## Scaling Considerations

### Horizontal Scaling

```bash
# Run multiple instances
docker run -d --name floor-plan-editor-1 -p 3001:3000 floor-plan-editor:latest
docker run -d --name floor-plan-editor-2 -p 3002:3000 floor-plan-editor:latest
docker run -d --name floor-plan-editor-3 -p 3003:3000 floor-plan-editor:latest

# Use Docker Swarm for orchestration
docker swarm init
docker service create \
  --name floor-plan-editor \
  --replicas 3 \
  --publish 3000:3000 \
  floor-plan-editor:latest
```

### Kubernetes Deployment

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: floor-plan-editor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: floor-plan-editor
  template:
    metadata:
      labels:
        app: floor-plan-editor
    spec:
      containers:
      - name: floor-plan-editor
        image: floor-plan-editor:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: floor-plan-editor-service
spec:
  selector:
    app: floor-plan-editor
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Maintenance Schedule

### Daily Tasks
- [ ] Check container health status
- [ ] Review application logs
- [ ] Monitor resource usage
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Update security patches
- [ ] Review performance metrics
- [ ] Clean up old images and containers
- [ ] Test backup restoration

### Monthly Tasks
- [ ] Update base images
- [ ] Review and update documentation
- [ ] Conduct disaster recovery test
- [ ] Performance optimization review

## Support and Documentation

### Getting Help

- **Documentation**: See `README.md` and `DOCKER_DEPLOYMENT.md`
- **Issues**: Check application logs and container status
- **Performance**: Use built-in performance monitor
- **Testing**: Run deployment test suite

### Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Vite Production Build Guide](https://vitejs.dev/guide/build.html)

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Maintainer**: Floor Plan Editor Team