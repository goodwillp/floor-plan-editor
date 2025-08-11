/**
 * Tests for PerformanceMetricsCollector
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PerformanceMetricsCollector } from '../../performance/PerformanceMetricsCollector';

// Mock performance.now()
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

// Mock process.memoryUsage()
const mockMemoryUsage = vi.fn();
Object.defineProperty(global, 'process', {
  value: { memoryUsage: mockMemoryUsage },
  writable: true
});

describe('PerformanceMetricsCollector', () => {
  let collector: PerformanceMetricsCollector;
  let currentTime: number;

  beforeEach(() => {
    currentTime = 1000;
    mockPerformanceNow.mockImplementation(() => currentTime);
    mockMemoryUsage.mockReturnValue({
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 10 * 1024 * 1024, // 10MB
      arrayBuffers: 5 * 1024 * 1024 // 5MB
    });

    collector = new PerformanceMetricsCollector({
      maxOperationTime: 500,
      maxMemoryUsage: 80 * 1024 * 1024
    });
  });

  describe('Operation Tracking', () => {
    test('should track operation lifecycle', () => {
      const operationId = 'test-op-1';
      const operationType = 'offset_operation';

      // Start operation
      collector.startOperation(operationType, operationId, 100);

      // Simulate time passing
      currentTime += 250;

      // End operation
      const metrics = collector.endOperation(operationId, operationType, 150, true);

      expect(metrics).toBeDefined();
      expect(metrics.operationType).toBe(operationType);
      expect(metrics.operationId).toBe(operationId);
      expect(metrics.duration).toBe(250);
      expect(metrics.success).toBe(true);
      expect(metrics.inputComplexity).toBe(0); // Set by caller
      expect(metrics.outputComplexity).toBe(150);
    });

    test('should handle failed operations', () => {
      const operationId = 'test-op-2';
      const operationType = 'boolean_operation';

      collector.startOperation(operationType, operationId, 200);
      currentTime += 100;

      const metrics = collector.endOperation(operationId, operationType, 0, false, 'intersection_failure');

      expect(metrics.success).toBe(false);
      expect(metrics.errorType).toBe('intersection_failure');
      expect(metrics.outputComplexity).toBe(0);
    });

    test('should throw error for unknown operation', () => {
      expect(() => {
        collector.endOperation('unknown-op', 'test_operation', 100, true);
      }).toThrow('Operation unknown-op was not started');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should calculate benchmark for operation type', () => {
      const operationType = 'offset_operation';

      // Add multiple operations
      for (let i = 0; i < 5; i++) {
        const opId = `op-${i}`;
        collector.startOperation(operationType, opId, 100);
        currentTime += 100 + i * 50; // Varying durations
        collector.endOperation(opId, operationType, 150, true);
      }

      const benchmark = collector.calculateBenchmark(operationType);

      expect(benchmark.operationType).toBe(operationType);
      expect(benchmark.sampleCount).toBe(5);
      expect(benchmark.averageTime).toBeGreaterThan(0);
      expect(benchmark.minTime).toBeLessThanOrEqual(benchmark.averageTime);
      expect(benchmark.maxTime).toBeGreaterThanOrEqual(benchmark.averageTime);
      expect(benchmark.successRate).toBe(1.0);
    });

    test('should handle empty benchmark calculation', () => {
      const benchmark = collector.calculateBenchmark('nonexistent_operation');

      expect(benchmark.sampleCount).toBe(0);
      expect(benchmark.averageTime).toBe(0);
      expect(benchmark.successRate).toBe(0);
    });

    test('should calculate benchmark with time window', () => {
      const operationType = 'test_operation';
      const oldTime = currentTime;

      // Add old operation
      collector.startOperation(operationType, 'old-op', 100);
      currentTime += 100;
      collector.endOperation('old-op', operationType, 150, true);

      // Move time forward significantly
      currentTime += 60 * 60 * 1000; // 1 hour

      // Add recent operation
      collector.startOperation(operationType, 'recent-op', 100);
      currentTime += 200;
      collector.endOperation('recent-op', operationType, 150, true);

      // Benchmark with 30-minute window should only include recent operation
      const benchmark = collector.calculateBenchmark(operationType, 30 * 60 * 1000);
      expect(benchmark.sampleCount).toBe(1);
    });
  });

  describe('Usage Pattern Analysis', () => {
    test('should analyze usage patterns', () => {
      // Add operations of different types
      const operations = [
        { type: 'offset_operation', count: 10, avgDuration: 100 },
        { type: 'boolean_operation', count: 5, avgDuration: 200 },
        { type: 'healing_operation', count: 3, avgDuration: 50 }
      ];

      operations.forEach(({ type, count, avgDuration }) => {
        for (let i = 0; i < count; i++) {
          const opId = `${type}-${i}`;
          collector.startOperation(type, opId, 100);
          currentTime += avgDuration;
          collector.endOperation(opId, type, 150, i % 10 !== 0); // 10% error rate
        }
      });

      const patterns = collector.analyzeUsagePatterns();

      expect(patterns).toHaveLength(3);
      
      const offsetPattern = patterns.find(p => p.operationType === 'offset_operation');
      expect(offsetPattern).toBeDefined();
      expect(offsetPattern!.frequency).toBe(10);
      expect(offsetPattern!.errorRate).toBeCloseTo(0.1, 1);
    });

    test('should calculate performance trends', () => {
      const operationType = 'trend_test';

      // Add operations with degrading performance
      for (let i = 0; i < 20; i++) {
        const opId = `trend-op-${i}`;
        collector.startOperation(operationType, opId, 100);
        currentTime += 100 + i * 10; // Increasing duration
        collector.endOperation(opId, operationType, 150, true);
      }

      const patterns = collector.analyzeUsagePatterns();
      const trendPattern = patterns.find(p => p.operationType === operationType);

      expect(trendPattern).toBeDefined();
      expect(trendPattern!.trends.performanceTrend).toBe('degrading');
    });
  });

  describe('Performance Profile Generation', () => {
    test('should generate performance profile', () => {
      const sessionId = 'test-session';

      // Add various operations
      const operationTypes = ['offset', 'boolean', 'healing'];
      operationTypes.forEach((type, index) => {
        for (let i = 0; i < 5; i++) {
          const opId = `${type}-${i}`;
          collector.startOperation(type, opId, 100);
          currentTime += 100 * (index + 1);
          collector.endOperation(opId, type, 150, true);
        }
      });

      const profile = collector.generateProfile(sessionId);

      expect(profile.sessionId).toBe(sessionId);
      expect(profile.totalOperations).toBe(15);
      expect(profile.operationBreakdown.size).toBe(3);
      expect(profile.bottlenecks).toBeDefined();
      expect(profile.overallScore).toBeGreaterThan(0);
      expect(profile.overallScore).toBeLessThanOrEqual(100);
    });

    test('should identify bottlenecks', () => {
      const slowOperationType = 'slow_operation';
      const fastOperationType = 'fast_operation';

      // Add slow operations
      for (let i = 0; i < 10; i++) {
        const opId = `slow-${i}`;
        collector.startOperation(slowOperationType, opId, 100);
        currentTime += 1000; // 1 second each
        collector.endOperation(opId, slowOperationType, 150, true);
      }

      // Add fast operations
      for (let i = 0; i < 100; i++) {
        const opId = `fast-${i}`;
        collector.startOperation(fastOperationType, opId, 100);
        currentTime += 10; // 10ms each
        collector.endOperation(opId, fastOperationType, 150, true);
      }

      const profile = collector.generateProfile('bottleneck-test');

      expect(profile.bottlenecks.length).toBeGreaterThan(0);
      
      const slowBottleneck = profile.bottlenecks.find(b => b.operationType === slowOperationType);
      expect(slowBottleneck).toBeDefined();
      expect(slowBottleneck!.averageTime).toBeGreaterThan(500);
    });
  });

  describe('Threshold Monitoring', () => {
    test('should generate alerts for threshold violations', () => {
      const operationType = 'slow_operation';
      const opId = 'threshold-test';

      collector.startOperation(operationType, opId, 100);
      currentTime += 1000; // Exceeds 500ms threshold by 2x, should be critical
      collector.endOperation(opId, operationType, 150, true);

      const alerts = collector.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const timeAlert = alerts.find(a => a.type === 'threshold_exceeded');
      expect(timeAlert).toBeDefined();
      expect(timeAlert!.severity).toBe('critical'); // 1000ms > 500ms * 2
    });

    test('should generate memory usage alerts', () => {
      // Mock high memory usage at start
      mockMemoryUsage.mockReturnValueOnce({
        heapUsed: 50 * 1024 * 1024, // 50MB start
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      const operationType = 'memory_intensive';
      const opId = 'memory-test';

      collector.startOperation(operationType, opId, 100);
      
      // Mock high memory usage at end (delta will be 100MB)
      mockMemoryUsage.mockReturnValueOnce({
        heapUsed: 150 * 1024 * 1024, // 150MB end - delta of 100MB exceeds 80MB threshold
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      currentTime += 100;
      collector.endOperation(opId, operationType, 150, true);

      const alerts = collector.getAlerts();
      const memoryAlert = alerts.find(a => a.message.includes('memory'));
      expect(memoryAlert).toBeDefined();
    });
  });

  describe('Data Management', () => {
    test('should cleanup old metrics', () => {
      const operationType = 'cleanup_test';

      // Add old metrics
      for (let i = 0; i < 5; i++) {
        const opId = `old-${i}`;
        collector.startOperation(operationType, opId, 100);
        currentTime += 100;
        collector.endOperation(opId, operationType, 150, true);
      }

      // Move time forward
      currentTime += 25 * 60 * 60 * 1000; // 25 hours

      // Add new metrics
      for (let i = 0; i < 3; i++) {
        const opId = `new-${i}`;
        collector.startOperation(operationType, opId, 100);
        currentTime += 100;
        collector.endOperation(opId, operationType, 150, true);
      }

      // Cleanup with 24-hour max age
      collector.cleanup(24 * 60 * 60 * 1000);

      const metrics = collector.getMetrics();
      expect(metrics.length).toBe(3); // Only new metrics should remain
    });

    test('should get metrics with time window', () => {
      const operationType = 'window_test';

      // Add metrics at different times
      for (let i = 0; i < 10; i++) {
        const opId = `window-${i}`;
        collector.startOperation(operationType, opId, 100);
        currentTime += 100;
        collector.endOperation(opId, operationType, 150, true);
        currentTime += 60 * 1000; // 1 minute between operations
      }

      // Get metrics from last 5 minutes
      const recentMetrics = collector.getMetrics(5 * 60 * 1000);
      expect(recentMetrics.length).toBeLessThan(10);
      expect(recentMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage Calculation', () => {
    test('should handle browser environment', () => {
      // Mock browser environment
      delete (global as any).process;
      Object.defineProperty(global, 'performance', {
        value: {
          now: mockPerformanceNow,
          memory: {
            usedJSHeapSize: 30 * 1024 * 1024,
            totalJSHeapSize: 60 * 1024 * 1024
          }
        },
        writable: true
      });

      const browserCollector = new PerformanceMetricsCollector();
      const operationType = 'browser_test';
      const opId = 'browser-op';

      browserCollector.startOperation(operationType, opId, 100);
      currentTime += 100;
      const metrics = browserCollector.endOperation(opId, operationType, 150, true);

      expect(metrics.memoryUsage.heapUsed).toBeDefined();
      expect(metrics.memoryUsage.heapTotal).toBeDefined();
    });
  });
});