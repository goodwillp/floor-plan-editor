/**
 * Caching Layer for BIM Wall System
 * 
 * Provides in-memory caching for frequently accessed walls and expensive geometric operations
 */

import { UnifiedWallData } from '../types/UnifiedWallData';
import { QualityMetrics } from '../types/QualityMetrics';
import { IntersectionData } from '../geometry/IntersectionData';

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number; // Estimated memory size in bytes
}

export interface CacheStatistics {
  totalEntries: number;
  totalMemoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  averageAccessCount: number;
}

export interface CacheConfiguration {
  maxMemoryUsage: number; // Maximum memory usage in bytes
  maxEntries: number; // Maximum number of entries
  ttl: number; // Time to live in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'ttl'; // Eviction policy
  enableStatistics: boolean;
}

export interface GeometricComputationKey {
  operation: string;
  wallId: string;
  parameters: Record<string, any>;
  tolerance: number;
}

export interface IntersectionCacheKey {
  wallIds: string[];
  intersectionType: string;
  tolerance: number;
}

/**
 * Main caching layer implementation
 */
export class CachingLayer {
  private wallCache: Map<string, CacheEntry<UnifiedWallData>> = new Map();
  private qualityMetricsCache: Map<string, CacheEntry<QualityMetrics>> = new Map();
  private geometricComputationCache: Map<string, CacheEntry<any>> = new Map();
  private intersectionCache: Map<string, CacheEntry<IntersectionData[]>> = new Map();
  
  private statistics = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  private config: CacheConfiguration;

  constructor(config: Partial<CacheConfiguration> = {}) {
    this.config = {
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB default
      maxEntries: 1000,
      ttl: 30 * 60 * 1000, // 30 minutes
      evictionPolicy: 'lru',
      enableStatistics: true,
      ...config
    };
  }

