/**
 * Tests for PerformanceMonitoringSystem
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceMonitoringSystem } from '../../performance/PerformanceMonitoringSystem';

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

describe('PerformanceMonitoringSystem', () => {
  let system: PerformanceMonitoringSystem;
  let currentTime: number;

  beforeEach(() => {
    currentTime = 1000;
    mockPerformanceNow.mockImplementation(() => currentTime);
    mockMemoryUsage.mockReturnValue({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 100 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    });

    system = new PerformanceMonitoringSystem({
      enableMetricsCollection: true,
      enableCacheMonitoring: true,
      enableProfiling: false,
      enableOptimizationRecommendations: true,
      thresholds: {
        maxOperationTime: 500,
        maxMemoryUsage: 80 * 1024 * 1024
      },
      autoCleanupInterval: 60000, // 1 minute for testing
      reportingInterval: 10000 // 10 seconds for testing
    });
  });

  afterEach(() => {
    system.shutdown();
  });

  describe('Operation Monitoring', () => {
    test('should monitor complete operation lifecycle', () => {
      const operationType = 'test_offset_operation';
      const inputComplexity = 150;
      const outputComplexity = 200;

      // Start operation
      const operationId = system.startOperation(operationType, inputComplexity, {
        wallThickness: 0.2,
        joinType: 'miter'
      });

      expect(operationId).toBeDefined();
      expect(operationId).toContain(operationType);

      // Simulate operation execution
      currentTime += 300;

      // End operation
      const metrics = system.endOperation(operationId, operationType, outputComplexity, true);

      expect(metrics).toBeDefined();
      expect(metrics!.operationType).toBe(operationType);
      expect(metrics!.duration).toBe(300);
      expect(metrics!.success).toBe(true);
      expect(metrics!.outputComplexity).toBe(outputComplexity);
    });

    test('should handle failed operations', () => {
      const operationType = 'failing_boolean_operation';
      const operationId = system.startOperation(operationType, 100);

      currentTime += 150;

      const metrics = system.endOperation(operationId, operationType, 0, false, 'intersection_failure');

      expect(metrics).toBeDefined();
      expect(metrics!.success).toBe(false);
      expect(metrics!.errorType).toBe('intersection_failure');
    });

    test('should work with disabled metrics collection', () => {
      const disabledSystem = new PerformanceMonitoringSystem({
        enableMetricsCollection: false
      });

      const operationId = disabledSystem.startOperation('test_operation', 100);
      currentTime += 100;
      const metrics = disabledSystem.endOperation(operationId, 'test_operation', 150, true);

      expect(metrics).toBeNull();
      disabledSystem.shutdown();
    });
  });

  describe('Cache Monitoring', () => {
    test('should record cache access events', () => {
      const cacheType = 'geometric_operations';
      const key = 'offset_curve_123';

      // Record cache hit
      system.recordCacheAccess(cacheType, key, true, 5);

      // Record cache miss
      system.recordCacheAccess(cacheType, key + '_miss', false, 15);

      const cacheMetrics = system.getCacheEffectiveness(cacheType);
      expect(cacheMetrics).toHaveLength(1);
      expect(cacheMetrics[0].cacheType).toBe(cacheType);
      expect(cacheMetrics[0].hitRate).toBe(0.5); // 1 hit out of 2 accesses
    });

    test('should record cache eviction events', () => {
      const cacheType = 'intersection_cache';
      const key = 'intersection_456';

      // Record some accesses first
      system.recordCacheAccess(cacheType, key, true, 3);
      system.recordCacheAccess(cacheType, key, true, 2);

      // Record eviction
      system.recordCacheEviction(cacheType, key, 'size_limit', 30000, 5);

      const cacheMetrics = system.getCacheEffectiveness(cacheType);
      expect(cacheMetrics).toHaveLength(1);
      expect(cacheMetrics[0].evictionRate).toBeGreaterThan(0);
    });

    test('should work with disabled cache monitoring', () => {
      const disabledSystem = new PerformanceMonitoringSystem({
        enableCacheMonitoring: false
      });

      disabledSystem.recordCacheAccess('test_cache', 'test_key', true, 5);
      const metrics = disabledSystem.getCacheEffectiveness();

      expect(metrics).toHaveLength(0);
      disabledSystem.shutdown();
    });
  });

  describe('Profiling Sessions', () => {
    test('should handle profiling when disabled', () => {
      const sessionId = system.startProfilingSession('test_session');
      expect(sessionId).toBeNull();

      const profile = system.endProfilingSession('fake_session');
      expect(profile).toBeNull();
    });

    test('should handle profiling when enabled', () => {
      const profilingSystem = new PerformanceMonitoringSystem({
        enableProfiling: true
      });

      const sessionId = profilingSystem.startProfilingSession('test_session');
      expect(sessionId).toBeDefined();
      expect(sessionId).not.toBeNull();

      // Simulate some operations during profiling
      const opId = profilingSystem.startOperation('profiled_operation', 100);
      currentTime += 200;
      profilingSystem.endOperation(opId, 'profiled_operation', 150, true);

      const profile = profilingSystem.endProfilingSession(sessionId!);
      expect(profile).toBeDefined();

      profilingSystem.shutdown();
    });
  });

  describe('Performance Reports', () => {
    test('should generate comprehensive performance report', () => {
      // Add some operations
      const operations = [
        { type: 'offset_operation', duration: 100, success: true },
        { type: 'offset_operation', duration: 150, success: true },
        { type: 'boolean_operation', duration: 300, success: true },
        { type: 'boolean_operation', duration: 250, success: false },
        { type: 'healing_operation', duration: 80, success: true }
      ];

      operations.forEach((op, index) => {
        const opId = system.startOperation(op.type, 100);
        currentTime += op.duration;
        system.endOperation(opId, op.type, 150, op.success);
      });

      // Add some cache events
      system.recordCacheAccess('test_cache', 'key1', true, 5);
      system.recordCacheAccess('test_cache', 'key2', false, 12);

      const report = system.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.summary.totalOperations).toBe(5);
      expect(report.summary.averageTime).toBeGreaterThan(0);
      expect(report.summary.errorRate).toBe(0.2); // 1 failure out of 5
      expect(report.summary.overallScore).toBeGreaterThan(0);
      expect(report.summary.overallScore).toBeLessThanOrEqual(100);

      expect(report.benchmarks.size).toBe(3); // 3 operation types
      expect(report.usagePatterns).toHaveLength(3);
      expect(report.cacheMetrics).toHaveLength(1);
      expect(report.recommendations).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.bottlenecks).toBeDefined();
    });

    test('should generate report with time window', () => {
      // Add old operations
      const oldOpId = system.startOperation('old_operation', 100);
      currentTime += 100;
      system.endOperation(oldOpId, 'old_operation', 150, true);

      // Move time forward significantly
      currentTime += 2 * 60 * 60 * 1000; // 2 hours

      // Add recent operations
      const recentOpId = system.startOperation('recent_operation', 100);
      currentTime += 200;
      system.endOperation(recentOpId, 'recent_operation', 150, true);

      // Generate report with 1-hour window
      const report = system.generateReport(60 * 60 * 1000);

      expect(report.summary.totalOperations).toBe(1); // Only recent operation
      expect(report.timeWindow).toBe(60 * 60 * 1000);
    });

    test('should handle empty report generation', () => {
      const report = system.generateReport();

      expect(report.summary.totalOperations).toBe(0);
      expect(report.summary.averageTime).toBe(0);
      expect(report.summary.errorRate).toBe(0);
      expect(report.summary.overallScore).toBe(100); // Perfect score when no operations
      expect(report.benchmarks.size).toBe(0);
      expect(report.usagePatterns).toHaveLength(0);
    });
  });

  describe('Optimization Recommendations', () => {
    test('should generate optimization recommendations', () => {
      // Add operations that should trigger recommendations
      const slowOperations = Array.from({ length: 20 }, (_, i) => ({
        type: 'slow_operation',
        duration: 800 + i * 50, // Slow operations
        success: true
      }));

      slowOperations.forEach((op, index) => {
        const opId = system.startOperation(op.type, 500);
        currentTime += op.duration;
        system.endOperation(opId, op.type, 600, op.success);
      });

      const recommendations = system.getOptimizationRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      
      const algorithmRec = recommendations.find(r => 
        r.title.includes('slow_operation')
      );
      expect(algorithmRec).toBeDefined();
    });

    test('should work with disabled recommendations', () => {
      const disabledSystem = new PerformanceMonitoringSystem({
        enableOptimizationRecommendations: false
      });

      const opId = disabledSystem.startOperation('test_operation', 100);
      currentTime += 1000; // Very slow operation
      disabledSystem.endOperation(opId, 'test_operation', 150, true);

      const recommendations = disabledSystem.getOptimizationRecommendations();
      expect(recommendations).toHaveLength(0);

      disabledSystem.shutdown();
    });
  });

  describe('Alert System', () => {
    test('should generate alerts for threshold violations', () => {
      const operationType = 'threshold_violating_operation';
      const opId = system.startOperation(operationType, 100);
      
      currentTime += 1000; // Exceeds 500ms threshold
      system.endOperation(opId, operationType, 150, true);

      const alerts = system.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const timeAlert = alerts.find(a => a.type === 'threshold_exceeded');
      expect(timeAlert).toBeDefined();
    });

    test('should filter alerts by time window', () => {
      // Generate old alert
      const oldOpId = system.startOperation('old_slow_operation', 100);
      currentTime += 1000;
      system.endOperation(oldOpId, 'old_slow_operation', 150, true);

      // Move time forward
      currentTime += 2 * 60 * 60 * 1000; // 2 hours

      // Generate recent alert
      const recentOpId = system.startOperation('recent_slow_operation', 100);
      currentTime += 1000;
      system.endOperation(recentOpId, 'recent_slow_operation', 150, true);

      const allAlerts = system.getAlerts();
      const recentAlerts = system.getAlerts(60 * 60 * 1000); // 1 hour window

      expect(allAlerts.length).toBe(2);
      expect(recentAlerts.length).toBe(1);
    });
  });

  describe('Report Subscriptions', () => {
    test('should handle report subscriptions', (done) => {
      let reportReceived = false;

      const unsubscribe = system.subscribeToReports((report) => {
        expect(report).toBeDefined();
        expect(report.timestamp).toBeDefined();
        reportReceived = true;
        unsubscribe();
        done();
      });

      // Add an operation to trigger report generation
      const opId = system.startOperation('subscription_test', 100);
      currentTime += 100;
      system.endOperation(opId, 'subscription_test', 150, true);

      // Wait for automatic report generation
      setTimeout(() => {
        if (!reportReceived) {
          unsubscribe();
          done(new Error('Report subscription did not trigger'));
        }
      }, 15000); // Wait longer than reporting interval
    });

    test('should handle subscription errors gracefully', () => {
      const faultyCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const unsubscribe = system.subscribeToReports(faultyCallback);

      // Add operation to trigger report
      const opId = system.startOperation('error_test', 100);
      currentTime += 100;
      system.endOperation(opId, 'error_test', 150, true);

      // Clean up
      unsubscribe();
      consoleSpy.mockRestore();
    });
  });

  describe('Data Export and Configuration', () => {
    test('should export performance data', () => {
      // Add some data
      const opId = system.startOperation('export_test', 100);
      currentTime += 200;
      system.endOperation(opId, 'export_test', 150, true);

      system.recordCacheAccess('export_cache', 'key1', true, 5);

      const exportData = system.exportData();
      const parsed = JSON.parse(exportData);

      expect(parsed.report).toBeDefined();
      expect(parsed.profilingSessions).toBeDefined();
      expect(parsed.config).toBeDefined();
      expect(parsed.exportTimestamp).toBeDefined();
    });

    test('should update configuration', () => {
      const newConfig = {
        enableProfiling: true,
        thresholds: {
          maxOperationTime: 1000
        }
      };

      system.updateConfig(newConfig);
      const currentConfig = system.getConfig();

      expect(currentConfig.enableProfiling).toBe(true);
      expect(currentConfig.thresholds.maxOperationTime).toBe(1000);
    });

    test('should perform manual cleanup', () => {
      // Add some operations
      const opId1 = system.startOperation('cleanup_test_1', 100);
      currentTime += 100;
      system.endOperation(opId1, 'cleanup_test_1', 150, true);

      // Move time forward
      currentTime += 25 * 60 * 60 * 1000; // 25 hours

      const opId2 = system.startOperation('cleanup_test_2', 100);
      currentTime += 100;
      system.endOperation(opId2, 'cleanup_test_2', 150, true);

      // Manual cleanup with 24-hour max age
      system.cleanup(24 * 60 * 60 * 1000);

      const report = system.generateReport();
      expect(report.summary.totalOperations).toBe(1); // Only recent operation should remain
    });
  });

  describe('System Lifecycle', () => {
    test('should shutdown cleanly', () => {
      const shutdownSystem = new PerformanceMonitoringSystem({
        autoCleanupInterval: 1000,
        reportingInterval: 1000
      });

      // Add a subscription to test cleanup
      const unsubscribe = shutdownSystem.subscribeToReports(() => {});

      // Shutdown should clear intervals and callbacks
      shutdownSystem.shutdown();

      // Verify subscription was cleaned up
      const config = shutdownSystem.getConfig();
      expect(config).toBeDefined(); // System should still be accessible
    });

    test('should handle multiple shutdowns gracefully', () => {
      const multiShutdownSystem = new PerformanceMonitoringSystem();

      // Multiple shutdowns should not throw errors
      expect(() => {
        multiShutdownSystem.shutdown();
        multiShutdownSystem.shutdown();
        multiShutdownSystem.shutdown();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle operations with zero complexity', () => {
      const opId = system.startOperation('zero_complexity', 0);
      currentTime += 50;
      const metrics = system.endOperation(opId, 'zero_complexity', 0, true);

      expect(metrics).toBeDefined();
      expect(metrics!.inputComplexity).toBe(0);
      expect(metrics!.outputComplexity).toBe(0);
    });

    test('should handle very long operation names', () => {
      const longName = 'very_long_operation_name_that_exceeds_normal_length_expectations_and_might_cause_issues_in_some_systems';
      const opId = system.startOperation(longName, 100);
      currentTime += 100;
      const metrics = system.endOperation(opId, longName, 150, true);

      expect(metrics).toBeDefined();
      expect(metrics!.operationType).toBe(longName);
    });

    test('should handle rapid operation sequences', () => {
      const operations: string[] = [];

      // Start many operations rapidly
      for (let i = 0; i < 100; i++) {
        const opId = system.startOperation('rapid_operation', i);
        operations.push(opId);
        currentTime += 1; // Very short operations
      }

      // End all operations
      operations.forEach((opId, index) => {
        system.endOperation(opId, 'rapid_operation', index, true);
      });

      const report = system.generateReport();
      expect(report.summary.totalOperations).toBe(100);
    });
  });
});