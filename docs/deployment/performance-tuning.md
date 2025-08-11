# Performance Tuning Guide

## Overview

This guide provides comprehensive performance optimization strategies for the BIM Wall System, covering geometric operations, database queries, memory management, and UI responsiveness.

## Geometric Operations Performance

### Offset Operation Optimization

```typescript
// Optimize offset operations with adaptive algorithms
export class PerformanceOptimizedOffsetEngine implements RobustOffsetEngine {
  private offsetCache = new Map<string, OffsetResult>();
  
  async offsetCurve(
    baseline: Curve, 
    distance: number, 
    joinType: OffsetJoinType,
    tolerance: number
  ): Promise<OffsetResult> {
    // Use cache for repeated operations
    const cacheKey = this.generateCacheKey(baseline, distance, joinType, tolerance);
    if (this.offsetCache.has(cacheKey)) {
      return this.offsetCache.get(cacheKey)!;
    }

    // Optimize based on curve complexity
    const optimizedResult = await this.optimizeForCurveType(baseline, distance, joinType, tolerance);
    
    // Cache result for future use
    this.offsetCache.set(cacheKey, optimizedResult);
    return optimizedResult;
  }

  private async optimizeForCurveType(
    baseline: Curve, 
    distance: number, 
    joinType: OffsetJoinType,
    tolerance: number
  ): Promise<OffsetResult> {
    // Use simplified algorithms for simple curves
    if (baseline.type === CurveType.POLYLINE && baseline.points.length < 10) {
      return this.simplePolylineOffset(baseline, distance, joinType);
    }
    
    // Use advanced algorithms for complex curves
    return this.advancedCurveOffset(baseline, distance, joinType, tolerance);
  }
}
```

### Boolean Operations Performance

```typescript
// Optimize boolean operations with spatial partitioning
export class PerformanceOptimizedBooleanEngine implements BooleanOperationsEngine {
  private spatialIndex = new RTree<WallSolid>();
  
  async batchUnion(solids: WallSolid[]): Promise<BooleanResult> {
    // Sort by size for optimal processing order
    const sortedSolids = solids.sort((a, b) => a.complexity - b.complexity);
    
    // Use spatial partitioning for large datasets
    if (sortedSolids.length > 100) {
      return this.spatialPartitionedUnion(sortedSolids);
    }
    
    // Use progressive union for medium datasets
    return this.progressiveUnion(sortedSolids);
  }

  private async spatialPartitionedUnion(solids: WallSolid[]): Promise<BooleanResult> {
    // Partition solids into spatial regions
    const partitions = this.partitionSpatially(solids, 4);
    
    // Process partitions in parallel
    const partitionResults = await Promise.all(
      partitions.map(partition => this.progressiveUnion(partition))
    );
    
    // Merge partition results
    return this.mergePartitionResults(partitionResults);
  }
}
```

### Shape Healing Performance

```typescript
// Optimize shape healing with targeted operations
export class PerformanceOptimizedShapeHealer implements ShapeHealingEngine {
  async healShape(solid: WallSolid, tolerance: number): Promise<HealingResult> {
    const startTime = performance.now();
    
    // Quick validation to skip unnecessary healing
    const quickValidation = this.quickValidationCheck(solid);
    if (quickValidation.isClean) {
      return {
        success: true,
        healedSolid: solid,
        operationsApplied: [],
        facesRemoved: 0,
        edgesMerged: 0,
        gapsEliminated: 0,
        processingTime: performance.now() - startTime
      };
    }
    
    // Apply only necessary healing operations
    const healingPlan = this.createOptimalHealingPlan(solid, quickValidation);
    return this.executeHealingPlan(solid, healingPlan, tolerance);
  }

  private createOptimalHealingPlan(
    solid: WallSolid, 
    validation: QuickValidationResult
  ): HealingOperation[] {
    const plan: HealingOperation[] = [];
    
    if (validation.hasSliverFaces) {
      plan.push({ type: 'removeSliverFaces', priority: 1 });
    }
    
    if (validation.hasDuplicateEdges) {
      plan.push({ type: 'mergeDuplicateEdges', priority: 2 });
    }
    
    if (validation.hasMicroGaps) {
      plan.push({ type: 'eliminateMicroGaps', priority: 3 });
    }
    
    return plan.sort((a, b) => a.priority - b.priority);
  }
}
```

## Database Performance Optimization

### Query Optimization

