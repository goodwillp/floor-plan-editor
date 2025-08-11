/**
 * Configuration validation tools for BIM Wall System setup
 * Validates database configurations, performance settings, and deployment parameters
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations?: string[];
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  ssl?: boolean | object;
  synchronize?: boolean;
  logging?: boolean | string[];
  entities?: string[];
  migrations?: string[];
  maxConnections?: number;
  connectionTimeout?: number;
}

export interface BIMSystemConfig {
  database: DatabaseConfig;
  performance: PerformanceConfig;
  cache: CacheConfig;
  tolerance: ToleranceConfig;
  visualization: VisualizationConfig;
}

export interface PerformanceConfig {
  maxConcurrentOperations: number;
  batchSize: number;
  enableParallelProcessing: boolean;
  memoryThreshold: number;
  operationTimeout: number;
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  enablePersistentCache: boolean;
  cacheDirectory?: string;
}

export interface ToleranceConfig {
  baseTolerance: number;
  adaptiveToleranceEnabled: boolean;
  documentPrecision: number;
  maxToleranceAdjustment: number;
}

export interface VisualizationConfig {
  enableAdvancedVisualization: boolean;
  maxRenderComplexity: number;
  enableLevelOfDetail: boolean;
  renderCacheSize: number;
}

/**
 * Comprehensive configuration validator for BIM Wall System
 */
export class ConfigurationValidator {
  /**
   * Validate complete BIM system configuration
   */
  validateSystemConfig(config: BIMSystemConfig): ValidationResult {
    const results: ValidationResult[] = [
      this.validateDatabaseConfig(config.database),
      this.validatePerformanceConfig(config.performance),
      this.validateCacheConfig(config.cache),
      this.validateToleranceConfig(config.tolerance),
      this.validateVisualizationConfig(config.visualization)
    ];

    return this.mergeValidationResults(results);
  }

