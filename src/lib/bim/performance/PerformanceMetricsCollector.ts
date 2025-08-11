/**
 * Performance metrics collection for BIM geometric operations
 */

import {
  PerformanceMetrics,
  MemoryUsage,
  PerformanceBenchmark,
  PerformanceProfile,
  PerformanceBottleneck,
  UsagePattern,
  PerformanceThresholds,
  PerformanceAlert
} from '../types/PerformanceTypes';

export class PerformanceMetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private activeOperations: Map<string, { startTime: number; startMemory: MemoryUsage }> = new Map();
  private thresholds: PerformanceThresholds;
  private alerts: PerformanceAlert[] = [];

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxOperationTime: 1000, // 1 second
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      minCacheHitRate: 0.8, // 80%
      maxErrorRate: 0.05, // 5%
      minThroughput: 10, // operations per second
      ...thresholds
    };
  }

  /**
   * Start tracking a geometric operation
   */
  startOperation(operationType: string, operationId: string, inputComplexity: number): void {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    this.activeOperations.set(operationId, {
      startTime,
      startMemory
    });
  }

  /**
   * End tracking a geometric operation
   */
  endOperation(
    operationId: string,
    operationType: string,
    outputComplexity: number,
    success: boolean,
    errorType?: string
  ): PerformanceMetrics {
    const operationData = this.activeOperations.get(operationId);
    if (!operationData) {
      throw new Error(`Operation ${operationId} was not started`);
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const duration = endTime - operationData.startTime;

    const metrics: PerformanceMetrics = {
      operationType,
      operationId,
      startTime: operationData.startTime,
      endTime,
      duration,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - operationData.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external - operationData.startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - operationData.startMemory.arrayBuffers,
        peak: Math.max(endMemory.heapUsed, operationData.startMemory.heapUsed)
      },
      inputComplexity: 0, // Will be set by caller
      outputComplexity,
      success,
      errorType
    };

    this.metrics.push(metrics);
    this.activeOperations.delete(operationId);

    // Check for threshold violations
    this.checkThresholds(metrics);

    return metrics;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): MemoryUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
        peak: usage.heapUsed
      };
    }

    // Browser fallback - approximate values
    return {
      heapUsed: (performance as any).memory?.usedJSHeapSize || 0,
      heapTotal: (performance as any).memory?.totalJSHeapSize || 0,
      external: 0,
      arrayBuffers: 0,
      peak: (performance as any).memory?.usedJSHeapSize || 0
    };
  }

  /**
   * Calculate performance benchmark for an operation type
   */
  calculateBenchmark(operationType: string, timeWindow?: number): PerformanceBenchmark {
    const cutoffTime = timeWindow ? performance.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter(
      m => m.operationType === operationType && m.startTime >= cutoffTime
    );

    if (relevantMetrics.length === 0) {
      return {
        operationType,
        sampleCount: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        standardDeviation: 0,
        throughput: 0,
        memoryEfficiency: 0,
        successRate: 0
      };
    }

    const durations = relevantMetrics.map(m => m.duration);
    const memoryUsages = relevantMetrics.map(m => m.memoryUsage.heapUsed);
    const successCount = relevantMetrics.filter(m => m.success).length;

    const averageTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minTime = Math.min(...durations);
    const maxTime = Math.max(...durations);
    
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - averageTime, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);

    const totalTime = relevantMetrics[relevantMetrics.length - 1].endTime - relevantMetrics[0].startTime;
    const throughput = relevantMetrics.length / (totalTime / 1000); // operations per second

    const averageMemory = memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length;
    const memoryEfficiency = averageMemory > 0 ? 1 / averageMemory : 1;

    return {
      operationType,
      sampleCount: relevantMetrics.length,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      throughput,
      memoryEfficiency,
      successRate: successCount / relevantMetrics.length
    };
  }

  /**
   * Analyze usage patterns
   */
  analyzeUsagePatterns(timeWindow?: number): UsagePattern[] {
    const cutoffTime = timeWindow ? performance.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter(m => m.startTime >= cutoffTime);

    const operationTypes = [...new Set(relevantMetrics.map(m => m.operationType))];
    
    return operationTypes.map(operationType => {
      const typeMetrics = relevantMetrics.filter(m => m.operationType === operationType);
      const durations = typeMetrics.map(m => m.duration);
      const memoryUsages = typeMetrics.map(m => m.memoryUsage.heapUsed);
      const errorCount = typeMetrics.filter(m => !m.success).length;

      return {
        operationType,
        frequency: typeMetrics.length,
        averageComplexity: typeMetrics.reduce((sum, m) => sum + m.inputComplexity, 0) / typeMetrics.length,
        timeDistribution: this.calculateDistribution(durations),
        memoryDistribution: this.calculateDistribution(memoryUsages),
        errorRate: errorCount / typeMetrics.length,
        trends: this.calculateTrends(typeMetrics)
      };
    });
  }

  /**
   * Generate performance profile
   */
  generateProfile(sessionId: string, timeWindow?: number): PerformanceProfile {
    const cutoffTime = timeWindow ? performance.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter(m => m.startTime >= cutoffTime);

    const operationBreakdown = new Map<string, number>();
    relevantMetrics.forEach(m => {
      operationBreakdown.set(m.operationType, (operationBreakdown.get(m.operationType) || 0) + 1);
    });

    const bottlenecks = this.identifyBottlenecks(relevantMetrics);
    const overallScore = this.calculateOverallScore(relevantMetrics);

    return {
      sessionId,
      startTime: relevantMetrics.length > 0 ? relevantMetrics[0].startTime : Date.now(),
      endTime: relevantMetrics.length > 0 ? relevantMetrics[relevantMetrics.length - 1].endTime : Date.now(),
      totalOperations: relevantMetrics.length,
      operationBreakdown,
      bottlenecks,
      recommendations: [], // Will be populated by optimization engine
      overallScore
    };
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    if (metrics.duration > this.thresholds.maxOperationTime) {
      alerts.push({
        id: `threshold_${performance.now()}_${Math.random()}`,
        type: 'threshold_exceeded',
        severity: metrics.duration >= this.thresholds.maxOperationTime * 2 ? 'critical' : 'warning',
        message: `Operation ${metrics.operationType} exceeded time threshold: ${metrics.duration}ms > ${this.thresholds.maxOperationTime}ms`,
        timestamp: performance.now(),
        metrics,
        recommendations: []
      });
    }

    if (Math.abs(metrics.memoryUsage.heapUsed) > this.thresholds.maxMemoryUsage) {
      alerts.push({
        id: `memory_${performance.now()}_${Math.random()}`,
        type: 'threshold_exceeded',
        severity: 'error',
        message: `Operation ${metrics.operationType} exceeded memory threshold: ${Math.abs(metrics.memoryUsage.heapUsed)} > ${this.thresholds.maxMemoryUsage}`,
        timestamp: performance.now(),
        metrics,
        recommendations: []
      });
    }

    this.alerts.push(...alerts);
  }

  /**
   * Calculate distribution percentiles
   */
  private calculateDistribution(values: number[]): number[] {
    if (values.length === 0) return [];
    
    const sorted = [...values].sort((a, b) => a - b);
    const percentiles = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99];
    
    return percentiles.map(p => {
      const index = Math.floor(p * (sorted.length - 1));
      return sorted[index];
    });
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(metrics: PerformanceMetrics[]): UsagePattern['trends'] {
    if (metrics.length < 10) {
      return {
        performanceTrend: 'stable',
        memoryTrend: 'stable',
        errorTrend: 'stable'
      };
    }

    const halfPoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, halfPoint);
    const secondHalf = metrics.slice(halfPoint);

    const firstHalfAvgTime = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
    const secondHalfAvgTime = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;

    const firstHalfAvgMemory = firstHalf.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / firstHalf.length;
    const secondHalfAvgMemory = secondHalf.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / secondHalf.length;

    const firstHalfErrors = firstHalf.filter(m => !m.success).length / firstHalf.length;
    const secondHalfErrors = secondHalf.filter(m => !m.success).length / secondHalf.length;

    return {
      performanceTrend: this.getTrend(firstHalfAvgTime, secondHalfAvgTime, true),
      memoryTrend: this.getTrend(firstHalfAvgMemory, secondHalfAvgMemory, true),
      errorTrend: this.getTrend(firstHalfErrors, secondHalfErrors, true)
    };
  }

  /**
   * Determine trend direction
   */
  private getTrend(oldValue: number, newValue: number, lowerIsBetter: boolean): 'improving' | 'stable' | 'degrading' {
    const threshold = 0.1; // 10% change threshold
    const change = (newValue - oldValue) / oldValue;

    if (Math.abs(change) < threshold) return 'stable';
    
    if (lowerIsBetter) {
      return change < 0 ? 'improving' : 'degrading';
    } else {
      return change > 0 ? 'improving' : 'degrading';
    }
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(metrics: PerformanceMetrics[]): PerformanceBottleneck[] {
    const operationTypes = [...new Set(metrics.map(m => m.operationType))];
    const bottlenecks: PerformanceBottleneck[] = [];

    operationTypes.forEach(operationType => {
      const typeMetrics = metrics.filter(m => m.operationType === operationType);
      const averageTime = typeMetrics.reduce((sum, m) => sum + m.duration, 0) / typeMetrics.length;
      const frequency = typeMetrics.length;
      const impact = averageTime * frequency;

      if (averageTime > this.thresholds.maxOperationTime || impact > 10000) {
        bottlenecks.push({
          operationType,
          averageTime,
          frequency,
          impact,
          cause: this.identifyBottleneckCause(typeMetrics),
          suggestedFix: this.suggestBottleneckFix(operationType, averageTime, frequency)
        });
      }
    });

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Identify the cause of a bottleneck
   */
  private identifyBottleneckCause(metrics: PerformanceMetrics[]): string {
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / metrics.length;
    const avgComplexity = metrics.reduce((sum, m) => sum + m.inputComplexity, 0) / metrics.length;
    const errorRate = metrics.filter(m => !m.success).length / metrics.length;

    if (errorRate > 0.1) return 'High error rate causing retries';
    if (avgMemory > this.thresholds.maxMemoryUsage * 0.8) return 'High memory usage';
    if (avgComplexity > 1000) return 'High input complexity';
    return 'Algorithm inefficiency';
  }

  /**
   * Suggest fix for bottleneck
   */
  private suggestBottleneckFix(operationType: string, averageTime: number, frequency: number): string {
    if (frequency > 100 && averageTime > 100) {
      return 'Consider caching results or batch processing';
    }
    if (averageTime > 1000) {
      return 'Optimize algorithm or reduce input complexity';
    }
    if (frequency > 1000) {
      return 'Implement spatial indexing or result caching';
    }
    return 'Profile specific operation for optimization opportunities';
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private calculateOverallScore(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 100;

    const avgTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const successRate = metrics.filter(m => m.success).length / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / metrics.length;

    const timeScore = Math.max(0, 100 - (avgTime / this.thresholds.maxOperationTime) * 50);
    const successScore = successRate * 100;
    const memoryScore = Math.max(0, 100 - (avgMemory / this.thresholds.maxMemoryUsage) * 50);

    return (timeScore + successScore + memoryScore) / 3;
  }

  /**
   * Get recent alerts
   */
  getAlerts(timeWindow?: number): PerformanceAlert[] {
    const cutoffTime = timeWindow ? performance.now() - timeWindow : 0;
    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = performance.now() - maxAge;
    this.metrics = this.metrics.filter(m => m.startTime >= cutoffTime);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoffTime);
  }

  /**
   * Get all metrics
   */
  getMetrics(timeWindow?: number): PerformanceMetrics[] {
    const cutoffTime = timeWindow ? performance.now() - timeWindow : 0;
    return this.metrics.filter(m => m.startTime >= cutoffTime);
  }
}