```sql
-- Optimized queries for common BIM operations

-- Spatial query optimization with proper indexing
EXPLAIN ANALYZE
SELECT w.id, w.thickness, w.wall_type
FROM walls w
WHERE ST_Intersects(
  w.geometry, 
  ST_MakeEnvelope($1, $2, $3, $4, 4326)
)
AND w.thickness BETWEEN $5 AND $6;

-- Index recommendations
CREATE INDEX CONCURRENTLY idx_walls_geometry_thickness 
ON walls USING GIST (geometry) 
WHERE thickness > 0;

CREATE INDEX CONCURRENTLY idx_walls_type_thickness 
ON walls (wall_type, thickness) 
WHERE visible = true;
```

### Connection Pool Optimization

```typescript
// Optimized connection pool configuration
export const optimizedPoolConfig = {
  // PostgreSQL optimization
  postgres: {
    max: Math.min(20, Math.max(5, Math.floor(os.cpus().length * 2))),
    min: 2,
    acquire: 30000,
    idle: 10000,
    evict: 1000,
    handleDisconnects: true,
    
    // Query optimization
    statement_timeout: 30000,
    query_timeout: 25000,
    
    // Connection optimization
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    
    // Pool monitoring
    log: (message, level) => {
      if (level === 'error') {
        console.error('Pool error:', message);
      }
    }
  },
  
  // SQLite optimization
  sqlite: {
    max: 1, // SQLite is single-threaded
    acquireTimeoutMillis: 5000,
    createTimeoutMillis: 3000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    
    // SQLite-specific optimizations
    pragma: {
      journal_mode: 'WAL',
      synchronous: 'NORMAL',
      cache_size: 10000,
      temp_store: 'MEMORY',
      mmap_size: 268435456 // 256MB
    }
  }
};
```

### Batch Operations

```typescript
// Optimized batch operations for large datasets
export class BatchOperationOptimizer {
  async batchSaveWalls(walls: WallSolid[], batchSize = 100): Promise<BatchResult> {
    const batches = this.chunkArray(walls, batchSize);
    const results: SaveResult[] = [];
    
    for (const batch of batches) {
      const batchResult = await this.processBatch(batch);
      results.push(...batchResult);
      
      // Yield control to prevent blocking
      await this.yieldControl();
    }
    
    return {
      totalProcessed: walls.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  private async processBatch(batch: WallSolid[]): Promise<SaveResult[]> {
    return Promise.all(
      batch.map(wall => this.saveWallOptimized(wall))
    );
  }

  private async yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

## Memory Management

### Memory Pool Management

```typescript
// Memory-efficient geometric operations
export class MemoryOptimizedGeometryProcessor {
  private geometryPool = new ObjectPool<Polygon>(() => new Polygon());
  private pointPool = new ObjectPool<Point>(() => new Point(0, 0));
  
  processWallGeometry(wall: WallSolid): ProcessingResult {
    // Acquire objects from pool
    const workingPolygon = this.geometryPool.acquire();
    const tempPoints = Array.from({ length: 100 }, () => this.pointPool.acquire());
    
    try {
      // Perform geometric operations
      const result = this.performGeometricOperations(wall, workingPolygon, tempPoints);
      return result;
    } finally {
      // Return objects to pool
      this.geometryPool.release(workingPolygon);
      tempPoints.forEach(point => this.pointPool.release(point));
    }
  }
}

class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  
  constructor(createFn: () => T) {
    this.createFn = createFn;
  }
  
  acquire(): T {
    return this.pool.pop() || this.createFn();
  }
  
  release(obj: T): void {
    this.pool.push(obj);
  }
}
```

### Garbage Collection Optimization

```typescript
// Minimize garbage collection pressure
export class GCOptimizedProcessor {
  private reusableBuffers = new Map<string, ArrayBuffer>();
  
  processLargeDataset(data: WallSolid[]): ProcessingResult {
    // Pre-allocate buffers
    const bufferSize = this.calculateOptimalBufferSize(data);
    const workingBuffer = this.getOrCreateBuffer('working', bufferSize);
    
    // Process in chunks to avoid large object allocation
    const chunkSize = Math.min(1000, Math.floor(bufferSize / 1024));
    const results: ProcessingResult[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResult = this.processChunk(chunk, workingBuffer);
      results.push(chunkResult);
      
      // Force garbage collection periodically
      if (i % (chunkSize * 10) === 0) {
        this.suggestGarbageCollection();
      }
    }
    
    return this.mergeResults(results);
  }

  private suggestGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }
}
```

## UI Performance Optimization

### Rendering Performance

```typescript
// Optimized PixiJS rendering for BIM walls
export class PerformanceOptimizedWallRenderer {
  private renderCache = new Map<string, PIXI.Graphics>();
  private visibilityManager = new ViewportVisibilityManager();
  
