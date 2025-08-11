/**
 * Cache effectiveness monitoring and visualization
 */

import { CacheEffectivenessMetrics, OptimizationRecommendation, OptimizationType } from '../types/PerformanceTypes';

export interface CacheAccessEvent {
  cacheType: string;
  key: string;
  hit: boolean;
  accessTime: number;
  timestamp: number;
  size?: number;
}

export interface CacheEvictionEvent {
  cacheType: string;
  key: string;
  reason: 'size_limit' | 'ttl_expired' | 'manual' | 'lru';
  timestamp: number;
  age: number;
  accessCount: number;
}

export class CacheEffectivenessMonitor {
  private accessEvents: CacheAccessEvent[] = [];
  private evictionEvents: CacheEvictionEvent[] = [];
  private cacheConfigs: Map<string, CacheConfig> = new Map();

  constructor() {
    // Set up default cache configurations
    this.setupDefaultConfigs();
  }

  /**
   * Record a cache access event
   */
  recordAccess(event: CacheAccessEvent): void {
    this.accessEvents.push(event);
    
    // Cleanup old events periodically
    if (this.accessEvents.length > 10000) {
      this.cleanup();
    }
  }

  /**
   * Record a cache eviction event
   */
  recordEviction(event: CacheEvictionEvent): void {
    this.evictionEvents.push(event);
    
    // Cleanup old events periodically
    if (this.evictionEvents.length > 1000) {
      this.cleanup();
    }
  }

  /**
   * Calculate cache effectiveness metrics
   */
  calculateEffectiveness(cacheType: string, timeWindow?: number): CacheEffectivenessMetrics {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    
    const relevantAccesses = this.accessEvents.filter(
      event => event.cacheType === cacheType && event.timestamp >= cutoffTime
    );
    
    const relevantEvictions = this.evictionEvents.filter(
      event => event.cacheType === cacheType && event.timestamp >= cutoffTime
    );

    if (relevantAccesses.length === 0) {
      return this.createEmptyMetrics(cacheType);
    }

    const hits = relevantAccesses.filter(event => event.hit).length;
    const misses = relevantAccesses.length - hits;
    const hitRate = hits / relevantAccesses.length;
    const missRate = misses / relevantAccesses.length;

    const totalAccessTime = relevantAccesses.reduce((sum, event) => sum + event.accessTime, 0);
    const averageAccessTime = totalAccessTime / relevantAccesses.length;

    const evictionRate = relevantEvictions.length / relevantAccesses.length;

    // Estimate memory usage based on cache configuration
    const config = this.cacheConfigs.get(cacheType);
    const estimatedMemoryUsage = this.estimateMemoryUsage(cacheType, relevantAccesses);
    const entryCount = this.estimateEntryCount(cacheType, relevantAccesses, relevantEvictions);

    const recommendations = this.generateCacheRecommendations(
      cacheType,
      hitRate,
      evictionRate,
      averageAccessTime,
      estimatedMemoryUsage
    );

    return {
      cacheType,
      hitRate,
      missRate,
      evictionRate,
      averageAccessTime,
      memoryUsage: estimatedMemoryUsage,
      entryCount,
      maxSize: config?.maxSize || 1000,
      recommendations
    };
  }

  /**
   * Get cache effectiveness for all cache types
   */
  getAllCacheEffectiveness(timeWindow?: number): CacheEffectivenessMetrics[] {
    const cacheTypes = [...new Set(this.accessEvents.map(event => event.cacheType))];
    return cacheTypes.map(cacheType => this.calculateEffectiveness(cacheType, timeWindow));
  }

