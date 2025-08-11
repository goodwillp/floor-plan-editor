/**
 * Comprehensive Performance Benchmarking Suite for BIM Wall System
 * Tests performance across different scales and scenarios
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceBenchmarkSuite } from '../../validation/PerformanceBenchmarkSuite';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { ShapeHealingEngine } from '../../engines/ShapeHealingEngine';
import { WallSolid } from '../../geometry/WallSolid';
import { Curve } from '../../geometry/Curve';
import { BIMPoint } from '../../geometry/BIMPoint';
import { OffsetJoinType } from '../../types/OffsetTypes';
import { WallTypeString } from '../../types/WallTypes';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

// Mock memory usage
const mockMemoryUsage = vi.fn();
Object.defineProperty(global, 'process', {
  value: { memoryUsage: mockMemoryUsage },
  writable: true
});

describe('PerformanceBenchmarkSuite', () => {
  let benchmarkSuite: PerformanceBenchmarkSuite;
  let offsetEngine: RobustOffsetEngine;
  let booleanEngine: BooleanOperationsEngine;
  let healingEngine: ShapeHealingEngine;
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

    offsetEngine = new RobustOffsetEngine();
    booleanEngine = new BooleanOperationsEngine();
    healingEngine = new ShapeHealingEngine();
    
    benchmarkSuite = new PerformanceBenchmarkSuite({
      offsetEngine,
      booleanEngine,
      healingEngine,
      maxOperationTime: 1000,
      maxMemoryUsage: 100 * 1024 * 1024,
      performanceThresholds: {
        offset_operation: 100,
        boolean_operation: 200,
        healing_operation: 150
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Offset Operation Benchmarks', () => {
    test('should benchmark simple offset operations', async () => {
      const testCases = [
        createSimpleRectangleWall(10, 0.2),
        createSimpleRectangleWall(20, 0.3),
        createSimpleRectangleWall(50, 0.4)
      ];

      const benchmark = await benchmarkSuite.benchmarkOffsetOperations(testCases);

      expect(benchmark.operationType).toBe('offset_operation');
      expect(benchmark.testCases).toBe(testCases.length);
      expect(benchmark.averageTime).toBeGreaterThan(0);
      expect(benchmark.minTime).toBeLessThanOrEqual(benchmark.averageTime);
      expect(benchmark.maxTime).toBeGreaterThanOrEqual(benchmark.averageTime);
      expect(benchmark.successRate).toBeGreaterThan(0.8);
      expect(benchmark.memoryUsage.peak).toBeGreaterThan(0);
    });

    test('should benchmark complex curve offset operations', async () => {
      const testCases = [
        createComplexCurveWall(20, 0.2),
        createComplexCurveWall(50, 0.3),
        createComplexCurveWall(100, 0.4)
      ];

      const benchmark = await benchmarkSuite.benchmarkOffsetOperations(testCases);

      expect(benchmark.operationType).toBe('offset_operation');
      expect(benchmark.complexity.average).toBeGreaterThan(20);
      expect(benchmark.throughput).toBeGreaterThan(0);
    });

    test('should handle offset operation failures gracefully', async () => {
      const testCases = [
        createDegenerateWall(), // Should fail
        createSelfIntersectingWall(), // Should fail
        createSimpleRectangleWall(10, 0.2) // Should succeed
      ];

      const benchmark = await benchmarkSuite.benchmarkOffsetOperations(testCases);

      expect(benchmark.successRate).toBeLessThan(1.0);
      expect(benchmark.failureAnalysis).toBeDefined();
      expect(benchmark.failureAnalysis.commonFailures.length).toBeGreaterThan(0);
    });
  });

  describe('Boolean Operation Benchmarks', () => {
    test('should benchmark simple boolean operations', async () => {
      const testCases = [
        createBooleanTestCase('union', 2),
        createBooleanTestCase('union', 5),
        createBooleanTestCase('union', 10)
      ];

      const benchmark = await benchmarkSuite.benchmarkBooleanOperations(testCases);

      expect(benchmark.operationType).toBe('boolean_operation');
      expect(benchmark.testCases).toBe(testCases.length);
      expect(benchmark.averageTime).toBeGreaterThan(0);
      expect(benchmark.successRate).toBeGreaterThan(0.8);
    });

    test('should benchmark complex intersection scenarios', async () => {
      const testCases = [
        createComplexIntersectionCase('t_junction'),
        createComplexIntersectionCase('l_junction'),
        createComplexIntersectionCase('cross_junction')
      ];

      const benchmark = await benchmarkSuite.benchmarkBooleanOperations(testCases);

      expect(benchmark.operationType).toBe('boolean_operation');
      expect(benchmark.complexity.average).toBeGreaterThan(50);
    });
  });

  describe('Scalability Testing', () => {
    test('should test scalability with increasing wall counts', async () => {
      const wallCounts = [10, 50, 100, 500, 1000];
      const results = [];

      for (const count of wallCounts) {
        currentTime = 1000; // Reset time for each test
        const result = await benchmarkSuite.testScalability(count, 'moderate');
        results.push(result);
        
        expect(result.wallCount).toBe(count);
        expect(result.totalTime).toBeGreaterThan(0);
        expect(result.averageTimePerWall).toBeGreaterThan(0);
      }

      // Verify scalability characteristics
      const scalabilityAnalysis = benchmarkSuite.analyzeScalability(results);
      expect(scalabilityAnalysis.scalingFactor).toBeDefined();
      expect(scalabilityAnalysis.memoryScaling).toBeDefined();
      expect(scalabilityAnalysis.recommendedMaxWalls).toBeGreaterThan(0);
    });

    test('should test scalability with different complexity levels', async () => {
      const complexityLevels = ['simple', 'moderate', 'complex', 'extreme'] as const;
      const results = [];

      for (const complexity of complexityLevels) {
        currentTime = 1000;
        const result = await benchmarkSuite.testScalability(100, complexity);
        results.push(result);
        
        expect(result.complexity).toBe(complexity);
        expect(result.totalTime).toBeGreaterThan(0);
      }

      // Verify complexity scaling
      expect(results[3].totalTime).toBeGreaterThan(results[0].totalTime);
    });

    test('should identify performance bottlenecks at scale', async () => {
      const result = await benchmarkSuite.testScalability(1000, 'complex');
      
      expect(result.bottlenecks).toBeDefined();
      expect(result.bottlenecks.length).toBeGreaterThan(0);
      
      const operationBottleneck = result.bottlenecks.find(b => b.type === 'operation');
      expect(operationBottleneck).toBeDefined();
    });
  });

  describe('Memory Usage Testing', () => {
    test('should track memory usage during operations', async () => {
      const testCase = createLargeWallNetwork(500);
      
      // Mock increasing memory usage
      let memoryUsage = 50 * 1024 * 1024;
      mockMemoryUsage.mockImplementation(() => ({
        heapUsed: memoryUsage,
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }));

      const memoryProfile = await benchmarkSuite.measureMemoryUsage('large_network_test', async () => {
        memoryUsage += 100 * 1024 * 1024; // Simulate memory growth
        currentTime += 1000;
        return { success: true, result: testCase };
      });

      expect(memoryProfile.operation).toBe('large_network_test');
      expect(memoryProfile.peakUsage).toBeGreaterThan(memoryProfile.initialUsage);
      expect(memoryProfile.memoryDelta).toBeGreaterThan(0);
      expect(memoryProfile.leakDetected).toBe(false);
    });

    test('should detect memory leaks', async () => {
      let memoryUsage = 50 * 1024 * 1024;
      const initialUsage = memoryUsage;
      
      mockMemoryUsage.mockImplementation(() => ({
        heapUsed: memoryUsage,
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }));

      const memoryProfile = await benchmarkSuite.measureMemoryUsage('leak_test', async () => {
        memoryUsage += 200 * 1024 * 1024; // Large memory increase
        currentTime += 100;
        // Simulate not releasing memory after operation
        return { success: true, result: null };
      });

      expect(memoryProfile.leakDetected).toBe(true);
      expect(memoryProfile.leakSeverity).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operation Testing', () => {
    test('should test concurrent offset operations', async () => {
      const concurrentOperations = 5;
      const testCases = Array.from({ length: concurrentOperations }, (_, i) => 
        createSimpleRectangleWall(10 + i * 5, 0.2)
      );

      const concurrencyResult = await benchmarkSuite.testConcurrentOperations(
        'offset_operation',
        testCases
      );

      expect(concurrencyResult.operationType).toBe('offset_operation');
      expect(concurrencyResult.concurrentOperations).toBe(concurrentOperations);
      expect(concurrencyResult.totalTime).toBeGreaterThan(0);
      expect(concurrencyResult.averageTime).toBeGreaterThan(0);
      expect(concurrencyResult.successRate).toBeGreaterThan(0.8);
    });

    test('should handle concurrent operation conflicts', async () => {
      const sharedResource = createSimpleRectangleWall(20, 0.3);
      const testCases = Array.from({ length: 3 }, () => sharedResource);

      const concurrencyResult = await benchmarkSuite.testConcurrentOperations(
        'boolean_operation',
        testCases
      );

      expect(concurrencyResult.conflicts).toBeDefined();
      expect(concurrencyResult.resourceContention).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Regression Testing', () => {
    test('should detect performance regressions', async () => {
      // Establish baseline
      const baselineResults = await benchmarkSuite.runBaselineBenchmarks();
      
      // Simulate performance degradation
      vi.spyOn(offsetEngine, 'offsetCurve').mockImplementation(async (...args) => {
        currentTime += 500; // Add artificial delay
        return { success: true, leftOffset: null, rightOffset: null, joinType: OffsetJoinType.MITER, warnings: [], fallbackUsed: false };
      });

      const currentResults = await benchmarkSuite.runBaselineBenchmarks();
      
      const regressionAnalysis = benchmarkSuite.detectRegressions(baselineResults, currentResults);
      
      expect(regressionAnalysis.hasRegressions).toBe(true);
      expect(regressionAnalysis.regressions.length).toBeGreaterThan(0);
      
      const offsetRegression = regressionAnalysis.regressions.find(r => r.operationType === 'offset_operation');
      expect(offsetRegression).toBeDefined();
      expect(offsetRegression!.performanceDelta).toBeGreaterThan(0);
    });

    test('should track performance trends over time', async () => {
      const trendData = [];
      
      // Simulate multiple benchmark runs over time
      for (let i = 0; i < 10; i++) {
        currentTime = 1000 + i * 60000; // 1 minute intervals
        const results = await benchmarkSuite.runBaselineBenchmarks();
        trendData.push({
          timestamp: currentTime,
          results
        });
      }

      const trendAnalysis = benchmarkSuite.analyzeTrends(trendData);
      
      expect(trendAnalysis.overallTrend).toBeDefined();
      expect(trendAnalysis.operationTrends).toBeDefined();
      expect(trendAnalysis.predictions).toBeDefined();
    });
  });

  describe('Resource Cleanup Validation', () => {
    test('should validate resource cleanup after operations', async () => {
      const initialMemory = 50 * 1024 * 1024;
      let currentMemory = initialMemory;
      
      mockMemoryUsage.mockImplementation(() => ({
        heapUsed: currentMemory,
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }));

      const testCase = createLargeWallNetwork(100);
      
      const cleanupValidation = await benchmarkSuite.validateResourceCleanup(async () => {
        currentMemory += 50 * 1024 * 1024; // Simulate memory usage
        currentTime += 500;
        
        // Simulate cleanup
        setTimeout(() => {
          currentMemory = initialMemory + 5 * 1024 * 1024; // Small residual
        }, 100);
        
        return { success: true, result: testCase };
      });

      expect(cleanupValidation.cleanupEffective).toBe(true);
      expect(cleanupValidation.residualMemory).toBeLessThan(10 * 1024 * 1024);
      expect(cleanupValidation.cleanupTime).toBeGreaterThan(0);
    });
  });

  describe('Performance Threshold Validation', () => {
    test('should validate operations meet performance thresholds', async () => {
      const testCases = [
        createSimpleRectangleWall(10, 0.2),
        createSimpleRectangleWall(20, 0.3)
      ];

      const thresholdValidation = await benchmarkSuite.validatePerformanceThresholds(
        'offset_operation',
        testCases
      );

      expect(thresholdValidation.operationType).toBe('offset_operation');
      expect(thresholdValidation.thresholdsMet).toBeDefined();
      expect(thresholdValidation.violations).toBeDefined();
      expect(thresholdValidation.overallCompliance).toBeGreaterThanOrEqual(0);
    });

    test('should identify threshold violations', async () => {
      // Mock slow operation
      vi.spyOn(offsetEngine, 'offsetCurve').mockImplementation(async (...args) => {
        currentTime += 2000; // Exceed threshold
        return { success: true, leftOffset: null, rightOffset: null, joinType: OffsetJoinType.MITER, warnings: [], fallbackUsed: false };
      });

      const testCases = [createSimpleRectangleWall(10, 0.2)];
      
      const thresholdValidation = await benchmarkSuite.validatePerformanceThresholds(
        'offset_operation',
        testCases
      );

      expect(thresholdValidation.violations.length).toBeGreaterThan(0);
      expect(thresholdValidation.overallCompliance).toBeLessThan(1.0);
    });
  });
});

// Helper functions for creating test data
function createSimpleRectangleWall(length: number, thickness: number): WallSolid {
  const points: BIMPoint[] = [
    { x: 0, y: 0, id: '1', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true },
    { x: length, y: 0, id: '2', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true },
    { x: length, y: 1, id: '3', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true },
    { x: 0, y: 1, id: '4', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true }
  ];

  const baseline = new Curve({
    id: 'baseline-1',
    points,
    type: 'polyline',
    isClosed: true
  });

  return new WallSolid({
    id: 'wall-1',
    baseline,
    thickness,
    wallType: 'Layout' as WallTypeString,
    joinTypes: new Map(),
    intersectionData: [],
    healingHistory: []
  });
}

function createComplexCurveWall(segments: number, thickness: number): WallSolid {
  const points: BIMPoint[] = [];
  const radius = 10;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      id: `point-${i}`,
      tolerance: 0.01,
      creationMethod: 'generated',
      accuracy: 1.0,
      validated: true
    });
  }

  const baseline = new Curve({
    id: 'complex-baseline',
    points,
    type: 'spline',
    isClosed: true
  });

  return new WallSolid({
    id: 'complex-wall',
    baseline,
    thickness,
    wallType: 'Layout' as WallTypeString,
    joinTypes: new Map(),
    intersectionData: [],
    healingHistory: []
  });
}

function createDegenerateWall(): WallSolid {
  const points: BIMPoint[] = [
    { x: 0, y: 0, id: '1', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true },
    { x: 0, y: 0, id: '2', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true } // Duplicate point
  ];

  const baseline = new Curve({
    id: 'degenerate-baseline',
    points,
    type: 'polyline',
    isClosed: false
  });

  return new WallSolid({
    id: 'degenerate-wall',
    baseline,
    thickness: 0.2,
    wallType: 'Layout' as WallTypeString,
    joinTypes: new Map(),
    intersectionData: [],
    healingHistory: []
  });
}

function createSelfIntersectingWall(): WallSolid {
  const points: BIMPoint[] = [
    { x: 0, y: 0, id: '1', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true },
    { x: 10, y: 0, id: '2', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true },
    { x: 0, y: 10, id: '3', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true },
    { x: 10, y: 10, id: '4', tolerance: 0.01, creationMethod: 'manual', accuracy: 1.0, validated: true }
  ];

  const baseline = new Curve({
    id: 'self-intersecting-baseline',
    points,
    type: 'polyline',
    isClosed: true
  });

  return new WallSolid({
    id: 'self-intersecting-wall',
    baseline,
    thickness: 0.2,
    wallType: 'Layout' as WallTypeString,
    joinTypes: new Map(),
    intersectionData: [],
    healingHistory: []
  });
}

function createBooleanTestCase(operation: string, wallCount: number): any {
  const walls = Array.from({ length: wallCount }, (_, i) => 
    createSimpleRectangleWall(5 + i, 0.2)
  );
  
  return {
    operation,
    walls,
    expectedComplexity: wallCount * 10
  };
}

function createComplexIntersectionCase(junctionType: string): any {
  const walls = [];
  
  switch (junctionType) {
    case 't_junction':
      walls.push(createSimpleRectangleWall(20, 0.3));
      walls.push(createSimpleRectangleWall(10, 0.3));
      break;
    case 'l_junction':
      walls.push(createSimpleRectangleWall(15, 0.25));
      walls.push(createSimpleRectangleWall(15, 0.25));
      break;
    case 'cross_junction':
      walls.push(createSimpleRectangleWall(20, 0.3));
      walls.push(createSimpleRectangleWall(20, 0.3));
      walls.push(createSimpleRectangleWall(10, 0.3));
      break;
  }
  
  return {
    operation: 'intersection',
    junctionType,
    walls,
    expectedComplexity: walls.length * 25
  };
}

function createLargeWallNetwork(wallCount: number): WallSolid[] {
  return Array.from({ length: wallCount }, (_, i) => {
    const length = 5 + (i % 20);
    const thickness = 0.2 + (i % 5) * 0.1;
    return createSimpleRectangleWall(length, thickness);
  });
}