  /**
   * Validate database configuration
   */
  validateDatabaseConfig(config: DatabaseConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate required fields
    if (!config.type) {
      errors.push('Database type is required (sqlite or postgres)');
    }

    if (!config.database) {
      errors.push('Database name/path is required');
    }

    // Validate PostgreSQL specific configuration
    if (config.type === 'postgres') {
      if (!config.host) {
        errors.push('PostgreSQL host is required');
      }

      if (!config.port) {
        warnings.push('PostgreSQL port not specified, using default 5432');
      } else if (config.port < 1 || config.port > 65535) {
        errors.push('PostgreSQL port must be between 1 and 65535');
      }

      if (!config.username) {
        errors.push('PostgreSQL username is required');
      }

      if (!config.password) {
        warnings.push('PostgreSQL password not set - ensure authentication is configured');
      }

      if (config.maxConnections && config.maxConnections > 100) {
        warnings.push('High connection count may impact performance');
        recommendations.push('Consider connection pooling for high-traffic applications');
      }

      if (!config.ssl && process.env.NODE_ENV === 'production') {
        warnings.push('SSL not enabled for production PostgreSQL connection');
        recommendations.push('Enable SSL for production deployments');
      }
    }

    // Validate SQLite specific configuration
    if (config.type === 'sqlite') {
      if (!config.database.endsWith('.db')) {
        warnings.push('SQLite database should have .db extension');
      }

      if (config.maxConnections && config.maxConnections > 1) {
        warnings.push('SQLite supports only single connection, maxConnections will be ignored');
      }

      if (config.host || config.port || config.username || config.password) {
        warnings.push('SQLite does not use host/port/credentials, these settings will be ignored');
      }
    }

    // Validate common settings
    if (config.synchronize && process.env.NODE_ENV === 'production') {
      errors.push('synchronize should be false in production');
      recommendations.push('Use migrations for production schema changes');
    }

    if (config.connectionTimeout && config.connectionTimeout < 5000) {
      warnings.push('Connection timeout is very low, may cause connection failures');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate performance configuration
   */
  validatePerformanceConfig(config: PerformanceConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (config.maxConcurrentOperations < 1) {
      errors.push('maxConcurrentOperations must be at least 1');
    } else if (config.maxConcurrentOperations > 32) {
      warnings.push('Very high concurrent operations may cause memory issues');
      recommendations.push('Monitor memory usage with high concurrency settings');
    }

    if (config.batchSize < 1) {
      errors.push('batchSize must be at least 1');
    } else if (config.batchSize > 10000) {
      warnings.push('Large batch size may cause memory pressure');
      recommendations.push('Consider smaller batch sizes for memory-constrained environments');
    }

    if (config.memoryThreshold < 0.1 || config.memoryThreshold > 1.0) {
      errors.push('memoryThreshold must be between 0.1 and 1.0');
    } else if (config.memoryThreshold > 0.9) {
      warnings.push('High memory threshold may cause system instability');
    }

    if (config.operationTimeout < 1000) {
      warnings.push('Very low operation timeout may cause premature failures');
    } else if (config.operationTimeout > 300000) {
      warnings.push('Very high operation timeout may cause UI freezing');
    }

    // Hardware-specific recommendations
    const cpuCount = require('os').cpus().length;
    if (config.maxConcurrentOperations > cpuCount * 2) {
      recommendations.push(`Consider reducing maxConcurrentOperations (current: ${config.maxConcurrentOperations}, CPUs: ${cpuCount})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate cache configuration
   */
  validateCacheConfig(config: CacheConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (config.maxSize < 1) {
      errors.push('Cache maxSize must be at least 1');
    } else if (config.maxSize > 100000) {
      warnings.push('Very large cache size may consume excessive memory');
      recommendations.push('Monitor memory usage with large cache sizes');
    }

    if (config.ttl < 1000) {
      warnings.push('Very low TTL may cause excessive cache churn');
    } else if (config.ttl > 86400000) { // 24 hours
      warnings.push('Very high TTL may cause stale data issues');
    }

    if (config.enablePersistentCache && !config.cacheDirectory) {
      errors.push('cacheDirectory is required when persistent cache is enabled');
    }

    if (config.cacheDirectory) {
      try {
        const fs = require('fs');
        if (!fs.existsSync(config.cacheDirectory)) {
          warnings.push('Cache directory does not exist, will be created');
        }
      } catch (error) {
        warnings.push('Cannot validate cache directory existence');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate tolerance configuration
   */
  validateToleranceConfig(config: ToleranceConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (config.baseTolerance <= 0) {
      errors.push('baseTolerance must be positive');
    } else if (config.baseTolerance > 1.0) {
      warnings.push('Very high base tolerance may cause geometric inaccuracy');
    } else if (config.baseTolerance < 0.0001) {
      warnings.push('Very low base tolerance may cause numerical instability');
    }

    if (config.documentPrecision <= 0) {
      errors.push('documentPrecision must be positive');
    } else if (config.documentPrecision > 0.1) {
      warnings.push('Low document precision may cause visible geometric errors');
    }

    if (config.maxToleranceAdjustment < 1.0) {
      warnings.push('Low maxToleranceAdjustment may prevent error recovery');
    } else if (config.maxToleranceAdjustment > 1000.0) {
      warnings.push('Very high maxToleranceAdjustment may cause geometric degradation');
    }

    // Relationship validations
    if (config.baseTolerance > config.documentPrecision) {
      warnings.push('baseTolerance is larger than documentPrecision');
      recommendations.push('Consider reducing baseTolerance or increasing documentPrecision');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate visualization configuration
   */
  validateVisualizationConfig(config: VisualizationConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (config.maxRenderComplexity < 1) {
      errors.push('maxRenderComplexity must be at least 1');
    } else if (config.maxRenderComplexity > 10000) {
      warnings.push('Very high render complexity may cause performance issues');
      recommendations.push('Consider enabling level-of-detail rendering for complex scenes');
    }

    if (config.renderCacheSize < 1) {
      errors.push('renderCacheSize must be at least 1');
    } else if (config.renderCacheSize > 10000) {
      warnings.push('Large render cache may consume excessive GPU memory');
    }

    if (!config.enableLevelOfDetail && config.maxRenderComplexity > 1000) {
      recommendations.push('Enable level-of-detail rendering for better performance with complex geometry');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate environment-specific settings
   */
  validateEnvironmentConfig(config: BIMSystemConfig, environment: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    switch (environment) {
      case 'development':
        if (!config.database.logging) {
          recommendations.push('Enable database logging for development');
        }
        if (config.performance.maxConcurrentOperations > 4) {
          recommendations.push('Reduce concurrent operations for development');
        }
        break;

      case 'production':
        if (config.database.synchronize) {
          errors.push('Database synchronize must be false in production');
        }
        if (config.database.logging === true) {
          warnings.push('Full database logging may impact production performance');
        }
        if (config.cache.maxSize < 1000) {
          recommendations.push('Increase cache size for production performance');
        }
        break;

      case 'test':
        if (config.cache.enabled) {
          warnings.push('Cache may interfere with test isolation');
        }
        if (config.performance.operationTimeout > 10000) {
          recommendations.push('Reduce operation timeout for faster test execution');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Generate hardware-specific recommendations
   */
  generateHardwareRecommendations(config: BIMSystemConfig): string[] {
    const recommendations: string[] = [];
    const os = require('os');
    
    const cpuCount = os.cpus().length;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    // CPU recommendations
    if (config.performance.maxConcurrentOperations > cpuCount * 2) {
      recommendations.push(`Reduce maxConcurrentOperations to ${cpuCount * 2} for optimal CPU utilization`);
    }

    // Memory recommendations
    const memoryUsageGB = totalMemory / (1024 * 1024 * 1024);
    if (memoryUsageGB < 4 && config.cache.maxSize > 1000) {
      recommendations.push('Reduce cache size on low-memory systems');
    }

    if (freeMemory / totalMemory < 0.2) {
      recommendations.push('System is low on memory, consider reducing cache and batch sizes');
    }

    // Storage recommendations
    if (config.database.type === 'sqlite') {
      recommendations.push('Consider PostgreSQL for better concurrent access in multi-user environments');
    }

    return recommendations;
  }

  /**
   * Merge multiple validation results
   */
  private mergeValidationResults(results: ValidationResult[]): ValidationResult {
    const merged: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    for (const result of results) {
      if (!result.isValid) {
        merged.isValid = false;
      }
      merged.errors.push(...result.errors);
      merged.warnings.push(...result.warnings);
      if (result.recommendations) {
        merged.recommendations!.push(...result.recommendations);
      }
    }

    return merged;
  }

  /**
   * Generate configuration report
   */
  generateConfigurationReport(config: BIMSystemConfig, environment: string): ConfigurationReport {
    const systemValidation = this.validateSystemConfig(config);
    const environmentValidation = this.validateEnvironmentConfig(config, environment);
    const hardwareRecommendations = this.generateHardwareRecommendations(config);

    const allValidations = this.mergeValidationResults([systemValidation, environmentValidation]);
    allValidations.recommendations!.push(...hardwareRecommendations);

    return {
      timestamp: new Date(),
      environment,
      isValid: allValidations.isValid,
      summary: {
        totalErrors: allValidations.errors.length,
        totalWarnings: allValidations.warnings.length,
        totalRecommendations: allValidations.recommendations!.length
      },
      validation: allValidations,
      configurationSummary: this.generateConfigurationSummary(config)
    };
  }

  /**
   * Generate configuration summary
   */
  private generateConfigurationSummary(config: BIMSystemConfig): ConfigurationSummary {
    return {
      database: {
        type: config.database.type,
        hasSSL: !!config.database.ssl,
        loggingEnabled: !!config.database.logging
      },
      performance: {
        concurrency: config.performance.maxConcurrentOperations,
        batchSize: config.performance.batchSize,
        parallelProcessing: config.performance.enableParallelProcessing
      },
      cache: {
        enabled: config.cache.enabled,
        size: config.cache.maxSize,
        persistent: config.cache.enablePersistentCache
      },
      tolerance: {
        base: config.tolerance.baseTolerance,
        adaptive: config.tolerance.adaptiveToleranceEnabled,
        precision: config.tolerance.documentPrecision
      }
    };
  }
}

export interface ConfigurationReport {
  timestamp: Date;
  environment: string;
  isValid: boolean;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalRecommendations: number;
  };
  validation: ValidationResult;
  configurationSummary: ConfigurationSummary;
}

export interface ConfigurationSummary {
  database: {
    type: string;
    hasSSL: boolean;
    loggingEnabled: boolean;
  };
  performance: {
    concurrency: number;
    batchSize: number;
    parallelProcessing: boolean;
  };
  cache: {
    enabled: boolean;
    size: number;
    persistent: boolean;
  };
  tolerance: {
    base: number;
    adaptive: boolean;
    precision: number;
  };
}

/**
 * Configuration validator factory for different environments
 */
export class ConfigurationValidatorFactory {
  static createValidator(environment: string): ConfigurationValidator {
    const validator = new ConfigurationValidator();
    
    // Environment-specific customizations could be added here
    switch (environment) {
      case 'development':
        // Development-specific validation rules
        break;
      case 'production':
        // Production-specific validation rules
        break;
      case 'test':
        // Test-specific validation rules
        break;
    }
    
    return validator;
  }
}