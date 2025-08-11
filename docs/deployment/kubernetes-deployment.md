# Kubernetes Deployment Guide

## Overview

This guide covers deploying the BIM Wall System on Kubernetes clusters, including configuration for development, staging, and production environments with high availability, auto-scaling, and monitoring.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm 3.x installed
- Container registry access
- Persistent storage provisioner

## Namespace and RBAC

### Namespace Configuration

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bim-wall-system
  labels:
    name: bim-wall-system
    environment: production
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: bim-resource-quota
  namespace: bim-wall-system
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"
    services: "5"
    secrets: "10"
    configmaps: "10"
```

### Service Account and RBAC

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bim-service-account
  namespace: bim-wall-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: bim-wall-system
  name: bim-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints", "configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: bim-role-binding
  namespace: bim-wall-system
subjects:
- kind: ServiceAccount
  name: bim-service-account
  namespace: bim-wall-system
roleRef:
  kind: Role
  name: bim-role
  apiGroup: rbac.authorization.k8s.io
```

## ConfigMaps and Secrets

### Application Configuration

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bim-config
  namespace: bim-wall-system
data:
  NODE_ENV: "production"
  DB_TYPE: "postgres"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "bim_walls"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  BIM_CACHE_SIZE: "10000"
  BIM_ENABLE_DEBUG_LOGGING: "false"
  BIM_MAX_CONCURRENT_OPERATIONS: "16"
  BIM_BATCH_SIZE: "1000"
  BIM_OPERATION_TIMEOUT: "30000"
  CORS_ORIGIN: "https://your-domain.com"
  API_RATE_LIMIT: "100"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: bim-wall-system