  /**
   * Wall caching operations
   */
  async getWall(wallId: string): Promise<UnifiedWallData | null> {
    const entry = this.wallCache.get(wallId);
    
    if (!entry) {
      if (this.config.enableStatistics) {
        this.statistics.misses++;
      }
      return null;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.wallCache.delete(wallId);
      if (this.config.enableStatistics) {
        this.statistics.misses++;
      }
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    if (this.config.enableStatistics) {
      this.statistics.hits++;
    }

    return entry.data;
  }

  async setWall(wallId: string, wall: UnifiedWallData): Promise<void> {
    const size = this.estimateWallSize(wall);
    const entry: CacheEntry<UnifiedWallData> = {
      data: wall,
      timestamp: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
      size
    };

    // Check if we need to evict entries
    await this.ensureCapacity(size);

    this.wallCache.set(wallId, entry);
  }

  async removeWall(wallId: string): Promise<boolean> {
    return this.wallCache.delete(wallId);
  }

  /**
   * Quality metrics caching operations
   */
  async getQualityMetrics(wallId: string): Promise<QualityMetrics | null> {
    const entry = this.qualityMetricsCache.get(wallId);
    
    if (!entry) {
      if (this.config.enableStatistics) {
        this.statistics.misses++;
      }
      return null;
    }

    if (this.isExpired(entry)) {
      this.qualityMetricsCache.delete(wallId);
      if (this.config.enableStatistics) {
        this.statistics.misses++;
      }
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    if (this.config.enableStatistics) {
      this.statistics.hits++;
    }

    return entry.data;
  }

  async setQualityMetrics(wallId: string, metrics: QualityMetrics): Promise<void> {
    const size = this.estimateQualityMetricsSize(metrics);
    const entry: CacheEntry<QualityMetrics> = {
      data: metrics,
      timestamp: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
      size
    };

    await this.ensureCapacity(size);
    this.qualityMetricsCache.set(wallId, entry);
  }

  /**
   * Geometric computation caching operations
   */
  async getGeometricComputation(key: GeometricComputationKey): Promise<any | null> {
    const cacheKey = this.generateGeometricComputationKey(key);
    const entry = this.geometricComputationCache.get(cacheKey);
    
    if (!entry) {
      if (this.config.enableStatistics) {
        this.statistics.misses++;
      }
      return null;
    }

    if (this.isExpired(entry)) {
      this.geometricComputationCache.delete(cacheKey);
      if (this.config.enableStatistics) {
        this.statistics.misses++;
      }
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    if (this.config.enableStatistics) {
      this.statistics.hits++;
    }

    return entry.data;
  }

  async setGeometricComputation(key: GeometricComputationKey, result: any): Promise<void> {
    const cacheKey = this.generateGeometricComputationKey(key);
    const size = this.estimateObjectSize(result);
    const entry: CacheEntry<any> = {
      data: result,
      timestamp: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
      size
    };

    await this.ensureCapacity(size);
    this.geometricComputationCache.set(cacheKey, entry);
  }

  /**
   * Intersection caching operations
   */
  async getIntersectionData(key: IntersectionCacheKey): Promise<IntersectionData[] | null> {
    const cacheKey = this.generateIntersectionCacheKey(key);
    const entry = this.intersectionCache.get(cacheKey);
    
    if (!entry) {
      if (this.config.enableStatistics) {
        this.statistics.misses++;
      }
      return null;
    }

    if (this.isExpired(entry)) {
      this.intersectionCache.delete(cacheKey);
      if (this.config.enableStatistics) {
        this.statistics.misses++;
      }
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    if (this.config.enableStatistics) {
      this.statistics.hits++;
    }

    return entry.data;
  }

  async setIntersectionData(key: IntersectionCacheKey, intersections: IntersectionData[]): Promise<void> {
    const cacheKey = this.generateIntersectionCacheKey(key);
    const size = this.estimateIntersectionDataSize(intersections);
    const entry: CacheEntry<IntersectionData[]> = {
      data: intersections,
      timestamp: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
      size
    };

    await this.ensureCapacity(size);
    this.intersectionCache.set(cacheKey, entry);
  }

  /**
   * Cache management operations
   */
  async clear(): Promise<void> {
    this.wallCache.clear();
    this.qualityMetricsCache.clear();
    this.geometricComputationCache.clear();
    this.intersectionCache.clear();
    
    this.statistics = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  async clearExpired(): Promise<number> {
    let expiredCount = 0;
    const now = new Date();

    // Clear expired walls
    for (const [key, entry] of this.wallCache.entries()) {
      if (this.isExpired(entry)) {
        this.wallCache.delete(key);
        expiredCount++;
      }
    }

    // Clear expired quality metrics
    for (const [key, entry] of this.qualityMetricsCache.entries()) {
      if (this.isExpired(entry)) {
        this.qualityMetricsCache.delete(key);
        expiredCount++;
      }
    }

    // Clear expired geometric computations
    for (const [key, entry] of this.geometricComputationCache.entries()) {
      if (this.isExpired(entry)) {
        this.geometricComputationCache.delete(key);
        expiredCount++;
      }
    }

    // Clear expired intersections
    for (const [key, entry] of this.intersectionCache.entries()) {
      if (this.isExpired(entry)) {
        this.intersectionCache.delete(key);
        expiredCount++;
      }
    }

    return expiredCount;
  }

  async invalidateWall(wallId: string): Promise<void> {
    // Remove wall from cache
    this.wallCache.delete(wallId);
    
    // Remove related quality metrics
    this.qualityMetricsCache.delete(wallId);
    
    // Remove related geometric computations
    for (const [key, entry] of this.geometricComputationCache.entries()) {
      if (key.includes(wallId)) {
        this.geometricComputationCache.delete(key);
      }
    }
    
    // Remove related intersections
    for (const [key, entry] of this.intersectionCache.entries()) {
      if (key.includes(wallId)) {
        this.intersectionCache.delete(key);
      }
    }
  }

  /**
   * Statistics and monitoring
   */
  getStatistics(): CacheStatistics {
    const totalEntries = this.wallCache.size + 
                        this.qualityMetricsCache.size + 
                        this.geometricComputationCache.size + 
                        this.intersectionCache.size;

    const totalMemoryUsage = this.calculateTotalMemoryUsage();
    const totalRequests = this.statistics.hits + this.statistics.misses;
    const hitRate = totalRequests > 0 ? this.statistics.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.statistics.misses / totalRequests : 0;

    const allEntries = [
      ...this.wallCache.values(),
      ...this.qualityMetricsCache.values(),
      ...this.geometricComputationCache.values(),
      ...this.intersectionCache.values()
    ];

    const timestamps = allEntries.map(entry => entry.timestamp);
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null;
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null;
    
    const totalAccessCount = allEntries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const averageAccessCount = allEntries.length > 0 ? totalAccessCount / allEntries.length : 0;

    return {
      totalEntries,
      totalMemoryUsage,
      hitRate,
      missRate,
      evictionCount: this.statistics.evictions,
      oldestEntry,
      newestEntry,
      averageAccessCount
    };
  }

  getConfiguration(): CacheConfiguration {
    return { ...this.config };
  }

  updateConfiguration(newConfig: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Private helper methods
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    const now = new Date();
    return (now.getTime() - entry.timestamp.getTime()) > this.config.ttl;
  }

  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const currentMemoryUsage = this.calculateTotalMemoryUsage();
    const currentEntryCount = this.wallCache.size + 
                             this.qualityMetricsCache.size + 
                             this.geometricComputationCache.size + 
                             this.intersectionCache.size;

    // Check if we need to evict based on memory usage
    if (currentMemoryUsage + newEntrySize > this.config.maxMemoryUsage) {
      await this.evictEntries('memory', newEntrySize);
    }

    // Check if we need to evict based on entry count
    if (currentEntryCount >= this.config.maxEntries) {
      await this.evictEntries('count', 1);
    }
  }

  private async evictEntries(reason: 'memory' | 'count', targetAmount: number): Promise<void> {
    const allEntries: Array<{ key: string; entry: CacheEntry<any>; cache: Map<string, any> }> = [];

    // Collect all entries with their cache references
    for (const [key, entry] of this.wallCache.entries()) {
      allEntries.push({ key, entry, cache: this.wallCache });
    }
    for (const [key, entry] of this.qualityMetricsCache.entries()) {
      allEntries.push({ key, entry, cache: this.qualityMetricsCache });
    }
    for (const [key, entry] of this.geometricComputationCache.entries()) {
      allEntries.push({ key, entry, cache: this.geometricComputationCache });
    }
    for (const [key, entry] of this.intersectionCache.entries()) {
      allEntries.push({ key, entry, cache: this.intersectionCache });
    }

    // Sort entries based on eviction policy
    switch (this.config.evictionPolicy) {
      case 'lru':
        allEntries.sort((a, b) => a.entry.lastAccessed.getTime() - b.entry.lastAccessed.getTime());
        break;
      case 'lfu':
        allEntries.sort((a, b) => a.entry.accessCount - b.entry.accessCount);
        break;
      case 'ttl':
        allEntries.sort((a, b) => a.entry.timestamp.getTime() - b.entry.timestamp.getTime());
        break;
    }

    // Evict entries
    let evictedAmount = 0;
    let evictedCount = 0;

    for (const { key, entry, cache } of allEntries) {
      cache.delete(key);
      evictedCount++;
      evictedAmount += entry.size;
      
      if (this.config.enableStatistics) {
        this.statistics.evictions++;
      }

      // Check if we've evicted enough
      if (reason === 'memory' && evictedAmount >= targetAmount) {
        break;
      }
      if (reason === 'count' && evictedCount >= targetAmount) {
        break;
      }
    }
  }

  private calculateTotalMemoryUsage(): number {
    let total = 0;

    for (const entry of this.wallCache.values()) {
      total += entry.size;
    }
    for (const entry of this.qualityMetricsCache.values()) {
      total += entry.size;
    }
    for (const entry of this.geometricComputationCache.values()) {
      total += entry.size;
    }
    for (const entry of this.intersectionCache.values()) {
      total += entry.size;
    }

    return total;
  }

  private estimateWallSize(wall: UnifiedWallData): number {
    // More realistic estimation of memory usage
    let size = 2000; // Base size for object overhead
    
    // Baseline points
    size += wall.baseline.points.length * 200;
    
    // Basic geometry
    size += JSON.stringify(wall.basicGeometry).length * 2;
    
    // BIM geometry if present
    if (wall.bimGeometry) {
      size += wall.bimGeometry.offsetCurves.length * 1000;
      size += wall.bimGeometry.intersectionData.length * 500;
      size += 1000; // Quality metrics
    }
    
    // Processing history
    size += wall.processingHistory.length * 200;
    
    return size;
  }

  private estimateQualityMetricsSize(metrics: QualityMetrics): number {
    let size = 200; // Base size
    size += metrics.issues.length * 100;
    size += metrics.recommendations.length * 50;
    return size;
  }

  private estimateIntersectionDataSize(intersections: IntersectionData[]): number {
    return intersections.length * 300; // Rough estimate per intersection
  }

  private estimateObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate
    } catch {
      return 1000; // Default size if serialization fails
    }
  }

  private generateGeometricComputationKey(key: GeometricComputationKey): string {
    const paramStr = JSON.stringify(key.parameters);
    return `${key.operation}:${key.wallId}:${key.tolerance}:${paramStr}`;
  }

  private generateIntersectionCacheKey(key: IntersectionCacheKey): string {
    const sortedWallIds = [...key.wallIds].sort();
    return `${key.intersectionType}:${sortedWallIds.join(',')}:${key.tolerance}`;
  }
}