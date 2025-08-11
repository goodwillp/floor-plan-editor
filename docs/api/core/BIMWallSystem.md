# BIMWallSystem

The main interface for the BIM Wall System, providing high-level operations for wall creation, modification, and intersection resolution.

## Class Definition

```typescript
class BIMWallSystem {
  constructor(config?: BIMWallConfiguration);
  
  // Wall operations
  createWall(definition: WallDefinition): Promise<UnifiedWallData>;
  updateWall(wallId: string, changes: WallChanges): Promise<UnifiedWallData>;
  deleteWall(wallId: string): Promise<void>;
  
  // Intersection operations
  resolveIntersections(walls: UnifiedWallData[]): Promise<IntersectionResult>;
  optimizeWallNetwork(walls: UnifiedWallData[]): Promise<OptimizationResult>;
  
  // Mode switching
  switchToBIMMode(walls: UnifiedWallData[]): Promise<ModeSwitchResult>;
  switchToBasicMode(walls: UnifiedWallData[]): Promise<ModeSwitchResult>;
  
  // Quality operations
  validateGeometry(walls: UnifiedWallData[]): Promise<ValidationResult>;
  healGeometry(walls: UnifiedWallData[]): Promise<HealingResult>;
  
  // Performance monitoring
  getPerformanceMetrics(): PerformanceMetrics;
  optimizePerformance(): Promise<OptimizationResult>;
}
```

## Constructor

### BIMWallSystem(config?)

Creates a new BIM Wall System instance with optional configuration.

**Parameters:**
- `config` (optional): BIMWallConfiguration - System configuration options

**Example:**
```typescript
const bimSystem = new BIMWallSystem({
  baseTolerance: 0.01,
  defaultJoinType: OffsetJoinType.MITER,
  autoHealingEnabled: true
});
```

## Wall Operations

### createWall(definition)

Creates a new wall with BIM precision using robust geometric algorithms.

**Parameters:**
- `definition`: WallDefinition - Wall specification including baseline, thickness, and type

**Returns:** Promise<UnifiedWallData> - The created wall with both basic and BIM representations

**Example:**
```typescript
const wall = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 500 }
    ],
    type: CurveType.POLYLINE
  },
  thickness: 200,
  wallType: 'Layout'
});
```

### updateWall(wallId, changes)

Updates an existing wall with new properties, maintaining geometric consistency.

**Parameters:**
- `wallId`: string - Unique identifier of the wall to update
- `changes`: WallChanges - Properties to modify

**Returns:** Promise<UnifiedWallData> - The updated wall data

**Example:**
```typescript
const updatedWall = await bimSystem.updateWall('wall-123', {
  thickness: 250,
  joinType: OffsetJoinType.BEVEL
});
```

## Intersection Operations

### resolveIntersections(walls)

Resolves intersections between multiple walls using boolean operations and shape healing.

**Parameters:**
- `walls`: UnifiedWallData[] - Array of walls to process for intersections

**Returns:** Promise<IntersectionResult> - Results including resolved geometry and quality metrics

**Example:**
```typescript
const result = await bimSystem.resolveIntersections([wall1, wall2, wall3]);
console.log(`Resolved ${result.intersectionCount} intersections`);
console.log(`Quality score: ${result.qualityMetrics.geometricAccuracy}`);
```

### optimizeWallNetwork(walls)

Optimizes a network of walls for performance and geometric quality.

**Parameters:**
- `walls`: UnifiedWallData[] - Array of walls to optimize

**Returns:** Promise<OptimizationResult> - Optimization results and performance improvements

**Example:**
```typescript
const optimization = await bimSystem.optimizeWallNetwork(allWalls);
console.log(`Reduced complexity by ${optimization.complexityReduction}%`);
console.log(`Performance improved by ${optimization.performanceImprovement}%`);
```

## Mode Switching

### switchToBIMMode(walls)

Converts walls from basic mode to BIM mode with enhanced geometric precision.

