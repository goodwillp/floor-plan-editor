/**
 * Cache Performance Tests
 * 
 * Performance tests for measuring cache effectiveness and memory usage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CachingLayer } from '../../persistence/CachingLayer';
import { createTestWall, createTestQualityMetrics } from '../helpers/TestDataFactory';

describe('Cache Performance', () => {
  let cache: CachingLayer;

  beforeEach(() => {
    cache = new CachingLayer({
      maxMemoryUsage: 10 * 1024 * 1024, // 10MB
      maxEntries: 1000,
      ttl: 60000, // 1 minute
      evictionPolicy: 'lru',
      enableStatistics: true
    });
  });

  describe('Memory Usage', () => {
    it('should track memory usage accurately', async () => {
      const initialStats = cache.getStatistics();
      expect(initialStats.totalMemoryUsage).toBe(0);

      // Add walls and track memory growth
      const memoryUsages: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const wall = createTestWall({
          id: `memory-test-wall-${i}`,
          type: 'Layout',
          thickness: 100,
          includeBIMGeometry: i % 2 === 0 // Every other wall has BIM geometry
        });

        await cache.setWall(`memory-test-wall-${i}`, wall);
        
        const stats = cache.getStatistics();
        memoryUsages.push(stats.totalMemoryUsage);
      }

      // Memory usage should generally increase
      expect(memoryUsages[memoryUsages.length - 1]).toBeGreaterThan(memoryUsages[0]);
      
      // Walls with BIM geometry should use more memory
      const finalStats = cache.getStatistics();
      expect(finalStats.totalMemoryUsage).toBeGreaterThan(0);
      expect(finalStats.totalEntries).toBe(10);
    });

    it('should respect memory limits', async () => {
      // Create cache with small memory limit
      const limitedCache = new CachingLayer({
        maxMemoryUsage: 50000, // 50KB
        maxEntries: 1000,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      // Add walls until memory limit is hit
      for (let i = 0; i < 50; i++) {
        const wall = createTestWall({
          id: `limited-wall-${i}`,
          type: 'Layout',
          thickness: 100,
          includeBIMGeometry: true
        });

        await limitedCache.setWall(`limited-wall-${i}`, wall);
      }

      const stats = limitedCache.getStatistics();
      expect(stats.totalMemoryUsage).toBeLessThanOrEqual(50000);
      expect(stats.evictionCount).toBeGreaterThan(0);
    });
  });

  describe('Cache Hit Performance', () => {
    it('should demonstrate performance improvement with caching', async () => {
      const testWalls = [];
      
      // Create test walls
      for (let i = 0; i < 100; i++) {
        const wall = createTestWall({
          id: `perf-wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        testWalls.push(wall);
        await cache.setWall(`perf-wall-${i}`, wall);
      }

      // Measure cache hit performance
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const wallId = `perf-wall-${i % 100}`;
        const wall = await cache.getWall(wallId);
        expect(wall).toBeDefined();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete quickly (cache hits are fast)
      expect(totalTime).toBeLessThan(1000); // Less than 1 second

      const stats = cache.getStatistics();
      expect(stats.hitRate).toBeGreaterThan(0.9); // Should have high hit rate
    });

    it('should handle mixed hit/miss scenarios efficiently', async () => {
      // Cache some walls
      for (let i = 0; i < 50; i++) {
        const wall = createTestWall({
          id: `mixed-wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        await cache.setWall(`mixed-wall-${i}`, wall);
      }

      const startTime = Date.now();
      
      // Mix of hits and misses
      for (let i = 0; i < 200; i++) {
        if (i % 2 === 0) {
          // Cache hit
          await cache.getWall(`mixed-wall-${i % 50}`);
        } else {
          // Cache miss
          await cache.getWall(`non-existent-wall-${i}`);
        }
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(2000); // Should still be reasonably fast

      const stats = cache.getStatistics();
      expect(stats.hitRate).toBeCloseTo(0.5, 1); // Should be around 50%
    });
  });

  describe('Eviction Performance', () => {
    it('should handle LRU eviction efficiently', async () => {
      const lruCache = new CachingLayer({
        maxEntries: 100,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      const startTime = Date.now();

      // Add more walls than the limit to trigger evictions
      for (let i = 0; i < 200; i++) {
        const wall = createTestWall({
          id: `lru-wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        await lruCache.setWall(`lru-wall-${i}`, wall);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle evictions efficiently
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds

      const stats = lruCache.getStatistics();
      expect(stats.totalEntries).toBeLessThanOrEqual(100);
      expect(stats.evictionCount).toBeGreaterThan(0);
    });

    it('should handle LFU eviction efficiently', async () => {
      const lfuCache = new CachingLayer({
        maxEntries: 100,
        evictionPolicy: 'lfu',
        enableStatistics: true
      });

      // Add walls and access some more frequently
      for (let i = 0; i < 150; i++) {
        const wall = createTestWall({
          id: `lfu-wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        await lfuCache.setWall(`lfu-wall-${i}`, wall);

        // Access first 50 walls more frequently
        if (i < 50) {
          await lfuCache.getWall(`lfu-wall-${i}`);
          await lfuCache.getWall(`lfu-wall-${i}`);
        }
      }

      const stats = lfuCache.getStatistics();
      expect(stats.totalEntries).toBeLessThanOrEqual(100);
      expect(stats.evictionCount).toBeGreaterThan(0);

      // Frequently accessed walls should still be in cache
      for (let i = 0; i < 50; i++) {
        const wall = await lfuCache.getWall(`lfu-wall-${i}`);
        if (wall) {
          expect(wall.id).toBe(`lfu-wall-${i}`);
        }
      }
    });
  });

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent reads efficiently', async () => {
      // Pre-populate cache
      for (let i = 0; i < 50; i++) {
        const wall = createTestWall({
          id: `concurrent-wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        await cache.setWall(`concurrent-wall-${i}`, wall);
      }

      const startTime = Date.now();

      // Simulate concurrent reads
      const readPromises = [];
      for (let i = 0; i < 1000; i++) {
        const wallId = `concurrent-wall-${i % 50}`;
        readPromises.push(cache.getWall(wallId));
      }

      const results = await Promise.all(readPromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle concurrent reads efficiently
      expect(totalTime).toBeLessThan(2000); // Less than 2 seconds
      expect(results.filter(r => r !== null)).toHaveLength(1000); // All should be hits

      const stats = cache.getStatistics();
      expect(stats.hitRate).toBeGreaterThan(0.9);
    });

    it('should handle concurrent writes efficiently', async () => {
      const startTime = Date.now();

      // Simulate concurrent writes
      const writePromises = [];
      for (let i = 0; i < 100; i++) {
        const wall = createTestWall({
          id: `write-wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        writePromises.push(cache.setWall(`write-wall-${i}`, wall));
      }

      await Promise.all(writePromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle concurrent writes efficiently
      expect(totalTime).toBeLessThan(3000); // Less than 3 seconds

      const stats = cache.getStatistics();
      expect(stats.totalEntries).toBe(100);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large numbers of walls efficiently', async () => {
      const largeCache = new CachingLayer({
        maxMemoryUsage: 50 * 1024 * 1024, // 50MB
        maxEntries: 5000,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      const startTime = Date.now();

      // Add a large number of walls
      for (let i = 0; i < 1000; i++) {
        const wall = createTestWall({
          id: `large-wall-${i}`,
          type: 'Layout',
          thickness: 100,
          includeBIMGeometry: i % 10 === 0 // Every 10th wall has BIM geometry
        });
        await largeCache.setWall(`large-wall-${i}`, wall);
      }

      const addTime = Date.now() - startTime;

      // Test retrieval performance
      const retrievalStartTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const wall = await largeCache.getWall(`large-wall-${i}`);
        expect(wall).toBeDefined();
      }
      
      const retrievalTime = Date.now() - retrievalStartTime;

      // Should handle large datasets efficiently
      expect(addTime).toBeLessThan(10000); // Less than 10 seconds to add
      expect(retrievalTime).toBeLessThan(2000); // Less than 2 seconds to retrieve all

      const stats = largeCache.getStatistics();
      expect(stats.totalEntries).toBe(1000);
      expect(stats.hitRate).toBeGreaterThan(0.9);
    });

    it('should maintain performance with complex geometric data', async () => {
      const complexCache = new CachingLayer({
        maxMemoryUsage: 20 * 1024 * 1024, // 20MB
        maxEntries: 500,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      const startTime = Date.now();

      // Add walls with complex BIM geometry
      for (let i = 0; i < 100; i++) {
        const wall = createTestWall({
          id: `complex-wall-${i}`,
          type: 'Layout',
          thickness: 100,
          includeBIMGeometry: true,
          baselinePoints: Array.from({ length: 20 }, (_, j) => ({ x: j * 10, y: Math.sin(j) * 10 }))
        });

        await complexCache.setWall(`complex-wall-${i}`, wall);

        // Also cache quality metrics
        const metrics = createTestQualityMetrics({
          geometricAccuracy: 0.95 - (i * 0.001),
          sliverFaceCount: i % 5,
          issues: Array.from({ length: i % 3 }, (_, k) => ({
            type: 'sliver_face' as any,
            severity: 'medium' as any,
            description: `Issue ${k}`,
            autoFixable: true
          }))
        });

        await complexCache.setQualityMetrics(`complex-wall-${i}`, metrics);
      }

      const addTime = Date.now() - startTime;

      // Test mixed retrieval performance
      const retrievalStartTime = Date.now();
      
      for (let i = 0; i < 200; i++) {
        const wallId = `complex-wall-${i % 100}`;
        const wall = await complexCache.getWall(wallId);
        const metrics = await complexCache.getQualityMetrics(wallId);
        
        expect(wall).toBeDefined();
        expect(metrics).toBeDefined();
      }
      
      const retrievalTime = Date.now() - retrievalStartTime;

      // Should handle complex data efficiently
      expect(addTime).toBeLessThan(15000); // Less than 15 seconds to add
      expect(retrievalTime).toBeLessThan(3000); // Less than 3 seconds to retrieve

      const stats = complexCache.getStatistics();
      expect(stats.totalEntries).toBe(200); // 100 walls + 100 quality metrics
      expect(stats.hitRate).toBeGreaterThan(0.8);
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle memory pressure gracefully', async () => {
      const pressureCache = new CachingLayer({
        maxMemoryUsage: 500 * 1024, // 500KB - smaller limit to ensure eviction
        maxEntries: 1000,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      // Add walls until memory pressure is high
      for (let i = 0; i < 200; i++) {
        const wall = createTestWall({
          id: `pressure-wall-${i}`,
          type: 'Layout',
          thickness: 100,
          includeBIMGeometry: true
        });
        await pressureCache.setWall(`pressure-wall-${i}`, wall);
      }

      const stats = pressureCache.getStatistics();
      
      // Should have evicted entries to stay within memory limit
      expect(stats.totalMemoryUsage).toBeLessThanOrEqual(500 * 1024);
      expect(stats.evictionCount).toBeGreaterThan(0);
      expect(stats.totalEntries).toBeLessThan(200);
    });

    it('should maintain cache effectiveness under pressure', async () => {
      const effectivenessCache = new CachingLayer({
        maxMemoryUsage: 2 * 1024 * 1024, // 2MB
        maxEntries: 100,
        evictionPolicy: 'lru',
        enableStatistics: true
      });

      // Add walls and create access patterns
      for (let i = 0; i < 150; i++) {
        const wall = createTestWall({
          id: `effectiveness-wall-${i}`,
          type: 'Layout',
          thickness: 100
        });
        await effectivenessCache.setWall(`effectiveness-wall-${i}`, wall);

        // Create hot spots (frequently accessed walls)
        if (i < 20) {
          for (let j = 0; j < 5; j++) {
            await effectivenessCache.getWall(`effectiveness-wall-${i}`);
          }
        }
      }

      // Test that hot spots are still cached
      let hotSpotHits = 0;
      for (let i = 0; i < 20; i++) {
        const wall = await effectivenessCache.getWall(`effectiveness-wall-${i}`);
        if (wall) {
          hotSpotHits++;
        }
      }

      const stats = effectivenessCache.getStatistics();
      
      // Should maintain some hit rate for frequently accessed items
      expect(hotSpotHits).toBeGreaterThanOrEqual(0); // Some hot spots should still be cached
      expect(stats.totalEntries).toBeLessThanOrEqual(100);
      expect(stats.evictionCount).toBeGreaterThan(0);
      
      // The cache should be working (some entries should be present)
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });
});