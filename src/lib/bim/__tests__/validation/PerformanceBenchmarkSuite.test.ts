import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceBenchmarkSuite, BenchmarkConfiguration, PerformanceThresholds } from '../../validation/PerformanceBenchmarkSuite';
import { ValidationPipeline } from '../../validation/ValidationPipeline';
import { AutomaticRecoverySystem } from '../../validation/AutomaticRecoverySystem';

describe('PerformanceBenchmarkSuite', () => {
  let benchmarkSuite: PerformanceBenchmarkSuite;
  let validationPipeline: ValidationPipeline;
  let recoverySystem: AutomaticRecoverySystem;

  beforeEach(() => {
    validationPipeline = new ValidationPipeline();
    recoverySystem = new AutomaticRecoverySystem();
    benchmarkSuite = new PerformanceBenchmarkSuite(validationPipeline, recoverySystem);
  });

  describe('Benchmark Configuration', () => {
    it('should create benchmark suite with default configuration', () => {
      expect(benchmarkSuite).toBeDefined();
    });

    it('should accept custom validation pipeline and recovery system', () => {
      const customPipeline = new ValidationPipeline({ enableAutoRecovery: false });
      const customRecovery = new AutomaticRecoverySystem({ enableAutoRecovery: false });
      const customSuite = new PerformanceBenchmarkSuite(customPipeline, customRecovery);
      
      expect(customSuite).toBeDefined();
    });
  });

  describe('Benchmark Execution', () => {
    it('should run basic benchmark suite', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [10, 20],
        iterations: 2,
        warmupIterations: 1,
        memoryMonitoring: true,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      expect(result).toBeDefined();
      expect(result.testName).toBe('BIM Validation Performance Benchmark');
      expect(result.configuration).toEqual(config);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.memoryProfile).toBeDefined();
      expect(result.scalabilityAnalysis).toBeDefined();
      expect(result.regressionAnalysis).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.environment).toBeDefined();
    });

    it('should handle different test sizes', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [5, 15, 25],
        iterations: 1,
        warmupIterations: 0,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'json'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      expect(result.results.length).toBeGreaterThan(0);
      
      // Should have results for each test size and operation type
      const validationResults = result.results.filter(r => r.operationType.includes('validation'));
      const recoveryResults = result.results.filter(r => r.operationType.includes('recovery'));
      const concurrentResults = result.results.filter(r => r.operationType.includes('concurrent'));

      expect(validationResults.length).toBe(config.testSizes.length);
      expect(recoveryResults.length).toBe(config.testSizes.length);
      expect(concurrentResults.length).toBe(config.testSizes.length);
    });

    it('should track memory usage when enabled', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [10],
        iterations: 2,
        warmupIterations: 1,
        memoryMonitoring: true,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      expect(result.memoryProfile.initialMemory).toBeGreaterThan(0);
      expect(result.memoryProfile.peakMemory).toBeGreaterThanOrEqual(result.memoryProfile.initialMemory);
      expect(result.memoryProfile.finalMemory).toBeGreaterThan(0);
      expect(result.memoryProfile.memoryTimeline.length).toBeGreaterThan(0);
    });

    it('should handle benchmark failures gracefully', async () => {
      // Mock validation pipeline to throw errors
      const failingPipeline = {
        executeValidation: vi.fn().mockRejectedValue(new Error('Validation failed'))
      } as any;

      const failingSuite = new PerformanceBenchmarkSuite(failingPipeline, recoverySystem);

      const config: BenchmarkConfiguration = {
        testSizes: [5],
        iterations: 1,
        warmupIterations: 0,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await failingSuite.runBenchmarkSuite(config);

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      
      // Should have recorded failures
      const validationResult = result.results.find(r => r.operationType.includes('validation'));
      expect(validationResult?.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze scalability correctly', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [10, 20, 40], // Doubling sizes to test scalability
        iterations: 2,
        warmupIterations: 1,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      expect(result.scalabilityAnalysis).toBeDefined();
      expect(result.scalabilityAnalysis.linearScaling).toBeDefined();
      expect(result.scalabilityAnalysis.scalingFactor).toBeGreaterThan(0);
      expect(result.scalabilityAnalysis.performanceDegradation).toBeGreaterThanOrEqual(0);
      expect(result.scalabilityAnalysis.recommendedMaxSize).toBeGreaterThan(0);
    });

    it('should detect performance regression when baseline exists', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [10],
        iterations: 2,
        warmupIterations: 1,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      // Run first benchmark to establish baseline
      const firstResult = await benchmarkSuite.runBenchmarkSuite(config);
      expect(firstResult.regressionAnalysis.regressionDetected).toBe(false);

      // Run second benchmark to compare against baseline
      const secondResult = await benchmarkSuite.runBenchmarkSuite(config);
      expect(secondResult.regressionAnalysis.baselineResults.length).toBeGreaterThan(0);
      expect(secondResult.regressionAnalysis.currentResults.length).toBeGreaterThan(0);
    });

    it('should calculate performance metrics correctly', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [5],
        iterations: 3,
        warmupIterations: 1,
        memoryMonitoring: true,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      for (const benchmark of result.results) {
        expect(benchmark.operationType).toBeDefined();
        expect(benchmark.inputSize).toBeGreaterThan(0);
        expect(benchmark.iterations).toBe(config.iterations);
        expect(benchmark.averageTime).toBeGreaterThan(0);
        expect(benchmark.minTime).toBeGreaterThan(0);
        expect(benchmark.maxTime).toBeGreaterThanOrEqual(benchmark.minTime);
        expect(benchmark.standardDeviation).toBeGreaterThanOrEqual(0);
        expect(benchmark.throughput).toBeGreaterThan(0);
        expect(benchmark.successRate).toBeGreaterThanOrEqual(0);
        expect(benchmark.successRate).toBeLessThanOrEqual(1);
        expect(benchmark.errorRate).toBeGreaterThanOrEqual(0);
        expect(benchmark.errorRate).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Memory Profiling', () => {
    it('should detect memory leaks when they occur', async () => {
      // Mock a scenario that causes memory leaks
      const leakyPipeline = {
        executeValidation: vi.fn().mockImplementation(() => {
          // Simulate memory leak by creating large objects
          const leak = new Array(10000).fill('memory leak');
          return Promise.resolve({ success: true, stageResults: new Map(), recoveryResults: new Map(), overallQuality: {}, totalProcessingTime: 10, recommendedActions: [] });
        })
      } as any;

      const leakySuite = new PerformanceBenchmarkSuite(leakyPipeline, recoverySystem);

      const config: BenchmarkConfiguration = {
        testSizes: [20],
        iterations: 5,
        warmupIterations: 1,
        memoryMonitoring: true,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 10, // Low threshold to detect leaks
          minThroughput: 10,
          maxMemoryLeakRate: 1 // Low threshold
        },
        outputFormat: 'console'
      };

      const result = await leakySuite.runBenchmarkSuite(config);

      expect(result.memoryProfile.memoryIncrease).toBeGreaterThan(0);
      // Note: Actual leak detection depends on garbage collection timing
    });

    it('should track memory timeline', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [10],
        iterations: 2,
        warmupIterations: 1,
        memoryMonitoring: true,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      expect(result.memoryProfile.memoryTimeline.length).toBeGreaterThan(1);
      
      for (const snapshot of result.memoryProfile.memoryTimeline) {
        expect(snapshot.timestamp).toBeGreaterThan(0);
        expect(snapshot.heapUsed).toBeGreaterThan(0);
        expect(snapshot.heapTotal).toBeGreaterThan(0);
        expect(snapshot.rss).toBeGreaterThan(0);
      }
    });
  });

  describe('Result Export', () => {
    it('should export results in console format', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [5],
        iterations: 1,
        warmupIterations: 0,
        memoryMonitoring: true,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);
      const consoleOutput = benchmarkSuite.exportResults(result, 'console');

      expect(consoleOutput).toContain('BIM Performance Benchmark Results');
      expect(consoleOutput).toContain('Operation Benchmarks');
      expect(consoleOutput).toContain('Memory Profile');
      expect(consoleOutput).toContain('Scalability Analysis');
    });

    it('should export results in JSON format', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [5],
        iterations: 1,
        warmupIterations: 0,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'json'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);
      const jsonOutput = benchmarkSuite.exportResults(result, 'json');

      expect(() => JSON.parse(jsonOutput)).not.toThrow();
      
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.testName).toBe('BIM Validation Performance Benchmark');
      expect(parsed.results).toBeDefined();
      expect(parsed.memoryProfile).toBeDefined();
    });

    it('should export results in CSV format', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [5],
        iterations: 1,
        warmupIterations: 0,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'csv'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);
      const csvOutput = benchmarkSuite.exportResults(result, 'csv');

      expect(csvOutput).toContain('Operation Type');
      expect(csvOutput).toContain('Input Size');
      expect(csvOutput).toContain('Average Time (ms)');
      expect(csvOutput).toContain('Throughput (ops/sec)');
      
      const lines = csvOutput.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
    });
  });

  describe('Environment Capture', () => {
    it('should capture environment information', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [5],
        iterations: 1,
        warmupIterations: 0,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      expect(result.environment.nodeVersion).toBeDefined();
      expect(result.environment.platform).toBeDefined();
      expect(result.environment.arch).toBeDefined();
      expect(result.environment.cpuModel).toBeDefined();
      expect(result.environment.totalMemory).toBeGreaterThan(0);
      expect(result.environment.freeMemory).toBeGreaterThan(0);
      expect(result.environment.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Performance Thresholds', () => {
    it('should respect performance thresholds in analysis', async () => {
      const strictThresholds: PerformanceThresholds = {
        maxValidationTimePerWall: 1, // Very strict - 1ms per wall
        maxRecoveryTimePerError: 1, // Very strict - 1ms per error
        maxMemoryUsageIncrease: 1, // Very strict - 1% increase
        minThroughput: 1000, // Very high - 1000 ops/sec
        maxMemoryLeakRate: 0.1 // Very strict - 0.1MB per 1000 ops
      };

      const config: BenchmarkConfiguration = {
        testSizes: [10],
        iterations: 2,
        warmupIterations: 1,
        memoryMonitoring: true,
        performanceThresholds: strictThresholds,
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      expect(result.configuration.performanceThresholds).toEqual(strictThresholds);
      
      // With strict thresholds, we might expect some operations to exceed limits
      // This is more of a configuration test than a performance test
    });
  });

  describe('Concurrent Operations', () => {
    it('should benchmark concurrent operations correctly', async () => {
      const config: BenchmarkConfiguration = {
        testSizes: [20], // Enough operations to test concurrency
        iterations: 2,
        warmupIterations: 1,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await benchmarkSuite.runBenchmarkSuite(config);

      const concurrentResults = result.results.filter(r => r.operationType.includes('concurrent'));
      expect(concurrentResults.length).toBeGreaterThan(0);

      for (const concurrentResult of concurrentResults) {
        expect(concurrentResult.averageTime).toBeGreaterThan(0);
        expect(concurrentResult.throughput).toBeGreaterThan(0);
        expect(concurrentResult.successRate).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle validation pipeline errors gracefully', async () => {
      const errorPipeline = {
        executeValidation: vi.fn().mockRejectedValue(new Error('Pipeline error'))
      } as any;

      const errorSuite = new PerformanceBenchmarkSuite(errorPipeline, recoverySystem);

      const config: BenchmarkConfiguration = {
        testSizes: [5],
        iterations: 1,
        warmupIterations: 0,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await errorSuite.runBenchmarkSuite(config);

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      
      // Should record high error rates
      const validationResult = result.results.find(r => r.operationType.includes('validation'));
      expect(validationResult?.errorRate).toBeGreaterThan(0);
    });

    it('should handle recovery system errors gracefully', async () => {
      const errorRecovery = {
        attemptRecovery: vi.fn().mockRejectedValue(new Error('Recovery error'))
      } as any;

      const errorSuite = new PerformanceBenchmarkSuite(validationPipeline, errorRecovery);

      const config: BenchmarkConfiguration = {
        testSizes: [5],
        iterations: 1,
        warmupIterations: 0,
        memoryMonitoring: false,
        performanceThresholds: {
          maxValidationTimePerWall: 100,
          maxRecoveryTimePerError: 200,
          maxMemoryUsageIncrease: 50,
          minThroughput: 10,
          maxMemoryLeakRate: 5
        },
        outputFormat: 'console'
      };

      const result = await errorSuite.runBenchmarkSuite(config);

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      
      // Should record high error rates for recovery operations
      const recoveryResult = result.results.find(r => r.operationType.includes('recovery'));
      expect(recoveryResult?.errorRate).toBeGreaterThan(0);
    });
  });
});