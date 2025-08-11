# Database Configuration Guide

## Overview

The BIM Wall System supports both SQLite and PostgreSQL databases, providing flexibility for different deployment scenarios. This guide covers configuration, setup, and migration between database systems.

## SQLite Configuration (Development & Small Deployments)

### Basic Setup

SQLite is the default database for development and small deployments. It requires minimal configuration and provides excellent performance for single-user scenarios.

```typescript
// Basic SQLite configuration
const sqliteConfig: DatabaseConfig = {
  type: 'sqlite',
  database: './data/bim-walls.db',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    'src/lib/bim/entities/*.ts'
  ],
  migrations: [
    'src/lib/bim/migrations/sqlite/*.ts'
  ]
};
```

### SQLite R-Tree Spatial Indexing

Enable spatial indexing for improved geometric query performance:

```sql
-- Enable R-Tree extension
PRAGMA foreign_keys = ON;
CREATE VIRTUAL TABLE IF NOT EXISTS wall_spatial_index 
USING rtree(id, min_x, max_x, min_y, max_y);

-- Create triggers for automatic spatial index updates
CREATE TRIGGER wall_spatial_insert AFTER INSERT ON walls
BEGIN
  INSERT INTO wall_spatial_index VALUES(
    NEW.id, 
    NEW.bounding_box_min_x, 
    NEW.bounding_box_max_x,
    NEW.bounding_box_min_y, 
    NEW.bounding_box_max_y
  );
END;
```

### SQLite Performance Optimization

```sql
-- Optimize SQLite for BIM operations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256MB
```

## PostgreSQL Configuration (Production & Multi-User)

### Basic Setup

PostgreSQL with PostGIS provides advanced spatial capabilities and better concurrent access for production deployments.

```typescript
// PostgreSQL configuration
const postgresConfig: DatabaseConfig = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'bim_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'bim_walls',
  synchronize: false,
  logging: ['error', 'warn'],
  entities: [
    'src/lib/bim/entities/*.ts'
  ],
  migrations: [
    'src/lib/bim/migrations/postgres/*.ts'
  ],
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};
```

### PostGIS Extension Setup

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create spatial indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_walls_geometry 
ON walls USING GIST (geometry);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intersections_point 
ON intersections USING GIST (intersection_point);
```

### PostgreSQL Performance Tuning

```sql
-- Optimize PostgreSQL for geometric operations
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

## Environment Configuration

### Development Environment

```bash
# .env.development
NODE_ENV=development
DB_TYPE=sqlite
DB_PATH=./data/bim-walls-dev.db
BIM_CACHE_SIZE=100
BIM_TOLERANCE_BASE=0.001
BIM_ENABLE_DEBUG_LOGGING=true
BIM_SPATIAL_INDEXING=true
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
DB_TYPE=postgres
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=bim_walls_prod
DB_USERNAME=bim_user
DB_PASSWORD=your-secure-password
BIM_CACHE_SIZE=1000
BIM_TOLERANCE_BASE=0.0001
BIM_ENABLE_DEBUG_LOGGING=false
BIM_SPATIAL_INDEXING=true
BIM_CONNECTION_POOL_SIZE=20
BIM_QUERY_TIMEOUT=30000
```

## Database Migration Between Systems

### SQLite to PostgreSQL Migration

```typescript
import { DatabaseMigrationManager } from '../lib/bim/migration/DatabaseMigrationManager';

const migrationManager = new DatabaseMigrationManager();

// Migrate from SQLite to PostgreSQL
const migrationResult = await migrationManager.migrateDatabase({
  source: {
    type: 'sqlite',
    database: './data/bim-walls.db'
  },
  target: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'bim_user',
    password: 'password',
    database: 'bim_walls'
  },
  options: {
    batchSize: 1000,
    validateData: true,
    createBackup: true
  }
});
```

### Migration Validation

```typescript
// Validate migration accuracy
const validationResult = await migrationManager.validateMigration({
  sourceConfig: sqliteConfig,
  targetConfig: postgresConfig,
  validationLevel: 'comprehensive'
});

if (!validationResult.isValid) {
  console.error('Migration validation failed:', validationResult.errors);
}
```

## Connection Pool Configuration

### PostgreSQL Connection Pooling

```typescript
const poolConfig = {
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  acquire: 30000,             // Maximum time to get connection
  idle: 10000,                // Maximum idle time
  evict: 1000,                // Eviction check interval
  handleDisconnects: true,    // Handle disconnections
  validate: (connection) => {
    return connection.isValid();
  }
};
```

### SQLite Connection Management

```typescript
const sqlitePoolConfig = {
  max: 1,                     // SQLite is single-threaded
  acquireTimeoutMillis: 5000,
  createTimeoutMillis: 3000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
};
```

## Backup and Recovery

### SQLite Backup

```bash
#!/bin/bash
# SQLite backup script
DB_PATH="./data/bim-walls.db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
sqlite3 $DB_PATH ".backup $BACKUP_DIR/bim-walls-$TIMESTAMP.db"

# Compress backup
gzip "$BACKUP_DIR/bim-walls-$TIMESTAMP.db"

echo "Backup created: $BACKUP_DIR/bim-walls-$TIMESTAMP.db.gz"
```

