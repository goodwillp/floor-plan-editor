# Monitoring and Maintenance Guide

## Overview

This guide provides comprehensive monitoring and maintenance procedures for the BIM Wall System in production environments. It covers health monitoring, performance tracking, preventive maintenance, and troubleshooting procedures.

## System Health Monitoring

### Health Check Implementation

```typescript
// Comprehensive health check system
export class BIMSystemHealthChecker {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alertThresholds: Map<string, AlertThreshold> = new Map();
  
  constructor() {
    this.initializeHealthChecks();
    this.setupAlertThresholds();
  }

  async performHealthCheck(): Promise<SystemHealthReport> {
    const checkResults = await Promise.allSettled(
      Array.from(this.healthChecks.values()).map(check => 
        this.executeHealthCheck(check)
      )
    );

    const healthReport: SystemHealthReport = {
      timestamp: new Date(),
      overallStatus: 'healthy',
      checks: [],
      alerts: [],
      recommendations: []
    };

    checkResults.forEach((result, index) => {
      const checkName = Array.from(this.healthChecks.keys())[index];
      
      if (result.status === 'fulfilled') {
        healthReport.checks.push({
          name: checkName,
          status: result.value.status,
          message: result.value.message,
          metrics: result.value.metrics,
          duration: result.value.duration
        });

        // Check for alerts
        this.evaluateAlerts(checkName, result.value, healthReport);
      } else {
        healthReport.checks.push({
          name: checkName,
          status: 'error',
          message: result.reason.message,
          metrics: {},
          duration: 0
        });
        healthReport.overallStatus = 'unhealthy';
      }
    });

    // Determine overall status
    if (healthReport.checks.some(check => check.status === 'error')) {
      healthReport.overallStatus = 'unhealthy';
    } else if (healthReport.checks.some(check => check.status === 'warning')) {
      healthReport.overallStatus = 'degraded';
    }

    return healthReport;
  }

  private initializeHealthChecks(): void {
    this.healthChecks.set('database', new DatabaseHealthCheck());
    this.healthChecks.set('memory', new MemoryHealthCheck());
    this.healthChecks.set('performance', new PerformanceHealthCheck());
    this.healthChecks.set('cache', new CacheHealthCheck());
    this.healthChecks.set('geometric_operations', new GeometricOperationsHealthCheck());
  }

  private setupAlertThresholds(): void {
    this.alertThresholds.set('database_response_time', { warning: 1000, critical: 5000 });
    this.alertThresholds.set('memory_usage', { warning: 0.8, critical: 0.95 });
    this.alertThresholds.set('cache_hit_rate', { warning: 0.7, critical: 0.5 });
    this.alertThresholds.set('operation_failure_rate', { warning: 0.05, critical: 0.1 });
  }
}
```

### Database Health Monitoring

```typescript
// Database-specific health checks
export class DatabaseHealthCheck implements HealthCheck {
  async execute(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    const metrics: Record<string, number> = {};

    try {
      // Test basic connectivity
      const connectionTest = await this.testConnection();
      metrics.connection_time = connectionTest.responseTime;

      // Test query performance
      const queryTest = await this.testQueryPerformance();
      metrics.query_time = queryTest.averageTime;

      // Check connection pool status
      const poolStatus = await this.checkConnectionPool();
      metrics.active_connections = poolStatus.active;
      metrics.idle_connections = poolStatus.idle;

      // Check disk space (for SQLite)
      const diskSpace = await this.checkDiskSpace();
      metrics.disk_usage = diskSpace.usagePercent;

      // Validate spatial indexes
      const spatialIndexes = await this.validateSpatialIndexes();
      metrics.spatial_index_count = spatialIndexes.count;

      const duration = performance.now() - startTime;

      return {
        status: this.determineStatus(metrics),
        message: this.generateStatusMessage(metrics),
        metrics,
        duration
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database health check failed: ${error.message}`,
        metrics,
        duration: performance.now() - startTime
      };
    }
  }

  private async testConnection(): Promise<{ responseTime: number }> {
    const start = performance.now();
    // Implement connection test
    await new Promise(resolve => setTimeout(resolve, 10)); // Placeholder
    return { responseTime: performance.now() - start };
  }

  private async testQueryPerformance(): Promise<{ averageTime: number }> {
    const testQueries = [
      'SELECT COUNT(*) FROM walls',
      'SELECT COUNT(*) FROM intersections',
      'SELECT COUNT(*) FROM quality_metrics'
    ];

    const times: number[] = [];
    for (const query of testQueries) {
      const start = performance.now();
      // Execute query
      await new Promise(resolve => setTimeout(resolve, 5)); // Placeholder
      times.push(performance.now() - start);
    }

    return { averageTime: times.reduce((a, b) => a + b, 0) / times.length };
  }
}
```

### Performance Monitoring

```typescript
// Performance monitoring system
export class BIMPerformanceMonitor {
  private metrics: Map<string, MetricCollector> = new Map();
  private alertManager: AlertManager;
  
