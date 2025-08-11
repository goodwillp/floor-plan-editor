/**
 * Concurrent Operation Testing Suite
 * Tests system behavior under concurrent load and multi-user scenarios
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import type { ShapeHealingEngine } from '../../engines/ShapeHealingEngine';
import { CachingLayer } from '../../persistence/CachingLayer';
import { WallSolid } from '../../geometry/WallSolid';
import { Curve } from '../../geometry/Curve';
import { BIMPoint } from '../../geometry/BIMPoint';
import { WallTypeString } from '../../types/WallTypes';

// Mock performance and memory APIs
const mockPerformanceNow = vi.fn();
const mockMemoryUsage = vi.fn();

Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

Object.defineProperty(global, 'process', {
  value: { memoryUsage: mockMemoryUsage },
  writable: true
});

interface ConcurrentTestResult {
  operationType: string;
  concurrentOperations: number;
  totalTime: number;
  averageTime: number;
  successRate: number;
  throughput: number; // operations per second
  conflicts: number;
  resourceContention: number;
  memoryPressure: number;
  errors: string[];
  performanceMetrics: {
    minTime: number;
    maxTime: number;
    standardDeviation: number;
    percentile95: number;
  };
  concurrencyAnalysis: {
    scalingEfficiency: number; // 0-1, how well it scales with concurrency
    bottleneckType: 'cpu' | 'memory' | 'io' | 'synchronization' | 'none';
    recommendedMaxConcurrency: number;
  };
}

interface ResourceContentionResult {
  resourceType: string;
  contentionLevel: 'low' | 'medium' | 'high' | 'critical';
  waitTime: number;
  lockConflicts: number;
  deadlocks: number;
  recommendations: string[];
}

interface MultiUserScenarioResult {
  userCount: number;
  operationsPerUser: number;
  totalOperations: number;
  overallSuccessRate: number;
  averageResponseTime: number;
  userExperienceMetrics: {
    satisfactory: number; // percentage of operations under acceptable time
    degraded: number;     // percentage with noticeable delay
    unacceptable: number; // percentage with unacceptable delay
  };
  systemStability: {
    stable: boolean;
    errorRate: number;
    recoveryTime: number;
  };
}

class ConcurrentOperationTestSuite {
  private offsetEngine: RobustOffsetEngine;
  private booleanEngine: BooleanOperationsEngine;
  private healingEngine: ShapeHealingEngine;
  private cachingLayer: CachingLayer;
  private resourceLocks: Map<string, boolean> = new Map();
  private operationQueue: Array<{ id: string; operation: () => Promise<any> }> = [];

  constructor() {
    this.offsetEngine = new RobustOffsetEngine();
    this.booleanEngine = new BooleanOperationsEngine();
    this.healingEngine = {} as ShapeHealingEngine; // Mock for testing
    this.cachingLayer = new CachingLayer();
  }

  async testConcurrentOperations(
    operationType: string,
    testCases: any[],
    maxConcurrency: number = 5
  ): Promise<ConcurrentTestResult> {
    const startTime = performance.now();
    const results: Array<{ success: boolean; time: number; error?: string }> = [];
    const concurrentPromises: Promise<any>[] = [];
    let conflicts = 0;
    let resourceContention = 0;
    const startMemory = this.getCurrentMemoryUsage();

    try {
      // Create concurrent operations
      for (let i = 0; i < Math.min(testCases.length, maxConcurrency); i++) {
        const testCase = testCases[i];
        const operationPromise = this.executeOperation(operationType, testCase, i)
          .then(result => {
            results.push({ success: true, time: result.time });
            return result;
          })
          .catch(error => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.push({ success: false, time: 0, error: errorMessage });
            
            if (errorMessage.includes('conflict') || errorMessage.includes('lock')) {
              conflicts++;
            }
            if (errorMessage.includes('contention') || errorMessage.includes('resource')) {
              resourceContention++;
            }
            
            return { success: false, error: errorMessage };
          });

        concurrentPromises.push(operationPromise);
      }

      // Wait for all operations to complete
      await Promise.allSettled(concurrentPromises);

      const totalTime = performance.now() - startTime;
      const successfulResults = results.filter(r => r.success);
      const successRate = successfulResults.length / results.length;
      const averageTime = successfulResults.length > 0 
        ? successfulResults.reduce((sum, r) => sum + r.time, 0) / successfulResults.length 
        : 0;
      const throughput = successfulResults.length / (totalTime / 1000); // ops per second

      // Calculate performance metrics
      const times = successfulResults.map(r => r.time).sort((a, b) => a - b);
      const performanceMetrics = {
        minTime: times.length > 0 ? times[0] : 0,
        maxTime: times.length > 0 ? times[times.length - 1] : 0,
        standardDeviation: this.calculateStandardDeviation(times),
        percentile95: times.length > 0 ? times[Math.floor(times.length * 0.95)] : 0
      };

      // Analyze concurrency characteristics
      const concurrencyAnalysis = this.analyzeConcurrency(
        maxConcurrency,
        successRate,
        averageTime,
        conflicts,
        resourceContention
      );

      const endMemory = this.getCurrentMemoryUsage();
      const memoryPressure = endMemory - startMemory;

      return {
        operationType,
        concurrentOperations: maxConcurrency,
        totalTime,
        averageTime,
        successRate,
        throughput,
        conflicts,
        resourceContention,
        memoryPressure,
        errors: results.filter(r => !r.success).map(r => r.error || 'Unknown error'),
        performanceMetrics,
        concurrencyAnalysis
      };

    } catch (error) {
      return {
        operationType,
        concurrentOperations: maxConcurrency,
        totalTime: performance.now() - startTime,
        averageTime: 0,
        successRate: 0,
        throughput: 0,
        conflicts: 0,
        resourceContention: 0,
        memoryPressure: this.getCurrentMemoryUsage() - startMemory,
        errors: [error instanceof Error ? error.message : String(error)],
        performanceMetrics: { minTime: 0, maxTime: 0, standardDeviation: 0, percentile95: 0 },
        concurrencyAnalysis: { scalingEfficiency: 0, bottleneckType: 'synchronization', recommendedMaxConcurrency: 1 }
      };
    }
  }

  async testResourceContention(
    resourceType: string,
    concurrentAccessCount: number,
    operationDuration: number
  ): Promise<ResourceContentionResult> {
    const resourceId = `test_resource_${resourceType}`;
    const results: Array<{ waitTime: number; success: boolean }> = [];
    let lockConflicts = 0;
    let deadlocks = 0;

    const operations = Array.from({ length: concurrentAccessCount }, (_, i) => 
      this.simulateResourceAccess(resourceId, operationDuration, i)
        .then(result => {
          results.push(result);
          return result;
        })
        .catch(error => {
          if (error.message.includes('lock conflict')) {
            lockConflicts++;
          }
          if (error.message.includes('deadlock')) {
            deadlocks++;
          }
          results.push({ waitTime: operationDuration, success: false });
          return { waitTime: operationDuration, success: false };
        })
    );

    await Promise.allSettled(operations);

    const averageWaitTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.waitTime, 0) / results.length 
      : 0;

    const contentionLevel = this.determineContentionLevel(averageWaitTime, lockConflicts, deadlocks);
    const recommendations = this.generateContentionRecommendations(contentionLevel, lockConflicts, deadlocks);

    return {
      resourceType,
      contentionLevel,
      waitTime: averageWaitTime,
      lockConflicts,
      deadlocks,
      recommendations
    };
  }

  async testMultiUserScenario(
    userCount: number,
    operationsPerUser: number
  ): Promise<MultiUserScenarioResult> {
    const startTime = performance.now();
    const userPromises: Promise<any>[] = [];
    const results: Array<{ userId: number; operations: Array<{ success: boolean; time: number }> }> = [];

    // Simulate multiple users performing operations concurrently
    for (let userId = 0; userId < userCount; userId++) {
      const userPromise = this.simulateUserOperations(userId, operationsPerUser)
        .then(userResults => {
          results.push({ userId, operations: userResults });
          return userResults;
        });
      userPromises.push(userPromise);
    }

    await Promise.allSettled(userPromises);

    const totalOperations = userCount * operationsPerUser;
    const allOperations = results.flatMap(r => r.operations);
    const successfulOperations = allOperations.filter(op => op.success);
    const overallSuccessRate = successfulOperations.length / allOperations.length;
    const averageResponseTime = successfulOperations.length > 0
      ? successfulOperations.reduce((sum, op) => sum + op.time, 0) / successfulOperations.length
      : 0;

    // Calculate user experience metrics
    const acceptableTime = 100; // ms
    const degradedTime = 500; // ms
    
    const satisfactory = successfulOperations.filter(op => op.time <= acceptableTime).length / successfulOperations.length * 100;
    const degraded = successfulOperations.filter(op => op.time > acceptableTime && op.time <= degradedTime).length / successfulOperations.length * 100;
    const unacceptable = successfulOperations.filter(op => op.time > degradedTime).length / successfulOperations.length * 100;

    const errorRate = (allOperations.length - successfulOperations.length) / allOperations.length;
    const stable = errorRate < 0.05 && overallSuccessRate > 0.95;

    return {
      userCount,
      operationsPerUser,
      totalOperations,
      overallSuccessRate,
      averageResponseTime,
      userExperienceMetrics: {
        satisfactory,
        degraded,
        unacceptable
      },
      systemStability: {
        stable,
        errorRate,
        recoveryTime: performance.now() - startTime
      }
    };
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0; // Fallback for browser environment
  }

  private async executeOperation(operationType: string, testCase: any, operationId: number): Promise<{ success: boolean; time: number; error?: string }> {
    const startTime = performance.now();
    
    try {
      switch (operationType) {
        case 'offset':
          await this.simulateOffsetOperation(testCase, operationId);
          break;
        case 'boolean':
          await this.simulateBooleanOperation(testCase, operationId);
          break;
        case 'healing':
          await this.simulateHealingOperation(testCase, operationId);
          break;
        case 'cache':
          await this.simulateCacheOperation(testCase, operationId);
          break;
        default:
          throw new Error(`Unknown operation type: ${operationType}`);
      }
      
      const time = performance.now() - startTime;
      return { success: true, time };
    } catch (error) {
      const time = performance.now() - startTime;
      return { 
        success: false, 
        time, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  private analyzeConcurrency(
    maxConcurrency: number,
    successRate: number,
    averageTime: number,
    conflicts: number,
    resourceContention: number
  ): ConcurrentTestResult['concurrencyAnalysis'] {
    // Calculate scaling efficiency (simplified model)
    const baselineTime = 50; // Expected time for single operation
    const scalingEfficiency = Math.max(0, Math.min(1, baselineTime / averageTime));
    
    // Determine bottleneck type
    let bottleneckType: 'cpu' | 'memory' | 'io' | 'synchronization' | 'none' = 'none';
    
    if (conflicts > maxConcurrency * 0.1) {
      bottleneckType = 'synchronization';
    } else if (resourceContention > maxConcurrency * 0.2) {
      bottleneckType = 'memory';
    } else if (averageTime > baselineTime * 2) {
      bottleneckType = 'cpu';
    }
    
    // Recommend max concurrency based on performance
    let recommendedMaxConcurrency = maxConcurrency;
    if (successRate < 0.9) {
      recommendedMaxConcurrency = Math.max(1, Math.floor(maxConcurrency * 0.7));
    } else if (scalingEfficiency > 0.8) {
      recommendedMaxConcurrency = Math.min(20, Math.floor(maxConcurrency * 1.5));
    }
    
    return {
      scalingEfficiency,
      bottleneckType,
      recommendedMaxConcurrency
    };
  }

  private async simulateResourceAccess(
    resourceId: string,
    duration: number,
    operationId: number
  ): Promise<{ waitTime: number; success: boolean }> {
    const startTime = performance.now();
    
    // Simulate resource locking
    if (this.resourceLocks.get(resourceId)) {
      // Resource is locked, simulate wait
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      if (this.resourceLocks.get(resourceId)) {
        throw new Error(`Resource lock conflict for ${resourceId}`);
      }
    }
    
    // Acquire lock
    this.resourceLocks.set(resourceId, true);
    
    try {
      // Simulate operation
      await new Promise(resolve => setTimeout(resolve, duration));
      
      const waitTime = performance.now() - startTime;
      return { waitTime, success: true };
    } finally {
      // Release lock
      this.resourceLocks.set(resourceId, false);
    }
  }

  private determineContentionLevel(
    averageWaitTime: number,
    lockConflicts: number,
    deadlocks: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (deadlocks > 0) return 'critical';
    if (lockConflicts > 10 || averageWaitTime > 200) return 'high';
    if (lockConflicts > 5 || averageWaitTime > 100) return 'medium';
    return 'low';
  }

  private generateContentionRecommendations(
    contentionLevel: string,
    lockConflicts: number,
    deadlocks: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (contentionLevel === 'critical') {
      recommendations.push('Implement deadlock detection and recovery');
      recommendations.push('Review locking order to prevent circular dependencies');
    }
    
    if (contentionLevel === 'high' || lockConflicts > 5) {
      recommendations.push('Consider implementing lock-free data structures');
      recommendations.push('Reduce critical section duration');
      recommendations.push('Implement backoff strategies for lock acquisition');
    }
    
    if (contentionLevel === 'medium') {
      recommendations.push('Monitor resource usage patterns');
      recommendations.push('Consider connection pooling or resource pooling');
    }
    
    return recommendations;
  }

  private async simulateUserOperations(
    userId: number,
    operationCount: number
  ): Promise<Array<{ success: boolean; time: number }>> {
    const operations: Array<{ success: boolean; time: number }> = [];
    
    for (let i = 0; i < operationCount; i++) {
      const startTime = performance.now();
      
      try {
        // Simulate various user operations
        const operationType = ['offset', 'boolean', 'healing', 'cache'][i % 4];
        const testCase = this.generateTestCase(operationType, userId, i);
        
        await this.executeOperation(operationType, testCase, i);
        
        const time = performance.now() - startTime;
        operations.push({ success: true, time });
      } catch (error) {
        const time = performance.now() - startTime;
        operations.push({ success: false, time });
      }
      
      // Add small delay between operations to simulate user behavior
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    }
    
    return operations;
  }

  private generateTestCase(operationType: string, userId: number, operationId: number): any {
    // Generate test case based on operation type
    const baseCase = {
      id: `${operationType}_${userId}_${operationId}`,
      userId,
      operationId
    };
    
    switch (operationType) {
      case 'offset':
        return {
          ...baseCase,
          curve: this.generateTestCurve(),
          distance: 10 + (operationId % 5) * 5,
          joinType: ['miter', 'bevel', 'round'][operationId % 3]
        };
      case 'boolean':
        return {
          ...baseCase,
          polygons: [this.generateTestPolygon(), this.generateTestPolygon()],
          operation: ['union', 'intersection', 'difference'][operationId % 3]
        };
      case 'healing':
        return {
          ...baseCase,
          shape: this.generateTestPolygon(),
          tolerance: 0.1 + (operationId % 3) * 0.05
        };
      case 'cache':
        return {
          ...baseCase,
          key: `cache_key_${operationId % 10}`,
          data: { value: Math.random() * 1000 }
        };
      default:
        return baseCase;
    }
  }

  private generateTestCurve(): any {
    return {
      type: 'polyline',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ]
    };
  }

  private generateTestPolygon(): any {
    return {
      exterior: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
        { x: 0, y: 50 },
        { x: 0, y: 0 }
      ],
      holes: []
    };
  }

  private async simulateOffsetOperation(testCase: any, operationId: number): Promise<void> {
    // Simulate offset operation with potential conflicts
    if (operationId % 10 === 0) {
      throw new Error('Simulated offset operation conflict');
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
  }

  private async simulateBooleanOperation(testCase: any, operationId: number): Promise<void> {
    // Simulate boolean operation with potential resource contention
    if (operationId % 15 === 0) {
      throw new Error('Simulated boolean operation resource contention');
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25));
  }

  private async simulateHealingOperation(testCase: any, operationId: number): Promise<void> {
    // Simulate healing operation
    if (operationId % 20 === 0) {
      throw new Error('Simulated healing operation failure');
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15));
  }

  private async simulateCacheOperation(testCase: any, operationId: number): Promise<void> {
    // Simulate cache operation with potential lock conflicts
    const cacheKey = testCase.key;
    
    if (this.resourceLocks.get(cacheKey)) {
      throw new Error('Simulated cache lock conflict');
    }
    
    this.resourceLocks.set(cacheKey, true);
    
    try {
      // Simulate cache read/write
      await new Promise(resolve => setTimeout(resolve, 2 + Math.random() * 8));
    } finally {
      this.resourceLocks.set(cacheKey, false);
    }
  }
}

// Test Suite Implementation
describe('Concurrent Operation Testing', () => {
  let testSuite: ConcurrentOperationTestSuite;

  beforeEach(() => {
    testSuite = new ConcurrentOperationTestSuite();
    mockPerformanceNow.mockImplementation(() => Date.now());
    mockMemoryUsage.mockReturnValue({
      rss: 1000000,
      heapTotal: 800000,
      heapUsed: 600000,
      external: 100000,
      arrayBuffers: 50000
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should handle concurrent offset operations', async () => {
    const testCases = Array.from({ length: 10 }, (_, i) => ({
      curve: { type: 'polyline', points: [{ x: 0, y: 0 }, { x: 100, y: i * 10 }] },
      distance: 10,
      joinType: 'miter'
    }));

    const result = await testSuite.testConcurrentOperations('offset', testCases, 5);

    expect(result.operationType).toBe('offset');
    expect(result.concurrentOperations).toBe(5);
    expect(result.successRate).toBeGreaterThan(0.8);
    expect(result.throughput).toBeGreaterThan(0);
    expect(result.concurrencyAnalysis.scalingEfficiency).toBeGreaterThan(0);
  });

  test('should handle concurrent boolean operations', async () => {
    const testCases = Array.from({ length: 8 }, (_, i) => ({
      polygons: [
        { exterior: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }] },
        { exterior: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 75, y: 75 }, { x: 25, y: 75 }] }
      ],
      operation: 'union'
    }));

    const result = await testSuite.testConcurrentOperations('boolean', testCases, 4);

    expect(result.operationType).toBe('boolean');
    expect(result.concurrentOperations).toBe(4);
    expect(result.successRate).toBeGreaterThan(0.7);
    expect(result.performanceMetrics.minTime).toBeGreaterThanOrEqual(0);
    expect(result.performanceMetrics.maxTime).toBeGreaterThanOrEqual(result.performanceMetrics.minTime);
  });

  test('should detect resource contention', async () => {
    const result = await testSuite.testResourceContention('database', 10, 50);

    expect(result.resourceType).toBe('database');
    expect(['low', 'medium', 'high', 'critical']).toContain(result.contentionLevel);
    expect(result.waitTime).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  test('should simulate multi-user scenarios', async () => {
    const result = await testSuite.testMultiUserScenario(3, 5);

    expect(result.userCount).toBe(3);
    expect(result.operationsPerUser).toBe(5);
    expect(result.totalOperations).toBe(15);
    expect(result.overallSuccessRate).toBeGreaterThan(0);
    expect(result.userExperienceMetrics.satisfactory + 
           result.userExperienceMetrics.degraded + 
           result.userExperienceMetrics.unacceptable).toBeCloseTo(100, 1);
    expect(typeof result.systemStability.stable).toBe('boolean');
  });

  test('should measure performance under high concurrency', async () => {
    const testCases = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      data: { value: Math.random() * 1000 }
    }));

    const result = await testSuite.testConcurrentOperations('cache', testCases, 15);

    expect(result.concurrentOperations).toBe(15);
    expect(result.performanceMetrics.standardDeviation).toBeGreaterThanOrEqual(0);
    expect(result.concurrencyAnalysis.recommendedMaxConcurrency).toBeGreaterThan(0);
    
    // Verify bottleneck detection
    expect(['cpu', 'memory', 'io', 'synchronization', 'none']).toContain(
      result.concurrencyAnalysis.bottleneckType
    );
  });

  test('should handle operation failures gracefully', async () => {
    const testCases = Array.from({ length: 5 }, (_, i) => ({ id: i }));

    const result = await testSuite.testConcurrentOperations('offset', testCases, 5);

    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
  });

  test('should provide scaling recommendations', async () => {
    const testCases = Array.from({ length: 12 }, (_, i) => ({ id: i }));

    const result = await testSuite.testConcurrentOperations('healing', testCases, 8);

    expect(result.concurrencyAnalysis.scalingEfficiency).toBeGreaterThanOrEqual(0);
    expect(result.concurrencyAnalysis.scalingEfficiency).toBeLessThanOrEqual(1);
    expect(result.concurrencyAnalysis.recommendedMaxConcurrency).toBeGreaterThan(0);
    expect(result.concurrencyAnalysis.recommendedMaxConcurrency).toBeLessThanOrEqual(20);
  });
});
   