  /**
   * Analyze cache access patterns
   */
  analyzeCachePatterns(cacheType: string, timeWindow?: number): CacheAccessPattern {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const relevantAccesses = this.accessEvents.filter(
      event => event.cacheType === cacheType && event.timestamp >= cutoffTime
    );

    if (relevantAccesses.length === 0) {
      return {
        cacheType,
        totalAccesses: 0,
        uniqueKeys: 0,
        hotKeys: [],
        coldKeys: [],
        accessFrequency: new Map(),
        temporalPattern: [],
        recommendations: []
      };
    }

    // Analyze key access frequency
    const keyAccessCount = new Map<string, number>();
    relevantAccesses.forEach(event => {
      keyAccessCount.set(event.key, (keyAccessCount.get(event.key) || 0) + 1);
    });

    // Identify hot and cold keys
    const sortedKeys = Array.from(keyAccessCount.entries()).sort((a, b) => b[1] - a[1]);
    const hotKeys = sortedKeys.slice(0, Math.min(10, sortedKeys.length * 0.1)).map(([key, count]) => ({ key, count }));
    const coldKeys = sortedKeys.slice(-Math.min(10, sortedKeys.length * 0.1)).map(([key, count]) => ({ key, count }));

    // Analyze temporal patterns
    const temporalPattern = this.analyzeTemporalPattern(relevantAccesses);

    const recommendations = this.generatePatternRecommendations(
      cacheType,
      keyAccessCount,
      hotKeys,
      coldKeys,
      temporalPattern
    );

    return {
      cacheType,
      totalAccesses: relevantAccesses.length,
      uniqueKeys: keyAccessCount.size,
      hotKeys,
      coldKeys,
      accessFrequency: keyAccessCount,
      temporalPattern,
      recommendations
    };
  }

