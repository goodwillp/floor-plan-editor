/**
 * Integrated performance monitoring system for BIM operations
 */

import { PerformanceMetricsCollector } from './PerformanceMetricsCollector';
import { OptimizationRecommendationEngine } from './OptimizationRecommendationEngine';
import { CacheEffectivenessMonitor } from './CacheEffectivenessMonitor';
import { PerformanceProfiler } from './PerformanceProfiler';
import {
  PerformanceMetrics,
  PerformanceBenchmark,
  OptimizationRecommendation,
  CacheEffectivenessMetrics,
  PerformanceProfile,
  UsagePattern,
  PerformanceThresholds,
  PerformanceAlert
} from '../types/PerformanceTypes';

export interface PerformanceMonitoringConfig {
  enableMetricsCollection: boolean;
  enableCacheMonitoring: boolean;
  enableProfiling: boolean;
  enableOptimizationRecommendations: boolean;
  thresholds: Partial<PerformanceThresholds>;
  autoCleanupInterval: number;
  reportingInterval: number;
}

export interface PerformanceReport {
  timestamp: number;
  timeWindow: number;
  summary: {
    totalOperations: number;
    averageTime: number;
    errorRate: number;
    memoryUsage: number;
    overallScore: number;
  };
  benchmarks: Map<string, PerformanceBenchmark>;
  usagePatterns: UsagePattern[];
  cacheMetrics: CacheEffectivenessMetrics[];
  recommendations: OptimizationRecommendation[];
  alerts: PerformanceAlert[];
  bottlenecks: Array<{
    operation: string;
    impact: number;
    frequency: number;
  }>;
}

export class PerformanceMonitoringSystem {
  private metricsCollector: PerformanceMetricsCollector;
  private recommendationEngine: OptimizationRecommendationEngine;
  private cacheMonitor: CacheEffectivenessMonitor;
  private profiler: PerformanceProfiler;
  private config: PerformanceMonitoringConfig;
  private cleanupInterval?: NodeJS.Timeout;
  private reportingInterval?: NodeJS.Timeout;
  private reportingCallbacks: Array<(report: PerformanceReport) => void> = [];

