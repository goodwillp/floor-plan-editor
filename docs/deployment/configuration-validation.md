# Configuration Validation Guide

## Overview

This guide covers the comprehensive configuration validation tools provided by the BIM Wall System. These tools help ensure your deployment configuration is correct, secure, and optimized for your environment.

## Configuration Validator

The BIM Wall System includes a built-in configuration validator that checks all aspects of your system configuration.

### Basic Usage

```typescript
import { ConfigurationValidator, BIMSystemConfig } from '../src/lib/bim/config/ConfigurationValidator';

const validator = new ConfigurationValidator();

// Validate complete system configuration
const config: BIMSystemConfig = {
  database: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'bim_user',
    password: 'secure_password',
    database: 'bim_walls'
  },
  performance: {
    maxConcurrentOperations: 8,
    batchSize: 1000,
    enableParallelProcessing: true,
    memoryThreshold: 0.8,
    operationTimeout: 30000
  },
  cache: {
    enabled: true,
    maxSize: 10000,
    ttl: 3600000,
    enablePersistentCache: true,
    cacheDirectory: './cache'
  },
  tolerance: {
    baseTolerance: 0.001,
    adaptiveToleranceEnabled: true,
    documentPrecision: 0.0001,
    maxToleranceAdjustment: 10.0
  },
  visualization: {
    enableAdvancedVisualization: true,
    maxRenderComplexity: 5000,
    enableLevelOfDetail: true,
    renderCacheSize: 1000
  }
};

const result = validator.validateSystemConfig(config);

if (!result.isValid) {
  console.error('Configuration errors:', result.errors);
  console.warn('Configuration warnings:', result.warnings);
  console.info('Recommendations:', result.recommendations);
}
```

### Environment-Specific Validation

```typescript
// Validate for specific environment
const environmentResult = validator.validateEnvironmentConfig(config, 'production');

// Generate comprehensive report
const report = validator.generateConfigurationReport(config, 'production');

console.log('Configuration Report:', {
  isValid: report.isValid,
  errors: report.summary.totalErrors,
  warnings: report.summary.totalWarnings,
  recommendations: report.summary.totalRecommendations
});
```

## Command Line Validation

Use the built-in CLI tool for configuration validation:

```bash
# Validate current configuration
npm run config:validate

# Validate specific environment
npm run config:validate -- --env production

# Generate detailed report
npm run config:validate -- --report --output config-report.json

# Validate and fix common issues
npm run config:validate -- --fix
```

### CLI Options

```bash
# Available CLI options
--env <environment>     # Specify environment (development, production, test)
--config <path>         # Path to configuration file
--report               # Generate detailed report
--output <file>        # Output report to file
--fix                  # Attempt to fix common configuration issues
--strict               # Treat warnings as errors
--quiet                # Suppress non-error output
--format <type>        # Output format (json, yaml, table)
```

## Configuration File Validation

### Database Configuration

```typescript
// Database configuration validation
const dbValidation = validator.validateDatabaseConfig({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'bim_user',
  password: 'secure_password',
  database: 'bim_walls',
  ssl: true,
  maxConnections: 20,
  connectionTimeout: 30000
});

// Common database validation errors:
// - Missing required fields (host, username for PostgreSQL)
// - Invalid port numbers
// - SSL not enabled in production
// - Connection pool size too large
// - Synchronize enabled in production
```

### Performance Configuration

```typescript
// Performance configuration validation
const perfValidation = validator.validatePerformanceConfig({
  maxConcurrentOperations: 8,
  batchSize: 1000,
  enableParallelProcessing: true,
  memoryThreshold: 0.8,
  operationTimeout: 30000
});

// Common performance validation issues:
// - Concurrent operations exceeding CPU cores
// - Batch size too large for available memory
// - Memory threshold too high (>90%)
// - Operation timeout too low or too high
```

### Cache Configuration