  constructor() {
    this.initializeMetrics();
    this.alertManager = new AlertManager();
    this.startPeriodicCollection();
  }

  private initializeMetrics(): void {
    this.metrics.set('operation_times', new OperationTimeCollector());
    this.metrics.set('memory_usage', new MemoryUsageCollector());
    this.metrics.set('cache_performance', new CachePerformanceCollector());
    this.metrics.set('error_rates', new ErrorRateCollector());
    this.metrics.set('throughput', new ThroughputCollector());
  }

  async collectMetrics(): Promise<PerformanceMetrics> {
    const metricResults = await Promise.all(
      Array.from(this.metrics.values()).map(collector => collector.collect())
    );

    const performanceMetrics: PerformanceMetrics = {
      timestamp: new Date(),
      operationTimes: metricResults[0] as OperationTimeMetrics,
      memoryUsage: metricResults[1] as MemoryUsageMetrics,
      cachePerformance: metricResults[2] as CachePerformanceMetrics,
      errorRates: metricResults[3] as ErrorRateMetrics,
      throughput: metricResults[4] as ThroughputMetrics
    };

    // Check for performance alerts
    await this.checkPerformanceAlerts(performanceMetrics);

    return performanceMetrics;
  }

  private async checkPerformanceAlerts(metrics: PerformanceMetrics): Promise<void> {
    // Check operation time alerts
    if (metrics.operationTimes.averageOffsetTime > 1000) {
      await this.alertManager.sendAlert({
        type: 'performance',
        severity: 'warning',
        message: 'Offset operations are taking longer than expected',
        metrics: { averageTime: metrics.operationTimes.averageOffsetTime }
      });
    }

    // Check memory usage alerts
    if (metrics.memoryUsage.heapUsedPercent > 0.9) {
      await this.alertManager.sendAlert({
        type: 'memory',
        severity: 'critical',
        message: 'Memory usage is critically high',
        metrics: { usage: metrics.memoryUsage.heapUsedPercent }
      });
    }

    // Check error rate alerts
    if (metrics.errorRates.geometricOperationErrors > 0.1) {
      await this.alertManager.sendAlert({
        type: 'errors',
        severity: 'warning',
        message: 'High geometric operation error rate detected',
        metrics: { errorRate: metrics.errorRates.geometricOperationErrors }
      });
    }
  }
}
```

## Automated Monitoring Setup

### Monitoring Dashboard

```typescript
// Real-time monitoring dashboard
export class BIMMonitoringDashboard {
  private websocketServer: WebSocket.Server;
  private healthChecker: BIMSystemHealthChecker;
  private performanceMonitor: BIMPerformanceMonitor;
  
  constructor() {
    this.healthChecker = new BIMSystemHealthChecker();
    this.performanceMonitor = new BIMPerformanceMonitor();
    this.setupWebSocketServer();
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Health checks every 30 seconds
    setInterval(async () => {
      const healthReport = await this.healthChecker.performHealthCheck();
      this.broadcastToClients('health_update', healthReport);
    }, 30000);

    // Performance metrics every 10 seconds
    setInterval(async () => {
      const performanceMetrics = await this.performanceMonitor.collectMetrics();
      this.broadcastToClients('performance_update', performanceMetrics);
    }, 10000);

    // System statistics every 5 minutes
    setInterval(async () => {
      const systemStats = await this.collectSystemStatistics();
      this.broadcastToClients('system_stats', systemStats);
    }, 300000);
  }

  private async collectSystemStatistics(): Promise<SystemStatistics> {
    const os = require('os');
    
    return {
      timestamp: new Date(),
      cpu: {
        usage: await this.getCPUUsage(),
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: (os.totalmem() - os.freemem()) / os.totalmem()
      },
      uptime: os.uptime(),
      platform: os.platform(),
      nodeVersion: process.version
    };
  }
}
```

### Log Aggregation and Analysis

```typescript
// Centralized logging system
export class BIMLogAggregator {
  private logBuffer: LogEntry[] = [];
  private logAnalyzer: LogAnalyzer;
  private alertThresholds: Map<string, number> = new Map();

