/**
 * Caching Layer Tests
 * 
 * Tests for the BIM wall system caching layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CachingLayer } from '../../persistence/CachingLayer';
import { createTestWall, createTestQualityMetrics, createTestIntersectionData } from '../helpers/TestDataFactory';
import { QualityIssueType } from '../../types/QualityMetrics';
import { IntersectionType } from '../../types/IntersectionTypes';

describe('CachingLayer', () => {
  let cache: CachingLayer;

  beforeEach(() => {
    cache = new CachingLayer({
      maxMemoryUsage: 1024 * 1024, // 1MB for testing
      maxEntries: 100,
      ttl: 5000, // 5 seconds for testing
      evictionPolicy: 'lru',
      enableStatistics: true
    });
  });

  describe('Wall Caching', () => {
    it('should cache and retrieve walls', async () => {
      const testWall = createTestWall({
        id: 'test-wall-1',
        type: 'Layout',
        thickness: 100
      });

      // Initially should return null
      const initialResult = await cache.getWall('test-wall-1');
      expect(initialResult).toBeNull();

      // Set wall in cache
      await cache.setWall('test-wall-1', testWall);

      // Should now return the cached wall
      const cachedWall = await cache.getWall('test-wall-1');
      expect(cachedWall).toBeDefined();
      expect(cachedWall!.id).toBe('test-wall-1');
      expect(cachedWall!.type).toBe('Layout');
      expect(cachedWall!.thickness).toBe(100);
    });

    it('should handle cache misses', async () => {
      const result = await cache.getWall('non-existent-wall');
      expect(result).toBeNull();

      const stats = cache.getStatistics();
      expect(stats.missRate).toBeGreaterThan(0);
    });

    it('should update access statistics on cache hits', async () => {
      const testWall = createTestWall({
        id: 'test-wall-stats',
        type: 'Layout',
        thickness: 100
      });

      await cache.setWall('test-wall-stats', testWall);

      // Access the wall multiple times
      await cache.getWall('test-wall-stats');
      await cache.getWall('test-wall-stats');
      await cache.getWall('test-wall-stats');

      const stats = cache.getStatistics();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.averageAccessCount).toBeGreaterThan(1);
    });

    it('should remove walls from cache', async () => {
      const testWall = createTestWall({
        id: 'test-wall-remove',
        type: 'Layout',
        thickness: 100
      });

      await cache.setWall('test-wall-remove', testWall);
      
      // Verify it's cached
      const cachedWall = await cache.getWall('test-wall-remove');
      expect(cachedWall).toBeDefined();

      // Remove from cache
      const removed = await cache.removeWall('test-wall-remove');
      expect(removed).toBe(true);

      // Should no longer be in cache
      const afterRemoval = await cache.getWall('test-wall-remove');
      expect(afterRemoval).toBeNull();
    });

    it('should handle TTL expiration', async () => {
      // Create cache with very short TTL
      const shortTtlCache = new CachingLayer({
        ttl: 10, // 10ms
        enableStatistics: true
      });

      const testWall = createTestWall({
        id: 'test-wall-ttl',
        type: 'Layout',
        thickness: 100
      });

      await shortTtlCache.setWall('test-wall-ttl', testWall);

      // Should be available immediately
      const immediate = await shortTtlCache.getWall('test-wall-ttl');
      expect(immediate).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should be expired now
      const expired = await shortTtlCache.getWall('test-wall-ttl');
      expect(expired).toBeNull();
    });
  });

  describe('Quality Metrics Caching', () => {
    it('should cache and retrieve quality metrics', async () => {
      const testMetrics = createTestQualityMetrics({
        geometricAccuracy: 0.95,
        sliverFaceCount: 2,
        issues: [
          {
            type: QualityIssueType.SLIVER_FACE,
            severity: 'medium',
            description: 'Test issue',
            autoFixable: true
          }
        ]
      });

      // Initially should return null
      const initialResult = await cache.getQualityMetrics('test-wall-1');
      expect(initialResult).toBeNull();

      // Set metrics in cache
      await cache.setQualityMetrics('test-wall-1', testMetrics);

      // Should now return the cached metrics
      const cachedMetrics = await cache.getQualityMetrics('test-wall-1');
      expect(cachedMetrics).toBeDefined();
      expect(cachedMetrics!.geometricAccuracy).toBe(0.95);
      expect(cachedMetrics!.sliverFaceCount).toBe(2);
      expect(cachedMetrics!.issues).toHaveLength(1);
    });

    it('should handle quality metrics TTL expiration', async () => {
      const shortTtlCache = new CachingLayer({ ttl: 10 });

      const testMetrics = createTestQualityMetrics({
        geometricAccuracy: 0.95
      });

      await shortTtlCache.setQualityMetrics('test-wall-ttl', testMetrics);

      // Should be available immediately
      const immediate = await shortTtlCache.getQualityMetrics('test-wall-ttl');
      expect(immediate).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should be expired now
      const expired = await shortTtlCache.getQualityMetrics('test-wall-ttl');
      expect(expired).toBeNull();
    });
  });

  describe('Geometric Computation Caching', () => {
    it('should cache and retrieve geometric computations', async () => {
      const computationKey = {
        operation: 'offset',
        wallId: 'test-wall-1',
        parameters: { distance: 50, joinType: 'miter' },
        tolerance: 0.1
      };

      const computationResult = {
        success: true,
        offsetCurve: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
        processingTime: 15
      };

      // Initially should return null
      const initialResult = await cache.getGeometricComputation(computationKey);
      expect(initialResult).toBeNull();

      // Set computation in cache
      await cache.setGeometricComputation(computationKey, computationResult);

      // Should now return the cached result
      const cachedResult = await cache.getGeometricComputation(computationKey);
      expect(cachedResult).toBeDefined();
      expect(cachedResult.success).toBe(true);
      expect(cachedResult.processingTime).toBe(15);
    });

    it('should generate consistent cache keys for geometric computations', async () => {
      const key1 = {
        operation: 'offset',
        wallId: 'wall-1',
        parameters: { distance: 50, joinType: 'miter' },
        tolerance: 0.1
      };

      const key2 = {
        operation: 'offset',
        wallId: 'wall-1',
        parameters: { distance: 50, joinType: 'miter' },
        tolerance: 0.1
      };

      const result = { success: true };

      await cache.setGeometricComputation(key1, result);
      const retrieved = await cache.getGeometricComputation(key2);

      expect(retrieved).toBeDefined();
      expect(retrieved.success).toBe(true);
    });

    it('should differentiate between different computation parameters', async () => {
      const key1 = {
        operation: 'offset',
        wallId: 'wall-1',
        parameters: { distance: 50 },
        tolerance: 0.1
      };

      const key2 = {
        operation: 'offset',
        wallId: 'wall-1',
        parameters: { distance: 100 }, // Different distance
        tolerance: 0.1
      };

      const result1 = { distance: 50 };
      const result2 = { distance: 100 };

      await cache.setGeometricComputation(key1, result1);
      await cache.setGeometricComputation(key2, result2);

      const retrieved1 = await cache.getGeometricComputation(key1);
      const retrieved2 = await cache.getGeometricComputation(key2);

      expect(retrieved1.distance).toBe(50);
      expect(retrieved2.distance).toBe(100);
    });
  });

  describe('Intersection Caching', () => {
    it('should cache and retrieve intersection data', async () => {
      const intersectionKey = {
        wallIds: ['wall-1', 'wall-2'],
        intersectionType: 'T_JUNCTION',
        tolerance: 0.1
      };

      const intersectionData = [
        createTestIntersectionData({
          id: 'intersection-1',
          type: IntersectionType.T_JUNCTION,
          participatingWalls: ['wall-1', 'wall-2'],
          intersectionPoint: { x: 100, y: 100 }
        })
      ];

      // Initially should return null
      const initialResult = await cache.getIntersectionData(intersectionKey);
      expect(initialResult).toBeNull();

      // Set intersection data in cache
      await cache.setIntersectionData(intersectionKey, intersectionData);

      // Should now return the cached data
      const cachedData = await cache.getIntersectionData(intersectionKey);
      expect(cachedData).toBeDefined();
      expect(cachedData!).toHaveLength(1);
      expect(cachedData![0].id).toBe('intersection-1');
      expect(cachedData![0].type).toBe(IntersectionType.T_JUNCTION);
    });

    it('should generate consistent cache keys for intersections regardless of wall order', async () => {
      const key1 = {
        wallIds: ['wall-1', 'wall-2'],
        intersectionType: 'T_JUNCTION',
        tolerance: 0.1
      };

      const key2 = {
        wallIds: ['wall-2', 'wall-1'], // Different order
        intersectionType: 'T_JUNCTION',
        tolerance: 0.1
      };

      const intersectionData = [
        createTestIntersectionData({
          id: 'intersection-1',
          type: IntersectionType.T_JUNCTION,
          participatingWalls: ['wall-1', 'wall-2'],
          intersectionPoint: { x: 100, y: 100 }
        })
      ];

      await cache.setIntersectionData(key1, intersectionData);
      const retrieved = await cache.getIntersectionData(key2);

      expect(retrieved).toBeDefined();
      expect(retrieved!).toHaveLength(1);
      expect(retrieved![0].id).toBe('intersection-1');
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', async () => {
      const testWall = createTestWall({
        id: 'test-wall-clear',
        type: 'Layout',
        thickness: 100
      });

      const testMetrics = createTestQualityMetrics({
        geometricAccuracy: 0.95
      });

      await cache.setWall('test-wall-clear', testWall);
      await cache.setQualityMetrics('test-wall-clear', testMetrics);

      // Verify items are cached
      expect(await cache.getWall('test-wall-clear')).toBeDefined();
      expect(await cache.getQualityMetrics('test-wall-clear')).toBeDefined();

      // Clear cache
      await cache.clear();

      // Should be empty now
      expect(await cache.getWall('test-wall-clear')).toBeNull();
      expect(await cache.getQualityMetrics('test-wall-clear')).toBeNull();

      const stats = cache.getStatistics();
      expect(stats.totalEntries).toBe(0);
    });

    it('should clear expired entries', async () => {
      const shortTtlCache = new CachingLayer({ ttl: 10 });

      const testWall1 = createTestWall({
        id: 'test-wall-1',
        type: 'Layout',
        thickness: 100
      });

      const testWall2 = createTestWall({
        id: 'test-wall-2',
        type: 'Layout',
        thickness: 100
      });

      await shortTtlCache.setWall('test-wall-1', testWall1);
      
      // Wait a bit then add second wall
      await new Promise(resolve => setTimeout(resolve, 15));
      await shortTtlCache.setWall('test-wall-2', testWall2);

      // Clear expired entries
      const expiredCount = await shortTtlCache.clearExpired();

      expect(expiredCount).toBeGreaterThan(0);
      expect(await shortTtlCache.getWall('test-wall-1')).toBeNull(); // Should be expired
      expect(await shortTtlCache.getWall('test-wall-2')).toBeDefined(); // Should still be valid
    });

    it('should invalidate wall and related data', async () => {
      const testWall = createTestWall({
        id: 'test-wall-invalidate',
        type: 'Layout',
        thickness: 100
      });

      const testMetrics = createTestQualityMetrics({
        geometricAccuracy: 0.95
      });

      const computationKey = {
        operation: 'offset',
        wallId: 'test-wall-invalidate',
        parameters: { distance: 50 },
        tolerance: 0.1
      };

      const intersectionKey = {
        wallIds: ['test-wall-invalidate', 'other-wall'],
        intersectionType: 'T_JUNCTION',
        tolerance: 0.1
      };

      // Cache all related data
      await cache.setWall('test-wall-invalidate', testWall);
      await cache.setQualityMetrics('test-wall-invalidate', testMetrics);
      await cache.setGeometricComputation(computationKey, { success: true });
      await cache.setIntersectionData(intersectionKey, []);

      // Verify all are cached
      expect(await cache.getWall('test-wall-invalidate')).toBeDefined();
      expect(await cache.getQualityMetrics('test-wall-invalidate')).toBeDefined();
      expect(await cache.getGeometricComputation(computationKey)).toBeDefined();
      expect(await cache.getIntersectionData(intersectionKey)).toBeDefined();

      // Invalidate the wall
      await cache.invalidateWall('test-wall-invalidate');

      // All related data should be removed
      expect(await cache.getWall('test-wall-invalidate')).toBeNull();
      expect(await cache.getQualityMetrics('test-wall-invalidate')).toBeNull();
      expect(await cache.getGeometricComputation(computationKey)).toBeNull();
      expect(await cache.getIntersectionData(intersectionKey)).toBeNull();
    });
  });

  describe('Eviction Policies', () => {
    it('should evict entries when memory limit is exceeded', async () => {
      // Create cache with very small memory limit
      const smallCache = new CachingLayer({
        maxMemoryUsage: 5000, // 5KB
        maxEntries: 1000,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      // Add walls until memory limit is exceeded
      const walls = [];
      for (let i = 0; i < 10; i++) {
        const wall = createTestWall({
          id: `wall-${i}`,
          type: 'Layout',
          thickness: 100,
          includeBIMGeometry: true // Larger memory footprint
        });
        walls.push(wall);
        await smallCache.setWall(`wall-${i}`, wall);
      }

      const stats = smallCache.getStatistics();
      expect(stats.evictionCount).toBeGreaterThan(0);
      expect(stats.totalMemoryUsage).toBeLessThanOrEqual(5000);
    });

    it('should evict entries when entry limit is exceeded', async () => {
      const limitedCache = new CachingLayer({
        maxEntries: 3,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      // Add more walls than the limit
      for (let i = 0; i < 5; i++) {
        const wall = createTestWall({
          id: `wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        await limitedCache.setWall(`wall-${i}`, wall);
      }

      const stats = limitedCache.getStatistics();
      expect(stats.totalEntries).toBeLessThanOrEqual(3);
      expect(stats.evictionCount).toBeGreaterThan(0);
    });

    it('should use LRU eviction policy correctly', async () => {
      const lruCache = new CachingLayer({
        maxEntries: 3,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      // Add 3 walls
      for (let i = 0; i < 3; i++) {
        const wall = createTestWall({
          id: `wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        await lruCache.setWall(`wall-${i}`, wall);
      }

      // Access wall-1 to make it recently used
      await lruCache.getWall('wall-1');

      // Add a new wall, should evict wall-0 (least recently used)
      const newWall = createTestWall({
        id: 'wall-new',
        type: 'Layout',
        thickness: 100
      });
      await lruCache.setWall('wall-new', newWall);

      // wall-0 should be evicted, others should remain
      expect(await lruCache.getWall('wall-0')).toBeNull();
      expect(await lruCache.getWall('wall-1')).toBeDefined();
      expect(await lruCache.getWall('wall-2')).toBeDefined();
      expect(await lruCache.getWall('wall-new')).toBeDefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track cache statistics correctly', async () => {
      const testWall = createTestWall({
        id: 'stats-wall',
        type: 'Layout',
        thickness: 100
      });

      // Generate some hits and misses
      await cache.getWall('non-existent'); // Miss
      await cache.setWall('stats-wall', testWall);
      await cache.getWall('stats-wall'); // Hit
      await cache.getWall('stats-wall'); // Hit
      await cache.getWall('another-non-existent'); // Miss

      const stats = cache.getStatistics();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2/4); // 2 hits out of 4 requests
      expect(stats.missRate).toBeCloseTo(2/4); // 2 misses out of 4 requests
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);
      expect(stats.averageAccessCount).toBeGreaterThan(1);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('should provide configuration access', () => {
      const config = cache.getConfiguration();
      
      expect(config.maxMemoryUsage).toBe(1024 * 1024);
      expect(config.maxEntries).toBe(100);
      expect(config.ttl).toBe(5000);
      expect(config.evictionPolicy).toBe('lru');
      expect(config.enableStatistics).toBe(true);
    });

    it('should allow configuration updates', () => {
      cache.updateConfiguration({
        maxMemoryUsage: 2 * 1024 * 1024,
        evictionPolicy: 'lfu'
      });

      const config = cache.getConfiguration();
      expect(config.maxMemoryUsage).toBe(2 * 1024 * 1024);
      expect(config.evictionPolicy).toBe('lfu');
      expect(config.maxEntries).toBe(100); // Should remain unchanged
    });
  });

  describe('Performance Optimization', () => {
    it('should handle concurrent cache operations', async () => {
      const promises = [];

      // Simulate concurrent operations
      for (let i = 0; i < 10; i++) {
        const wall = createTestWall({
          id: `concurrent-wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        
        promises.push(cache.setWall(`concurrent-wall-${i}`, wall));
        promises.push(cache.getWall(`concurrent-wall-${i}`));
      }

      // All operations should complete without errors
      await Promise.all(promises);

      const stats = cache.getStatistics();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should estimate memory usage reasonably', async () => {
      const smallWall = createTestWall({
        id: 'small-wall',
        type: 'Layout',
        thickness: 100
      });

      const largeWall = createTestWall({
        id: 'large-wall',
        type: 'Layout',
        thickness: 100,
        includeBIMGeometry: true,
        baselinePoints: Array.from({ length: 100 }, (_, i) => ({ x: i, y: i }))
      });

      await cache.setWall('small-wall', smallWall);
      const statsAfterSmall = cache.getStatistics();

      await cache.setWall('large-wall', largeWall);
      const statsAfterLarge = cache.getStatistics();

      // Large wall should use more memory
      expect(statsAfterLarge.totalMemoryUsage).toBeGreaterThan(statsAfterSmall.totalMemoryUsage);
    });
  });
});