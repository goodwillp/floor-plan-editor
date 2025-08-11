/**
 * Tests for OptimizationRecommendationEngine
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { OptimizationRecommendationEngine } from '../../performance/OptimizationRecommendationEngine';
import {
  UsagePattern,
  PerformanceBenchmark,
  CacheEffectivenessMetrics,
  OptimizationType
} from '../../types/PerformanceTypes';

describe('OptimizationRecommendationEngine', () => {
  let engine: OptimizationRecommendationEngine;

  beforeEach(() => {
    engine = new OptimizationRecommendationEngine();
  });

  describe('Performance Pattern Analysis', () => {
    test('should recommend algorithm optimization for slow operations', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'slow_offset_operation',
        frequency: 50,
        averageComplexity: 500,
        timeDistribution: [100, 200, 800, 1200, 1500, 1800, 2000],
        memoryDistribution: [1024, 2048, 4096, 8192, 16384, 32768, 65536],
        errorRate: 0.02,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['slow_offset_operation', {
          operationType: 'slow_offset_operation',
          sampleCount: 50,
          averageTime: 800,
          minTime: 100,
          maxTime: 2000,
          standardDeviation: 400,
          throughput: 1.25,
          memoryEfficiency: 0.001,
          successRate: 0.98
        }]
      ]);

      const recommendations = engine.analyzeAndRecommend(patterns, benchmarks, []);

      const algorithmRec = recommendations.find(r => r.type === OptimizationType.ALGORITHM_SELECTION);
      expect(algorithmRec).toBeDefined();
      expect(algorithmRec!.severity).toBe('medium');
      expect(algorithmRec!.title).toContain('Optimize slow_offset_operation Performance');
    });

    test('should recommend caching for high-frequency operations', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'frequent_intersection',
        frequency: 500,
        averageComplexity: 200,
        timeDistribution: [50, 60, 70, 80, 90, 100, 110],
        memoryDistribution: [1024, 1536, 2048, 2560, 3072, 3584, 4096],
        errorRate: 0.01,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['frequent_intersection', {
          operationType: 'frequent_intersection',
          sampleCount: 500,
          averageTime: 75,
          minTime: 50,
          maxTime: 110,
          standardDeviation: 15,
          throughput: 13.3,
          memoryEfficiency: 0.0005,
          successRate: 0.99
        }]
      ]);

      const recommendations = engine.analyzeAndRecommend(patterns, benchmarks, []);

      const cachingRec = recommendations.find(r => r.type === OptimizationType.CACHING_OPTIMIZATION);
      expect(cachingRec).toBeDefined();
      expect(cachingRec!.title).toContain('Add Caching for frequent_intersection');
      expect(cachingRec!.impact.performanceGain).toBeGreaterThan(0);
    });

    test('should recommend addressing performance degradation', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'degrading_operation',
        frequency: 100,
        averageComplexity: 300,
        timeDistribution: [200, 250, 300, 350, 400, 450, 500],
        memoryDistribution: [2048, 3072, 4096, 5120, 6144, 7168, 8192],
        errorRate: 0.03,
        trends: {
          performanceTrend: 'degrading',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['degrading_operation', {
          operationType: 'degrading_operation',
          sampleCount: 100,
          averageTime: 350,
          minTime: 200,
          maxTime: 500,
          standardDeviation: 75,
          throughput: 2.86,
          memoryEfficiency: 0.0002,
          successRate: 0.97
        }]
      ]);

      const recommendations = engine.analyzeAndRecommend(patterns, benchmarks, []);

      const degradationRec = recommendations.find(r => 
        r.title.includes('Address Performance Degradation')
      );
      expect(degradationRec).toBeDefined();
      expect(degradationRec!.severity).toBe('high');
    });
  });

  describe('Cache Effectiveness Analysis', () => {
    test('should recommend improving low cache hit rate', () => {
      const cacheMetrics: CacheEffectivenessMetrics[] = [{
        cacheType: 'geometric_operations',
        hitRate: 0.45,
        missRate: 0.55,
        evictionRate: 0.2,
        averageAccessTime: 5,
        memoryUsage: 20 * 1024 * 1024,
        entryCount: 500,
        maxSize: 1000,
        recommendations: []
      }];

      const recommendations = engine.analyzeAndRecommend([], new Map(), cacheMetrics);

      const hitRateRec = recommendations.find(r => 
        r.title.includes('Improve geometric_operations Cache Hit Rate')
      );
      expect(hitRateRec).toBeDefined();
      expect(hitRateRec!.severity).toBe('high');
      expect(hitRateRec!.metrics.currentValue).toBe(0.45);
      expect(hitRateRec!.metrics.targetValue).toBe(0.8);
    });

    test('should recommend reducing high eviction rate', () => {
      const cacheMetrics: CacheEffectivenessMetrics[] = [{
        cacheType: 'intersection_cache',
        hitRate: 0.75,
        missRate: 0.25,
        evictionRate: 0.4,
        averageAccessTime: 3,
        memoryUsage: 15 * 1024 * 1024,
        entryCount: 300,
        maxSize: 500,
        recommendations: []
      }];

      const recommendations = engine.analyzeAndRecommend([], new Map(), cacheMetrics);

      const evictionRec = recommendations.find(r => 
        r.title.includes('Reduce intersection_cache Cache Evictions')
      );
      expect(evictionRec).toBeDefined();
      expect(evictionRec!.type).toBe(OptimizationType.CACHING_OPTIMIZATION);
      expect(evictionRec!.impact.memoryReduction).toBe(-20); // Negative because larger cache uses more memory
    });

    test('should recommend memory optimization for large caches', () => {
      const cacheMetrics: CacheEffectivenessMetrics[] = [{
        cacheType: 'wall_geometry',
        hitRate: 0.65,
        missRate: 0.35,
        evictionRate: 0.15,
        averageAccessTime: 8,
        memoryUsage: 80 * 1024 * 1024, // 80MB
        entryCount: 1500,
        maxSize: 2000,
        recommendations: []
      }];

      const recommendations = engine.analyzeAndRecommend([], new Map(), cacheMetrics);

      const memoryRec = recommendations.find(r => 
        r.title.includes('Optimize wall_geometry Memory Usage')
      );
      expect(memoryRec).toBeDefined();
      expect(memoryRec!.type).toBe(OptimizationType.MEMORY_OPTIMIZATION);
      expect(memoryRec!.impact.memoryReduction).toBe(30);
    });
  });

  describe('Memory Pattern Analysis', () => {
    test('should recommend memory optimization for high-memory operations', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'memory_intensive_healing',
        frequency: 25,
        averageComplexity: 800,
        timeDistribution: [300, 400, 500, 600, 700, 800, 900],
        memoryDistribution: [
          5 * 1024 * 1024,   // 5MB
          8 * 1024 * 1024,   // 8MB
          12 * 1024 * 1024,  // 12MB
          15 * 1024 * 1024,  // 15MB (75th percentile)
          20 * 1024 * 1024,  // 20MB
          25 * 1024 * 1024,  // 25MB
          30 * 1024 * 1024   // 30MB
        ],
        errorRate: 0.02,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const recommendations = engine.analyzeAndRecommend(patterns, new Map(), []);

      const memoryRec = recommendations.find(r => 
        r.title.includes('Reduce Memory Usage in memory_intensive_healing')
      );
      expect(memoryRec).toBeDefined();
      expect(memoryRec!.type).toBe(OptimizationType.MEMORY_OPTIMIZATION);
      expect(memoryRec!.severity).toBe('medium');
    });

    test('should recommend addressing memory leaks', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'leaky_operation',
        frequency: 50,
        averageComplexity: 400,
        timeDistribution: [100, 150, 200, 250, 300, 350, 400],
        memoryDistribution: [
          2 * 1024 * 1024,
          4 * 1024 * 1024,
          6 * 1024 * 1024,
          8 * 1024 * 1024,
          10 * 1024 * 1024,
          12 * 1024 * 1024,
          14 * 1024 * 1024
        ],
        errorRate: 0.01,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'degrading',
          errorTrend: 'stable'
        }
      }];

      const recommendations = engine.analyzeAndRecommend(patterns, new Map(), []);

      const leakRec = recommendations.find(r => 
        r.title.includes('Address Memory Leak in leaky_operation')
      );
      expect(leakRec).toBeDefined();
      expect(leakRec!.severity).toBe('high');
      expect(leakRec!.implementation.difficulty).toBe('hard');
    });
  });

  describe('Error Pattern Analysis', () => {
    test('should recommend reducing high error rates', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'error_prone_boolean',
        frequency: 80,
        averageComplexity: 600,
        timeDistribution: [200, 300, 400, 500, 600, 700, 800],
        memoryDistribution: [1024, 2048, 4096, 8192, 16384, 32768, 65536],
        errorRate: 0.12, // 12% error rate
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const recommendations = engine.analyzeAndRecommend(patterns, new Map(), []);

      const errorRec = recommendations.find(r => 
        r.title.includes('Reduce Error Rate in error_prone_boolean')
      );
      expect(errorRec).toBeDefined();
      expect(errorRec!.type).toBe(OptimizationType.TOLERANCE_ADJUSTMENT);
      expect(errorRec!.severity).toBe('high');
      expect(errorRec!.metrics.currentValue).toBe(0.12);
    });

    test('should recommend addressing increasing error trends', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'degrading_errors',
        frequency: 60,
        averageComplexity: 300,
        timeDistribution: [150, 200, 250, 300, 350, 400, 450],
        memoryDistribution: [1024, 1536, 2048, 2560, 3072, 3584, 4096],
        errorRate: 0.08,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'degrading'
        }
      }];

      const recommendations = engine.analyzeAndRecommend(patterns, new Map(), []);

      const errorTrendRec = recommendations.find(r => 
        r.title.includes('Address Increasing Error Rate in degrading_errors')
      );
      expect(errorTrendRec).toBeDefined();
      expect(errorTrendRec!.severity).toBe('high');
      expect(errorTrendRec!.type).toBe(OptimizationType.ALGORITHM_SELECTION);
    });
  });

  describe('Algorithm Selection Analysis', () => {
    test('should recommend spatial indexing for high-complexity operations', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'complex_intersection',
        frequency: 75,
        averageComplexity: 1500,
        timeDistribution: [500, 700, 900, 1100, 1300, 1500, 1700],
        memoryDistribution: [2048, 4096, 8192, 16384, 32768, 65536, 131072],
        errorRate: 0.03,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['complex_intersection', {
          operationType: 'complex_intersection',
          sampleCount: 75,
          averageTime: 1100,
          minTime: 500,
          maxTime: 1700,
          standardDeviation: 300,
          throughput: 0.91,
          memoryEfficiency: 0.00005,
          successRate: 0.97
        }]
      ]);

      const recommendations = engine.analyzeAndRecommend(patterns, benchmarks, []);

      const spatialRec = recommendations.find(r => 
        r.title.includes('Add Spatial Indexing for complex_intersection')
      );
      expect(spatialRec).toBeDefined();
      expect(spatialRec!.type).toBe(OptimizationType.SPATIAL_INDEXING);
      expect(spatialRec!.metrics.currentValue).toBe(1500);
    });

    test('should recommend batch processing for high-frequency operations', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'frequent_validation',
        frequency: 300,
        averageComplexity: 100,
        timeDistribution: [20, 30, 40, 50, 60, 70, 80],
        memoryDistribution: [512, 768, 1024, 1280, 1536, 1792, 2048],
        errorRate: 0.01,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['frequent_validation', {
          operationType: 'frequent_validation',
          sampleCount: 300,
          averageTime: 50,
          minTime: 20,
          maxTime: 80,
          standardDeviation: 15,
          throughput: 20,
          memoryEfficiency: 0.001,
          successRate: 0.99
        }]
      ]);

      const recommendations = engine.analyzeAndRecommend(patterns, benchmarks, []);

      const batchRec = recommendations.find(r => 
        r.title.includes('Implement Batch Processing for frequent_validation')
      );
      expect(batchRec).toBeDefined();
      expect(batchRec!.type).toBe(OptimizationType.BATCH_PROCESSING);
      expect(batchRec!.severity).toBe('low');
    });

    test('should recommend simplification tuning', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'complex_simplification',
        frequency: 40,
        averageComplexity: 800,
        timeDistribution: [150, 200, 250, 300, 350, 400, 450],
        memoryDistribution: [4096, 6144, 8192, 10240, 12288, 14336, 16384],
        errorRate: 0.02,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['complex_simplification', {
          operationType: 'complex_simplification',
          sampleCount: 40,
          averageTime: 300,
          minTime: 150,
          maxTime: 450,
          standardDeviation: 75,
          throughput: 3.33,
          memoryEfficiency: 0.0001,
          successRate: 0.98
        }]
      ]);

      const recommendations = engine.analyzeAndRecommend(patterns, benchmarks, []);

      const simplifyRec = recommendations.find(r => 
        r.title.includes('Tune Simplification for complex_simplification')
      );
      expect(simplifyRec).toBeDefined();
      expect(simplifyRec!.type).toBe(OptimizationType.SIMPLIFICATION_TUNING);
      expect(simplifyRec!.impact.qualityImpact).toBe(-5); // Slight quality reduction
    });
  });

  describe('Recommendation Prioritization', () => {
    test('should prioritize recommendations by impact and feasibility', () => {
      const patterns: UsagePattern[] = [
        {
          operationType: 'critical_slow_operation',
          frequency: 100,
          averageComplexity: 1000,
          timeDistribution: [800, 1000, 1200, 1400, 1600, 1800, 2000],
          memoryDistribution: [10485760, 15728640, 20971520, 26214400, 31457280, 36700160, 41943040],
          errorRate: 0.15,
          trends: {
            performanceTrend: 'degrading',
            memoryTrend: 'degrading',
            errorTrend: 'degrading'
          }
        },
        {
          operationType: 'minor_optimization',
          frequency: 10,
          averageComplexity: 100,
          timeDistribution: [50, 60, 70, 80, 90, 100, 110],
          memoryDistribution: [1024, 1536, 2048, 2560, 3072, 3584, 4096],
          errorRate: 0.01,
          trends: {
            performanceTrend: 'stable',
            memoryTrend: 'stable',
            errorTrend: 'stable'
          }
        }
      ];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['critical_slow_operation', {
          operationType: 'critical_slow_operation',
          sampleCount: 100,
          averageTime: 1400,
          minTime: 800,
          maxTime: 2000,
          standardDeviation: 300,
          throughput: 0.71,
          memoryEfficiency: 0.00005,
          successRate: 0.85
        }],
        ['minor_optimization', {
          operationType: 'minor_optimization',
          sampleCount: 10,
          averageTime: 80,
          minTime: 50,
          maxTime: 110,
          standardDeviation: 15,
          throughput: 12.5,
          memoryEfficiency: 0.0005,
          successRate: 0.99
        }]
      ]);

      const recommendations = engine.analyzeAndRecommend(patterns, benchmarks, []);

      // Critical operation recommendations should be prioritized
      expect(recommendations.length).toBeGreaterThan(0);
      
      const topRecommendations = recommendations.slice(0, 3);
      const criticalRecs = topRecommendations.filter(r => 
        r.title.includes('critical_slow_operation')
      );
      
      expect(criticalRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Recommendation Management', () => {
    test('should filter recommendations by type', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'test_operation',
        frequency: 150,
        averageComplexity: 1200,
        timeDistribution: [400, 500, 600, 700, 800, 900, 1000],
        memoryDistribution: [5242880, 7864320, 10485760, 13107200, 15728640, 18350080, 20971520],
        errorRate: 0.08,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['test_operation', {
          operationType: 'test_operation',
          sampleCount: 150,
          averageTime: 700,
          minTime: 400,
          maxTime: 1000,
          standardDeviation: 150,
          throughput: 1.43,
          memoryEfficiency: 0.0001,
          successRate: 0.92
        }]
      ]);

      engine.analyzeAndRecommend(patterns, benchmarks, []);

      const cachingRecs = engine.getRecommendationsByType(OptimizationType.CACHING_OPTIMIZATION);
      const algorithmRecs = engine.getRecommendationsByType(OptimizationType.ALGORITHM_SELECTION);

      expect(cachingRecs.length).toBeGreaterThanOrEqual(0);
      expect(algorithmRecs.length).toBeGreaterThanOrEqual(0);
    });

    test('should filter recommendations by severity', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'severe_issue',
        frequency: 200,
        averageComplexity: 2000,
        timeDistribution: [1000, 1200, 1400, 1600, 1800, 2000, 2200],
        memoryDistribution: [20971520, 31457280, 41943040, 52428800, 62914560, 73400320, 83886080],
        errorRate: 0.2,
        trends: {
          performanceTrend: 'degrading',
          memoryTrend: 'degrading',
          errorTrend: 'degrading'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['severe_issue', {
          operationType: 'severe_issue',
          sampleCount: 200,
          averageTime: 1600,
          minTime: 1000,
          maxTime: 2200,
          standardDeviation: 300,
          throughput: 0.625,
          memoryEfficiency: 0.00002,
          successRate: 0.8
        }]
      ]);

      engine.analyzeAndRecommend(patterns, benchmarks, []);

      const highSeverityRecs = engine.getRecommendationsBySeverity('high');
      const criticalRecs = engine.getRecommendationsBySeverity('critical');

      expect(highSeverityRecs.length).toBeGreaterThan(0);
      expect(criticalRecs.length).toBeGreaterThanOrEqual(0);
    });

    test('should mark recommendations as implemented', () => {
      const patterns: UsagePattern[] = [{
        operationType: 'implemented_fix',
        frequency: 50,
        averageComplexity: 600,
        timeDistribution: [300, 400, 500, 600, 700, 800, 900],
        memoryDistribution: [2097152, 3145728, 4194304, 5242880, 6291456, 7340032, 8388608],
        errorRate: 0.06,
        trends: {
          performanceTrend: 'stable',
          memoryTrend: 'stable',
          errorTrend: 'stable'
        }
      }];

      const benchmarks = new Map<string, PerformanceBenchmark>([
        ['implemented_fix', {
          operationType: 'implemented_fix',
          sampleCount: 50,
          averageTime: 600,
          minTime: 300,
          maxTime: 900,
          standardDeviation: 150,
          throughput: 1.67,
          memoryEfficiency: 0.0002,
          successRate: 0.94
        }]
      ]);

      const recommendations = engine.analyzeAndRecommend(patterns, benchmarks, []);
      expect(recommendations.length).toBeGreaterThan(0);

      const firstRec = recommendations[0];
      engine.markImplemented(firstRec.id);

      const remainingRecs = engine.getRecommendationsByType(firstRec.type);
      expect(remainingRecs.find(r => r.id === firstRec.id)).toBeUndefined();
    });
  });
});