  constructor() {
    this.logAnalyzer = new LogAnalyzer();
    this.setupLogThresholds();
    this.startLogProcessing();
  }

  logEvent(level: LogLevel, category: string, message: string, metadata?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      metadata,
      id: this.generateLogId()
    };

    this.logBuffer.push(logEntry);
    
    // Immediate processing for critical logs
    if (level === 'error' || level === 'critical') {
      this.processLogEntry(logEntry);
    }
  }

  private startLogProcessing(): void {
    // Process log buffer every 5 seconds
    setInterval(() => {
      this.processLogBuffer();
    }, 5000);

    // Analyze logs for patterns every minute
    setInterval(() => {
      this.analyzeLogPatterns();
    }, 60000);
  }

  private async processLogBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToProcess = [...this.logBuffer];
    this.logBuffer = [];

    // Store logs in database
    await this.storeLogs(logsToProcess);

    // Check for alert conditions
    await this.checkLogAlerts(logsToProcess);
  }

  private async analyzeLogPatterns(): Promise<void> {
    const recentLogs = await this.getRecentLogs(3600000); // Last hour
    const analysis = await this.logAnalyzer.analyzePatterns(recentLogs);

    if (analysis.anomaliesDetected) {
      await this.handleLogAnomalies(analysis);
    }
  }
}
```

## Preventive Maintenance

### Automated Maintenance Tasks

```typescript
// Automated maintenance scheduler
export class BIMMaintenanceScheduler {
  private maintenanceTasks: Map<string, MaintenanceTask> = new Map();
  private scheduler: NodeSchedule;

  constructor() {
    this.initializeMaintenanceTasks();
    this.scheduleMaintenanceTasks();
  }

  private initializeMaintenanceTasks(): void {
    // Daily tasks
    this.maintenanceTasks.set('database_cleanup', {
      name: 'Database Cleanup',
      frequency: 'daily',
      time: '02:00',
      execute: () => this.performDatabaseCleanup()
    });

    this.maintenanceTasks.set('cache_optimization', {
      name: 'Cache Optimization',
      frequency: 'daily',
      time: '03:00',
      execute: () => this.optimizeCache()
    });

    // Weekly tasks
    this.maintenanceTasks.set('performance_analysis', {
      name: 'Performance Analysis',
      frequency: 'weekly',
      day: 'sunday',
      time: '01:00',
      execute: () => this.performPerformanceAnalysis()
    });

    this.maintenanceTasks.set('database_optimization', {
      name: 'Database Optimization',
      frequency: 'weekly',
      day: 'sunday',
      time: '02:00',
      execute: () => this.optimizeDatabase()
    });

    // Monthly tasks
    this.maintenanceTasks.set('full_system_check', {
      name: 'Full System Check',
      frequency: 'monthly',
      day: 1,
      time: '01:00',
      execute: () => this.performFullSystemCheck()
    });
  }

  private async performDatabaseCleanup(): Promise<MaintenanceResult> {
    const startTime = new Date();
    const results: string[] = [];

    try {
      // Clean up old log entries
      const logCleanup = await this.cleanupOldLogs();
      results.push(`Cleaned up ${logCleanup.deletedCount} old log entries`);

      // Clean up temporary geometric data
      const tempDataCleanup = await this.cleanupTemporaryData();
      results.push(`Cleaned up ${tempDataCleanup.deletedCount} temporary data entries`);

      // Vacuum database (SQLite) or analyze tables (PostgreSQL)
      const dbOptimization = await this.performDatabaseVacuum();
      results.push(`Database optimization completed: ${dbOptimization.message}`);

      return {
        taskName: 'database_cleanup',
        success: true,
        startTime,
        endTime: new Date(),
        results,
        errors: []
      };
    } catch (error) {
      return {
        taskName: 'database_cleanup',
        success: false,
        startTime,
        endTime: new Date(),
        results,
        errors: [error.message]
      };
    }
  }