  constructor(config?: Partial<PerformanceMonitoringConfig>) {
    this.config = {
      enableMetricsCollection: true,
      enableCacheMonitoring: true,
      enableProfiling: false, // Disabled by default due to overhead
      enableOptimizationRecommendations: true,
      thresholds: {},
      autoCleanupInterval: 60 * 60 * 1000, // 1 hour
      reportingInterval: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    this.metricsCollector = new PerformanceMetricsCollector(this.config.thresholds);
    this.recommendationEngine = new OptimizationRecommendationEngine();
    this.cacheMonitor = new CacheEffectivenessMonitor();
    this.profiler = new PerformanceProfiler(this.config.thresholds);

    this.setupAutomaticCleanup();
    this.setupAutomaticReporting();
  }

  /**
   * Start monitoring a BIM operation
   */
  startOperation(operationType: string, inputComplexity: number = 0, metadata: Record<string, any> = {}): string {
    const operationId = `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (this.config.enableMetricsCollection) {
      this.metricsCollector.startOperation(operationType, operationId, inputComplexity);
    }

    if (this.config.enableProfiling) {
      this.profiler.startOperation(operationType, metadata);
    }

    return operationId;
  }

  /**
   * End monitoring a BIM operation
   */
  endOperation(
    operationId: string,
    operationType: string,
    outputComplexity: number = 0,
    success: boolean = true,
    errorType?: string
  ): PerformanceMetrics | null {
    let metrics: PerformanceMetrics | null = null;

    if (this.config.enableMetricsCollection) {
      metrics = this.metricsCollector.endOperation(
        operationId,
        operationType,
        outputComplexity,
        success,
        errorType
      );
    }

    if (this.config.enableProfiling) {
      this.profiler.endOperation(operationId);
    }

    return metrics;
  }

  /**
   * Record cache access for monitoring
   */
  recordCacheAccess(cacheType: string, key: string, hit: boolean, accessTime: number): void {
    if (this.config.enableCacheMonitoring) {
      this.cacheMonitor.recordAccess({
        cacheType,
        key,
        hit,
        accessTime,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Record cache eviction for monitoring
   */
  recordCacheEviction(
    cacheType: string,
    key: string,
    reason: 'size_limit' | 'ttl_expired' | 'manual' | 'lru',
    age: number,
    accessCount: number
  ): void {
    if (this.config.enableCacheMonitoring) {
      this.cacheMonitor.recordEviction({
        cacheType,
        key,
        reason,
        timestamp: Date.now(),
        age,
        accessCount
      });
    }
  }

  /**
   * Start a profiling session
   */
  startProfilingSession(name: string): string | null {
    if (!this.config.enableProfiling) return null;
    return this.profiler.startSession(name);
  }

  /**
   * End a profiling session
   */
  endProfilingSession(sessionId: string): PerformanceProfile | null {
    if (!this.config.enableProfiling || !sessionId) return null;
    
    const session = this.profiler.endSession(sessionId);
    if (session) {
      return this.profiler.analyzeSession(sessionId);
    }
    return null;
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(timeWindow: number = 60 * 60 * 1000): PerformanceReport {
    const timestamp = Date.now();
    const metrics = this.metricsCollector.getMetrics(timeWindow);
    
    // Calculate summary statistics
    const totalOperations = metrics.length;
    const averageTime = totalOperations > 0 
      ? metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0;
    const errorRate = totalOperations > 0 
      ? metrics.filter(m => !m.success).length / totalOperations 
      : 0;
    const memoryUsage = totalOperations > 0 
      ? metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / totalOperations 
      : 0;

    // Generate benchmarks
    const operationTypes = [...new Set(metrics.map(m => m.operationType))];
    const benchmarks = new Map<string, PerformanceBenchmark>();
    operationTypes.forEach(type => {
      benchmarks.set(type, this.metricsCollector.calculateBenchmark(type, timeWindow));
    });

    // Analyze usage patterns
    const usagePatterns = this.metricsCollector.analyzeUsagePatterns(timeWindow);

    // Get cache metrics
    const cacheMetrics = this.config.enableCacheMonitoring 
      ? this.cacheMonitor.getAllCacheEffectiveness(timeWindow)
      : [];

    // Generate recommendations
    const recommendations = this.config.enableOptimizationRecommendations
      ? this.recommendationEngine.analyzeAndRecommend(usagePatterns, benchmarks, cacheMetrics)
      : [];

    // Get alerts
    const alerts = this.metricsCollector.getAlerts(timeWindow);

    // Identify bottlenecks
    const bottlenecks = this.identifyTopBottlenecks(usagePatterns, benchmarks);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(averageTime, errorRate, memoryUsage);

    return {
      timestamp,
      timeWindow,
      summary: {
        totalOperations,
        averageTime,
        errorRate,
        memoryUsage,
        overallScore
      },
      benchmarks,
      usagePatterns,
      cacheMetrics,
      recommendations,
      alerts,
      bottlenecks
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(timeWindow?: number): OptimizationRecommendation[] {
    if (!this.config.enableOptimizationRecommendations) return [];

    const usagePatterns = this.metricsCollector.analyzeUsagePatterns(timeWindow);
    const operationTypes = [...new Set(usagePatterns.map(p => p.operationType))];
    const benchmarks = new Map<string, PerformanceBenchmark>();
    
    operationTypes.forEach(type => {
      benchmarks.set(type, this.metricsCollector.calculateBenchmark(type, timeWindow));
    });

    const cacheMetrics = this.config.enableCacheMonitoring 
      ? this.cacheMonitor.getAllCacheEffectiveness(timeWindow)
      : [];

    return this.recommendationEngine.analyzeAndRecommend(usagePatterns, benchmarks, cacheMetrics);
  }

  /**
   * Get cache effectiveness metrics
   */
  getCacheEffectiveness(cacheType?: string, timeWindow?: number): CacheEffectivenessMetrics[] {
    if (!this.config.enableCacheMonitoring) return [];

    if (cacheType) {
      return [this.cacheMonitor.calculateEffectiveness(cacheType, timeWindow)];
    }

    return this.cacheMonitor.getAllCacheEffectiveness(timeWindow);
  }

  /**
   * Get performance alerts
   */
  getAlerts(timeWindow?: number): PerformanceAlert[] {
    return this.metricsCollector.getAlerts(timeWindow);
  }

  /**
   * Subscribe to performance reports
   */
  subscribeToReports(callback: (report: PerformanceReport) => void): () => void {
    this.reportingCallbacks.push(callback);
    
    return () => {
      const index = this.reportingCallbacks.indexOf(callback);
      if (index > -1) {
        this.reportingCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Export performance data
   */
  exportData(timeWindow?: number): string {
    const report = this.generateReport(timeWindow);
    const profilingSessions = this.config.enableProfiling 
      ? this.profiler.getCompletedSessions()
      : [];

    return JSON.stringify({
      report,
      profilingSessions,
      config: this.config,
      exportTimestamp: Date.now()
    }, null, 2);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart intervals if they changed
    if (newConfig.autoCleanupInterval !== undefined) {
      this.setupAutomaticCleanup();
    }
    
    if (newConfig.reportingInterval !== undefined) {
      this.setupAutomaticReporting();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceMonitoringConfig {
    return { ...this.config };
  }

  /**
   * Manual cleanup of old data
   */
  cleanup(maxAge?: number): void {
    this.metricsCollector.cleanup(maxAge);
    this.recommendationEngine.cleanup(maxAge);
    this.profiler.cleanup(maxAge);
  }

  /**
   * Shutdown the monitoring system
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    this.reportingCallbacks.length = 0;
  }

  /**
   * Setup automatic cleanup
   */
  private setupAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.autoCleanupInterval);
  }

  /**
   * Setup automatic reporting
   */
  private setupAutomaticReporting(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }

    if (this.reportingCallbacks.length > 0) {
      this.reportingInterval = setInterval(() => {
        const report = this.generateReport();
        this.reportingCallbacks.forEach(callback => {
          try {
            callback(report);
          } catch (error) {
            console.error('Error in performance report callback:', error);
          }
        });
      }, this.config.reportingInterval);
    }
  }

  /**
   * Identify top bottlenecks
   */
  private identifyTopBottlenecks(
    patterns: UsagePattern[],
    benchmarks: Map<string, PerformanceBenchmark>
  ): Array<{ operation: string; impact: number; frequency: number }> {
    const bottlenecks = patterns
      .map(pattern => {
        const benchmark = benchmarks.get(pattern.operationType);
        if (!benchmark) return null;

        const impact = benchmark.averageTime * pattern.frequency;
        return {
          operation: pattern.operationType,
          impact,
          frequency: pattern.frequency
        };
      })
      .filter(bottleneck => bottleneck !== null)
      .sort((a, b) => b!.impact - a!.impact)
      .slice(0, 10);

    return bottlenecks as Array<{ operation: string; impact: number; frequency: number }>;
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(averageTime: number, errorRate: number, memoryUsage: number): number {
    const thresholds = this.config.thresholds;
    const maxTime = thresholds.maxOperationTime || 1000;
    const maxMemory = thresholds.maxMemoryUsage || 100 * 1024 * 1024;
    const maxErrorRate = thresholds.maxErrorRate || 0.05;

    const timeScore = Math.max(0, 100 - (averageTime / maxTime) * 50);
    const errorScore = Math.max(0, 100 - (errorRate / maxErrorRate) * 100);
    const memoryScore = Math.max(0, 100 - (memoryUsage / maxMemory) * 50);

    return (timeScore + errorScore + memoryScore) / 3;
  }
}