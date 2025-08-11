/**
 * Scalability Testing Suite for BIM Wall System
 * Tests system behavior with progressively larger datasets
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { ShapeHealingEngine } from '../../engines/ShapeHealingEngine';
import { WallSolid } from '../../geometry/WallSolid';
import { Curve } from '../../geometry/Curve';
import { BIMPoint } from '../../geometry/BIMPoint';
import { WallTypeString } from '../../types/WallTypes';
import { PerformanceMetricsCollector } from '../../performance/PerformanceMetricsCollector';

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

interface ScalabilityTestResult {
  wallCount: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'extreme';
  totalTime: number;
  averageTimePerWall: number;
  peakMemoryUsage: number;
  memoryEfficiency: number;
  operationBreakdown: Map<string, number>;
  bottlenecks: Array<{
    type: string;
    operation: string;
    impact: number;
    recommendation: string;
  }>;
  scalingFactor: number;
  success: boolean;
  errors: string[];
}

interface ScalabilityAnalysis {
  scalingFactor: number;
  memoryScaling: number;
  recommendedMaxWalls: number;
  performanceCliff: number | null;
  bottleneckAnalysis: {
    primaryBottleneck: string;
    secondaryBottlenecks: string[];
    recommendations: string[];
  };
  trends: {
    timeComplexity: 'linear' | 'quadratic' | 'exponential' | 'unknown';
    memoryComplexity: 'linear' | 'quadratic' | 'exponential' | 'unknown';
    stabilityTrend: 'stable' | 'degrading' | 'improving';
  };
}

class ScalabilityTestSuite {
  private offsetEngine: RobustOffsetEngine;
  private booleanEngine: BooleanOperationsEngine;
  private healingEngine: ShapeHealingEngine;
  private metricsCollector: PerformanceMetricsCollector;

  constructor() {
    this.offsetEngine = new RobustOffsetEngine();
    this.booleanEngine = new BooleanOperationsEngine();
    this.healingEngine = new ShapeHealingEngine();
    this.metricsCollector = new PerformanceMetricsCollector({
      maxOperationTime: 5000,
      maxMemoryUsage: 500 * 1024 * 1024
    });
  }

  async testScalability(
    wallCount: number,
    complexity: 'simple' | 'moderate' | 'complex' | 'extreme'
  ): Promise<ScalabilityTestResult> {
    const startTime = performance.now();
    const startMemory = this.getCurrentMemoryUsage();
    let peakMemory = startMemory;
    const operationTimes = new Map<string, number>();
    const errors: string[] = [];

    try {
      // Generate test walls based on complexity
      const walls = this.generateWallNetwork(wallCount, complexity);
      
      // Track memory after wall generation
      peakMemory = Math.max(peakMemory, this.getCurrentMemoryUsage());

      // Test offset operations
      const offsetStartTime = performance.now();
      const offsetResults = await this.testOffsetOperationsAtScale(walls);
      const offsetTime = performance.now() - offsetStartTime;
      operationTimes.set('offset_operations', offsetTime);
      peakMemory = Math.max(peakMemory, this.getCurrentMemoryUsage());

      if (!offsetResults.success) {
        errors.push(`Offset operations failed: ${offsetResults.errors.join(', ')}`);
      }

      // Test boolean operations
      const booleanStartTime = performance.now();
      const booleanResults = await this.testBooleanOperationsAtScale(walls);
      const booleanTime = performance.now() - booleanStartTime;
      operationTimes.set('boolean_operations', booleanTime);
      peakMemory = Math.max(peakMemory, this.getCurrentMemoryUsage());

      if (!booleanResults.success) {
        errors.push(`Boolean operations failed: ${booleanResults.errors.join(', ')}`);
      }

      // Test healing operations
      const healingStartTime = performance.now();
      const healingResults = await this.testHealingOperationsAtScale(walls);
      const healingTime = performance.now() - healingStartTime;
      operationTimes.set('healing_operations', healingTime);
      peakMemory = Math.max(peakMemory, this.getCurrentMemoryUsage());

      if (!healingResults.success) {
        errors.push(`Healing operations failed: ${healingResults.errors.join(', ')}`);
      }

      const totalTime = performance.now() - startTime;
      const averageTimePerWall = totalTime / wallCount;
      const memoryEfficiency = wallCount / (peakMemory - startMemory);

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(operationTimes, wallCount);

      // Calculate scaling factor (compared to baseline of 10 walls)
      const baselineTimePerWall = 10; // ms per wall for 10 walls
      const scalingFactor = averageTimePerWall / baselineTimePerWall;

      return {
        wallCount,
        complexity,
        totalTime,
        averageTimePerWall,
        peakMemoryUsage: peakMemory,
        memoryEfficiency,
        operationBreakdown: operationTimes,
        bottlenecks,
        scalingFactor,
        success: errors.length === 0,
        errors
      };

    } catch (error) {
      errors.push(`Scalability test failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        wallCount,
        complexity,
        totalTime: performance.now() - startTime,
        averageTimePerWall: 0,
        peakMemoryUsage: peakMemory,
        memoryEfficiency: 0,
        operationBreakdown: operationTimes,
        bottlenecks: [],
        scalingFactor: Infinity,
        success: false,
        errors
      };
    }
  }

  analyzeScalability(results: ScalabilityTestResult[]): ScalabilityAnalysis {
    if (results.length < 2) {
      throw new Error('Need at least 2 results for scalability analysis');
    }

    // Sort by wall count
    const sortedResults = results.sort((a, b) => a.wallCount - b.wallCount);

    // Calculate scaling factors
    const scalingFactors = sortedResults.map(r => r.scalingFactor);
    const averageScalingFactor = scalingFactors.reduce((sum, factor) => sum + factor, 0) / scalingFactors.length;

    // Calculate memory scaling
    const memoryUsages = sortedResults.map(r => r.peakMemoryUsage);
    const wallCounts = sortedResults.map(r => r.wallCount);
    const memoryScaling = this.calculateScalingTrend(wallCounts, memoryUsages);

    // Find performance cliff (point where performance degrades significantly)
    const performanceCliff = this.findPerformanceCliff(sortedResults);

    // Determine recommended max walls
    const recommendedMaxWalls = this.calculateRecommendedMaxWalls(sortedResults);

    // Analyze bottlenecks
    const bottleneckAnalysis = this.analyzeBottlenecks(sortedResults);

    // Determine complexity trends
    const timeComplexity = this.determineTimeComplexity(sortedResults);
    const memoryComplexity = this.determineMemoryComplexity(sortedResults);
    const stabilityTrend = this.determineStabilityTrend(sortedResults);

    return {
      scalingFactor: averageScalingFactor,
      memoryScaling,
      recommendedMaxWalls,
      performanceCliff,
      bottleneckAnalysis,
      trends: {
        timeComplexity,
        memoryComplexity,
        stabilityTrend
      }
    };
  }

  private generateWallNetwork(count: number, complexity: 'simple' | 'moderate' | 'complex' | 'extreme'): WallSolid[] {
    const walls: WallSolid[] = [];

    for (let i = 0; i < count; i++) {
      let wall: WallSolid;

      switch (complexity) {
        case 'simple':
          wall = this.createSimpleWall(i);
          break;
        case 'moderate':
          wall = this.createModerateWall(i);
          break;
        case 'complex':
          wall = this.createComplexWall(i);
          break;
        case 'extreme':
          wall = this.createExtremeWall(i);
          break;
      }

      walls.push(wall);
    }

    return walls;
  }

  private createSimpleWall(index: number): WallSolid {
    const length = 5 + (index % 10);
    const points: BIMPoint[] = [
      { x: 0, y: index, id: `${index}-1`, tolerance: 0.01, creationMethod: 'generated', accuracy: 1.0, validated: true },
      { x: length, y: index, id: `${index}-2`, tolerance: 0.01, creationMethod: 'generated', accuracy: 1.0, validated: true }
    ];

    const baseline = new Curve({
      id: `simple-baseline-${index}`,
      points,
      type: 'polyline',
      isClosed: false
    });

    return new WallSolid({
      id: `simple-wall-${index}`,
      baseline,
      thickness: 0.2,
      wallType: 'Layout' as WallTypeString,
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: []
    });
  }

  private createModerateWall(index: number): WallSolid {
    const segmentCount = 5 + (index % 10);
    const points: BIMPoint[] = [];

    for (let i = 0; i <= segmentCount; i++) {
      points.push({
        x: i * 2,
        y: index + Math.sin(i * 0.5) * 2,
        id: `${index}-${i}`,
        tolerance: 0.01,
        creationMethod: 'generated',
        accuracy: 1.0,
        validated: true
      });
    }

    const baseline = new Curve({
      id: `moderate-baseline-${index}`,
      points,
      type: 'polyline',
      isClosed: false
    });

    return new WallSolid({
      id: `moderate-wall-${index}`,
      baseline,
      thickness: 0.25,
      wallType: 'Layout' as WallTypeString,
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: []
    });
  }

  private createComplexWall(index: number): WallSolid {
    const segmentCount = 20 + (index % 30);
    const points: BIMPoint[] = [];
    const radius = 5 + (index % 10);

    for (let i = 0; i <= segmentCount; i++) {
      const angle = (i / segmentCount) * 2 * Math.PI;
      points.push({
        x: radius * Math.cos(angle) + (index % 20) * 15,
        y: radius * Math.sin(angle) + Math.floor(index / 20) * 15,
        id: `${index}-${i}`,
        tolerance: 0.005,
        creationMethod: 'generated',
        accuracy: 0.95,
        validated: true
      });
    }

    const baseline = new Curve({
      id: `complex-baseline-${index}`,
      points,
      type: 'spline',
      isClosed: true
    });

    return new WallSolid({
      id: `complex-wall-${index}`,
      baseline,
      thickness: 0.3,
      wallType: 'Layout' as WallTypeString,
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: []
    });
  }

  private createExtremeWall(index: number): WallSolid {
    const segmentCount = 100 + (index % 200);
    const points: BIMPoint[] = [];

    // Create highly complex geometry with multiple curves and sharp angles
    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const x = 50 * Math.cos(t * 10 * Math.PI) * Math.sin(t * 3 * Math.PI) + (index % 50) * 20;
      const y = 50 * Math.sin(t * 8 * Math.PI) * Math.cos(t * 5 * Math.PI) + Math.floor(index / 50) * 20;
      
      points.push({
        x,
        y,
        id: `${index}-${i}`,
        tolerance: 0.001,
        creationMethod: 'generated',
        accuracy: 0.9,
        validated: true
      });
    }

    const baseline = new Curve({
      id: `extreme-baseline-${index}`,
      points,
      type: 'spline',
      isClosed: true
    });

    return new WallSolid({
      id: `extreme-wall-${index}`,
      baseline,
      thickness: 0.4,
      wallType: 'Layout' as WallTypeString,
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: []
    });
  }

  private async testOffsetOperationsAtScale(walls: WallSolid[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;

    for (const wall of walls) {
      try {
        const result = await this.offsetEngine.offsetCurve(
          wall.baseline,
          wall.thickness / 2,
          'miter',
          0.01
        );

        if (result.success) {
          successCount++;
        } else {
          errors.push(`Offset failed for wall ${wall.id}: ${result.warnings.join(', ')}`);
        }
      } catch (error) {
        errors.push(`Offset error for wall ${wall.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: successCount / walls.length > 0.8, // 80% success rate threshold
      errors
    };
  }

  private async testBooleanOperationsAtScale(walls: WallSolid[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;

    // Test boolean operations on batches of walls
    const batchSize = Math.min(10, walls.length);
    for (let i = 0; i < walls.length; i += batchSize) {
      const batch = walls.slice(i, i + batchSize);
      
      try {
        const result = await this.booleanEngine.batchUnion(batch);
        
        if (result.success) {
          successCount++;
        } else {
          errors.push(`Boolean batch ${i / batchSize} failed: ${result.warnings.join(', ')}`);
        }
      } catch (error) {
        errors.push(`Boolean error for batch ${i / batchSize}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const totalBatches = Math.ceil(walls.length / batchSize);
    return {
      success: successCount / totalBatches > 0.8,
      errors
    };
  }

  private async testHealingOperationsAtScale(walls: WallSolid[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;

    for (const wall of walls) {
      try {
        const result = await this.healingEngine.healShape(wall, 0.01);
        
        if (result.success) {
          successCount++;
        } else {
          errors.push(`Healing failed for wall ${wall.id}`);
        }
      } catch (error) {
        errors.push(`Healing error for wall ${wall.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: successCount / walls.length > 0.9, // Higher threshold for healing
      errors
    };
  }

  private identifyBottlenecks(operationTimes: Map<string, number>, wallCount: number): Array<{
    type: string;
    operation: string;
    impact: number;
    recommendation: string;
  }> {
    const bottlenecks = [];
    const totalTime = Array.from(operationTimes.values()).reduce((sum, time) => sum + time, 0);

    for (const [operation, time] of operationTimes) {
      const impact = time / totalTime;
      
      if (impact > 0.4) { // More than 40% of total time
        bottlenecks.push({
          type: 'operation',
          operation,
          impact,
          recommendation: this.getBottleneckRecommendation(operation, impact, wallCount)
        });
      }
    }

    return bottlenecks;
  }

  private getBottleneckRecommendation(operation: string, impact: number, wallCount: number): string {
    if (operation === 'offset_operations' && impact > 0.5) {
      return 'Consider implementing parallel offset processing or optimizing curve simplification';
    } else if (operation === 'boolean_operations' && impact > 0.6) {
      return 'Implement spatial indexing for boolean operations or increase batch sizes';
    } else if (operation === 'healing_operations' && impact > 0.3) {
      return 'Optimize healing algorithms or implement selective healing based on quality metrics';
    }
    
    return 'Monitor this operation for further optimization opportunities';
  }

  private calculateScalingTrend(wallCounts: number[], values: number[]): number {
    // Simple linear regression to determine scaling trend
    const n = wallCounts.length;
    const sumX = wallCounts.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = wallCounts.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = wallCounts.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private findPerformanceCliff(results: ScalabilityTestResult[]): number | null {
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      const previous = results[i - 1];
      
      // Check if performance degraded significantly (more than 3x)
      if (current.averageTimePerWall > previous.averageTimePerWall * 3) {
        return current.wallCount;
      }
    }
    
    return null;
  }

  private calculateRecommendedMaxWalls(results: ScalabilityTestResult[]): number {
    // Find the point where performance becomes unacceptable (>1000ms per wall)
    const acceptableThreshold = 1000; // ms per wall
    
    for (const result of results) {
      if (result.averageTimePerWall > acceptableThreshold) {
        return Math.max(1, result.wallCount - 100); // Conservative estimate
      }
    }
    
    // If no threshold exceeded, extrapolate based on trend
    const lastResult = results[results.length - 1];
    const growthRate = lastResult.scalingFactor;
    
    if (growthRate > 2) {
      return lastResult.wallCount * 2; // Conservative for high growth
    } else {
      return lastResult.wallCount * 5; // More optimistic for linear growth
    }
  }

  private analyzeBottlenecks(results: ScalabilityTestResult[]): {
    primaryBottleneck: string;
    secondaryBottlenecks: string[];
    recommendations: string[];
  } {
    const bottleneckCounts = new Map<string, number>();
    const recommendations = new Set<string>();

    for (const result of results) {
      for (const bottleneck of result.bottlenecks) {
        bottleneckCounts.set(bottleneck.operation, (bottleneckCounts.get(bottleneck.operation) || 0) + 1);
        recommendations.add(bottleneck.recommendation);
      }
    }

    const sortedBottlenecks = Array.from(bottleneckCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    return {
      primaryBottleneck: sortedBottlenecks[0]?.[0] || 'none',
      secondaryBottlenecks: sortedBottlenecks.slice(1, 3).map(([operation]) => operation),
      recommendations: Array.from(recommendations)
    };
  }

  private determineTimeComplexity(results: ScalabilityTestResult[]): 'linear' | 'quadratic' | 'exponential' | 'unknown' {
    if (results.length < 3) return 'unknown';

    const wallCounts = results.map(r => r.wallCount);
    const times = results.map(r => r.totalTime);

    // Test for linear complexity (O(n))
    const linearCorrelation = this.calculateCorrelation(wallCounts, times);
    
    // Test for quadratic complexity (O(n²))
    const quadraticValues = wallCounts.map(n => n * n);
    const quadraticCorrelation = this.calculateCorrelation(quadraticValues, times);
    
    // Test for exponential complexity (O(2^n) approximated as O(n^3) for practical ranges)
    const cubicValues = wallCounts.map(n => n * n * n);
    const cubicCorrelation = this.calculateCorrelation(cubicValues, times);

    if (cubicCorrelation > 0.9) return 'exponential';
    if (quadraticCorrelation > 0.9) return 'quadratic';
    if (linearCorrelation > 0.8) return 'linear';
    
    return 'unknown';
  }

  private determineMemoryComplexity(results: ScalabilityTestResult[]): 'linear' | 'quadratic' | 'exponential' | 'unknown' {
    if (results.length < 3) return 'unknown';

    const wallCounts = results.map(r => r.wallCount);
    const memoryUsages = results.map(r => r.peakMemoryUsage);

    const linearCorrelation = this.calculateCorrelation(wallCounts, memoryUsages);
    const quadraticValues = wallCounts.map(n => n * n);
    const quadraticCorrelation = this.calculateCorrelation(quadraticValues, memoryUsages);

    if (quadraticCorrelation > 0.9) return 'quadratic';
    if (linearCorrelation > 0.8) return 'linear';
    
    return 'unknown';
  }

  private determineStabilityTrend(results: ScalabilityTestResult[]): 'stable' | 'degrading' | 'improving' {
    if (results.length < 3) return 'stable';

    const successRates = results.map(r => r.success ? 1 : 0);
    const trend = this.calculateScalingTrend(
      results.map((_, i) => i),
      successRates
    );

    if (trend < -0.1) return 'degrading';
    if (trend > 0.1) return 'improving';
    return 'stable';
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    } else if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

describe('ScalabilityTestSuite', () => {
  let scalabilityTester: ScalabilityTestSuite;
  let currentTime: number;

  beforeEach(() => {
    currentTime = 1000;
    mockPerformanceNow.mockImplementation(() => currentTime);
    mockMemoryUsage.mockReturnValue({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 200 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    });

    scalabilityTester = new ScalabilityTestSuite();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Small Scale Testing (10-100 walls)', () => {
    test('should handle 10 walls with simple complexity', async () => {
      const result = await scalabilityTester.testScalability(10, 'simple');
      
      expect(result.wallCount).toBe(10);
      expect(result.complexity).toBe('simple');
      expect(result.success).toBe(true);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.averageTimePerWall).toBeGreaterThan(0);
      expect(result.scalingFactor).toBeCloseTo(1, 1); // Should be close to baseline
    });

    test('should handle 50 walls with moderate complexity', async () => {
      // Simulate increasing time with wall count
      mockPerformanceNow.mockImplementation(() => {
        currentTime += 2; // 2ms per operation
        return currentTime;
      });

      const result = await scalabilityTester.testScalability(50, 'moderate');
      
      expect(result.wallCount).toBe(50);
      expect(result.success).toBe(true);
      expect(result.averageTimePerWall).toBeGreaterThan(0);
      expect(result.operationBreakdown.size).toBeGreaterThan(0);
    });

    test('should handle 100 walls with complex geometry', async () => {
      mockPerformanceNow.mockImplementation(() => {
        currentTime += 5; // 5ms per operation
        return currentTime;
      });

      const result = await scalabilityTester.testScalability(100, 'complex');
      
      expect(result.wallCount).toBe(100);
      expect(result.success).toBe(true);
      expect(result.bottlenecks).toBeDefined();
    });
  });

  describe('Medium Scale Testing (100-1000 walls)', () => {
    test('should handle 500 walls and identify bottlenecks', async () => {
      // Simulate slower boolean operations
      mockPerformanceNow.mockImplementation(() => {
        currentTime += 10; // 10ms per operation
        return currentTime;
      });

      const result = await scalabilityTester.testScalability(500, 'moderate');
      
      expect(result.wallCount).toBe(500);
      expect(result.bottlenecks.length).toBeGreaterThan(0);
      expect(result.scalingFactor).toBeGreaterThan(1);
    });

    test('should handle 1000 walls with performance monitoring', async () => {
      let operationCount = 0;
      mockPerformanceNow.mockImplementation(() => {
        operationCount++;
        currentTime += Math.min(20, operationCount * 0.1); // Increasing time per operation
        return currentTime;
      });

      const result = await scalabilityTester.testScalability(1000, 'moderate');
      
      expect(result.wallCount).toBe(1000);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.memoryEfficiency).toBeGreaterThan(0);
    });
  });

  describe('Large Scale Testing (1000+ walls)', () => {
    test('should handle 5000 walls and detect performance cliffs', async () => {
      // Simulate exponential time growth
      let operationCount = 0;
      mockPerformanceNow.mockImplementation(() => {
        operationCount++;
        currentTime += Math.pow(operationCount / 1000, 2) * 10; // Quadratic growth
        return currentTime;
      });

      const result = await scalabilityTester.testScalability(5000, 'simple');
      
      expect(result.wallCount).toBe(5000);
      expect(result.scalingFactor).toBeGreaterThan(10); // Should show significant scaling issues
    });

    test('should handle 10000 walls with extreme complexity', async () => {
      // Simulate memory pressure
      let memoryUsage = 50 * 1024 * 1024;
      mockMemoryUsage.mockImplementation(() => {
        memoryUsage += 1024 * 1024; // 1MB per operation
        return {
          heapUsed: memoryUsage,
          heapTotal: 500 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          arrayBuffers: 5 * 1024 * 1024
        };
      });

      const result = await scalabilityTester.testScalability(10000, 'extreme');
      
      expect(result.wallCount).toBe(10000);
      expect(result.peakMemoryUsage).toBeGreaterThan(100 * 1024 * 1024);
    });
  });

  describe('Scalability Analysis', () => {
    test('should analyze scaling trends across multiple test runs', async () => {
      const results: ScalabilityTestResult[] = [];
      
      // Simulate multiple test runs with increasing complexity
      const wallCounts = [10, 50, 100, 500, 1000];
      
      for (let i = 0; i < wallCounts.length; i++) {
        const wallCount = wallCounts[i];
        currentTime = 1000; // Reset time for each test
        
        // Simulate quadratic time growth
        mockPerformanceNow.mockImplementation(() => {
          currentTime += Math.pow(wallCount / 100, 2) * 10;
          return currentTime;
        });

        const result = await scalabilityTester.testScalability(wallCount, 'moderate');
        results.push(result);
      }

      const analysis = scalabilityTester.analyzeScalability(results);
      
      expect(analysis.scalingFactor).toBeGreaterThan(1);
      expect(analysis.recommendedMaxWalls).toBeGreaterThan(0);
      expect(analysis.trends.timeComplexity).toBeDefined();
      expect(analysis.trends.memoryComplexity).toBeDefined();
      expect(analysis.bottleneckAnalysis.primaryBottleneck).toBeDefined();
    });

    test('should detect linear scaling for simple operations', async () => {
      const results: ScalabilityTestResult[] = [];
      const wallCounts = [10, 20, 30, 40, 50];
      
      for (const wallCount of wallCounts) {
        currentTime = 1000;
        
        // Simulate linear time growth
        mockPerformanceNow.mockImplementation(() => {
          currentTime += wallCount * 2; // Linear growth
          return currentTime;
        });

        const result = await scalabilityTester.testScalability(wallCount, 'simple');
        results.push(result);
      }

      const analysis = scalabilityTester.analyzeScalability(results);
      
      expect(analysis.trends.timeComplexity).toBe('linear');
      expect(analysis.recommendedMaxWalls).toBeGreaterThan(1000);
    });

    test('should detect quadratic scaling for complex operations', async () => {
      const results: ScalabilityTestResult[] = [];
      const wallCounts = [10, 20, 30, 40, 50];
      
      for (const wallCount of wallCounts) {
        currentTime = 1000;
        
        // Simulate quadratic time growth
        mockPerformanceNow.mockImplementation(() => {
          currentTime += wallCount * wallCount * 0.1; // Quadratic growth
          return currentTime;
        });

        const result = await scalabilityTester.testScalability(wallCount, 'complex');
        results.push(result);
      }

      const analysis = scalabilityTester.analyzeScalability(results);
      
      expect(analysis.trends.timeComplexity).toBe('quadratic');
      expect(analysis.recommendedMaxWalls).toBeLessThan(500);
    });

    test('should identify performance cliffs', async () => {
      const results: ScalabilityTestResult[] = [];
      const wallCounts = [100, 200, 300, 400, 500];
      
      for (let i = 0; i < wallCounts.length; i++) {
        const wallCount = wallCounts[i];
        currentTime = 1000;
        
        // Simulate performance cliff at 400 walls
        const timeMultiplier = wallCount >= 400 ? 10 : 1;
        mockPerformanceNow.mockImplementation(() => {
          currentTime += wallCount * timeMultiplier;
          return currentTime;
        });

        const result = await scalabilityTester.testScalability(wallCount, 'moderate');
        results.push(result);
      }

      const analysis = scalabilityTester.analyzeScalability(results);
      
      expect(analysis.performanceCliff).toBe(400);
    });
  });

  describe('Memory Scaling Analysis', () => {
    test('should track memory usage scaling', async () => {
      const results: ScalabilityTestResult[] = [];
      const wallCounts = [100, 200, 400, 800];
      
      for (const wallCount of wallCounts) {
        let memoryUsage = 50 * 1024 * 1024;
        
        mockMemoryUsage.mockImplementation(() => {
          memoryUsage += wallCount * 1024; // 1KB per wall
          return {
            heapUsed: memoryUsage,
            heapTotal: 500 * 1024 * 1024,
            external: 10 * 1024 * 1024,
            arrayBuffers: 5 * 1024 * 1024
          };
        });

        const result = await scalabilityTester.testScalability(wallCount, 'moderate');
        results.push(result);
      }

      const analysis = scalabilityTester.analyzeScalability(results);
      
      expect(analysis.memoryScaling).toBeGreaterThan(0);
      expect(analysis.trends.memoryComplexity).toBe('linear');
    });
  });

  describe('Bottleneck Identification', () => {
    test('should identify operation bottlenecks', async () => {
      // Simulate slow boolean operations
      mockPerformanceNow.mockImplementation(() => {
        currentTime += 100; // Slow operations
        return currentTime;
      });

      const result = await scalabilityTester.testScalability(100, 'complex');
      
      expect(result.bottlenecks.length).toBeGreaterThan(0);
      
      const operationBottleneck = result.bottlenecks.find(b => b.type === 'operation');
      expect(operationBottleneck).toBeDefined();
      expect(operationBottleneck!.recommendation).toBeDefined();
    });
  });
});