  private async optimizeCache(): Promise<MaintenanceResult> {
    const startTime = new Date();
    const results: string[] = [];

    try {
      // Clear expired cache entries
      const expiredEntries = await this.clearExpiredCacheEntries();
      results.push(`Cleared ${expiredEntries} expired cache entries`);

      // Optimize cache memory usage
      const memoryOptimization = await this.optimizeCacheMemory();
      results.push(`Cache memory optimized: ${memoryOptimization.freedMemory}MB freed`);

      // Update cache statistics
      const cacheStats = await this.updateCacheStatistics();
      results.push(`Cache statistics updated: ${cacheStats.hitRate}% hit rate`);

      return {
        taskName: 'cache_optimization',
        success: true,
        startTime,
        endTime: new Date(),
        results,
        errors: []
      };
    } catch (error) {
      return {
        taskName: 'cache_optimization',
        success: false,
        startTime,
        endTime: new Date(),
        results,
        errors: [error.message]
      };
    }
  }
}
```

### Database Maintenance

```sql
-- PostgreSQL maintenance queries
-- Analyze table statistics
ANALYZE walls;
ANALYZE intersections;
ANALYZE quality_metrics;

-- Update table statistics
UPDATE pg_stat_user_tables SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0;

-- Reindex spatial indexes
REINDEX INDEX CONCURRENTLY idx_walls_geometry;
REINDEX INDEX CONCURRENTLY idx_intersections_point;

-- Check for bloated tables
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum and analyze
VACUUM ANALYZE walls;
VACUUM ANALYZE intersections;
VACUUM ANALYZE quality_metrics;
```

```sql
-- SQLite maintenance queries
-- Analyze database
ANALYZE;

-- Vacuum database
VACUUM;

-- Check database integrity
PRAGMA integrity_check;

-- Optimize database
PRAGMA optimize;

-- Update statistics
UPDATE sqlite_stat1 SET stat = NULL;
ANALYZE;
```

## Backup and Recovery Procedures

### Automated Backup System

```typescript
// Comprehensive backup system
export class BIMBackupManager {
  private backupConfig: BackupConfiguration;
  private storageProviders: Map<string, StorageProvider> = new Map();

  constructor(config: BackupConfiguration) {
    this.backupConfig = config;
    this.initializeStorageProviders();
    this.scheduleBackups();
  }

  async performBackup(type: BackupType): Promise<BackupResult> {
    const backupId = this.generateBackupId();
    const startTime = new Date();

    try {
      let backupData: BackupData;

      switch (type) {
        case 'full':
          backupData = await this.performFullBackup();
          break;
        case 'incremental':
          backupData = await this.performIncrementalBackup();
          break;
        case 'differential':
          backupData = await this.performDifferentialBackup();
          break;
        default:
          throw new Error(`Unknown backup type: ${type}`);
      }

      // Compress backup data
      const compressedData = await this.compressBackupData(backupData);

      // Store backup
      const storageResults = await this.storeBackup(backupId, compressedData);

      // Verify backup integrity
      const verificationResult = await this.verifyBackup(backupId);

      return {
        backupId,
        type,
        startTime,
        endTime: new Date(),
        success: true,
        size: compressedData.size,
        storageLocations: storageResults.map(r => r.location),
        verificationPassed: verificationResult.passed,
        metadata: {
          wallCount: backupData.walls.length,
          intersectionCount: backupData.intersections.length,
          qualityMetricsCount: backupData.qualityMetrics.length
        }
      };
    } catch (error) {
      return {
        backupId,
        type,
        startTime,
        endTime: new Date(),
        success: false,
        error: error.message,
        size: 0,
        storageLocations: [],
        verificationPassed: false
      };
    }
  }

  async restoreFromBackup(backupId: string, options: RestoreOptions): Promise<RestoreResult> {
    const startTime = new Date();

    try {
      // Retrieve backup data
      const backupData = await this.retrieveBackup(backupId);

      // Verify backup integrity
      const verificationResult = await this.verifyBackupData(backupData);
      if (!verificationResult.passed) {
        throw new Error('Backup data verification failed');
      }

      // Create restore point
      const restorePoint = await this.createRestorePoint();

      // Perform restoration
      const restorationResult = await this.performRestoration(backupData, options);

      return {
        backupId,
        startTime,
        endTime: new Date(),
        success: true,
        restorePointId: restorePoint.id,
        restoredItems: restorationResult.itemCount,
        warnings: restorationResult.warnings
      };
    } catch (error) {
      return {
        backupId,
        startTime,
        endTime: new Date(),
        success: false,
        error: error.message,
        restoredItems: 0
      };
    }
  }
}
```

### Disaster Recovery Procedures

```bash
#!/bin/bash
# Disaster recovery script

set -e

