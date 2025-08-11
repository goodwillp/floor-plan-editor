/**
 * Unit tests for IntersectionCache class
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntersectionCache } from '../../engines/IntersectionCache';
import { IntersectionDataImpl } from '../../geometry/IntersectionData';
import { MiterCalculationImpl } from '../../geometry/MiterCalculation';
import { IntersectionType, OffsetJoinType } from '../../types/BIMTypes';
import type { BIMPoint } from '../../geometry/BIMPoint';
import type { BIMPolygon } from '../../geometry/BIMPolygon';

describe('IntersectionCache', () => {
  let cache: IntersectionCache;
  let mockIntersectionData: IntersectionDataImpl;
  let mockMiterCalculation: MiterCalculationImpl;

  beforeEach(() => {
    cache = new IntersectionCache({
      maxEntries: 10,
      maxMemoryMB: 1,
      ttlMinutes: 5,
      cleanupIntervalMinutes: 1,
      enableStatistics: true
    });

    // Create mock data
    const mockPoint: BIMPoint = {
      x: 100,
      y: 100,
      id: 'test_point',
      tolerance: 1e-6,
      creationMethod: 'test',
      accuracy: 0.9,
      validated: true
    };

    const mockGeometry: BIMPolygon = {
      id: 'test_geometry',
      outerRing: [mockPoint],
      holes: [],
      area: 100,
      perimeter: 40,
      centroid: mockPoint,
      boundingBox: { minX: 90, minY: 90, maxX: 110, maxY: 110 },
      isValid: true,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'test',
      healingApplied: false,
      simplificationApplied: false
    };

    mockIntersectionData = new IntersectionDataImpl({
      id: 'test_intersection',
      type: IntersectionType.T_JUNCTION,
      participatingWalls: ['wall_1', 'wall_2'],
      intersectionPoint: mockPoint,
      miterApex: mockPoint,
      offsetIntersections: [mockPoint],
      resolvedGeometry: mockGeometry,
      resolutionMethod: 'test_method',
      geometricAccuracy: 0.9,
      validated: true,
      processingTime: 10
    });

    mockMiterCalculation = new MiterCalculationImpl({
      apex: mockPoint,
      leftOffsetIntersection: mockPoint,
      rightOffsetIntersection: mockPoint,
      angle: Math.PI / 2,
      joinType: OffsetJoinType.MITER,
      fallbackUsed: false,
      calculationMethod: 'test_method',
      accuracy: 0.9,
      processingTime: 5
    });
  });

  afterEach(() => {
    cache.dispose();
  });

  describe('intersection caching', () => {
    test('should cache and retrieve intersection data', () => {
      const key = 'test_intersection_key';
      
      cache.cacheIntersection(key, mockIntersectionData);
      const retrieved = cache.getIntersection(key);
      
      expect(retrieved).toBe(mockIntersectionData);
      expect(retrieved?.id).toBe('test_intersection');
    });

    test('should return null for non-existent key', () => {
      const retrieved = cache.getIntersection('non_existent_key');
      expect(retrieved).toBeNull();
    });

    test('should handle cache miss correctly', () => {
      const retrieved = cache.getIntersection('missing_key');
      expect(retrieved).toBeNull();
      
      const stats = cache.getStatistics();
      expect(stats.missCount).toBe(1);
      expect(stats.hitCount).toBe(0);
    });

    test('should handle cache hit correctly', () => {
      const key = 'hit_test_key';
      cache.cacheIntersection(key, mockIntersectionData);
      
      const retrieved = cache.getIntersection(key);
      expect(retrieved).toBe(mockIntersectionData);
      
      const stats = cache.getStatistics();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(0);
    });

    test('should expire entries after TTL', async () => {
      const shortTTLCache = new IntersectionCache({
        ttlMinutes: 0.001 // Very short TTL for testing
      });

      const key = 'expiry_test_key';
      shortTTLCache.cacheIntersection(key, mockIntersectionData);
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const retrieved = shortTTLCache.getIntersection(key);
      expect(retrieved).toBeNull();
      
      shortTTLCache.dispose();
    });
  });

  describe('miter calculation caching', () => {
    test('should cache and retrieve miter calculation', () => {
      const key = 'test_miter_key';
      
      cache.cacheMiterCalculation(key, mockMiterCalculation);
      const retrieved = cache.getMiterCalculation(key);
      
      expect(retrieved).toBe(mockMiterCalculation);
      expect(retrieved?.calculationMethod).toBe('test_method');
    });

    test('should return null for non-existent miter key', () => {
      const retrieved = cache.getMiterCalculation('non_existent_miter_key');
      expect(retrieved).toBeNull();
    });

    test('should expire miter calculations after TTL', async () => {
      const shortTTLCache = new IntersectionCache({
        ttlMinutes: 0.001
      });

      const key = 'miter_expiry_test_key';
      shortTTLCache.cacheMiterCalculation(key, mockMiterCalculation);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const retrieved = shortTTLCache.getMiterCalculation(key);
      expect(retrieved).toBeNull();
      
      shortTTLCache.dispose();
    });
  });

  describe('key generation', () => {
    test('should generate consistent intersection keys', () => {
      const wallIds = ['wall_1', 'wall_2'];
      const intersectionType = IntersectionType.T_JUNCTION;
      const point = { x: 100.123456, y: 200.654321 };
      const tolerance = 1e-6;

      const key1 = cache.generateIntersectionKey(wallIds, intersectionType, point, tolerance);
      const key2 = cache.generateIntersectionKey(wallIds, intersectionType, point, tolerance);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('intersection_');
      expect(key1).toContain('wall_1_wall_2');
      expect(key1).toContain('t_junction');
    });

    test('should generate different keys for different parameters', () => {
      const wallIds1 = ['wall_1', 'wall_2'];
      const wallIds2 = ['wall_3', 'wall_4'];
      const point = { x: 100, y: 200 };
      const tolerance = 1e-6;

      const key1 = cache.generateIntersectionKey(wallIds1, IntersectionType.T_JUNCTION, point, tolerance);
      const key2 = cache.generateIntersectionKey(wallIds2, IntersectionType.T_JUNCTION, point, tolerance);
      
      expect(key1).not.toBe(key2);
    });

    test('should generate consistent miter keys', () => {
      const leftPoint = { x: 95.123456, y: 100.654321 };
      const rightPoint = { x: 105.987654, y: 100.321987 };
      const baselinePoint = { x: 100.555555, y: 100.444444 };
      const thickness = 10.5;
      const tolerance = 1e-6;

      const key1 = cache.generateMiterKey(leftPoint, rightPoint, baselinePoint, thickness, tolerance);
      const key2 = cache.generateMiterKey(leftPoint, rightPoint, baselinePoint, thickness, tolerance);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('miter_');
    });

    test('should sort wall IDs for consistent keys', () => {
      const wallIds1 = ['wall_2', 'wall_1']; // Different order
      const wallIds2 = ['wall_1', 'wall_2'];
      const point = { x: 100, y: 200 };
      const tolerance = 1e-6;

      const key1 = cache.generateIntersectionKey(wallIds1, IntersectionType.T_JUNCTION, point, tolerance);
      const key2 = cache.generateIntersectionKey(wallIds2, IntersectionType.T_JUNCTION, point, tolerance);
      
      expect(key1).toBe(key2); // Should be same due to sorting
    });
  });

  describe('cache management', () => {
    test('should clear all cached data', () => {
      cache.cacheIntersection('key1', mockIntersectionData);
      cache.cacheMiterCalculation('key2', mockMiterCalculation);
      
      let stats = cache.getStatistics();
      expect(stats.totalEntries).toBe(2);
      
      cache.clear();
      
      stats = cache.getStatistics();
      expect(stats.totalEntries).toBe(0);
      expect(cache.getIntersection('key1')).toBeNull();
      expect(cache.getMiterCalculation('key2')).toBeNull();
    });

    test('should clear expired entries', async () => {
      const shortTTLCache = new IntersectionCache({
        ttlMinutes: 0.001,
        cleanupIntervalMinutes: 0
      });

      shortTTLCache.cacheIntersection('key1', mockIntersectionData);
      shortTTLCache.cacheMiterCalculation('key2', mockMiterCalculation);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const clearedCount = shortTTLCache.clearExpired();
      expect(clearedCount).toBe(2);
      
      shortTTLCache.dispose();
    });

    test('should optimize cache when over capacity', () => {
      const smallCache = new IntersectionCache({
        maxEntries: 3,
        maxMemoryMB: 0.001 // Very small memory limit
      });

      // Fill cache beyond capacity
      for (let i = 0; i < 5; i++) {
        smallCache.cacheIntersection(`key${i}`, mockIntersectionData);
      }

      const optimizedCount = smallCache.optimize();
      expect(optimizedCount).toBeGreaterThan(0);
      
      const stats = smallCache.getStatistics();
      expect(stats.totalEntries).toBeLessThanOrEqual(3);
      
      smallCache.dispose();
    });
  });

  describe('statistics', () => {
    test('should track hit and miss statistics', () => {
      cache.cacheIntersection('key1', mockIntersectionData);
      
      // Generate hits
      cache.getIntersection('key1');
      cache.getIntersection('key1');
      
      // Generate misses
      cache.getIntersection('missing1');
      cache.getIntersection('missing2');
      
      const stats = cache.getStatistics();
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should track memory usage', () => {
      const initialStats = cache.getStatistics();
      const initialMemory = initialStats.totalMemoryUsage;
      
      cache.cacheIntersection('key1', mockIntersectionData);
      
      const afterStats = cache.getStatistics();
      expect(afterStats.totalMemoryUsage).toBeGreaterThan(initialMemory);
      expect(afterStats.totalEntries).toBe(1);
    });

    test('should track entry timestamps', () => {
      const beforeTime = Date.now();
      
      cache.cacheIntersection('key1', mockIntersectionData);
      
      const afterTime = Date.now();
      const stats = cache.getStatistics();
      
      expect(stats.newestEntry).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.newestEntry).toBeLessThanOrEqual(afterTime);
    });

    test('should disable statistics when configured', () => {
      const noStatsCache = new IntersectionCache({
        enableStatistics: false
      });

      noStatsCache.cacheIntersection('key1', mockIntersectionData);
      noStatsCache.getIntersection('key1');
      noStatsCache.getIntersection('missing');
      
      const stats = noStatsCache.getStatistics();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.totalEntries).toBe(0);
      
      noStatsCache.dispose();
    });
  });

  describe('performance optimization', () => {
    test('should handle large number of entries efficiently', () => {
      const largeCache = new IntersectionCache({
        maxEntries: 1000,
        maxMemoryMB: 10
      });

      const startTime = performance.now();
      
      // Cache many entries
      for (let i = 0; i < 100; i++) {
        const key = `performance_key_${i}`;
        largeCache.cacheIntersection(key, mockIntersectionData);
      }
      
      // Retrieve entries
      for (let i = 0; i < 100; i++) {
        const key = `performance_key_${i}`;
        const retrieved = largeCache.getIntersection(key);
        expect(retrieved).toBeDefined();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
      
      largeCache.dispose();
    });

    test('should handle concurrent access patterns', async () => {
      const concurrentCache = new IntersectionCache({
        maxEntries: 50,
        maxMemoryMB: 5
      });

      // Simulate concurrent caching and retrieval
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        promises.push(
          new Promise<void>(resolve => {
            setTimeout(() => {
              const key = `concurrent_key_${i}`;
              concurrentCache.cacheIntersection(key, mockIntersectionData);
              const retrieved = concurrentCache.getIntersection(key);
              expect(retrieved).toBeDefined();
              resolve();
            }, Math.random() * 10);
          })
        );
      }
      
      await Promise.all(promises);
      
      const stats = concurrentCache.getStatistics();
      expect(stats.totalEntries).toBe(20);
      
      concurrentCache.dispose();
    });
  });

  describe('error handling', () => {
    test('should handle null intersection data gracefully', () => {
      expect(() => {
        cache.cacheIntersection('null_key', null as any);
      }).not.toThrow();
    });

    test('should handle invalid keys gracefully', () => {
      expect(() => {
        cache.getIntersection('');
        cache.getIntersection(null as any);
        cache.getIntersection(undefined as any);
      }).not.toThrow();
    });

    test('should handle memory pressure gracefully', () => {
      const memoryPressureCache = new IntersectionCache({
        maxEntries: 2,
        maxMemoryMB: 0.001 // Very small limit
      });

      // Try to cache more than the limit
      for (let i = 0; i < 10; i++) {
        expect(() => {
          memoryPressureCache.cacheIntersection(`pressure_key_${i}`, mockIntersectionData);
        }).not.toThrow();
      }
      
      memoryPressureCache.dispose();
    });
  });

  describe('cleanup timer', () => {
    test('should start and stop cleanup timer correctly', () => {
      const timerCache = new IntersectionCache({
        cleanupIntervalMinutes: 0.01 // Very short interval for testing
      });

      // Cache should be created without errors
      expect(timerCache).toBeDefined();
      
      // Dispose should clean up timer
      expect(() => {
        timerCache.dispose();
      }).not.toThrow();
    });

    test('should not start timer when cleanup interval is zero', () => {
      const noTimerCache = new IntersectionCache({
        cleanupIntervalMinutes: 0
      });

      expect(noTimerCache).toBeDefined();
      noTimerCache.dispose();
    });
  });
});