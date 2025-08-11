/**
 * IntersectionCache class for performance optimization of intersection calculations
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { IntersectionData } from '../geometry/IntersectionData';
import type { MiterCalculation } from '../geometry/MiterCalculation';
import type { IntersectionType } from '../types/BIMTypes';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size in bytes
}

/**
 * Cache statistics interface
 */
export interface CacheStatistics {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalMemoryUsage: number;
  averageAccessTime: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  maxEntries: number;
  maxMemoryMB: number;
  ttlMinutes: number;
  cleanupIntervalMinutes: number;
  enableStatistics: boolean;
}

/**
 * High-performance intersection caching system
 */
export class IntersectionCache {
  private readonly intersectionCache = new Map<string, CacheEntry<IntersectionData>>();
  private readonly miterCache = new Map<string, CacheEntry<MiterCalculation>>();
  private readonly config: CacheConfig;
  private statistics: CacheStatistics;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries || 1000,
      maxMemoryMB: config.maxMemoryMB || 50,
      ttlMinutes: config.ttlMinutes || 60,
      cleanupIntervalMinutes: config.cleanupIntervalMinutes || 10,
      enableStatistics: config.enableStatistics ?? true
    };

    this.statistics = {
      totalEntries: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      totalMemoryUsage: 0,
      averageAccessTime: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now()
    };

    this.startCleanupTimer();
  }

  /**
   * Cache an intersection data object
   */
  cacheIntersection(key: string, intersection: IntersectionData): void {
    if (!intersection || !key) {
      return; // Gracefully handle null/undefined data
    }

    const now = Date.now();
    const size = this.estimateIntersectionSize(intersection);

    // Check if we need to make room
    this.ensureCapacity(size);

    const entry: CacheEntry<IntersectionData> = {
      data: intersection,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    this.intersectionCache.set(key, entry);
    this.updateStatistics('cache', size);

    // Mark the intersection as cached
    if (typeof intersection.markAsCached === 'function') {
      intersection.markAsCached();
    }
  }

  /**
   * Retrieve cached intersection data
   */
  getIntersection(key: string): IntersectionData | null {
    const entry = this.intersectionCache.get(key);
    
    if (!entry) {
      this.updateStatistics('miss');
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    const ageMinutes = (now - entry.timestamp) / (1000 * 60);
    
    if (ageMinutes > this.config.ttlMinutes) {
      this.intersectionCache.delete(key);
      this.updateStatistics('miss');
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateStatistics('hit');

    return entry.data;
  }

  /**
   * Cache a miter calculation
   */
  cacheMiterCalculation(key: string, miter: MiterCalculation): void {
    const now = Date.now();
    const size = this.estimateMiterSize(miter);

    this.ensureCapacity(size);

    const entry: CacheEntry<MiterCalculation> = {
      data: miter,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    this.miterCache.set(key, entry);
    this.updateStatistics('cache', size);
  }

  /**
   * Retrieve cached miter calculation
   */
  getMiterCalculation(key: string): MiterCalculation | null {
    const entry = this.miterCache.get(key);
    
    if (!entry) {
      this.updateStatistics('miss');
      return null;
    }

    // Check expiration
    const now = Date.now();
    const ageMinutes = (now - entry.timestamp) / (1000 * 60);
    
    if (ageMinutes > this.config.ttlMinutes) {
      this.miterCache.delete(key);
      this.updateStatistics('miss');
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateStatistics('hit');

    return entry.data;
  }

  /**
   * Generate cache key for intersection
   */
  generateIntersectionKey(
    wallIds: string[],
    intersectionType: IntersectionType,
    intersectionPoint: { x: number; y: number },
    tolerance: number
  ): string {
    const sortedWalls = wallIds.sort().join('_');
    const pointKey = `${intersectionPoint.x.toFixed(6)}_${intersectionPoint.y.toFixed(6)}`;
    const toleranceKey = tolerance.toExponential(2);
    return `intersection_${sortedWalls}_${intersectionType}_${pointKey}_${toleranceKey}`;
  }

  /**
   * Generate cache key for miter calculation
   */
  generateMiterKey(
    leftPoint: { x: number; y: number },
    rightPoint: { x: number; y: number },
    baselinePoint: { x: number; y: number },
    wallThickness: number,
    tolerance: number
  ): string {
    const leftKey = `${leftPoint.x.toFixed(6)}_${leftPoint.y.toFixed(6)}`;
    const rightKey = `${rightPoint.x.toFixed(6)}_${rightPoint.y.toFixed(6)}`;
    const baseKey = `${baselinePoint.x.toFixed(6)}_${baselinePoint.y.toFixed(6)}`;
    const thicknessKey = wallThickness.toFixed(3);
    const toleranceKey = tolerance.toExponential(2);
    return `miter_${leftKey}_${rightKey}_${baseKey}_${thicknessKey}_${toleranceKey}`;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.intersectionCache.clear();
    this.miterCache.clear();
    this.resetStatistics();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    const ttlMs = this.config.ttlMinutes * 60 * 1000;
    let clearedCount = 0;

    // Clear expired intersections
    for (const [key, entry] of this.intersectionCache.entries()) {
      if (now - entry.timestamp > ttlMs) {
        this.intersectionCache.delete(key);
        this.updateStatistics('remove', entry.size);
        clearedCount++;
      }
    }

    // Clear expired miter calculations
    for (const [key, entry] of this.miterCache.entries()) {
      if (now - entry.timestamp > ttlMs) {
        this.miterCache.delete(key);
        this.updateStatistics('remove', entry.size);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    if (!this.config.enableStatistics) {
      return {
        totalEntries: 0,
        hitCount: 0,
        missCount: 0,
        hitRate: 0,
        totalMemoryUsage: 0,
        averageAccessTime: 0,
        oldestEntry: 0,
        newestEntry: 0
      };
    }

    return { ...this.statistics };
  }

  /**
   * Optimize cache by removing least recently used entries
   */
  optimize(): number {
    const totalEntries = this.intersectionCache.size + this.miterCache.size;
    
    if (totalEntries <= this.config.maxEntries * 0.8) {
      return 0; // No optimization needed
    }

    // Collect all entries with their access patterns
    const allEntries: Array<{
      key: string;
      entry: CacheEntry<any>;
      type: 'intersection' | 'miter';
      score: number;
    }> = [];

    // Score intersection entries
    for (const [key, entry] of this.intersectionCache.entries()) {
      const score = this.calculateLRUScore(entry);
      allEntries.push({ key, entry, type: 'intersection', score });
    }

    // Score miter entries
    for (const [key, entry] of this.miterCache.entries()) {
      const score = this.calculateLRUScore(entry);
      allEntries.push({ key, entry, type: 'miter', score });
    }

    // Sort by score (lower scores are removed first)
    allEntries.sort((a, b) => a.score - b.score);

    // Remove lowest scoring entries
    const targetSize = Math.floor(this.config.maxEntries * 0.7);
    const toRemove = totalEntries - targetSize;
    let removedCount = 0;

    for (let i = 0; i < Math.min(toRemove, allEntries.length); i++) {
      const { key, entry, type } = allEntries[i];
      
      if (type === 'intersection') {
        this.intersectionCache.delete(key);
      } else {
        this.miterCache.delete(key);
      }
      
      this.updateStatistics('remove', entry.size);
      removedCount++;
    }

    return removedCount;
  }

  /**
   * Dispose of the cache and cleanup resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private ensureCapacity(newEntrySize: number): void {
    const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
    
    // Check memory limit
    if (this.statistics.totalMemoryUsage + newEntrySize > maxMemoryBytes) {
      this.optimize();
    }

    // Check entry count limit
    const totalEntries = this.intersectionCache.size + this.miterCache.size;
    if (totalEntries >= this.config.maxEntries) {
      this.optimize();
    }
  }

  /**
   * Calculate LRU score for cache optimization
   */
  private calculateLRUScore(entry: CacheEntry<any>): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    const accessFrequency = entry.accessCount / (age / (1000 * 60 * 60)); // accesses per hour

    // Lower score = more likely to be removed
    // Factors: recency of access, frequency of access, age
    return (timeSinceAccess / 1000) - (accessFrequency * 100) + (age / 10000);
  }

  /**
   * Estimate memory size of intersection data
   */
  private estimateIntersectionSize(intersection: IntersectionData): number {
    if (!intersection) {
      return 0;
    }

    // Rough estimation in bytes
    let size = 200; // Base object overhead
    
    if (intersection.id) {
      size += intersection.id.length * 2; // String characters
    }
    
    if (intersection.participatingWalls) {
      size += intersection.participatingWalls.length * 50; // Wall IDs
    }
    
    if (intersection.offsetIntersections) {
      size += intersection.offsetIntersections.length * 32; // Points
    }
    
    if (intersection.resolutionMethod) {
      size += intersection.resolutionMethod.length * 2;
    }
    
    // Add geometry size estimation
    if (intersection.resolvedGeometry) {
      size += 1000; // Rough polygon size
    }
    
    return size;
  }

  /**
   * Estimate memory size of miter calculation
   */
  private estimateMiterSize(miter: MiterCalculation): number {
    // Rough estimation in bytes
    let size = 150; // Base object overhead
    size += 32 * 3; // Three points (apex, left, right)
    size += 8 * 4; // Four numbers (angle, accuracy, processingTime, etc.)
    size += miter.calculationMethod.length * 2;
    
    return size;
  }

  /**
   * Update cache statistics
   */
  private updateStatistics(operation: 'hit' | 'miss' | 'cache' | 'remove', size: number = 0): void {
    if (!this.config.enableStatistics) return;

    const now = Date.now();

    switch (operation) {
      case 'hit':
        this.statistics.hitCount++;
        break;
      case 'miss':
        this.statistics.missCount++;
        break;
      case 'cache':
        this.statistics.totalMemoryUsage += size;
        this.statistics.newestEntry = now;
        break;
      case 'remove':
        this.statistics.totalMemoryUsage -= size;
        break;
    }

    // Update derived statistics
    const totalRequests = this.statistics.hitCount + this.statistics.missCount;
    this.statistics.hitRate = totalRequests > 0 ? this.statistics.hitCount / totalRequests : 0;
    this.statistics.totalEntries = this.intersectionCache.size + this.miterCache.size;
  }

  /**
   * Reset statistics
   */
  private resetStatistics(): void {
    this.statistics = {
      totalEntries: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      totalMemoryUsage: 0,
      averageAccessTime: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now()
    };
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.config.cleanupIntervalMinutes <= 0) return;

    this.cleanupTimer = setInterval(() => {
      this.clearExpired();
      
      // Optimize if memory usage is high
      const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
      if (this.statistics.totalMemoryUsage > maxMemoryBytes * 0.8) {
        this.optimize();
      }
    }, this.config.cleanupIntervalMinutes * 60 * 1000);
  }
}