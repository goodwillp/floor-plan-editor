#!/usr/bin/env node

/**
 * Configuration validation CLI tool for BIM Wall System
 * Usage: node scripts/validate-config.js [options]
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { ConfigurationValidator } = require('../src/lib/bim/config/ConfigurationValidator');

// CLI Configuration
program
  .name('validate-config')
  .description('Validate BIM Wall System configuration')
  .version('1.0.0')
  .option('-e, --env <environment>', 'Environment to validate (development, production, test)', 'production')
  .option('-c, --config <path>', 'Path to configuration file', './config/bim-config.json')
  .option('-r, --report', 'Generate detailed report')
  .option('-o, --output <file>', 'Output report to file')
  .option('-f, --fix', 'Attempt to fix common configuration issues')
  .option('-s, --strict', 'Treat warnings as errors')
  .option('-q, --quiet', 'Suppress non-error output')
  .option('--format <type>', 'Output format (json, yaml, table)', 'table');

program.parse();

const options = program.opts();

/**
 * Load configuration from file or environment
 */
function loadConfiguration() {
  let config = {};
  
  // Try to load from file
  if (fs.existsSync(options.config)) {
    try {
      const configContent = fs.readFileSync(options.config, 'utf8');
      config = JSON.parse(configContent);
      if (!options.quiet) {
        console.log(`✓ Loaded configuration from ${options.config}`);
      }
    } catch (error) {
      console.error(`✗ Failed to load configuration from ${options.config}: ${error.message}`);
      process.exit(1);
    }
  } else {
    // Load from environment variables
    config = loadFromEnvironment();
    if (!options.quiet) {
      console.log('✓ Loaded configuration from environment variables');
    }
  }
  
  return config;
}

/**
 * Load configuration from environment variables
 */
function loadFromEnvironment() {
  return {
    database: {
      type: process.env.DB_TYPE || 'sqlite',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || process.env.DB_PATH || './data/bim-walls.db',
      ssl: process.env.DB_SSL === 'true',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true'
    },
    performance: {
      maxConcurrentOperations: parseInt(process.env.BIM_MAX_CONCURRENT_OPERATIONS || '8'),
      batchSize: parseInt(process.env.BIM_BATCH_SIZE || '1000'),
      enableParallelProcessing: process.env.BIM_ENABLE_PARALLEL_PROCESSING !== 'false',
      memoryThreshold: parseFloat(process.env.BIM_MEMORY_THRESHOLD || '0.8'),
      operationTimeout: parseInt(process.env.BIM_OPERATION_TIMEOUT || '30000')
    },
    cache: {
      enabled: process.env.BIM_CACHE_ENABLED !== 'false',
      maxSize: parseInt(process.env.BIM_CACHE_SIZE || '10000'),
      ttl: parseInt(process.env.BIM_CACHE_TTL || '3600000'),
      enablePersistentCache: process.env.BIM_ENABLE_PERSISTENT_CACHE === 'true',
      cacheDirectory: process.env.BIM_CACHE_DIRECTORY
    },
    tolerance: {
      baseTolerance: parseFloat(process.env.BIM_BASE_TOLERANCE || '0.001'),
      adaptiveToleranceEnabled: process.env.BIM_ADAPTIVE_TOLERANCE !== 'false',
      documentPrecision: parseFloat(process.env.BIM_DOCUMENT_PRECISION || '0.0001'),
      maxToleranceAdjustment: parseFloat(process.env.BIM_MAX_TOLERANCE_ADJUSTMENT || '10.0')
    },
    visualization: {
      enableAdvancedVisualization: process.env.BIM_ENABLE_ADVANCED_VISUALIZATION !== 'false',
      maxRenderComplexity: parseInt(process.env.BIM_MAX_RENDER_COMPLEXITY || '5000'),
      enableLevelOfDetail: process.env.BIM_ENABLE_LEVEL_OF_DETAIL !== 'false',
      renderCacheSize: parseInt(process.env.BIM_RENDER_CACHE_SIZE || '1000')
    }
  };
}

/**
 * Fix common configuration issues
 */
function fixConfiguration(config, validationResult) {
  const fixes = [];
  
  // Fix database configuration
  if (config.database.type === 'postgres' && !config.database.ssl && options.env === 'production') {
    config.database.ssl = true;
    fixes.push('Enabled SSL for PostgreSQL in production');
  }
  
  if (config.database.synchronize && options.env === 'production') {
    config.database.synchronize = false;
    fixes.push('Disabled database synchronize in production');
  }
  
  // Fix performance configuration
  const os = require('os');
  const cpuCount = os.cpus().length;
  if (config.performance.maxConcurrentOperations > cpuCount * 2) {
    config.performance.maxConcurrentOperations = cpuCount * 2;
    fixes.push(`Reduced maxConcurrentOperations to ${cpuCount * 2} based on CPU count`);
  }
  
  // Fix cache configuration
  if (config.cache.enablePersistentCache && !config.cache.cacheDirectory) {
    config.cache.cacheDirectory = './cache';
    fixes.push('Set default cache directory for persistent cache');
  }
  
  return { config, fixes };
}