data:
  nginx.conf: |
    upstream bim_backend {
        server bim-app-service:3000;
    }
    
    server {
        listen 80;
        server_name _;
        
        location /health {
            access_log off;
            proxy_pass http://bim_backend;
        }
        
        location / {
            proxy_pass http://bim_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
```

### Secrets Management

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bim-secrets
  namespace: bim-wall-system
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
  REDIS_PASSWORD: <base64-encoded-redis-password>
---
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
  namespace: bim-wall-system
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-certificate>
  tls.key: <base64-encoded-private-key>
```

## Persistent Storage

### Storage Classes and PVCs

```yaml
# storage.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: bim-ssd-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  fsType: ext4
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: bim-wall-system
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: bim-ssd-storage
  resources:
    requests:
      storage: 100Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: bim-wall-system
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: bim-ssd-storage
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: bim-data-pvc
  namespace: bim-wall-system
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: bim-ssd-storage
  resources:
    requests:
      storage: 50Gi
```

## Database Deployment

### PostgreSQL with PostGIS

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: bim-wall-system
  labels:
    app: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      serviceAccountName: bim-service-account
      containers:
      - name: postgres
        image: postgis/postgis:14-3.2
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: bim-config
              key: DB_NAME
        - name: POSTGRES_USER
          value: bim_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: bim-secrets
              key: DB_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: postgres-init
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - bim_user
            - -d
            - bim_walls
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - bim_user
            - -d
            - bim_walls
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: postgres-init
        configMap:
          name: postgres-init-scripts
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: bim-wall-system
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

### Redis Cache

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: bim-wall-system
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      serviceAccountName: bim-service-account
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - --appendonly
        - "yes"
        - --requirepass
        - $(REDIS_PASSWORD)
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: bim-secrets
              key: REDIS_PASSWORD
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: bim-wall-system
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

## Application Deployment

### BIM Wall System Application

```yaml
# bim-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bim-app
  namespace: bim-wall-system
  labels:
    app: bim-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bim-app
  template:
    metadata:
      labels:
        app: bim-app
    spec:
      serviceAccountName: bim-service-account
      initContainers:
      - name: wait-for-postgres
        image: postgres:14-alpine
        command:
        - sh
        - -c
        - |
          until pg_isready -h postgres-service -p 5432 -U bim_user; do
            echo "Waiting for postgres..."
            sleep 2
          done
      - name: run-migrations
        image: your-registry/bim-wall-system:latest
        command: ["npm", "run", "migrate"]
        envFrom:
        - configMapRef:
            name: bim-config
        - secretRef:
            name: bim-secrets
      containers:
      - name: bim-app
        image: your-registry/bim-wall-system:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: bim-config
        - secretRef:
            name: bim-secrets
        volumeMounts:
        - name: bim-data
          mountPath: /app/data
        - name: bim-logs
          mountPath: /app/logs
        - name: bim-cache
          mountPath: /app/cache
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      volumes:
      - name: bim-data
        persistentVolumeClaim:
          claimName: bim-data-pvc
      - name: bim-logs
        emptyDir: {}
      - name: bim-cache
        emptyDir: {}
      securityContext:
        fsGroup: 1001
---
apiVersion: v1
kind: Service
metadata:
  name: bim-app-service
  namespace: bim-wall-system
  labels:
    app: bim-app
spec:
  selector:
    app: bim-app
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
```

## Load Balancer and Ingress

### Nginx Load Balancer

```yaml
# nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: bim-wall-system
  labels:
    app: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-config
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  namespace: bim-wall-system
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bim-ingress
  namespace: bim-wall-system
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: tls-secret
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 80
```

## Auto-scaling Configuration

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bim-app-hpa
  namespace: bim-wall-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bim-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Vertical Pod Autoscaler

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: bim-app-vpa
  namespace: bim-wall-system
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bim-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: bim-app
      minAllowed:
        cpu: 100m
        memory: 256Mi
      maxAllowed:
        cpu: 1000m
        memory: 2Gi
      controlledResources: ["cpu", "memory"]
```

## Monitoring and Observability

### Prometheus ServiceMonitor

```yaml
# monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bim-app-monitor
  namespace: bim-wall-system
  labels:
    app: bim-app
spec:
  selector:
    matchLabels:
      app: bim-app
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: bim-app-alerts
  namespace: bim-wall-system
spec:
  groups:
  - name: bim-app.rules
    rules:
    - alert: BIMAppDown
      expr: up{job="bim-app-service"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "BIM App is down"
        description: "BIM App has been down for more than 1 minute"
    
    - alert: BIMAppHighCPU
      expr: rate(container_cpu_usage_seconds_total{pod=~"bim-app-.*"}[5m]) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "BIM App high CPU usage"
        description: "BIM App CPU usage is above 80% for 5 minutes"
    
    - alert: BIMAppHighMemory
      expr: container_memory_usage_bytes{pod=~"bim-app-.*"} / container_spec_memory_limit_bytes > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "BIM App high memory usage"
        description: "BIM App memory usage is above 90% for 5 minutes"
```

## Backup and Disaster Recovery

### Database Backup CronJob

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: bim-wall-system
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: bim-service-account
          containers:
          - name: postgres-backup
            image: postgres:14-alpine
            command:
            - /bin/bash
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              pg_dump -h postgres-service -U bim_user -d bim_walls -Fc > /backup/bim_walls_${TIMESTAMP}.backup
              gzip /backup/bim_walls_${TIMESTAMP}.backup
              
              # Upload to S3 (if configured)
              if [ -n "$AWS_S3_BUCKET" ]; then
                aws s3 cp /backup/bim_walls_${TIMESTAMP}.backup.gz s3://$AWS_S3_BUCKET/backups/
              fi
              
              # Clean up old backups
              find /backup -name "bim_walls_*.backup.gz" -mtime +30 -delete
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: bim-secrets
                  key: DB_PASSWORD
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## Helm Chart

### Chart.yaml

```yaml
# Chart.yaml
apiVersion: v2
name: bim-wall-system
description: A Helm chart for BIM Wall System
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - bim
  - cad
  - architecture
home: https://github.com/your-org/bim-wall-system
sources:
  - https://github.com/your-org/bim-wall-system
maintainers:
  - name: BIM Team
    email: bim-team@your-org.com
```

### Values.yaml

```yaml
# values.yaml
global:
  imageRegistry: your-registry.com
  imagePullSecrets: []

replicaCount: 3

image:
  repository: bim-wall-system
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: tls-secret
      hosts:
        - your-domain.com

resources:
  limits:
    cpu: 500m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

postgresql:
  enabled: true
  auth:
    username: bim_user
    database: bim_walls
  primary:
    persistence:
      enabled: true
      size: 100Gi
      storageClass: bim-ssd-storage

redis:
  enabled: true
  auth:
    enabled: true
  master:
    persistence:
      enabled: true
      size: 10Gi
      storageClass: bim-ssd-storage

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
  prometheusRule:
    enabled: true

backup:
  enabled: true
  schedule: "0 2 * * *"
  retention: 30
  s3:
    enabled: false
    bucket: ""
    region: ""
```

## Deployment Scripts

### Deployment Script

```bash
#!/bin/bash
# deploy-k8s.sh - Kubernetes deployment script

set -e

NAMESPACE=${1:-bim-wall-system}
ENVIRONMENT=${2:-production}
HELM_RELEASE=${3:-bim-wall-system}

echo "Deploying BIM Wall System to Kubernetes..."
echo "Namespace: $NAMESPACE"
echo "Environment: $ENVIRONMENT"
echo "Helm Release: $HELM_RELEASE"

# Create namespace if it doesn't exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Apply RBAC
kubectl apply -f k8s/rbac.yaml

# Create secrets (if they don't exist)
if ! kubectl get secret bim-secrets -n "$NAMESPACE" > /dev/null 2>&1; then
    echo "Creating secrets..."
    kubectl create secret generic bim-secrets \
        --from-literal=DB_PASSWORD="$(openssl rand -base64 32)" \
        --from-literal=JWT_SECRET="$(openssl rand -base64 64)" \
        --from-literal=ENCRYPTION_KEY="$(openssl rand -base64 32)" \
        --from-literal=REDIS_PASSWORD="$(openssl rand -base64 32)" \
        -n "$NAMESPACE"
fi

# Deploy using Helm
helm upgrade --install "$HELM_RELEASE" ./helm/bim-wall-system \
    --namespace "$NAMESPACE" \
    --values "helm/bim-wall-system/values-${ENVIRONMENT}.yaml" \
    --wait \
    --timeout 10m

# Wait for rollout to complete
kubectl rollout status deployment/bim-app -n "$NAMESPACE" --timeout=600s

# Run health check
echo "Running health check..."
kubectl wait --for=condition=ready pod -l app=bim-app -n "$NAMESPACE" --timeout=300s

# Get service information
echo "Deployment completed successfully!"
kubectl get all -n "$NAMESPACE"
```

### Rollback Script

```bash
#!/bin/bash
# rollback-k8s.sh - Kubernetes rollback script

set -e

NAMESPACE=${1:-bim-wall-system}
HELM_RELEASE=${2:-bim-wall-system}
REVISION=${3:-}

echo "Rolling back BIM Wall System..."

if [ -n "$REVISION" ]; then
    echo "Rolling back to revision $REVISION"
    helm rollback "$HELM_RELEASE" "$REVISION" -n "$NAMESPACE"
else
    echo "Rolling back to previous revision"
    helm rollback "$HELM_RELEASE" -n "$NAMESPACE"
fi

# Wait for rollback to complete
kubectl rollout status deployment/bim-app -n "$NAMESPACE" --timeout=600s

echo "Rollback completed successfully!"
kubectl get pods -n "$NAMESPACE"
```

This comprehensive Kubernetes deployment guide provides all the necessary configurations and scripts for deploying the BIM Wall System on Kubernetes with high availability, auto-scaling, and monitoring capabilities.