BACKUP_DIR="/backups"
RECOVERY_DIR="/recovery"
LOG_FILE="/var/log/bim-recovery.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to recover from database corruption
recover_database() {
    log "Starting database recovery procedure"
    
    # Stop application
    log "Stopping BIM application"
    systemctl stop bim-wall-system
    
    # Find latest backup
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.backup" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    log "Using backup: $LATEST_BACKUP"
    
    if [ -z "$LATEST_BACKUP" ]; then
        log "ERROR: No backup found"
        exit 1
    fi
    
    # Create recovery directory
    mkdir -p "$RECOVERY_DIR"
    
    # Restore database
    if [[ "$LATEST_BACKUP" == *.sql.gz ]]; then
        # PostgreSQL backup
        log "Restoring PostgreSQL database"
        gunzip -c "$LATEST_BACKUP" | psql -U bim_user -d bim_walls
    elif [[ "$LATEST_BACKUP" == *.db.gz ]]; then
        # SQLite backup
        log "Restoring SQLite database"
        gunzip -c "$LATEST_BACKUP" > "$RECOVERY_DIR/bim-walls.db"
        cp "$RECOVERY_DIR/bim-walls.db" "/app/data/bim-walls.db"
    fi
    
    # Verify database integrity
    log "Verifying database integrity"
    node /app/scripts/verify-database.js
    
    if [ $? -eq 0 ]; then
        log "Database integrity verified"
        # Start application
        systemctl start bim-wall-system
        log "BIM application restarted"
    else
        log "ERROR: Database integrity check failed"
        exit 1
    fi
}

# Function to recover from system failure
recover_system() {
    log "Starting system recovery procedure"
    
    # Check system resources
    check_system_resources
    
    # Recover configuration
    recover_configuration
    
    # Recover application data
    recover_application_data
    
    # Restart services
    restart_services
    
    log "System recovery completed"
}

# Execute recovery based on failure type
case "$1" in
    "database")
        recover_database
        ;;
    "system")
        recover_system
        ;;
    *)
        echo "Usage: $0 {database|system}"
        exit 1
        ;;
esac
```

## Alert and Notification System

### Alert Configuration

```typescript
// Comprehensive alerting system
export class BIMAlertManager {
  private alertChannels: Map<string, AlertChannel> = new Map();
  private alertRules: AlertRule[] = [];
  private alertHistory: AlertHistory[] = [];

  constructor() {
    this.initializeAlertChannels();
    this.setupAlertRules();
  }

  private initializeAlertChannels(): void {
    // Email alerts
    this.alertChannels.set('email', new EmailAlertChannel({
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      from: process.env.ALERT_FROM_EMAIL,
      to: process.env.ALERT_TO_EMAIL?.split(',') || []
    }));

    // Slack alerts
    this.alertChannels.set('slack', new SlackAlertChannel({
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#bim-alerts'
    }));

    // SMS alerts (for critical issues)
    this.alertChannels.set('sms', new SMSAlertChannel({
      provider: 'twilio',
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
      toNumbers: process.env.ALERT_SMS_NUMBERS?.split(',') || []
    }));
  }

  private setupAlertRules(): void {
    this.alertRules = [
      {
        name: 'High Memory Usage',
        condition: (metrics) => metrics.memoryUsage > 0.9,
        severity: 'critical',
        channels: ['email', 'slack', 'sms'],
        cooldown: 300000 // 5 minutes
      },
      {
        name: 'Database Connection Failure',
        condition: (metrics) => metrics.databaseConnections === 0,
        severity: 'critical',
        channels: ['email', 'slack', 'sms'],
        cooldown: 60000 // 1 minute
      },
      {
        name: 'High Error Rate',
        condition: (metrics) => metrics.errorRate > 0.1,
        severity: 'warning',
        channels: ['email', 'slack'],
        cooldown: 600000 // 10 minutes
      },
      {
        name: 'Slow Performance',
        condition: (metrics) => metrics.averageResponseTime > 5000,
        severity: 'warning',
        channels: ['slack'],
        cooldown: 900000 // 15 minutes
      }
    ];
  }

  async processAlert(alertData: AlertData): Promise<void> {
    const applicableRules = this.alertRules.filter(rule => 
      rule.condition(alertData.metrics)
    );

    for (const rule of applicableRules) {
      // Check cooldown period
      if (this.isInCooldown(rule.name)) {
        continue;
      }

      // Send alert through configured channels
      await this.sendAlert(rule, alertData);

      // Record alert in history
      this.recordAlert(rule, alertData);
    }
  }
}
```

This comprehensive monitoring and maintenance guide provides all the necessary tools and procedures for maintaining a healthy BIM Wall System in production environments.