### PostgreSQL Backup

```bash
#!/bin/bash
# PostgreSQL backup script
DB_NAME="bim_walls"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup with custom format
pg_dump -Fc -v --host=localhost --username=bim_user --dbname=$DB_NAME \
  --file="$BACKUP_DIR/bim-walls-$TIMESTAMP.backup"

echo "Backup created: $BACKUP_DIR/bim-walls-$TIMESTAMP.backup"
```

## Monitoring and Health Checks

### Database Health Check

```typescript
export class DatabaseHealthChecker {
  async checkHealth(config: DatabaseConfig): Promise<HealthCheckResult> {
    const checks = [
      this.checkConnection(config),
      this.checkSpatialIndexes(config),
      this.checkPerformanceMetrics(config),
      this.checkDiskSpace(config)
    ];

    const results = await Promise.allSettled(checks);
    
    return {
      overall: results.every(r => r.status === 'fulfilled'),
      details: results.map((r, i) => ({
        check: ['connection', 'spatial_indexes', 'performance', 'disk_space'][i],
        status: r.status,
        result: r.status === 'fulfilled' ? r.value : r.reason
      }))
    };
  }

  private async checkConnection(config: DatabaseConfig): Promise<boolean> {
    // Implementation for connection check
    return true;
  }

  private async checkSpatialIndexes(config: DatabaseConfig): Promise<boolean> {
    // Implementation for spatial index validation
    return true;
  }
}
```

## Configuration Validation

### Validation Tools

```typescript
export class ConfigurationValidator {
  validateDatabaseConfig(config: DatabaseConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!config.type) {
      errors.push('Database type is required');
    }

    // Validate PostgreSQL specific config
    if (config.type === 'postgres') {
      if (!config.host) errors.push('PostgreSQL host is required');
      if (!config.username) errors.push('PostgreSQL username is required');
      if (!config.password) warnings.push('PostgreSQL password not set');
    }

    // Validate SQLite specific config
    if (config.type === 'sqlite') {
      if (!config.database) errors.push('SQLite database path is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

## Troubleshooting Common Issues

### Connection Issues

```typescript
// Common connection troubleshooting
export class DatabaseTroubleshooter {
  async diagnoseConnectionIssue(config: DatabaseConfig): Promise<DiagnosisResult> {
    const diagnosis = {
      issue: '',
      solution: '',
      severity: 'low' as 'low' | 'medium' | 'high'
    };

    try {
      await this.testConnection(config);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        diagnosis.issue = 'Database server is not running or unreachable';
        diagnosis.solution = 'Check if database server is running and network connectivity';
        diagnosis.severity = 'high';
      } else if (error.code === 'EAUTH') {
        diagnosis.issue = 'Authentication failed';
        diagnosis.solution = 'Verify username and password credentials';
        diagnosis.severity = 'high';
      }
    }

    return diagnosis;
  }
}
```

### Performance Issues

```sql
-- PostgreSQL performance diagnostics
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename IN ('walls', 'intersections', 'quality_metrics')
ORDER BY tablename, attname;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Security Configuration

### Database Security

```sql
-- Create dedicated BIM user with limited privileges
CREATE USER bim_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE bim_walls TO bim_user;
GRANT USAGE ON SCHEMA public TO bim_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bim_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO bim_user;

-- Revoke unnecessary privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE bim_walls FROM PUBLIC;
```

### SSL Configuration

```typescript
const sslConfig = {
  ssl: {
    require: true,
    rejectUnauthorized: true,
    ca: fs.readFileSync('path/to/ca-certificate.crt').toString(),
    key: fs.readFileSync('path/to/client-key.key').toString(),
    cert: fs.readFileSync('path/to/client-cert.crt').toString()
  }
};
```

## Docker Configuration

### SQLite Docker Setup

```dockerfile
# Dockerfile for SQLite deployment
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN mkdir -p /app/data

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["npm", "start"]
```

### PostgreSQL Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:14-3.2
    environment:
      POSTGRES_DB: bim_walls
      POSTGRES_USER: bim_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    
  bim-app:
    build: .
    environment:
      DB_TYPE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: bim_walls
      DB_USERNAME: bim_user
      DB_PASSWORD: ${DB_PASSWORD}
    depends_on:
      - postgres
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

## Configuration Examples

### Complete Configuration Files

```typescript
// config/database.ts
export const databaseConfigs = {
  development: {
    type: 'sqlite' as const,
    database: './data/bim-walls-dev.db',
    synchronize: true,
    logging: true,
    entities: ['src/lib/bim/entities/*.ts'],
    migrations: ['src/lib/bim/migrations/sqlite/*.ts']
  },
  
  test: {
    type: 'sqlite' as const,
    database: ':memory:',
    synchronize: true,
    logging: false,
    entities: ['src/lib/bim/entities/*.ts']
  },
  
  production: {
    type: 'postgres' as const,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
    logging: ['error'],
    entities: ['dist/lib/bim/entities/*.js'],
    migrations: ['dist/lib/bim/migrations/postgres/*.js'],
    ssl: process.env.DB_SSL === 'true'
  }
};
```

This comprehensive database configuration guide provides all the necessary information for setting up, configuring, and maintaining the BIM Wall System database in various environments.