**Parameters:**
- `walls`: UnifiedWallData[] - Walls to convert to BIM mode

**Returns:** Promise<ModeSwitchResult> - Conversion results and compatibility status

**Example:**
```typescript
const switchResult = await bimSystem.switchToBIMMode(basicWalls);
if (switchResult.success) {
  console.log(`Converted ${switchResult.convertedWalls.length} walls to BIM mode`);
} else {
  console.log(`Failed walls: ${switchResult.failedWalls.join(', ')}`);
}
```

### switchToBasicMode(walls)

Converts walls from BIM mode to basic mode for compatibility.

**Parameters:**
- `walls`: UnifiedWallData[] - Walls to convert to basic mode

**Returns:** Promise<ModeSwitchResult> - Conversion results and data preservation status

## Quality Operations

### validateGeometry(walls)

Validates geometric consistency and quality of wall data.

**Parameters:**
- `walls`: UnifiedWallData[] - Walls to validate

**Returns:** Promise<ValidationResult> - Validation results with issue details

**Example:**
```typescript
const validation = await bimSystem.validateGeometry(walls);
if (!validation.isValid) {
  console.log('Geometric issues found:');
  validation.issues.forEach(issue => {
    console.log(`- ${issue.type}: ${issue.description}`);
  });
}
```

### healGeometry(walls)

Applies shape healing algorithms to fix geometric issues.

**Parameters:**
- `walls`: UnifiedWallData[] - Walls to heal

**Returns:** Promise<HealingResult> - Healing results and applied operations

**Example:**
```typescript
const healing = await bimSystem.healGeometry(problematicWalls);
console.log(`Applied ${healing.operationsApplied.length} healing operations`);
console.log(`Removed ${healing.facesRemoved} sliver faces`);
```

## Performance Monitoring

### getPerformanceMetrics()

Retrieves current performance metrics for the BIM system.

**Returns:** PerformanceMetrics - Current performance data

**Example:**
```typescript
const metrics = bimSystem.getPerformanceMetrics();
console.log(`Average operation time: ${metrics.averageOperationTime}ms`);
console.log(`Memory usage: ${metrics.memoryUsage}MB`);
console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);
```

### optimizePerformance()

Performs system optimization to improve performance.

**Returns:** Promise<OptimizationResult> - Optimization results

## Error Handling

All methods may throw the following errors:

- `GeometricError` - Issues with geometric operations
- `ToleranceError` - Tolerance-related problems
- `BooleanError` - Boolean operation failures
- `ValidationError` - Data validation issues

**Example:**
```typescript
try {
  const wall = await bimSystem.createWall(definition);
} catch (error) {
  if (error instanceof GeometricError) {
    console.log(`Geometric error: ${error.message}`);
    console.log(`Suggested fix: ${error.suggestedFix}`);
  }
}
```

## Configuration Options

The BIMWallSystem accepts the following configuration options:

```typescript
interface BIMWallConfiguration {
  // Tolerance settings
  baseTolerance: number;
  documentPrecision: number;
  adaptiveToleranceEnabled: boolean;
  
  // Offset settings
  defaultJoinType: OffsetJoinType;
  miterLimit: number;
  roundSegments: number;
  
  // Boolean operation settings
  booleanTolerance: number;
  maxBooleanComplexity: number;
  enableParallelProcessing: boolean;
  
  // Shape healing settings
  autoHealingEnabled: boolean;
  sliverFaceThreshold: number;
  microGapThreshold: number;
  
  // Performance settings
  maxProcessingTime: number;
  enableCaching: boolean;
  spatialIndexingEnabled: boolean;
}
```

## See Also

- [RobustOffsetEngine](../engines/RobustOffsetEngine.md) - Core offsetting algorithms
- [BooleanOperationsEngine](../engines/BooleanOperationsEngine.md) - Intersection resolution
- [UnifiedWallData](../data/UnifiedWallData.md) - Wall data structure
- [Performance Guide](../guides/performance-optimization.md) - Performance optimization