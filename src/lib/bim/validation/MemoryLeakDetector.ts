/**
 * Memory Leak Detection System for BIM Operations
 * 
 * Monitors memory usage patterns and detects potential memory leaks
 * during long-running BIM validation and recovery operations
 */

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryLeakReport {
  leakDetected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  leakRate: number; // MB per operation
  totalLeakage: number; // MB
  operationsAnalyzed: number;
  timespan: number; // milliseconds
  patterns: MemoryLeakPattern[];
  recommendations: string[];
  snapshots: MemorySnapshot[];
}

export interface MemoryLeakPattern {
  type: 'linear_growth' | 'step_growth' | 'exponential_growth' | 'periodic_spike';
  confidence: number;
  description: string;
  affectedOperations: string[];
  estimatedImpact: number;
}

export interface MemoryMonitoringConfig {
  snapshotInterval: number; // milliseconds
  maxSnapshots: number;
  leakThreshold: number; // MB per 1000 operations
  analysisWindow: number; // number of snapshots to analyze
  enableGCForcing: boolean;
  enableDetailedTracking: boolean;
}

/**
 * Advanced memory leak detector for BIM operations
 */
export class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private operationCounts: Map<string, number> = new Map();
  private config: MemoryMonitoringConfig;
  private monitoringActive: boolean = false;
  private snapshotTimer: NodeJS.Timeout | null = null;
  private baselineMemory: number = 0;

  constructor(config: Partial<MemoryMonitoringConfig> = {}) {
    this.config = {
      snapshotInterval: 1000, // 1 second
      maxSnapshots: 1000,
      leakThreshold: 10, // 10MB per 1000 operations
      analysisWindow: 50,
      enableGCForcing: false,
      enableDetailedTracking: true,
      ...config
    };
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;
    this.baselineMemory = process.memoryUsage().heapUsed;
    this.snapshots = [];
    this.operationCounts.clear();

    // Take initial snapshot
    this.takeSnapshot();

    // Start periodic snapshots
    this.snapshotTimer = setInterval(() => {
      this.takeSnapshot();
      this.maintainSnapshotLimit();
    }, this.config.snapshotInterval);

    console.log('Memory leak detection started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): MemoryLeakReport {
    if (!this.monitoringActive) {
      throw new Error('Memory monitoring is not active');
    }

    this.monitoringActive = false;

    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }

    // Take final snapshot
    this.takeSnapshot();

    console.log('Memory leak detection stopped');
    return this.generateReport();
  }

  /**
   * Record an operation for tracking
   */
  recordOperation(operationType: string): void {
    if (!this.monitoringActive) {
      return;
    }

    const currentCount = this.operationCounts.get(operationType) || 0;
    this.operationCounts.set(operationType, currentCount + 1);

    // Take snapshot if detailed tracking is enabled
    if (this.config.enableDetailedTracking) {
      this.takeSnapshot();
    }
  }

  /**
   * Force garbage collection if available and enabled
   */
  forceGarbageCollection(): void {
    if (this.config.enableGCForcing && global.gc) {
      global.gc();
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0
    };
  }

  /**
   * Analyze memory usage patterns
   */
  analyzeMemoryPatterns(): MemoryLeakPattern[] {
    if (this.snapshots.length < this.config.analysisWindow) {
      return [];
    }

    const patterns: MemoryLeakPattern[] = [];
    const recentSnapshots = this.snapshots.slice(-this.config.analysisWindow);

    // Analyze linear growth pattern
    const linearPattern = this.detectLinearGrowth(recentSnapshots);
    if (linearPattern) {
      patterns.push(linearPattern);
    }

    // Analyze step growth pattern
    const stepPattern = this.detectStepGrowth(recentSnapshots);
    if (stepPattern) {
      patterns.push(stepPattern);
    }

    // Analyze exponential growth pattern
    const exponentialPattern = this.detectExponentialGrowth(recentSnapshots);
    if (exponentialPattern) {
      patterns.push(exponentialPattern);
    }

    // Analyze periodic spikes
    const spikePattern = this.detectPeriodicSpikes(recentSnapshots);
    if (spikePattern) {
      patterns.push(spikePattern);
    }

    return patterns;
  }

  /**
   * Get memory leak severity assessment
   */
  assessLeakSeverity(leakRate: number): 'low' | 'medium' | 'high' | 'critical' {
    if (leakRate < 1) {
      return 'low';
    } else if (leakRate < 5) {
      return 'medium';
    } else if (leakRate < 20) {
      return 'high';
    } else {
      return 'critical';
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(patterns: MemoryLeakPattern[], severity: string): string[] {
    const recommendations: string[] = [];

    if (severity === 'critical' || severity === 'high') {
      recommendations.push('Immediate action required: Investigate memory usage in recent operations');
      recommendations.push('Consider implementing object pooling for frequently created objects');
      recommendations.push('Review event listener cleanup and ensure proper disposal of resources');
    }

    if (patterns.some(p => p.type === 'linear_growth')) {
      recommendations.push('Linear memory growth detected: Check for accumulating data structures');
      recommendations.push('Implement periodic cleanup of cached data');
    }

    if (patterns.some(p => p.type === 'step_growth')) {
      recommendations.push('Step growth pattern detected: Review batch operations for memory efficiency');
      recommendations.push('Consider processing data in smaller chunks');
    }

    if (patterns.some(p => p.type === 'exponential_growth')) {
      recommendations.push('Exponential growth detected: Critical issue requiring immediate attention');
      recommendations.push('Check for recursive operations or unbounded data structures');
    }

    if (patterns.some(p => p.type === 'periodic_spike')) {
      recommendations.push('Periodic memory spikes detected: Review periodic operations');
      recommendations.push('Consider implementing memory-efficient algorithms for recurring tasks');
    }

    // General recommendations
    recommendations.push('Enable garbage collection monitoring in production');
    recommendations.push('Implement memory usage alerts for early detection');
    recommendations.push('Regular memory profiling during development');

    return recommendations;
  }

  private takeSnapshot(): void {
    const snapshot = this.getCurrentMemoryUsage();
    this.snapshots.push(snapshot);
  }

  private maintainSnapshotLimit(): void {
    if (this.snapshots.length > this.config.maxSnapshots) {
      // Remove oldest snapshots, keeping the most recent ones
      const excessCount = this.snapshots.length - this.config.maxSnapshots;
      this.snapshots.splice(0, excessCount);
    }
  }

  private generateReport(): MemoryLeakReport {
    const patterns = this.analyzeMemoryPatterns();
    const totalOperations = Array.from(this.operationCounts.values()).reduce((sum, count) => sum + count, 0);
    
    // Calculate leak metrics
    const firstSnapshot = this.snapshots[0];
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    const totalLeakage = (lastSnapshot.heapUsed - firstSnapshot.heapUsed) / (1024 * 1024); // MB
    const timespan = lastSnapshot.timestamp - firstSnapshot.timestamp;
    const leakRate = totalOperations > 0 ? (totalLeakage / totalOperations) * 1000 : 0; // MB per 1000 operations

    const leakDetected = leakRate > this.config.leakThreshold / 1000;
    const severity = this.assessLeakSeverity(leakRate);
    const recommendations = this.generateRecommendations(patterns, severity);

    return {
      leakDetected,
      severity,
      leakRate,
      totalLeakage,
      operationsAnalyzed: totalOperations,
      timespan,
      patterns,
      recommendations,
      snapshots: [...this.snapshots] // Copy to prevent external modification
    };
  }

  private detectLinearGrowth(snapshots: MemorySnapshot[]): MemoryLeakPattern | null {
    if (snapshots.length < 10) {
      return null;
    }

    // Calculate linear regression
    const n = snapshots.length;
    const sumX = snapshots.reduce((sum, _, index) => sum + index, 0);
    const sumY = snapshots.reduce((sum, snapshot) => sum + snapshot.heapUsed, 0);
    const sumXY = snapshots.reduce((sum, snapshot, index) => sum + index * snapshot.heapUsed, 0);
    const sumXX = snapshots.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = snapshots.reduce((sum, snapshot, index) => 
      sum + (index - meanX) * (snapshot.heapUsed - meanY), 0);
    const denominatorX = Math.sqrt(snapshots.reduce((sum, _, index) => 
      sum + Math.pow(index - meanX, 2), 0));
    const denominatorY = Math.sqrt(snapshots.reduce((sum, snapshot) => 
      sum + Math.pow(snapshot.heapUsed - meanY, 2), 0));
    
    const correlation = numerator / (denominatorX * denominatorY);

    // Consider it linear growth if correlation is strong and slope is positive
    if (correlation > 0.7 && slope > 0) {
      const growthRateMB = (slope * snapshots.length) / (1024 * 1024);
      
      return {
        type: 'linear_growth',
        confidence: correlation,
        description: `Linear memory growth detected: ${growthRateMB.toFixed(2)} MB over analysis window`,
        affectedOperations: Array.from(this.operationCounts.keys()),
        estimatedImpact: growthRateMB
      };
    }

    return null;
  }

  private detectStepGrowth(snapshots: MemorySnapshot[]): MemoryLeakPattern | null {
    if (snapshots.length < 10) {
      return null;
    }

    // Look for sudden increases in memory usage
    const stepThreshold = 5 * 1024 * 1024; // 5MB threshold
    const steps: number[] = [];

    for (let i = 1; i < snapshots.length; i++) {
      const increase = snapshots[i].heapUsed - snapshots[i - 1].heapUsed;
      if (increase > stepThreshold) {
        steps.push(increase);
      }
    }

    if (steps.length >= 3) {
      const averageStep = steps.reduce((sum, step) => sum + step, 0) / steps.length;
      const totalStepGrowth = steps.reduce((sum, step) => sum + step, 0) / (1024 * 1024);

      return {
        type: 'step_growth',
        confidence: Math.min(steps.length / 10, 1.0),
        description: `Step growth pattern detected: ${steps.length} steps averaging ${(averageStep / 1024 / 1024).toFixed(2)} MB`,
        affectedOperations: Array.from(this.operationCounts.keys()),
        estimatedImpact: totalStepGrowth
      };
    }

    return null;
  }

  private detectExponentialGrowth(snapshots: MemorySnapshot[]): MemoryLeakPattern | null {
    if (snapshots.length < 10) {
      return null;
    }

    // Check if memory usage is growing exponentially
    const growthRates: number[] = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const prevMemory = snapshots[i - 1].heapUsed;
      const currentMemory = snapshots[i].heapUsed;
      
      if (prevMemory > 0 && currentMemory > prevMemory) {
        const growthRate = currentMemory / prevMemory;
        growthRates.push(growthRate);
      }
    }

    if (growthRates.length >= 5) {
      const averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      
      // Consider exponential if average growth rate is > 1.1 (10% per snapshot)
      if (averageGrowthRate > 1.1) {
        const projectedGrowth = Math.pow(averageGrowthRate, snapshots.length);
        
        return {
          type: 'exponential_growth',
          confidence: Math.min((averageGrowthRate - 1) * 10, 1.0),
          description: `Exponential growth detected: ${((averageGrowthRate - 1) * 100).toFixed(1)}% average growth rate`,
          affectedOperations: Array.from(this.operationCounts.keys()),
          estimatedImpact: projectedGrowth
        };
      }
    }

    return null;
  }

  private detectPeriodicSpikes(snapshots: MemorySnapshot[]): MemoryLeakPattern | null {
    if (snapshots.length < 20) {
      return null;
    }

    // Look for periodic spikes in memory usage
    const spikeThreshold = 10 * 1024 * 1024; // 10MB threshold
    const spikes: number[] = [];
    const spikeIntervals: number[] = [];
    let lastSpikeIndex = -1;

    for (let i = 1; i < snapshots.length - 1; i++) {
      const prev = snapshots[i - 1].heapUsed;
      const current = snapshots[i].heapUsed;
      const next = snapshots[i + 1].heapUsed;

      // Detect spike: current is significantly higher than both neighbors
      if (current - prev > spikeThreshold && current - next > spikeThreshold) {
        spikes.push(current - Math.min(prev, next));
        
        if (lastSpikeIndex >= 0) {
          spikeIntervals.push(i - lastSpikeIndex);
        }
        lastSpikeIndex = i;
      }
    }

    if (spikes.length >= 3 && spikeIntervals.length >= 2) {
      // Check if intervals are roughly consistent (periodic)
      const averageInterval = spikeIntervals.reduce((sum, interval) => sum + interval, 0) / spikeIntervals.length;
      const intervalVariance = spikeIntervals.reduce((sum, interval) => 
        sum + Math.pow(interval - averageInterval, 2), 0) / spikeIntervals.length;
      const intervalStdDev = Math.sqrt(intervalVariance);

      // Consider periodic if standard deviation is less than 50% of average
      if (intervalStdDev < averageInterval * 0.5) {
        const averageSpike = spikes.reduce((sum, spike) => sum + spike, 0) / spikes.length;

        return {
          type: 'periodic_spike',
          confidence: Math.min(spikes.length / 10, 1.0),
          description: `Periodic spikes detected: ${spikes.length} spikes averaging ${(averageSpike / 1024 / 1024).toFixed(2)} MB every ${averageInterval.toFixed(1)} snapshots`,
          affectedOperations: Array.from(this.operationCounts.keys()),
          estimatedImpact: averageSpike / (1024 * 1024)
        };
      }
    }

    return null;
  }

  /**
   * Export memory data for external analysis
   */
  exportMemoryData(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify({
        snapshots: this.snapshots,
        operationCounts: Object.fromEntries(this.operationCounts),
        config: this.config
      }, null, 2);
    } else {
      // CSV format
      const headers = ['Timestamp', 'Heap Used (MB)', 'Heap Total (MB)', 'External (MB)', 'RSS (MB)', 'Array Buffers (MB)'];
      const rows = this.snapshots.map(snapshot => [
        new Date(snapshot.timestamp).toISOString(),
        (snapshot.heapUsed / 1024 / 1024).toFixed(2),
        (snapshot.heapTotal / 1024 / 1024).toFixed(2),
        (snapshot.external / 1024 / 1024).toFixed(2),
        (snapshot.rss / 1024 / 1024).toFixed(2),
        (snapshot.arrayBuffers / 1024 / 1024).toFixed(2)
      ]);

      return [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    }
  }

  /**
   * Get real-time memory statistics
   */
  getMemoryStatistics(): {
    current: MemorySnapshot;
    baseline: number;
    increase: number;
    increasePercent: number;
    operationCount: number;
    averagePerOperation: number;
  } {
    const current = this.getCurrentMemoryUsage();
    const increase = current.heapUsed - this.baselineMemory;
    const increasePercent = (increase / this.baselineMemory) * 100;
    const operationCount = Array.from(this.operationCounts.values()).reduce((sum, count) => sum + count, 0);
    const averagePerOperation = operationCount > 0 ? increase / operationCount : 0;

    return {
      current,
      baseline: this.baselineMemory,
      increase,
      increasePercent,
      operationCount,
      averagePerOperation
    };
  }
}