```typescript
// Cache configuration validation
const cacheValidation = validator.validateCacheConfig({
  enabled: true,
  maxSize: 10000,
  ttl: 3600000, // 1 hour
  enablePersistentCache: true,
  cacheDirectory: './cache'
});

// Common cache validation issues:
// - Cache directory missing when persistent cache enabled
// - Cache size too large for available memory
// - TTL too low causing cache churn
// - TTL too high causing stale data
```

## Hardware-Specific Validation

The validator automatically detects your hardware and provides recommendations:

```typescript
// Generate hardware-specific recommendations
const hardwareRecommendations = validator.generateHardwareRecommendations(config);

console.log('Hardware Recommendations:', hardwareRecommendations);
// Example output:
// - "Reduce maxConcurrentOperations to 16 for optimal CPU utilization"
// - "Reduce cache size on low-memory systems"
// - "Consider PostgreSQL for better concurrent access"
```

### Hardware Detection

```typescript
// The validator automatically detects:
const os = require('os');

const systemInfo = {
  cpuCount: os.cpus().length,
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  platform: os.platform(),
  architecture: os.arch()
};

// And provides recommendations based on:
// - CPU core count for concurrency settings
// - Available memory for cache and batch sizes
// - Platform-specific optimizations
// - Architecture-specific considerations
```

## Automated Validation

### Pre-Deployment Validation

```bash
#!/bin/bash
# Pre-deployment validation script

echo "Starting pre-deployment validation..."

# Validate configuration
npm run config:validate -- --env production --strict
if [ $? -ne 0 ]; then
    echo "Configuration validation failed"
    exit 1
fi

# Test database connectivity
npm run db:test-connection
if [ $? -ne 0 ]; then
    echo "Database connection test failed"
    exit 1
fi

# Validate system resources
npm run system:check-resources
if [ $? -ne 0 ]; then
    echo "System resource check failed"
    exit 1
fi

echo "Pre-deployment validation completed successfully"
```

### Continuous Validation

```typescript
// Continuous configuration monitoring
export class ConfigurationMonitor {
  private validator: ConfigurationValidator;
  private currentConfig: BIMSystemConfig;
  
  constructor(config: BIMSystemConfig) {
    this.validator = new ConfigurationValidator();
    this.currentConfig = config;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Monitor configuration changes
    setInterval(() => {
      this.validateCurrentConfiguration();
    }, 300000); // Every 5 minutes

    // Monitor system resources
    setInterval(() => {
      this.validateSystemResources();
    }, 60000); // Every minute
  }

  private async validateCurrentConfiguration(): Promise<void> {
    const result = this.validator.validateSystemConfig(this.currentConfig);
    
    if (!result.isValid) {
      console.error('Configuration validation failed:', result.errors);
      // Send alert to monitoring system
      await this.sendConfigurationAlert(result);
    }
  }

  private async validateSystemResources(): Promise<void> {
    const recommendations = this.validator.generateHardwareRecommendations(this.currentConfig);
    
    if (recommendations.length > 0) {
      console.warn('Hardware recommendations:', recommendations);
      // Log recommendations for review
      await this.logHardwareRecommendations(recommendations);
    }
  }
}
```

## Configuration Templates

### Development Template

```json
{
  "database": {
    "type": "sqlite",
    "database": "./data/bim-walls-dev.db",
    "synchronize": true,
    "logging": true
  },
  "performance": {
    "maxConcurrentOperations": 2,
    "batchSize": 100,
    "enableParallelProcessing": false,
    "memoryThreshold": 0.7,
    "operationTimeout": 10000
  },
  "cache": {
    "enabled": true,
    "maxSize": 100,
    "ttl": 300000,
    "enablePersistentCache": false
  },
  "tolerance": {
    "baseTolerance": 0.001,
    "adaptiveToleranceEnabled": true,
    "documentPrecision": 0.0001,
    "maxToleranceAdjustment": 10.0
  },
  "visualization": {
    "enableAdvancedVisualization": true,
    "maxRenderComplexity": 1000,
    "enableLevelOfDetail": false,
    "renderCacheSize": 100
  }
}
```

