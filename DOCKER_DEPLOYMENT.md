# Docker Deployment Guide

This guide covers the Docker containerization setup for the Floor Plan Editor application.

## Overview

The Floor Plan Editor is containerized using Docker with separate configurations for development and production environments. The setup includes:

- **Production Container**: Optimized build with static file serving
- **Development Container**: Hot-reload development server with volume mounting
- **Docker Compose**: Orchestration for both environments
- **Environment Configuration**: Flexible port and environment variable management

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- Node.js 24+ (for local development)

## Quick Start

### Using Deployment Scripts

**Windows:**
```cmd
# Deploy production
docker-deploy.bat prod

# Deploy development
docker-deploy.bat dev

# Deploy both environments
docker-deploy.bat both

# Stop all containers
docker-deploy.bat stop

# View container status
docker-deploy.bat status

# View logs
docker-deploy.bat logs
```

**Linux/macOS:**
```bash
# Make script executable
chmod +x docker-deploy.sh

# Deploy production
./docker-deploy.sh prod

# Deploy development
./docker-deploy.sh dev

# Deploy both environments
./docker-deploy.sh both

# Stop all containers
./docker-deploy.sh stop

# View container status
./docker-deploy.sh status

# View logs
./docker-deploy.sh logs
```

### Manual Docker Commands

**Production Deployment:**
```bash
# Build production image
docker build -t floor-plan-editor:latest -f Dockerfile .

# Run production container
docker run -d -p 3000:3000 --name floor-plan-editor floor-plan-editor:latest

# Or use Docker Compose
docker-compose up -d floor-plan-editor
```

**Development Deployment:**
```bash
# Build development image
docker build -t floor-plan-editor:dev -f Dockerfile.dev .

# Run development container with volume mounting
docker run -d -p 5173:5173 -v $(pwd):/app -v /app/node_modules --name floor-plan-editor-dev floor-plan-editor:dev

# Or use Docker Compose
docker-compose up -d floor-plan-editor-dev
```

## Configuration

### Environment Variables

Create a `.env` file in the project root to customize ports and settings:

```env
# Port configuration
PROD_PORT=3000
DEV_PORT=5173

# Node environment
NODE_ENV=production

# Vite configuration for development
VITE_HOST=0.0.0.0
VITE_PORT=5173

# Application configuration
APP_NAME=Floor Plan Editor
APP_VERSION=1.0.0
```

### Docker Compose Configuration

The `docker-compose.yml` file defines two services:

1. **floor-plan-editor** (Production)
   - Builds optimized production bundle
   - Serves static files using `serve`
   - Includes health checks
   - Configurable port via `PROD_PORT` environment variable

2. **floor-plan-editor-dev** (Development)
   - Runs Vite development server
   - Hot-reload with volume mounting
   - Includes health checks
   - Configurable port via `DEV_PORT` environment variable

## Container Details

### Production Container (Dockerfile)

**Multi-stage build process:**

1. **Dependencies Stage**: Installs all dependencies including dev dependencies
2. **Builder Stage**: Builds the production bundle using Vite
3. **Runner Stage**: Creates minimal runtime image with only built assets

**Key features:**
- Node.js 24 Alpine base image for minimal size
- Multi-stage build for optimized final image
- Non-root user for security
- Static file serving with `serve`
- Health checks for container monitoring

**Image size optimization:**
- Excludes source code and dev dependencies from final image
- Uses Alpine Linux for minimal base image
- Leverages Docker layer caching

### Development Container (Dockerfile.dev)

**Features:**
- Full development environment with all dependencies
- Volume mounting for live code changes
- Vite development server with hot-reload
- Exposed on configurable port (default: 5173)

## Health Checks

Both containers include health checks that verify the application is responding:

- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start Period**: 40 seconds

Health check commands use `wget` to test HTTP endpoints.

## Networking

### Port Configuration

