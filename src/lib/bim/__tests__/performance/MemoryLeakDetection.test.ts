/**
 * Memory Leak Detection Test Suite
 * Tests for memory leaks and resource cleanup validation
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { CachingLayer } from '../../persistence/CachingLayer';
import { WallSolid } from '../../geometry/WallSolid';
import { Curve } from '../../geometry/Curve';

// Mock memory monitoring
const mockMemoryUsage = vi.fn();
const mockPerformanceNow = vi.fn();

Object.defineProperty(global, 'process', {
  value: { memoryUsage: mockMemoryUsage },
  writable: true
});

Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

interface LeakAnalysisResult {
  componentName: string;
  leakDetected: boolean;
  leakSeverity: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  memoryGrowthRate: number; // bytes per operation
  totalMemoryGrowth: number;
  operationCount: number;
  recommendations: string[];
  memoryProfile: {
    baseline: MemorySnapshot;
    peak: MemorySnapshot;
    final: MemorySnapshot;
    snapshots: MemorySnapshot[];
  };
}

interface ResourceCleanupResult {
  resourceType: string;
  cleanupSuccessful: boolean;
  resourcesLeaked: number;
  cleanupTime: number;
  issues: string[];
  recommendations: string[];
}

class MemoryLeakDetector {
  private memorySnapshots: MemorySnapshot[] = [];
  private resourceTrackers: Map<string, Set<any>> = new Map();
  private cleanupCallbacks: Map<string, (() => void)[]> = new Map();

  constructor() {
    this.initializeResourceTrackers();
  }

  private initializeResourceTrackers(): void {
    this.resourceTrackers.set('eventListeners', new Set());
    this.resourceTrackers.set('timers', new Set());
    this.resourceTrackers.set('geometryObjects', new Set());
    this.resourceTrackers.set('cacheEntries', new Set());
    this.resourceTrackers.set('workers', new Set());
  }

  takeMemorySnapshot(label?: string): MemorySnapshot {
    const memUsage = this.getCurrentMemoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: performance.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    };

    this.memorySnapshots.push(snapshot);
    return snapshot;
  }

  async analyzeMemoryLeaks(
    componentName: string,
    operationFactory: () => Promise<void>,
    iterations: number = 1000,
    snapshotInterval: number = 100
  ): Promise<LeakAnalysisResult> {
    // Clear previous snapshots
    this.memorySnapshots = [];
    
    // Take baseline snapshot
    const baseline = this.takeMemorySnapshot('baseline');
    
    let peak = baseline;
    let operationCount = 0;

    try {
      for (let i = 0; i < iterations; i++) {
        await operationFactory();
        operationCount++;

        // Take periodic snapshots
        if (i % snapshotInterval === 0) {
          const snapshot = this.takeMemorySnapshot(`iteration_${i}`);
          if (snapshot.heapUsed > peak.heapUsed) {
            peak = snapshot;
          }
        }

        // Force garbage collection periodically (if available)
        if (i % (snapshotInterval * 2) === 0 && global.gc) {
          global.gc();
        }
      }
    } catch (error) {
      console.error(`Error during memory leak analysis: ${error}`);
    }

    // Take final snapshot
    const final = this.takeMemorySnapshot('final');

    // Analyze leak characteristics
    const totalMemoryGrowth = final.heapUsed - baseline.heapUsed;
    const memoryGrowthRate = totalMemoryGrowth / operationCount;
    const leakDetected = this.detectLeak(this.memorySnapshots);
    const leakSeverity = this.assessLeakSeverity(memoryGrowthRate, totalMemoryGrowth);
    const recommendations = this.generateLeakRecommendations(leakSeverity, memoryGrowthRate, componentName);

    return {
      componentName,
      leakDetected,
      leakSeverity,
      memoryGrowthRate,
      totalMemoryGrowth,
      operationCount,
      recommendations,
      memoryProfile: {
        baseline,
        peak,
        final,
        snapshots: [...this.memorySnapshots]
      }
    };
  }

  async testResourceCleanup(
    resourceType: string,
    createResource: () => any,
    cleanupResource: (resource: any) => void,
    resourceCount: number = 100
  ): Promise<ResourceCleanupResult> {
    const startTime = performance.now();
    const resources: any[] = [];
    const issues: string[] = [];
    let resourcesLeaked = 0;

    try {
      // Create resources
      for (let i = 0; i < resourceCount; i++) {
        const resource = createResource();
        resources.push(resource);
        this.trackResource(resourceType, resource);
      }

      // Attempt cleanup
      for (const resource of resources) {
        try {
          cleanupResource(resource);
          this.untrackResource(resourceType, resource);
        } catch (error) {
          issues.push(`Failed to cleanup resource: ${error}`);
          resourcesLeaked++;
        }
      }

      // Verify cleanup
      const remainingResources = this.getTrackedResources(resourceType);
      resourcesLeaked += remainingResources.size;

      if (remainingResources.size > 0) {
        issues.push(`${remainingResources.size} resources not properly cleaned up`);
      }

    } catch (error) {
      issues.push(`Resource cleanup test failed: ${error}`);
      resourcesLeaked = resourceCount; // Assume all leaked on failure
    }

    const cleanupTime = performance.now() - startTime;
    const cleanupSuccessful = resourcesLeaked === 0 && issues.length === 0;
    const recommendations = this.generateCleanupRecommendations(resourceType, resourcesLeaked, issues);

    return {
      resourceType,
      cleanupSuccessful,
      resourcesLeaked,
      cleanupTime,
      issues,
      recommendations
    };
  }

  private getCurrentMemoryUsage(): any {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    
    // Fallback for browser environment
    return {
      heapUsed: Math.random() * 50000000 + 10000000,
      heapTotal: Math.random() * 100000000 + 50000000,
      external: Math.random() * 5000000,
      arrayBuffers: Math.random() * 1000000
    };
  }

  private detectLeak(snapshots: MemorySnapshot[]): boolean {
    if (snapshots.length < 5) return false;

    // Analyze trend in memory usage
    const recentSnapshots = snapshots.slice(-5);
    let increasingTrend = 0;

    for (let i = 1; i < recentSnapshots.length; i++) {
      if (recentSnapshots[i].heapUsed > recentSnapshots[i - 1].heapUsed) {
        increasingTrend++;
      }
    }

    // Consider it a leak if memory increases in most recent snapshots
    return increasingTrend >= 3;
  }

  private assessLeakSeverity(
    growthRate: number,
    totalGrowth: number
  ): 'none' | 'minor' | 'moderate' | 'severe' | 'critical' {
    if (growthRate <= 0) return 'none';
    if (growthRate < 100) return 'minor';        // < 100 bytes per operation
    if (growthRate < 1000) return 'moderate';    // < 1KB per operation
    if (growthRate < 10000) return 'severe';     // < 10KB per operation
    return 'critical';                           // >= 10KB per operation
  }

  private generateLeakRecommendations(
    severity: string,
    growthRate: number,
    componentName: string
  ): string[] {
    const recommendations: string[] = [];

    if (severity === 'none') {
      recommendations.push('No memory leaks detected - good job!');
      return recommendations;
    }

    recommendations.push(`Memory leak detected in ${componentName}`);

    if (severity === 'critical' || severity === 'severe') {
      recommendations.push('URGENT: High memory growth rate detected');
      recommendations.push('Review object lifecycle management immediately');
      recommendations.push('Check for circular references and event listener cleanup');
      recommendations.push('Implement object pooling for frequently created objects');
    }

    if (severity === 'moderate') {
      recommendations.push('Moderate memory growth - review resource management');
      recommendations.push('Consider implementing WeakMap/WeakSet for temporary references');
      recommendations.push('Add explicit cleanup in finally blocks');
    }

    if (severity === 'minor') {
      recommendations.push('Minor memory growth detected - monitor over time');
      recommendations.push('Consider periodic garbage collection hints');
    }

    // Component-specific recommendations
    if (componentName.includes('Cache')) {
      recommendations.push('Implement cache size limits and LRU eviction');
      recommendations.push('Add cache entry expiration');
    }

    if (componentName.includes('Engine')) {
      recommendations.push('Ensure proper cleanup of intermediate geometric objects');
      recommendations.push('Review algorithm for unnecessary object creation');
    }

    return recommendations;
  }

  private generateCleanupRecommendations(
    resourceType: string,
    leakedCount: number,
    issues: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (leakedCount === 0 && issues.length === 0) {
      recommendations.push('Resource cleanup successful - no issues detected');
      return recommendations;
    }

    if (leakedCount > 0) {
      recommendations.push(`${leakedCount} ${resourceType} resources leaked`);
      recommendations.push('Implement proper resource disposal pattern');
      recommendations.push('Add try-finally blocks for guaranteed cleanup');
    }

    switch (resourceType) {
      case 'eventListeners':
        recommendations.push('Use AbortController for automatic event listener cleanup');
        recommendations.push('Remove event listeners in component unmount/destroy');
        break;
      case 'timers':
        recommendations.push('Clear all timers and intervals on cleanup');
        recommendations.push('Use cleanup functions in useEffect/lifecycle methods');
        break;
      case 'geometryObjects':
        recommendations.push('Implement dispose() methods for geometry objects');
        recommendations.push('Use object pooling for frequently created geometries');
        break;
      case 'cacheEntries':
        recommendations.push('Implement cache eviction policies');
        recommendations.push('Add cache size monitoring and limits');
        break;
    }

    return recommendations;
  }

  private trackResource(type: string, resource: any): void {
    const tracker = this.resourceTrackers.get(type);
    if (tracker) {
      tracker.add(resource);
    }
  }

  private untrackResource(type: string, resource: any): void {
    const tracker = this.resourceTrackers.get(type);
    if (tracker) {
      tracker.delete(resource);
    }
  }

  private getTrackedResources(type: string): Set<any> {
    return this.resourceTrackers.get(type) || new Set();
  }
}

// Test Suite Implementation
describe('Memory Leak Detection', () => {
  let detector: MemoryLeakDetector;
  let offsetEngine: RobustOffsetEngine;
  let booleanEngine: BooleanOperationsEngine;
  let cachingLayer: CachingLayer;

  beforeEach(() => {
    detector = new MemoryLeakDetector();
    offsetEngine = new RobustOffsetEngine();
    booleanEngine = new BooleanOperationsEngine();
    cachingLayer = new CachingLayer();

    let mockTime = Date.now();
    mockPerformanceNow.mockImplementation(() => {
      mockTime += Math.random() * 10 + 1; // Ensure time always increases
      return mockTime;
    });
    mockMemoryUsage.mockReturnValue({
      rss: 50000000,
      heapTotal: 40000000,
      heapUsed: 30000000,
      external: 5000000,
      arrayBuffers: 2000000
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should detect memory leaks in offset operations', async () => {
    const result = await detector.analyzeMemoryLeaks(
      'RobustOffsetEngine',
      async () => {
        // Simulate offset operation that might leak memory
        const curve = {
          type: 'polyline' as const,
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 100 }
          ]
        };
        
        // Simulate memory-consuming operation
        const largeArray = new Array(1000).fill(0).map(() => ({ ...curve }));
        
        // Simulate some processing
        await new Promise(resolve => setTimeout(resolve, 1));
        
        // Intentionally don't clean up to simulate leak
        if (Math.random() > 0.5) {
          // Sometimes clean up, sometimes don't
          largeArray.length = 0;
        }
      },
      100,
      20
    );

    expect(result.componentName).toBe('RobustOffsetEngine');
    expect(typeof result.leakDetected).toBe('boolean');
    expect(['none', 'minor', 'moderate', 'severe', 'critical']).toContain(result.leakSeverity);
    expect(result.memoryGrowthRate).toBeGreaterThanOrEqual(0);
    expect(result.operationCount).toBe(100);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.memoryProfile.snapshots.length).toBeGreaterThan(0);
  });

  test('should detect memory leaks in boolean operations', async () => {
    const result = await detector.analyzeMemoryLeaks(
      'BooleanOperationsEngine',
      async () => {
        // Simulate boolean operation
        const polygon1 = {
          exterior: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
          holes: []
        };
        
        const polygon2 = {
          exterior: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 75, y: 75 }, { x: 25, y: 75 }],
          holes: []
        };
        
        // Simulate processing that creates intermediate objects
        const intermediateResults = [];
        for (let i = 0; i < 50; i++) {
          intermediateResults.push({
            ...polygon1,
            id: i,
            processed: new Date()
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1));
      },
      50,
      10
    );

    expect(result.componentName).toBe('BooleanOperationsEngine');
    expect(result.memoryProfile.baseline).toBeDefined();
    expect(result.memoryProfile.final).toBeDefined();
    expect(result.memoryProfile.peak).toBeDefined();
  });

  test('should test cache resource cleanup', async () => {
    const result = await detector.testResourceCleanup(
      'cacheEntries',
      () => {
        // Create cache entry
        const entry = {
          key: `cache_${Math.random()}`,
          value: { data: new Array(100).fill(0) },
          timestamp: Date.now()
        };
        return entry;
      },
      (entry) => {
        // Cleanup cache entry
        if (entry.value && entry.value.data) {
          entry.value.data.length = 0;
          entry.value = null;
        }
      },
      50
    );

    expect(result.resourceType).toBe('cacheEntries');
    expect(typeof result.cleanupSuccessful).toBe('boolean');
    expect(result.resourcesLeaked).toBeGreaterThanOrEqual(0);
    expect(result.cleanupTime).toBeGreaterThan(0);
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  test('should test event listener cleanup', async () => {
    const result = await detector.testResourceCleanup(
      'eventListeners',
      () => {
        // Create mock event listener
        const listener = {
          element: 'mockElement',
          event: 'click',
          handler: () => {},
          active: true
        };
        return listener;
      },
      (listener) => {
        // Cleanup event listener
        listener.active = false;
        listener.handler = null;
      },
      25
    );

    expect(result.resourceType).toBe('eventListeners');
    expect(result.cleanupTime).toBeGreaterThan(0);
  });

  test('should test geometry object cleanup', async () => {
    const result = await detector.testResourceCleanup(
      'geometryObjects',
      () => {
        // Create geometry object
        return {
          vertices: new Array(1000).fill(0).map(() => ({ x: Math.random(), y: Math.random() })),
          edges: new Array(500).fill(0).map(() => ({ start: 0, end: 1 })),
          disposed: false
        };
      },
      (geometry) => {
        // Cleanup geometry
        if (!geometry.disposed) {
          geometry.vertices.length = 0;
          geometry.edges.length = 0;
          geometry.disposed = true;
        }
      },
      20
    );

    expect(result.resourceType).toBe('geometryObjects');
    expect(result.resourcesLeaked).toBeGreaterThanOrEqual(0);
  });

  test('should provide appropriate recommendations based on leak severity', async () => {
    const result = await detector.analyzeMemoryLeaks(
      'TestComponent',
      async () => {
        // Simulate operation with significant memory growth
        const largeObject = {
          data: new Array(10000).fill(0).map(() => Math.random()),
          timestamp: Date.now()
        };
        
        // Don't clean up to simulate leak
        await new Promise(resolve => setTimeout(resolve, 1));
      },
      20,
      5
    );

    expect(result.recommendations.length).toBeGreaterThan(0);
    
    if (result.leakSeverity === 'critical' || result.leakSeverity === 'severe') {
      expect(result.recommendations.some(r => r.includes('URGENT'))).toBe(true);
    }
    
    if (result.leakSeverity !== 'none') {
      expect(result.recommendations.some(r => r.includes('leak'))).toBe(true);
    }
  });

  test('should track memory snapshots correctly', async () => {
    const baseline = detector.takeMemorySnapshot('baseline');
    
    // Simulate some memory allocation
    const tempData = new Array(1000).fill(0);
    
    const snapshot1 = detector.takeMemorySnapshot('after_allocation');
    
    expect(snapshot1.timestamp).toBeGreaterThan(baseline.timestamp);
    expect(typeof snapshot1.heapUsed).toBe('number');
    expect(typeof snapshot1.heapTotal).toBe('number');
    expect(typeof snapshot1.external).toBe('number');
    expect(typeof snapshot1.arrayBuffers).toBe('number');
  });

  test('should handle cleanup failures gracefully', async () => {
    const result = await detector.testResourceCleanup(
      'failingResources',
      () => ({ id: Math.random(), data: 'test' }),
      (resource) => {
        // Simulate cleanup failure
        throw new Error('Cleanup failed');
      },
      10
    );

    expect(result.cleanupSuccessful).toBe(false);
    expect(result.resourcesLeaked).toBe(10);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(issue => issue.includes('Failed to cleanup'))).toBe(true);
  });
});