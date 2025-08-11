/**
 * Performance monitoring types for BIM geometric operations
 */

export interface PerformanceMetrics {
  operationType: string;
  operationId: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: MemoryUsage;
  inputComplexity: number;
  outputComplexity: number;
  success: boolean;
  errorType?: string;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  peak: number;
}

export interface PerformanceBenchmark {
  operationType: string;
  sampleCount: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  throughput: number;
  memoryEfficiency: number;
  successRate: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: OptimizationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    performanceGain: number;
    memoryReduction: number;
    qualityImpact: number;
  };
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: number;
    dependencies: string[];
  };
  metrics: {
    currentValue: number;
    targetValue: number;
    threshold: number;
  };
}

export enum OptimizationType {
  TOLERANCE_ADJUSTMENT = 'tolerance_adjustment',
  CACHING_OPTIMIZATION = 'caching_optimization',
  ALGORITHM_SELECTION = 'algorithm_selection',
  BATCH_PROCESSING = 'batch_processing',
  MEMORY_OPTIMIZATION = 'memory_optimization',
  SPATIAL_INDEXING = 'spatial_indexing',
  SIMPLIFICATION_TUNING = 'simplification_tuning'
}

export interface CacheEffectivenessMetrics {
  cacheType: string;
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageAccessTime: number;
  memoryUsage: number;
  entryCount: number;
  maxSize: number;
  recommendations: OptimizationRecommendation[];
}

export interface PerformanceProfile {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalOperations: number;
  operationBreakdown: Map<string, number>;
  bottlenecks: PerformanceBottleneck[];
  recommendations: OptimizationRecommendation[];
  overallScore: number;
}

export interface PerformanceBottleneck {
  operationType: string;
  averageTime: number;
  frequency: number;
  impact: number;
  cause: string;
  suggestedFix: string;
}

export interface UsagePattern {
  operationType: string;
  frequency: number;
  averageComplexity: number;
  timeDistribution: number[];
  memoryDistribution: number[];
  errorRate: number;
  trends: {
    performanceTrend: 'improving' | 'stable' | 'degrading';
    memoryTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'improving' | 'stable' | 'degrading';
  };
}

export interface PerformanceThresholds {
  maxOperationTime: number;
  maxMemoryUsage: number;
  minCacheHitRate: number;
  maxErrorRate: number;
  minThroughput: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'threshold_exceeded' | 'performance_degradation' | 'memory_leak' | 'cache_inefficiency';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metrics: PerformanceMetrics;
  recommendations: OptimizationRecommendation[];
}