| Service | Internal Port | Default External Port | Environment Variable |
|---------|---------------|----------------------|---------------------|
| Production | 3000 | 3000 | `PROD_PORT` |
| Development | 5173 | 5173 | `DEV_PORT` |

### Port Conflicts

If default ports are in use, modify the `.env` file:

```env
PROD_PORT=3001
DEV_PORT=5174
```

## Volume Mounting (Development)

The development container mounts the project directory for live code changes:

```yaml
volumes:
  - .:/app
  - /app/node_modules  # Prevents overwriting container's node_modules
```

## Build Optimization

### Production Build Features

- **Code Splitting**: Vendor libraries separated into chunks
- **Minification**: ESBuild minification for optimal size
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Optimized CSS and JavaScript bundles

### Build Performance

- **Docker Layer Caching**: Dependencies cached separately from source code
- **Multi-stage Build**: Only necessary files in final image
- **Parallel Processing**: Vite's fast build system

## Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
netstat -tulpn | grep :3000

# Use different port in .env file
echo "PROD_PORT=3001" >> .env
```

**2. Docker Build Fails**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t floor-plan-editor:latest .
```

**3. Container Won't Start**
```bash
# Check container logs
docker logs floor-plan-editor

# Check container status
docker ps -a
```

**4. Development Hot-reload Not Working**
- Ensure volume mounting is correct
- Check that files are being watched
- Verify Vite configuration for host binding

### Performance Issues

**1. Slow Build Times**
- Use Docker BuildKit for faster builds
- Ensure `.dockerignore` excludes unnecessary files
- Leverage layer caching by copying package files first

**2. Large Image Size**
- Review `.dockerignore` to exclude unnecessary files
- Use multi-stage builds effectively
- Consider using distroless images for production

## Security Considerations

### Container Security

- **Non-root User**: Containers run as non-root user (uid: 1001)
- **Minimal Base Image**: Alpine Linux reduces attack surface
- **No Unnecessary Packages**: Only required dependencies installed
- **Read-only Filesystem**: Consider using read-only root filesystem

### Network Security

- **Port Binding**: Only bind necessary ports
- **Internal Networks**: Use Docker networks for service communication
- **Environment Variables**: Avoid hardcoding secrets

## Monitoring and Logging

### Container Monitoring

```bash
# View real-time logs
docker-compose logs -f

# Monitor resource usage
docker stats

# Check health status
docker-compose ps
```

### Log Management

- Logs are written to stdout/stderr for Docker log collection
- Use log rotation to prevent disk space issues
- Consider centralized logging solutions for production

## Production Deployment

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Ports available and configured
- [ ] Docker and Docker Compose installed
- [ ] Application builds successfully
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup strategy in place

### Scaling Considerations

For production scaling:
- Use Docker Swarm or Kubernetes for orchestration
- Implement load balancing for multiple instances
- Configure persistent storage if needed
- Set up monitoring and alerting

## Maintenance

### Regular Tasks

1. **Update Base Images**: Regularly update Node.js base image
2. **Security Updates**: Keep dependencies updated
3. **Log Rotation**: Manage log file sizes
4. **Health Monitoring**: Monitor container health and performance
5. **Backup**: Regular backup of any persistent data

### Updates and Rollbacks

```bash
# Build new version
docker build -t floor-plan-editor:v2.0.0 .

# Tag as latest
docker tag floor-plan-editor:v2.0.0 floor-plan-editor:latest

# Deploy new version
docker-compose up -d floor-plan-editor

# Rollback if needed
docker tag floor-plan-editor:v1.0.0 floor-plan-editor:latest
docker-compose up -d floor-plan-editor
```

## Support

For issues related to Docker deployment:

1. Check container logs: `docker-compose logs`
2. Verify Docker installation: `docker --version`
3. Check available resources: `docker system df`
4. Review configuration files for syntax errors
5. Ensure all required ports are available

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Vite Documentation](https://vitejs.dev/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)