### Production Template

```json
{
  "database": {
    "type": "postgres",
    "host": "${DB_HOST}",
    "port": "${DB_PORT}",
    "username": "${DB_USERNAME}",
    "password": "${DB_PASSWORD}",
    "database": "${DB_NAME}",
    "ssl": true,
    "synchronize": false,
    "logging": ["error", "warn"],
    "maxConnections": 20,
    "connectionTimeout": 30000
  },
  "performance": {
    "maxConcurrentOperations": 16,
    "batchSize": 1000,
    "enableParallelProcessing": true,
    "memoryThreshold": 0.8,
    "operationTimeout": 30000
  },
  "cache": {
    "enabled": true,
    "maxSize": 10000,
    "ttl": 3600000,
    "enablePersistentCache": true,
    "cacheDirectory": "/app/cache"
  },
  "tolerance": {
    "baseTolerance": 0.0001,
    "adaptiveToleranceEnabled": true,
    "documentPrecision": 0.00001,
    "maxToleranceAdjustment": 100.0
  },
  "visualization": {
    "enableAdvancedVisualization": true,
    "maxRenderComplexity": 10000,
    "enableLevelOfDetail": true,
    "renderCacheSize": 5000
  }
}
```

## Validation Rules Reference

### Database Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `type_required` | Error | Database type must be specified |
| `database_required` | Error | Database name/path is required |
| `postgres_host_required` | Error | PostgreSQL requires host |
| `postgres_username_required` | Error | PostgreSQL requires username |
| `invalid_port` | Error | Port must be 1-65535 |
| `synchronize_production` | Error | Synchronize must be false in production |
| `ssl_production` | Warning | SSL recommended for production |
| `high_connections` | Warning | High connection count may impact performance |

### Performance Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `min_concurrent_ops` | Error | Must have at least 1 concurrent operation |
| `min_batch_size` | Error | Batch size must be at least 1 |
| `memory_threshold_range` | Error | Memory threshold must be 0.1-1.0 |
| `high_concurrent_ops` | Warning | High concurrency may cause memory issues |
| `large_batch_size` | Warning | Large batches may cause memory pressure |
| `high_memory_threshold` | Warning | High threshold may cause instability |

### Cache Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `min_cache_size` | Error | Cache size must be at least 1 |
| `cache_dir_required` | Error | Directory required for persistent cache |
| `large_cache_size` | Warning | Large cache may consume excessive memory |
| `low_ttl` | Warning | Low TTL may cause cache churn |
| `high_ttl` | Warning | High TTL may cause stale data |

## Custom Validation Rules

You can extend the validator with custom rules:

```typescript
export class CustomConfigurationValidator extends ConfigurationValidator {
  validateCustomRules(config: BIMSystemConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Custom business logic validation
    if (config.performance.maxConcurrentOperations > 10 && !config.cache.enabled) {
      warnings.push('High concurrency without caching may impact performance');
      recommendations.push('Enable caching for high-concurrency deployments');
    }

    // Custom security validation
    if (config.database.type === 'postgres' && !config.database.ssl) {
      errors.push('SSL is required for PostgreSQL in this deployment');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }
}
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Configuration Validation
on: [push, pull_request]

jobs:
  validate-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run config:validate -- --env production --strict
      - run: npm run config:validate -- --report --output config-report.json
      - uses: actions/upload-artifact@v3
        with:
          name: config-report
          path: config-report.json
```

### Docker Build Validation

```dockerfile
# Dockerfile with configuration validation
FROM node:18-alpine AS validator

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run config:validate -- --env production --strict

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=validator /app .
CMD ["npm", "start"]
```

This comprehensive configuration validation guide ensures that your BIM Wall System deployment is properly configured, secure, and optimized for your specific environment and hardware.