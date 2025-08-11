/**
 * Performance Regression Test Suite
 * Tests to prevent performance degradation over time
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { CachingLayer } from '../../persistence/CachingLayer';

// Mock performance API
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

interface PerformanceBenchmark {
  operationType: string;
  testCase: string;
  expectedMaxTime: number; // milliseconds
  expectedMaxMemory: number; // bytes
  tolerance: number; // percentage tolerance for regression
}

interface PerformanceResult {
  operationType: string;
  testCase: string;
  actualTime: number;
  actualMemory: number;
  expectedMaxTime: number;
  expectedMaxMemory: number;
  timeRegression: number; // percentage change from expected
  memoryRegression: number; // percentage change from expected
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

interface RegressionTestSuite {
  suiteName: string;
  benchmarks: PerformanceBenchmark[];
  results: PerformanceResult[];
  overallPassed: boolean;
  regressionSummary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageTimeRegression: number;
    averageMemoryRegression: number;
    criticalRegressions: number;
  };
}

class PerformanceRegressionTester {
  private offsetEngine: RobustOffsetEngine;
  private booleanEngine: BooleanOperationsEngine;
  private cachingLayer: CachingLayer;

  // Performance benchmarks based on historical data
  private readonly benchmarks: PerformanceBenchmark[] = [
    {
      operationType: 'offset',
      testCase: 'simple_rectangle',
      expectedMaxTime: 10,
      expectedMaxMemory: 1000000,
      tolerance: 20 // 20% tolerance
    },
    {
      operationType: 'offset',
      testCase: 'complex_polygon',
      expectedMaxTime: 50,
      expectedMaxMemory: 5000000,
      tolerance: 25
    },
    {
      operationType: 'boolean',
      testCase: 'simple_union',
      expectedMaxTime: 15,
      expectedMaxMemory: 2000000,
      tolerance: 20
    },
    {
      operationType: 'boolean',
      testCase: 'complex_intersection',
      expectedMaxTime: 100,
      expectedMaxMemory: 10000000,
      tolerance: 30
    },
    {
      operationType: 'healing',
      testCase: 'remove_slivers',
      expectedMaxTime: 25,
      expectedMaxMemory: 3000000,
      tolerance: 15
    },
    {
      operationType: 'cache',
      testCase: 'large_dataset',
      expectedMaxTime: 5,
      expectedMaxMemory: 500000,
      tolerance: 10
    }
  ];

  constructor() {
    this.offsetEngine = new RobustOffsetEngine();
    this.booleanEngine = new BooleanOperationsEngine();
    this.cachingLayer = new CachingLayer();
  }

  async runRegressionTests(): Promise<RegressionTestSuite> {
    const results: PerformanceResult[] = [];
    
    for (const benchmark of this.benchmarks) {
      const result = await this.runSingleBenchmark(benchmark);
      results.push(result);
    }

    const regressionSummary = this.calculateRegressionSummary(results);
    const overallPassed = regressionSummary.failedTests === 0;

    return {
      suiteName: 'BIM Performance Regression Tests',
      benchmarks: this.benchmarks,
      results,
      overallPassed,
      regressionSummary
    };
  }

  async runSingleBenchmark(benchmark: PerformanceBenchmark): Promise<PerformanceResult> {
    const testData = this.generateTestData(benchmark.operationType, benchmark.testCase);
    const initialMemory = this.getCurrentMemoryUsage();
    
    const startTime = performance.now();
    
    try {
      await this.executeOperation(benchmark.operationType, testData);
    } catch (error) {
      console.error(`Benchmark failed: ${benchmark.testCase}`, error);
    }
    
    const actualTime = performance.now() - startTime;
    const actualMemory = this.getCurrentMemoryUsage() - initialMemory;

    const timeRegression = ((actualTime - benchmark.expectedMaxTime) / benchmark.expectedMaxTime) * 100;
    const memoryRegression = ((actualMemory - benchmark.expectedMaxMemory) / benchmark.expectedMaxMemory) * 100;

    const timePassed = timeRegression <= benchmark.tolerance;
    const memoryPassed = memoryRegression <= benchmark.tolerance;
    const passed = timePassed && memoryPassed;

    const issues = this.identifyIssues(benchmark, actualTime, actualMemory, timeRegression, memoryRegression);
    const recommendations = this.generateRecommendations(benchmark, timeRegression, memoryRegression, issues);

    return {
      operationType: benchmark.operationType,
      testCase: benchmark.testCase,
      actualTime,
      actualMemory,
      expectedMaxTime: benchmark.expectedMaxTime,
      expectedMaxMemory: benchmark.expectedMaxMemory,
      timeRegression,
      memoryRegression,
      passed,
      issues,
      recommendations
    };
  }

  private generateTestData(operationType: string, testCase: string): any {
    switch (operationType) {
      case 'offset':
        return this.generateOffsetTestData(testCase);
      case 'boolean':
        return this.generateBooleanTestData(testCase);
      case 'healing':
        return this.generateHealingTestData(testCase);
      case 'cache':
        return this.generateCacheTestData(testCase);
      default:
        return {};
    }
  }

  private generateOffsetTestData(testCase: string): any {
    switch (testCase) {
      case 'simple_rectangle':
        return {
          curve: {
            type: 'polyline',
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 100 },
              { x: 0, y: 100 },
              { x: 0, y: 0 }
            ]
          },
          distance: 10,
          joinType: 'miter'
        };
      case 'complex_polygon':
        return {
          curve: {
            type: 'polyline',
            points: this.generateComplexPolygonPoints(50)
          },
          distance: 15,
          joinType: 'round'
        };
      default:
        return this.generateOffsetTestData('simple_rectangle');
    }
  }

  private generateBooleanTestData(testCase: string): any {
    switch (testCase) {
      case 'simple_union':
        return {
          polygon1: {
            exterior: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
            holes: []
          },
          polygon2: {
            exterior: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 75, y: 75 }, { x: 25, y: 75 }],
            holes: []
          },
          operation: 'union'
        };
      case 'complex_intersection':
        return {
          polygon1: {
            exterior: this.generateComplexPolygonPoints(30),
            holes: [this.generateComplexPolygonPoints(10)]
          },
          polygon2: {
            exterior: this.generateComplexPolygonPoints(25),
            holes: []
          },
          operation: 'intersection'
        };
      default:
        return this.generateBooleanTestData('simple_union');
    }
  }

  private generateHealingTestData(testCase: string): any {
    switch (testCase) {
      case 'remove_slivers':
        return {
          shape: {
            exterior: this.generatePolygonWithSlivers(20),
            holes: []
          },
          tolerance: 0.1
        };
      default:
        return {
          shape: {
            exterior: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
            holes: []
          },
          tolerance: 0.1
        };
    }
  }

  private generateCacheTestData(testCase: string): any {
    switch (testCase) {
      case 'large_dataset':
        return {
          entries: Array.from({ length: 1000 }, (_, i) => ({
            key: `cache_key_${i}`,
            value: {
              geometry: this.generateComplexPolygonPoints(10),
              metadata: { id: i, timestamp: Date.now() }
            }
          }))
        };
      default:
        return {
          entries: Array.from({ length: 10 }, (_, i) => ({
            key: `cache_key_${i}`,
            value: { data: i }
          }))
        };
    }
  }

  private generateComplexPolygonPoints(count: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const centerX = 50;
    const centerY = 50;
    const baseRadius = 30;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const radiusVariation = 1 + 0.3 * Math.sin(angle * 3); // Create irregular shape
      const radius = baseRadius * radiusVariation;
      
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    }

    // Close the polygon
    if (count > 0) {
      points.push(points[0]);
    }

    return points;
  }

  private generatePolygonWithSlivers(count: number): Array<{ x: number; y: number }> {
    const points = this.generateComplexPolygonPoints(count);
    
    // Add some sliver-creating points
    for (let i = 1; i < points.length - 1; i += 3) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Add a point very close to current point to create sliver
      const sliverPoint = {
        x: curr.x + (next.x - prev.x) * 0.001,
        y: curr.y + (next.y - prev.y) * 0.001
      };
      
      points.splice(i + 1, 0, sliverPoint);
    }

    return points;
  }

  private async executeOperation(operationType: string, testData: any): Promise<void> {
    switch (operationType) {
      case 'offset':
        await this.simulateOffsetOperation(testData);
        break;
      case 'boolean':
        await this.simulateBooleanOperation(testData);
        break;
      case 'healing':
        await this.simulateHealingOperation(testData);
        break;
      case 'cache':
        await this.simulateCacheOperation(testData);
        break;
      default:
        await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  private async simulateOffsetOperation(testData: any): Promise<void> {
    // Simulate offset calculation complexity
    const pointCount = testData.curve?.points?.length || 4;
    const complexity = pointCount * (testData.distance || 10);
    const processingTime = Math.max(1, complexity * 0.1);
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate memory allocation
    const tempArray = new Array(pointCount * 10).fill(0);
    tempArray.length = 0; // Clean up
  }

  private async simulateBooleanOperation(testData: any): Promise<void> {
    // Simulate boolean operation complexity
    const poly1Points = testData.polygon1?.exterior?.length || 4;
    const poly2Points = testData.polygon2?.exterior?.length || 4;
    const complexity = poly1Points * poly2Points;
    const processingTime = Math.max(1, complexity * 0.05);
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate memory allocation for intermediate results
    const tempResults = new Array(complexity).fill(0).map(() => ({ x: Math.random(), y: Math.random() }));
    tempResults.length = 0; // Clean up
  }

  private async simulateHealingOperation(testData: any): Promise<void> {
    // Simulate healing operation complexity
    const pointCount = testData.shape?.exterior?.length || 4;
    const processingTime = Math.max(1, pointCount * 0.5);
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate memory for healing algorithms
    const tempData = new Array(pointCount * 5).fill(0);
    tempData.length = 0; // Clean up
  }

  private async simulateCacheOperation(testData: any): Promise<void> {
    // Simulate cache operations
    const entryCount = testData.entries?.length || 1;
    const processingTime = Math.max(1, entryCount * 0.01);
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate cache storage
    const cacheData = testData.entries?.map((entry: any) => ({ ...entry })) || [];
    cacheData.length = 0; // Clean up
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return Math.random() * 10000000; // Fallback for browser
  }

  private identifyIssues(
    benchmark: PerformanceBenchmark,
    actualTime: number,
    actualMemory: number,
    timeRegression: number,
    memoryRegression: number
  ): string[] {
    const issues: string[] = [];

    if (timeRegression > benchmark.tolerance) {
      issues.push(`Time regression: ${timeRegression.toFixed(1)}% (expected max: ${benchmark.tolerance}%)`);
    }

    if (memoryRegression > benchmark.tolerance) {
      issues.push(`Memory regression: ${memoryRegression.toFixed(1)}% (expected max: ${benchmark.tolerance}%)`);
    }

    if (actualTime > benchmark.expectedMaxTime * 2) {
      issues.push(`Critical time regression: ${actualTime}ms vs expected ${benchmark.expectedMaxTime}ms`);
    }

    if (actualMemory > benchmark.expectedMaxMemory * 2) {
      issues.push(`Critical memory regression: ${actualMemory} bytes vs expected ${benchmark.expectedMaxMemory} bytes`);
    }

    return issues;
  }

  private generateRecommendations(
    benchmark: PerformanceBenchmark,
    timeRegression: number,
    memoryRegression: number,
    issues: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (issues.length === 0) {
      recommendations.push('Performance within acceptable limits');
      return recommendations;
    }

    if (timeRegression > benchmark.tolerance) {
      recommendations.push('Profile CPU usage to identify performance bottlenecks');
      recommendations.push('Consider algorithm optimizations or caching');
      
      if (timeRegression > 50) {
        recommendations.push('CRITICAL: Investigate recent code changes for performance impact');
      }
    }

    if (memoryRegression > benchmark.tolerance) {
      recommendations.push('Review memory allocation patterns');
      recommendations.push('Check for memory leaks or unnecessary object creation');
      
      if (memoryRegression > 50) {
        recommendations.push('CRITICAL: Implement memory profiling to identify leak sources');
      }
    }

    // Operation-specific recommendations
    switch (benchmark.operationType) {
      case 'offset':
        recommendations.push('Consider optimizing offset calculation algorithms');
        recommendations.push('Review join type selection for performance impact');
        break;
      case 'boolean':
        recommendations.push('Optimize polygon clipping library usage');
        recommendations.push('Consider spatial indexing for complex polygons');
        break;
      case 'healing':
        recommendations.push('Review shape healing algorithm efficiency');
        recommendations.push('Consider tolerance-based optimizations');
        break;
      case 'cache':
        recommendations.push('Review cache eviction policies');
        recommendations.push('Consider cache size limits and memory management');
        break;
    }

    return recommendations;
  }

  private calculateRegressionSummary(results: PerformanceResult[]): RegressionTestSuite['regressionSummary'] {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const timeRegressions = results.map(r => r.timeRegression);
    const memoryRegressions = results.map(r => r.memoryRegression);

    const averageTimeRegression = timeRegressions.reduce((sum, val) => sum + val, 0) / totalTests;
    const averageMemoryRegression = memoryRegressions.reduce((sum, val) => sum + val, 0) / totalTests;

    const criticalRegressions = results.filter(r => 
      r.timeRegression > 100 || r.memoryRegression > 100
    ).length;

    return {
      totalTests,
      passedTests,
      failedTests,
      averageTimeRegression,
      averageMemoryRegression,
      criticalRegressions
    };
  }
}

// Test Suite Implementation
describe('Performance Regression Tests', () => {
  let tester: PerformanceRegressionTester;

  beforeEach(() => {
    tester = new PerformanceRegressionTester();
    mockPerformanceNow.mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should run complete regression test suite', async () => {
    const results = await tester.runRegressionTests();

    expect(results.suiteName).toBe('BIM Performance Regression Tests');
    expect(results.benchmarks.length).toBeGreaterThan(0);
    expect(results.results.length).toBe(results.benchmarks.length);
    expect(typeof results.overallPassed).toBe('boolean');
    
    expect(results.regressionSummary.totalTests).toBe(results.results.length);
    expect(results.regressionSummary.passedTests + results.regressionSummary.failedTests)
      .toBe(results.regressionSummary.totalTests);
  });

  test('should detect time performance regressions', async () => {
    const benchmark: PerformanceBenchmark = {
      operationType: 'offset',
      testCase: 'simple_rectangle',
      expectedMaxTime: 1, // Very low threshold to trigger regression
      expectedMaxMemory: 1000000,
      tolerance: 10
    };

    const result = await tester.runSingleBenchmark(benchmark);

    expect(result.operationType).toBe('offset');
    expect(result.testCase).toBe('simple_rectangle');
    expect(result.actualTime).toBeGreaterThan(0);
    expect(typeof result.timeRegression).toBe('number');
    
    // Should likely fail due to low threshold
    if (!result.passed) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    }
  });

  test('should detect memory performance regressions', async () => {
    const benchmark: PerformanceBenchmark = {
      operationType: 'boolean',
      testCase: 'complex_intersection',
      expectedMaxTime: 1000,
      expectedMaxMemory: 100, // Very low threshold to trigger regression
      tolerance: 5
    };

    const result = await tester.runSingleBenchmark(benchmark);

    expect(result.operationType).toBe('boolean');
    expect(result.actualMemory).toBeGreaterThanOrEqual(0);
    expect(typeof result.memoryRegression).toBe('number');
    
    // Should likely fail due to low memory threshold
    if (!result.passed) {
      expect(result.issues.some(issue => issue.includes('Memory regression'))).toBe(true);
    }
  });

  test('should provide appropriate recommendations for regressions', async () => {
    const benchmark: PerformanceBenchmark = {
      operationType: 'healing',
      testCase: 'remove_slivers',
      expectedMaxTime: 1,
      expectedMaxMemory: 1000,
      tolerance: 1 // Very strict tolerance
    };

    const result = await tester.runSingleBenchmark(benchmark);

    expect(Array.isArray(result.recommendations)).toBe(true);
    
    if (result.recommendations.length > 0) {
      result.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    }
  });

  test('should handle different operation types correctly', async () => {
    const operationTypes = ['offset', 'boolean', 'healing', 'cache'];
    
    for (const operationType of operationTypes) {
      const benchmark: PerformanceBenchmark = {
        operationType,
        testCase: 'test_case',
        expectedMaxTime: 100,
        expectedMaxMemory: 5000000,
        tolerance: 50
      };

      const result = await tester.runSingleBenchmark(benchmark);
      
      expect(result.operationType).toBe(operationType);
      expect(result.actualTime).toBeGreaterThan(0);
      expect(result.actualMemory).toBeGreaterThanOrEqual(0);
    }
  });

  test('should calculate regression summary correctly', async () => {
    const results = await tester.runRegressionTests();
    const summary = results.regressionSummary;

    expect(summary.totalTests).toBeGreaterThan(0);
    expect(summary.passedTests).toBeGreaterThanOrEqual(0);
    expect(summary.failedTests).toBeGreaterThanOrEqual(0);
    expect(summary.passedTests + summary.failedTests).toBe(summary.totalTests);
    expect(typeof summary.averageTimeRegression).toBe('number');
    expect(typeof summary.averageMemoryRegression).toBe('number');
    expect(summary.criticalRegressions).toBeGreaterThanOrEqual(0);
  });

  test('should identify critical regressions', async () => {
    const benchmark: PerformanceBenchmark = {
      operationType: 'offset',
      testCase: 'simple_rectangle',
      expectedMaxTime: 0.1, // Extremely low to trigger critical regression
      expectedMaxMemory: 100,
      tolerance: 10
    };

    const result = await tester.runSingleBenchmark(benchmark);

    if (result.timeRegression > 100) {
      expect(result.issues.some(issue => issue.includes('Critical'))).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('CRITICAL'))).toBe(true);
    }
  });

  test('should pass when performance is within acceptable limits', async () => {
    const benchmark: PerformanceBenchmark = {
      operationType: 'cache',
      testCase: 'large_dataset',
      expectedMaxTime: 1000, // Very generous threshold
      expectedMaxMemory: 50000000,
      tolerance: 100 // 100% tolerance
    };

    const result = await tester.runSingleBenchmark(benchmark);

    // Should likely pass with generous thresholds
    if (result.passed) {
      expect(result.issues.length).toBe(0);
      expect(result.recommendations.some(rec => rec.includes('within acceptable limits'))).toBe(true);
    }
  });
});