  renderWalls(walls: WallSolid[], viewport: Viewport): void {
    // Cull walls outside viewport
    const visibleWalls = this.visibilityManager.getVisibleWalls(walls, viewport);
    
    // Use level-of-detail rendering
    const lodWalls = this.applyLevelOfDetail(visibleWalls, viewport.zoom);
    
    // Batch render operations
    this.batchRenderWalls(lodWalls);
  }

  private applyLevelOfDetail(walls: WallSolid[], zoom: number): LODWall[] {
    return walls.map(wall => {
      if (zoom < 0.5) {
        // Low detail for distant view
        return this.createLowDetailWall(wall);
      } else if (zoom < 2.0) {
        // Medium detail for normal view
        return this.createMediumDetailWall(wall);
      } else {
        // High detail for close view
        return this.createHighDetailWall(wall);
      }
    });
  }

  private batchRenderWalls(walls: LODWall[]): void {
    // Group walls by rendering properties
    const renderGroups = this.groupWallsByRenderProperties(walls);
    
    // Render each group in a single draw call
    renderGroups.forEach(group => {
      this.renderWallGroup(group);
    });
  }
}
```

### Interaction Performance

```typescript
// Optimized user interaction handling
export class PerformanceOptimizedInteractionHandler {
  private interactionThrottle = new Map<string, number>();
  private lastInteractionTime = 0;
  
  handleWallInteraction(event: InteractionEvent): void {
    const now = performance.now();
    
    // Throttle rapid interactions
    if (now - this.lastInteractionTime < 16) { // ~60fps
      return;
    }
    
    this.lastInteractionTime = now;
    
    // Use spatial indexing for hit testing
    const hitWalls = this.spatialIndex.query(event.point, event.radius);
    
    // Process only the closest wall
    if (hitWalls.length > 0) {
      const closestWall = this.findClosestWall(hitWalls, event.point);
      this.processWallInteraction(closestWall, event);
    }
  }

  private processWallInteraction(wall: WallSolid, event: InteractionEvent): void {
    // Defer expensive operations
    requestIdleCallback(() => {
      this.updateWallProperties(wall, event);
    });
  }
}
```

## Caching Strategies

### Multi-Level Caching

```typescript
// Comprehensive caching system
export class BIMCachingSystem {
  private l1Cache = new Map<string, any>(); // In-memory cache
  private l2Cache = new LRUCache<string, any>({ max: 1000 }); // LRU cache
  private l3Cache = new PersistentCache(); // Disk cache
  
  async get<T>(key: string, factory: () => Promise<T>): Promise<T> {
    // Check L1 cache (fastest)
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }
    
    // Check L2 cache
    if (this.l2Cache.has(key)) {
      const value = this.l2Cache.get(key);
      this.l1Cache.set(key, value);
      return value;
    }
    
    // Check L3 cache
    const l3Value = await this.l3Cache.get(key);
    if (l3Value) {
      this.l2Cache.set(key, l3Value);
      this.l1Cache.set(key, l3Value);
      return l3Value;
    }
    
    // Generate value
    const value = await factory();
    
    // Store in all cache levels
    this.l1Cache.set(key, value);
    this.l2Cache.set(key, value);
    await this.l3Cache.set(key, value);
    
    return value;
  }
}
```

### Geometric Computation Cache

```typescript
// Cache expensive geometric computations
export class GeometricComputationCache {
  private offsetCache = new Map<string, OffsetResult>();
  private booleanCache = new Map<string, BooleanResult>();
  private intersectionCache = new Map<string, IntersectionData>();
  
  getCachedOffset(
    baseline: Curve, 
    distance: number, 
    joinType: OffsetJoinType
  ): OffsetResult | null {
    const key = this.generateOffsetKey(baseline, distance, joinType);
    return this.offsetCache.get(key) || null;
  }

  setCachedOffset(
    baseline: Curve, 
    distance: number, 
    joinType: OffsetJoinType,
    result: OffsetResult
  ): void {
    const key = this.generateOffsetKey(baseline, distance, joinType);
    this.offsetCache.set(key, result);
    
    // Implement cache size limits
    if (this.offsetCache.size > 10000) {
      this.evictOldestEntries(this.offsetCache, 1000);
    }
  }