/**
 * Format output based on specified format
 */
function formatOutput(data, format) {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'yaml':
      const yaml = require('js-yaml');
      return yaml.dump(data);
    case 'table':
    default:
      return formatTable(data);
  }
}

/**
 * Format data as a table
 */
function formatTable(report) {
  const lines = [];
  
  lines.push('BIM Wall System Configuration Validation Report');
  lines.push('='.repeat(50));
  lines.push(`Environment: ${report.environment}`);
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Overall Status: ${report.isValid ? '✓ VALID' : '✗ INVALID'}`);
  lines.push('');
  
  lines.push('Summary:');
  lines.push(`  Errors: ${report.summary.totalErrors}`);
  lines.push(`  Warnings: ${report.summary.totalWarnings}`);
  lines.push(`  Recommendations: ${report.summary.totalRecommendations}`);
  lines.push('');
  
  if (report.validation.errors.length > 0) {
    lines.push('Errors:');
    report.validation.errors.forEach(error => {
      lines.push(`  ✗ ${error}`);
    });
    lines.push('');
  }
  
  if (report.validation.warnings.length > 0) {
    lines.push('Warnings:');
    report.validation.warnings.forEach(warning => {
      lines.push(`  ⚠ ${warning}`);
    });
    lines.push('');
  }
  
  if (report.validation.recommendations && report.validation.recommendations.length > 0) {
    lines.push('Recommendations:');
    report.validation.recommendations.forEach(recommendation => {
      lines.push(`  💡 ${recommendation}`);
    });
    lines.push('');
  }
  
  lines.push('Configuration Summary:');
  lines.push(`  Database: ${report.configurationSummary.database.type} (SSL: ${report.configurationSummary.database.hasSSL})`);
  lines.push(`  Performance: ${report.configurationSummary.performance.concurrency} concurrent ops, batch size ${report.configurationSummary.performance.batchSize}`);
  lines.push(`  Cache: ${report.configurationSummary.cache.enabled ? 'enabled' : 'disabled'} (size: ${report.configurationSummary.cache.size})`);
  lines.push(`  Tolerance: base ${report.configurationSummary.tolerance.base}, adaptive ${report.configurationSummary.tolerance.adaptive}`);
  
  return lines.join('\n');
}

/**
 * Main validation function
 */
async function validateConfiguration() {
  try {
    // Load configuration
    let config = loadConfiguration();
    
    // Create validator
    const validator = new ConfigurationValidator();
    
    // Apply fixes if requested
    if (options.fix) {
      const systemValidation = validator.validateSystemConfig(config);
      const { config: fixedConfig, fixes } = fixConfiguration(config, systemValidation);
      config = fixedConfig;
      
      if (fixes.length > 0 && !options.quiet) {
        console.log('Applied fixes:');
        fixes.forEach(fix => console.log(`  ✓ ${fix}`));
        console.log('');
      }
      
      // Save fixed configuration back to file
      if (fs.existsSync(options.config)) {
        fs.writeFileSync(options.config, JSON.stringify(config, null, 2));
        if (!options.quiet) {
          console.log(`✓ Saved fixed configuration to ${options.config}`);
        }
      }
    }
    
    // Generate validation report
    const report = validator.generateConfigurationReport(config, options.env);
    
    // Check if validation passed
    const hasErrors = report.validation.errors.length > 0;
    const hasWarnings = report.validation.warnings.length > 0;
    const treatWarningsAsErrors = options.strict && hasWarnings;
    
    // Format and output report
    if (options.report || options.output) {
      const formattedReport = formatOutput(report, options.format);
      
      if (options.output) {
        fs.writeFileSync(options.output, formattedReport);
        if (!options.quiet) {
          console.log(`✓ Report saved to ${options.output}`);
        }
      } else {
        console.log(formattedReport);
      }
    } else if (!options.quiet) {
      // Simple output
      if (hasErrors) {
        console.log('✗ Configuration validation failed');
        report.validation.errors.forEach(error => {
          console.log(`  Error: ${error}`);
        });
      } else {
        console.log('✓ Configuration validation passed');
      }
      
      if (hasWarnings) {
        report.validation.warnings.forEach(warning => {
          console.log(`  Warning: ${warning}`);
        });
      }
    }
    
    // Exit with appropriate code
    if (hasErrors || treatWarningsAsErrors) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error(`✗ Configuration validation failed: ${error.message}`);
    if (!options.quiet) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run validation
validateConfiguration();