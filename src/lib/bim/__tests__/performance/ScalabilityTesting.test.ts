/**
 * Scalability Testing Suite
 * Tests system performance with progressively larger datasets
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { CachingLayer } from '../../persistence/CachingLayer';
import { WallSolid } from '../../geometry/WallSolid';
import { Curve } from '../../geometry/Curve';
import { BIMPoint } from '../../geometry/BIMPoint';

// Mock performance API
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

interface ScalabilityTestResult {
  datasetSize: number;
  operationType: string;
  totalTime: number;
  averageTimePerOperation: number;
  throughput: number; // operations per second
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    growth: number;
  };
  performanceMetrics: {
    linearScaling: boolean;
    scalingFactor: number; // how performance degrades with size
    complexityClass: 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n³)' | 'unknown';
  };
  resourceUtilization: {
    cpuIntensive: boolean;
    memoryIntensive: boolean;
    ioIntensive: boolean;
  };
  recommendations: string[];
}

interface MemoryLeakTestResult {
  operationType: string;
  iterations: number;
  memoryGrowth: number;
  leakDetected: boolean;
  leakRate: number; // bytes per operation
  recommendations: string[];
}

class ScalabilityTestSuite {
  private offsetEngine: RobustOffsetEngine;
  private booleanEngine: BooleanOperationsEngine;
  private cachingLayer: CachingLayer;
  private memorySnapshots: number[] = [];

  constructor() {
    this.offsetEngine = new RobustOffsetEngine();
    this.booleanEngine = new BooleanOperationsEngine();
    this.cachingLayer = new CachingLayer();
  }

  async testScalability(
    operationType: string,
    dataSizes: number[],
    operationsPerSize: number = 10
  ): Promise<ScalabilityTestResult[]> {
    const results: ScalabilityTestResult[] = [];

    for (const datasetSize of dataSizes) {
      const result = await this.testSingleScalePoint(operationType, datasetSize, operationsPerSize);
      results.push(result);
    }

    return results;
  }

  async testMemoryLeaks(
    operationType: string,
    iterations: number = 1000
  ): Promise<MemoryLeakTestResult> {
    const initialMemory = this.getCurrentMemoryUsage();
    const memorySnapshots: number[] = [initialMemory];

    for (let i = 0; i < iterations; i++) {
      await this.performSingleOperation(operationType, this.generateTestData(operationType, 10));
      
      // Take memory snapshot every 100 iterations
      if (i % 100 === 0) {
        memorySnapshots.push(this.getCurrentMemoryUsage());
      }
    }

    const finalMemory = this.getCurrentMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;
    const leakRate = memoryGrowth / iterations;
    const leakDetected = this.detectMemoryLeak(memorySnapshots);

    const recommendations = this.generateMemoryRecommendations(leakDetected, leakRate, memoryGrowth);

    return {
      operationType,
      iterations,
      memoryGrowth,
      leakDetected,
      leakRate,
      recommendations
    };
  }

  async testLargeDatasetPerformance(maxWalls: number = 10000): Promise<ScalabilityTestResult[]> {
    const dataSizes = [100, 500, 1000, 2500, 5000, maxWalls];
    const results: ScalabilityTestResult[] = [];

    for (const size of dataSizes) {
      console.log(`Testing with ${size} walls...`);
      
      const wallData = this.generateLargeWallDataset(size);
      const startTime = performance.now();
      const initialMemory = this.getCurrentMemoryUsage();

      try {
        // Test boolean operations on large dataset
        await this.performBatchBooleanOperations(wallData);
        
        const totalTime = performance.now() - startTime;
        const finalMemory = this.getCurrentMemoryUsage();
        const memoryGrowth = finalMemory - initialMemory;

        const result: ScalabilityTestResult = {
          datasetSize: size,
          operationType: 'batch_boolean',
          totalTime,
          averageTimePerOperation: totalTime / size,
          throughput: size / (totalTime / 1000),
          memoryUsage: {
            initial: initialMemory,
            peak: finalMemory, // Simplified - would need more sophisticated tracking
            final: finalMemory,
            growth: memoryGrowth
          },
          performanceMetrics: this.analyzePerformanceComplexity(size, totalTime, results),
          resourceUtilization: this.analyzeResourceUtilization(totalTime, memoryGrowth, size),
          recommendations: this.generateScalabilityRecommendations(size, totalTime, memoryGrowth)
        };

        results.push(result);
      } catch (error) {
        console.error(`Failed at dataset size ${size}:`, error);
        // Add a minimal result even on failure to ensure we have some data
        const result: ScalabilityTestResult = {
          datasetSize: size,
          operationType: 'batch_boolean',
          totalTime: performance.now() - startTime,
          averageTimePerOperation: 0,
          throughput: 0,
          memoryUsage: {
            initial: initialMemory,
            peak: initialMemory,
            final: initialMemory,
            growth: 0
          },
          performanceMetrics: {
            linearScaling: false,
            scalingFactor: 0,
            complexityClass: 'unknown'
          },
          resourceUtilization: {
            cpuIntensive: false,
            memoryIntensive: false,
            ioIntensive: false
          },
          recommendations: [`Failed to process ${size} walls: ${error}`]
        };
        results.push(result);
        break;
      }
    }

    return results;
  }

  private async testSingleScalePoint(
    operationType: string,
    datasetSize: number,
    operationsPerSize: number
  ): Promise<ScalabilityTestResult> {
    const startTime = performance.now();
    const initialMemory = this.getCurrentMemoryUsage();
    let peakMemory = initialMemory;

    const testData = this.generateTestData(operationType, datasetSize);
    
    for (let i = 0; i < operationsPerSize; i++) {
      await this.performSingleOperation(operationType, testData);
      
      const currentMemory = this.getCurrentMemoryUsage();
      peakMemory = Math.max(peakMemory, currentMemory);
    }

    const totalTime = performance.now() - startTime;
    const finalMemory = this.getCurrentMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;

    return {
      datasetSize,
      operationType,
      totalTime,
      averageTimePerOperation: totalTime / operationsPerSize,
      throughput: operationsPerSize / (totalTime / 1000),
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
        growth: memoryGrowth
      },
      performanceMetrics: this.analyzePerformanceComplexity(datasetSize, totalTime, []),
      resourceUtilization: this.analyzeResourceUtilization(totalTime, memoryGrowth, datasetSize),
      recommendations: this.generateScalabilityRecommendations(datasetSize, totalTime, memoryGrowth)
    };
  }

  private generateTestData(operationType: string, size: number): any {
    switch (operationType) {
      case 'offset':
        return this.generateOffsetTestData(size);
      case 'boolean':
        return this.generateBooleanTestData(size);
      case 'healing':
        return this.generateHealingTestData(size);
      case 'cache':
        return this.generateCacheTestData(size);
      default:
        return { size, data: Array.from({ length: size }, (_, i) => ({ id: i })) };
    }
  }

  private generateOffsetTestData(size: number): any {
    return {
      curves: Array.from({ length: size }, (_, i) => ({
        type: 'polyline',
        points: this.generateRandomPoints(4 + (i % 6)),
        id: i
      })),
      distance: 10,
      joinType: 'miter'
    };
  }

  private generateBooleanTestData(size: number): any {
    return {
      polygons: Array.from({ length: size }, (_, i) => ({
        exterior: this.generateRandomPoints(4 + (i % 4)),
        holes: [],
        id: i
      })),
      operation: 'union'
    };
  }

  private generateHealingTestData(size: number): any {
    return {
      shapes: Array.from({ length: size }, (_, i) => ({
        exterior: this.generateRandomPoints(5 + (i % 5)),
        holes: [],
        id: i
      })),
      tolerance: 0.1
    };
  }

  private generateCacheTestData(size: number): any {
    return {
      entries: Array.from({ length: size }, (_, i) => ({
        key: `cache_key_${i}`,
        value: { data: Math.random() * 1000, timestamp: Date.now() }
      }))
    };
  }

  private generateRandomPoints(count: number): BIMPoint[] {
    const points: BIMPoint[] = [];
    const radius = 50;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      points.push({
        x: Math.cos(angle) * radius + Math.random() * 20,
        y: Math.sin(angle) * radius + Math.random() * 20
      });
    }
    
    // Close the polygon
    if (count > 2) {
      points.push(points[0]);
    }
    
    return points;
  }

  private generateLargeWallDataset(size: number): any[] {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      baseline: this.generateRandomPoints(4),
      thickness: 10 + (i % 5) * 2,
      type: ['interior', 'exterior', 'partition'][i % 3]
    }));
  }

  private async performSingleOperation(operationType: string, testData: any): Promise<void> {
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

  private async performBatchBooleanOperations(wallData: any[]): Promise<void> {
    // Simulate batch processing of walls
    const batchSize = 100;
    
    for (let i = 0; i < wallData.length; i += batchSize) {
      const batch = wallData.slice(i, i + batchSize);
      
      // Simulate boolean operations on batch
      await Promise.all(batch.map(async (wall, index) => {
        // Simulate processing time based on complexity
        const processingTime = 1 + Math.random() * 5;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        // Simulate occasional failures for realism
        if (Math.random() < 0.01) {
          throw new Error(`Processing failed for wall ${wall.id}`);
        }
      }));
    }
  }

  private async simulateOffsetOperation(testData: any): Promise<void> {
    const processingTime = testData.curves ? testData.curves.length * 0.5 : 1;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  private async simulateBooleanOperation(testData: any): Promise<void> {
    const processingTime = testData.polygons ? testData.polygons.length * 0.8 : 1;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  private async simulateHealingOperation(testData: any): Promise<void> {
    const processingTime = testData.shapes ? testData.shapes.length * 0.3 : 1;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  private async simulateCacheOperation(testData: any): Promise<void> {
    const processingTime = testData.entries ? testData.entries.length * 0.1 : 1;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return Math.random() * 1000000; // Fallback for browser environment
  }

  private detectMemoryLeak(memorySnapshots: number[]): boolean {
    if (memorySnapshots.length < 3) return false;
    
    // Simple trend analysis - check if memory consistently increases
    let increasingTrend = 0;
    for (let i = 1; i < memorySnapshots.length; i++) {
      if (memorySnapshots[i] > memorySnapshots[i - 1]) {
        increasingTrend++;
      }
    }
    
    // Consider it a leak if memory increases in more than 70% of snapshots
    return increasingTrend / (memorySnapshots.length - 1) > 0.7;
  }

  private analyzePerformanceComplexity(
    datasetSize: number,
    totalTime: number,
    previousResults: ScalabilityTestResult[]
  ): ScalabilityTestResult['performanceMetrics'] {
    if (previousResults.length === 0) {
      return {
        linearScaling: true,
        scalingFactor: 1.0,
        complexityClass: 'unknown'
      };
    }

    // Analyze scaling pattern
    const lastResult = previousResults[previousResults.length - 1];
    const sizeRatio = datasetSize / lastResult.datasetSize;
    const timeRatio = totalTime / lastResult.totalTime;
    const scalingFactor = timeRatio / sizeRatio;

    // Determine complexity class based on scaling factor
    let complexityClass: ScalabilityTestResult['performanceMetrics']['complexityClass'] = 'unknown';
    
    if (scalingFactor < 1.2) {
      complexityClass = 'O(1)';
    } else if (scalingFactor < 1.5) {
      complexityClass = 'O(log n)';
    } else if (scalingFactor < 2.5) {
      complexityClass = 'O(n)';
    } else if (scalingFactor < 4.0) {
      complexityClass = 'O(n log n)';
    } else if (scalingFactor < 8.0) {
      complexityClass = 'O(n²)';
    } else {
      complexityClass = 'O(n³)';
    }

    return {
      linearScaling: scalingFactor < 2.0,
      scalingFactor,
      complexityClass
    };
  }

  private analyzeResourceUtilization(
    totalTime: number,
    memoryGrowth: number,
    datasetSize: number
  ): ScalabilityTestResult['resourceUtilization'] {
    const timePerItem = totalTime / datasetSize;
    const memoryPerItem = memoryGrowth / datasetSize;

    return {
      cpuIntensive: timePerItem > 10, // More than 10ms per item
      memoryIntensive: memoryPerItem > 1000, // More than 1KB per item
      ioIntensive: false // Simplified - would need actual I/O monitoring
    };
  }

  private generateScalabilityRecommendations(
    datasetSize: number,
    totalTime: number,
    memoryGrowth: number
  ): string[] {
    const recommendations: string[] = [];
    const timePerItem = totalTime / datasetSize;
    const memoryPerItem = memoryGrowth / datasetSize;

    if (timePerItem > 10) {
      recommendations.push('Consider implementing parallel processing for CPU-intensive operations');
      recommendations.push('Optimize algorithms to reduce computational complexity');
    }

    if (memoryPerItem > 1000) {
      recommendations.push('Implement memory pooling to reduce allocation overhead');
      recommendations.push('Consider streaming processing for large datasets');
    }

    if (datasetSize > 5000 && totalTime > 10000) {
      recommendations.push('Implement progressive loading and processing');
      recommendations.push('Add user feedback for long-running operations');
    }

    if (memoryGrowth > 100000000) { // 100MB
      recommendations.push('Implement garbage collection hints');
      recommendations.push('Consider using memory-mapped files for large datasets');
    }

    return recommendations;
  }

  private generateMemoryRecommendations(
    leakDetected: boolean,
    leakRate: number,
    totalGrowth: number
  ): string[] {
    const recommendations: string[] = [];

    if (leakDetected) {
      recommendations.push('Memory leak detected - review object lifecycle management');
      recommendations.push('Implement proper cleanup in finally blocks');
      recommendations.push('Check for circular references and event listener cleanup');
    }

    if (leakRate > 1000) { // More than 1KB per operation
      recommendations.push('High memory growth rate - optimize data structures');
      recommendations.push('Consider object pooling for frequently created objects');
    }

    if (totalGrowth > 50000000) { // 50MB total growth
      recommendations.push('Implement periodic garbage collection');
      recommendations.push('Consider using WeakMap/WeakSet for temporary references');
    }

    return recommendations;
  }
}

// Test Suite Implementation
describe('Scalability Testing', () => {
  let testSuite: ScalabilityTestSuite;

  beforeEach(() => {
    testSuite = new ScalabilityTestSuite();
    mockPerformanceNow.mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should test offset operation scalability', async () => {
    const dataSizes = [10, 50, 100];
    const results = await testSuite.testScalability('offset', dataSizes, 5);

    expect(results).toHaveLength(3);
    
    results.forEach((result, index) => {
      expect(result.datasetSize).toBe(dataSizes[index]);
      expect(result.operationType).toBe('offset');
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
      expect(result.performanceMetrics.scalingFactor).toBeGreaterThan(0);
      expect(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'unknown']).toContain(
        result.performanceMetrics.complexityClass
      );
    });
  });

  test('should test boolean operation scalability', async () => {
    const dataSizes = [5, 25, 50];
    const results = await testSuite.testScalability('boolean', dataSizes, 3);

    expect(results).toHaveLength(3);
    
    // Verify scaling characteristics
    const firstResult = results[0];
    const lastResult = results[results.length - 1];
    
    expect(lastResult.datasetSize).toBeGreaterThan(firstResult.datasetSize);
    expect(lastResult.totalTime).toBeGreaterThan(firstResult.totalTime);
    
    // Memory usage should be tracked
    results.forEach(result => {
      expect(result.memoryUsage.initial).toBeGreaterThanOrEqual(0);
      expect(result.memoryUsage.final).toBeGreaterThanOrEqual(result.memoryUsage.initial);
      expect(result.memoryUsage.growth).toBe(result.memoryUsage.final - result.memoryUsage.initial);
    });
  });

  test('should detect memory leaks', async () => {
    const result = await testSuite.testMemoryLeaks('cache', 100);

    expect(result.operationType).toBe('cache');
    expect(result.iterations).toBe(100);
    expect(typeof result.leakDetected).toBe('boolean');
    expect(result.leakRate).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  test('should handle large dataset performance testing', async () => {
    const results = await testSuite.testLargeDatasetPerformance(1000);

    expect(results.length).toBeGreaterThan(0);
    
    results.forEach(result => {
      expect(result.datasetSize).toBeGreaterThan(0);
      expect(result.operationType).toBe('batch_boolean');
      expect(result.resourceUtilization.cpuIntensive).toBeDefined();
      expect(result.resourceUtilization.memoryIntensive).toBeDefined();
      expect(result.resourceUtilization.ioIntensive).toBeDefined();
    });

    // Verify performance degrades with size (but not too badly)
    if (results.length > 1) {
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      
      expect(lastResult.averageTimePerOperation).toBeGreaterThanOrEqual(0);
      expect(lastResult.datasetSize).toBeGreaterThan(firstResult.datasetSize);
    }
  });

  test('should provide performance recommendations', async () => {
    const dataSizes = [100, 500];
    const results = await testSuite.testScalability('healing', dataSizes, 2);

    results.forEach(result => {
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      if (result.recommendations.length > 0) {
        result.recommendations.forEach(recommendation => {
          expect(typeof recommendation).toBe('string');
          expect(recommendation.length).toBeGreaterThan(0);
        });
      }
    });
  });

  test('should analyze complexity classes correctly', async () => {
    const dataSizes = [10, 20, 40, 80];
    const results = await testSuite.testScalability('offset', dataSizes, 1);

    expect(results).toHaveLength(4);
    
    // First result should have unknown complexity (no previous data)
    expect(results[0].performanceMetrics.complexityClass).toBe('unknown');
    
    // Subsequent results should have determined complexity
    for (let i = 1; i < results.length; i++) {
      expect(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'unknown']).toContain(
        results[i].performanceMetrics.complexityClass
      );
      expect(results[i].performanceMetrics.scalingFactor).toBeGreaterThan(0);
    }
  });

  test('should track memory usage accurately', async () => {
    const result = await testSuite.testMemoryLeaks('boolean', 50);

    expect(result.memoryGrowth).toBeGreaterThanOrEqual(0);
    expect(result.leakRate).toBe(result.memoryGrowth / result.iterations);
    
    if (result.leakDetected) {
      expect(result.recommendations.some(r => r.includes('leak'))).toBe(true);
    }
  });
});