  private evictOldestEntries<T>(cache: Map<string, T>, count: number): void {
    const entries = Array.from(cache.entries());
    for (let i = 0; i < count && entries.length > 0; i++) {
      cache.delete(entries[i][0]);
    }
  }
}
```

## Performance Monitoring

### Real-Time Performance Metrics

```typescript
// Performance monitoring system
export class BIMPerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private alertThresholds = new Map<string, number>();
  
  startOperation(operationName: string): PerformanceTracker {
    return new PerformanceTracker(operationName, this);
  }

  recordMetric(name: string, value: number, unit: string): void {
    const metric = this.metrics.get(name) || {
      name,
      values: [],
      unit,
      average: 0,
      min: Infinity,
      max: -Infinity
    };

    metric.values.push(value);
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.average = metric.values.reduce((a, b) => a + b, 0) / metric.values.length;

    // Keep only recent values
    if (metric.values.length > 1000) {
      metric.values = metric.values.slice(-500);
    }

    this.metrics.set(name, metric);
    
    // Check for performance alerts
    this.checkPerformanceAlerts(name, value);
  }

  private checkPerformanceAlerts(name: string, value: number): void {
    const threshold = this.alertThresholds.get(name);
    if (threshold && value > threshold) {
      console.warn(`Performance alert: ${name} exceeded threshold (${value} > ${threshold})`);
    }
  }
}

class PerformanceTracker {
  private startTime: number;
  private startMemory: number;

  constructor(
    private operationName: string,
    private monitor: BIMPerformanceMonitor
  ) {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  end(): PerformanceResult {
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    const duration = endTime - this.startTime;
    const memoryDelta = endMemory - this.startMemory;

    this.monitor.recordMetric(`${this.operationName}_duration`, duration, 'ms');
    this.monitor.recordMetric(`${this.operationName}_memory`, memoryDelta, 'bytes');

    return {
      operationName: this.operationName,
      duration,
      memoryDelta,
      startTime: this.startTime,
      endTime
    };
  }
}
```

## Performance Benchmarking

### Automated Performance Tests

```typescript
// Automated performance benchmarking
export class BIMPerformanceBenchmark {
  async runBenchmarkSuite(): Promise<BenchmarkReport> {
    const results = await Promise.all([
      this.benchmarkOffsetOperations(),
      this.benchmarkBooleanOperations(),
      this.benchmarkShapeHealing(),
      this.benchmarkDatabaseOperations(),
      this.benchmarkRenderingPerformance()
    ]);

    return {
      timestamp: new Date(),
      results,
      summary: this.generateSummary(results),
      recommendations: this.generateRecommendations(results)
    };
  }

  private async benchmarkOffsetOperations(): Promise<BenchmarkResult> {
    const testCases = this.generateOffsetTestCases();
    const results: number[] = [];

    for (const testCase of testCases) {
      const tracker = new PerformanceTracker('offset_benchmark', this.monitor);
      
      await this.offsetEngine.offsetCurve(
        testCase.baseline,
        testCase.distance,
        testCase.joinType,
        testCase.tolerance
      );
      
      const result = tracker.end();
      results.push(result.duration);
    }

    return {
      operation: 'offset_operations',
      testCases: testCases.length,
      averageTime: results.reduce((a, b) => a + b, 0) / results.length,
      minTime: Math.min(...results),
      maxTime: Math.max(...results),
      standardDeviation: this.calculateStandardDeviation(results)
    };
  }
}
```

## Configuration Recommendations

### Environment-Specific Optimizations

```typescript
// Environment-specific performance configurations
export const performanceConfigs = {
  development: {
    cacheSize: 100,
    batchSize: 50,
    enableProfiling: true,
    enableDebugLogging: true,
    maxConcurrentOperations: 2
  },
  
  testing: {
    cacheSize: 10,
    batchSize: 10,
    enableProfiling: false,
    enableDebugLogging: false,
    maxConcurrentOperations: 1
  },
  
  production: {
    cacheSize: 10000,
    batchSize: 1000,
    enableProfiling: false,
    enableDebugLogging: false,
    maxConcurrentOperations: Math.max(4, os.cpus().length)
  }
};
```

### Hardware-Specific Tuning

```typescript
// Automatic hardware detection and optimization
export class HardwareOptimizer {
  optimizeForHardware(): OptimizationConfig {
    const cpuCount = os.cpus().length;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    return {
      maxConcurrentOperations: Math.min(cpuCount * 2, 16),
      cacheSize: Math.floor(freeMemory * 0.1 / 1024 / 1024), // 10% of free memory
      batchSize: cpuCount < 4 ? 100 : cpuCount < 8 ? 500 : 1000,
      enableParallelProcessing: cpuCount > 2,
      memoryThreshold: totalMemory * 0.8 // Alert at 80% memory usage
    };
  }
}
```

This comprehensive performance tuning guide provides detailed strategies for optimizing every aspect of the BIM Wall System, from low-level geometric operations to high-level user interface interactions.