  /**
   * Monitor cache performance in real-time
   */
  startRealTimeMonitoring(cacheType: string, callback: (metrics: CacheEffectivenessMetrics) => void): () => void {
    const interval = setInterval(() => {
      const metrics = this.calculateEffectiveness(cacheType, 60000); // Last minute
      callback(metrics);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }

  /**
   * Generate cache optimization recommendations
   */
  private generateCacheRecommendations(
    cacheType: string,
    hitRate: number,
    evictionRate: number,
    averageAccessTime: number,
    memoryUsage: number
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Low hit rate recommendations
    if (hitRate < 0.7) {
      recommendations.push({
        id: `cache_hit_rate_${cacheType}_${Date.now()}`,
        type: OptimizationType.CACHING_OPTIMIZATION,
        severity: hitRate < 0.5 ? 'high' : 'medium',
        title: `Improve ${cacheType} Hit Rate`,
        description: `Cache hit rate is ${(hitRate * 100).toFixed(1)}%. Consider increasing cache size or adjusting TTL.`,
        impact: {
          performanceGain: (0.8 - hitRate) * 100,
          memoryReduction: 0,
          qualityImpact: 0
        },
        implementation: {
          difficulty: 'easy',
          estimatedTime: 2,
          dependencies: []
        },
        metrics: {
          currentValue: hitRate,
          targetValue: 0.8,
          threshold: 0.7
        }
      });
    }

    // High eviction rate recommendations
    if (evictionRate > 0.3) {
      recommendations.push({
        id: `cache_eviction_${cacheType}_${Date.now()}`,
        type: OptimizationType.CACHING_OPTIMIZATION,
        severity: 'medium',
        title: `Reduce ${cacheType} Eviction Rate`,
        description: `High eviction rate (${(evictionRate * 100).toFixed(1)}%) suggests cache size optimization needed.`,
        impact: {
          performanceGain: evictionRate * 50,
          memoryReduction: -20,
          qualityImpact: 0
        },
        implementation: {
          difficulty: 'easy',
          estimatedTime: 1,
          dependencies: []
        },
        metrics: {
          currentValue: evictionRate,
          targetValue: 0.2,
          threshold: 0.3
        }
      });
    }

    // Slow access time recommendations
    if (averageAccessTime > 10) {
      recommendations.push({
        id: `cache_access_time_${cacheType}_${Date.now()}`,
        type: OptimizationType.CACHING_OPTIMIZATION,
        severity: 'medium',
        title: `Optimize ${cacheType} Access Time`,
        description: `Average access time is ${averageAccessTime.toFixed(1)}ms. Consider cache structure optimization.`,
        impact: {
          performanceGain: Math.min(50, averageAccessTime),
          memoryReduction: 0,
          qualityImpact: 0
        },
        implementation: {
          difficulty: 'medium',
          estimatedTime: 4,
          dependencies: ['cache_structure_analysis']
        },
        metrics: {
          currentValue: averageAccessTime,
          targetValue: 5,
          threshold: 10
        }
      });
    }

    // High memory usage recommendations
    if (memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push({
        id: `cache_memory_${cacheType}_${Date.now()}`,
        type: OptimizationType.MEMORY_OPTIMIZATION,
        severity: 'medium',
        title: `Optimize ${cacheType} Memory Usage`,
        description: `Cache is using ${(memoryUsage / 1024 / 1024).toFixed(1)}MB. Consider compression or selective caching.`,
        impact: {
          performanceGain: 0,
          memoryReduction: 30,
          qualityImpact: 0
        },
        implementation: {
          difficulty: 'medium',
          estimatedTime: 6,
          dependencies: ['compression_library']
        },
        metrics: {
          currentValue: memoryUsage,
          targetValue: memoryUsage * 0.7,
          threshold: 50 * 1024 * 1024
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate pattern-based recommendations
   */
  private generatePatternRecommendations(
    cacheType: string,
    keyAccessCount: Map<string, number>,
    hotKeys: Array<{ key: string; count: number }>,
    coldKeys: Array<{ key: string; count: number }>,
    temporalPattern: TemporalPattern
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Hot key optimization
    if (hotKeys.length > 0 && hotKeys[0].count > keyAccessCount.size * 0.1) {
      recommendations.push({
        id: `hot_keys_${cacheType}_${Date.now()}`,
        type: OptimizationType.CACHING_OPTIMIZATION,
        severity: 'medium',
        title: `Optimize Hot Keys in ${cacheType}`,
        description: `Top key "${hotKeys[0].key}" accounts for ${((hotKeys[0].count / Array.from(keyAccessCount.values()).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}% of accesses. Consider dedicated caching.`,
        impact: {
          performanceGain: 20,
          memoryReduction: 0,
          qualityImpact: 0
        },
        implementation: {
          difficulty: 'medium',
          estimatedTime: 3,
          dependencies: ['hot_key_analysis']
        },
        metrics: {
          currentValue: hotKeys[0].count,
          targetValue: hotKeys[0].count * 0.5,
          threshold: keyAccessCount.size * 0.1
        }
      });
    }

    // Cold key cleanup
    if (coldKeys.length > keyAccessCount.size * 0.5) {
      recommendations.push({
        id: `cold_keys_${cacheType}_${Date.now()}`,
        type: OptimizationType.MEMORY_OPTIMIZATION,
        severity: 'low',
        title: `Clean Up Cold Keys in ${cacheType}`,
        description: `Many keys have low access frequency. Consider more aggressive TTL for cold keys.`,
        impact: {
          performanceGain: 5,
          memoryReduction: 25,
          qualityImpact: 0
        },
        implementation: {
          difficulty: 'easy',
          estimatedTime: 2,
          dependencies: []
        },
        metrics: {
          currentValue: coldKeys.length,
          targetValue: coldKeys.length * 0.5,
          threshold: keyAccessCount.size * 0.5
        }
      });
    }

    // Temporal pattern optimization
    if (temporalPattern.peakVariance > 0.5) {
      recommendations.push({
        id: `temporal_${cacheType}_${Date.now()}`,
        type: OptimizationType.CACHING_OPTIMIZATION,
        severity: 'low',
        title: `Optimize for Temporal Patterns in ${cacheType}`,
        description: `Access patterns show high variance. Consider time-based cache warming or adaptive sizing.`,
        impact: {
          performanceGain: 15,
          memoryReduction: 10,
          qualityImpact: 0
        },
        implementation: {
          difficulty: 'hard',
          estimatedTime: 8,
          dependencies: ['temporal_analysis', 'adaptive_caching']
        },
        metrics: {
          currentValue: temporalPattern.peakVariance,
          targetValue: 0.3,
          threshold: 0.5
        }
      });
    }

    return recommendations;
  }

  /**
   * Analyze temporal access patterns
   */
  private analyzeTemporalPattern(accesses: CacheAccessEvent[]): TemporalPattern {
    if (accesses.length === 0) {
      return {
        hourlyDistribution: new Array(24).fill(0),
        peakHour: 0,
        peakVariance: 0,
        burstiness: 0
      };
    }

    // Group accesses by hour
    const hourlyDistribution = new Array(24).fill(0);
    accesses.forEach(access => {
      const hour = new Date(access.timestamp).getHours();
      hourlyDistribution[hour]++;
    });

    // Find peak hour
    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));

    // Calculate variance
    const mean = hourlyDistribution.reduce((sum, count) => sum + count, 0) / 24;
    const variance = hourlyDistribution.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / 24;
    const peakVariance = Math.sqrt(variance) / mean;

    // Calculate burstiness (coefficient of variation of inter-arrival times)
    const interArrivalTimes: number[] = [];
    for (let i = 1; i < accesses.length; i++) {
      interArrivalTimes.push(accesses[i].timestamp - accesses[i - 1].timestamp);
    }

    const avgInterArrival = interArrivalTimes.reduce((sum, time) => sum + time, 0) / interArrivalTimes.length;
    const interArrivalVariance = interArrivalTimes.reduce((sum, time) => sum + Math.pow(time - avgInterArrival, 2), 0) / interArrivalTimes.length;
    const burstiness = Math.sqrt(interArrivalVariance) / avgInterArrival;

    return {
      hourlyDistribution,
      peakHour,
      peakVariance: isNaN(peakVariance) ? 0 : peakVariance,
      burstiness: isNaN(burstiness) ? 0 : burstiness
    };
  }

  /**
   * Estimate memory usage for a cache type
   */
  private estimateMemoryUsage(cacheType: string, accesses: CacheAccessEvent[]): number {
    const config = this.cacheConfigs.get(cacheType);
    if (!config) return 0;

    const uniqueKeys = new Set(accesses.map(access => access.key));
    const avgEntrySize = config.avgEntrySize || 1024; // 1KB default
    
    return uniqueKeys.size * avgEntrySize;
  }

  /**
   * Estimate current entry count
   */
  private estimateEntryCount(
    cacheType: string,
    accesses: CacheAccessEvent[],
    evictions: CacheEvictionEvent[]
  ): number {
    const uniqueKeys = new Set(accesses.map(access => access.key));
    const evictedKeys = new Set(evictions.map(eviction => eviction.key));
    
    // Subtract evicted keys from unique keys
    evictedKeys.forEach(key => uniqueKeys.delete(key));
    
    return uniqueKeys.size;
  }

  /**
   * Create empty metrics for a cache type
   */
  private createEmptyMetrics(cacheType: string): CacheEffectivenessMetrics {
    return {
      cacheType,
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      entryCount: 0,
      maxSize: this.cacheConfigs.get(cacheType)?.maxSize || 1000,
      recommendations: []
    };
  }

  /**
   * Set up default cache configurations
   */
  private setupDefaultConfigs(): void {
    this.cacheConfigs.set('geometric_operations', {
      maxSize: 1000,
      avgEntrySize: 2048,
      ttl: 300000 // 5 minutes
    });

    this.cacheConfigs.set('intersection_cache', {
      maxSize: 500,
      avgEntrySize: 1024,
      ttl: 600000 // 10 minutes
    });

    this.cacheConfigs.set('wall_geometry', {
      maxSize: 2000,
      avgEntrySize: 4096,
      ttl: 900000 // 15 minutes
    });
  }

  /**
   * Clean up old events
   */
  private cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAge;
    this.accessEvents = this.accessEvents.filter(event => event.timestamp >= cutoffTime);
    this.evictionEvents = this.evictionEvents.filter(event => event.timestamp >= cutoffTime);
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(cacheType: string): CacheConfig | undefined {
    return this.cacheConfigs.get(cacheType);
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(cacheType: string, config: Partial<CacheConfig>): void {
    const existing = this.cacheConfigs.get(cacheType) || {};
    this.cacheConfigs.set(cacheType, { ...existing, ...config });
  }
}

interface CacheConfig {
  maxSize: number;
  avgEntrySize: number;
  ttl: number;
}

interface CacheAccessPattern {
  cacheType: string;
  totalAccesses: number;
  uniqueKeys: number;
  hotKeys: Array<{ key: string; count: number }>;
  coldKeys: Array<{ key: string; count: number }>;
  accessFrequency: Map<string, number>;
  temporalPattern: TemporalPattern;
  recommendations: OptimizationRecommendation[];
}

interface TemporalPattern {
  hourlyDistribution: number[];
  peakHour: number;
  peakVariance: number;
  burstiness: number;
}