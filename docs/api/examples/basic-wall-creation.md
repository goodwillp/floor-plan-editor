# Basic Wall Creation Examples

## Overview

This guide demonstrates how to create walls using the BIM Wall System, from simple straight walls to complex curved geometries.

## Simple Straight Wall

### Basic Example

```typescript
import { BIMWallSystem, CurveType } from '@/lib/bim';

// Initialize the BIM system
const bimSystem = new BIMWallSystem();

// Create a simple straight wall
const straightWall = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 1000, y: 0 }  // 1000mm long wall
    ],
    type: CurveType.POLYLINE,
    isClosed: false
  },
  thickness: 200,  // 200mm thick
  wallType: 'Layout'
});

console.log(`Created wall with ID: ${straightWall.id}`);
console.log(`Wall length: ${straightWall.bimGeometry?.wallSolid.baseline.length}mm`);
```

### With Custom Configuration

```typescript
// Create BIM system with custom settings
const customBimSystem = new BIMWallSystem({
  baseTolerance: 0.01,
  defaultJoinType: OffsetJoinType.MITER,
  autoHealingEnabled: true,
  enableCaching: true
});

const precisionWall = await customBimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 2000, y: 0 }
    ],
    type: CurveType.POLYLINE,
    isClosed: false
  },
  thickness: 150,
  wallType: 'Layout'
});
```

## L-Shaped Wall

### Creating Corner Geometry

```typescript
// Create an L-shaped wall with proper corner handling
const lShapedWall = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },    // Horizontal segment
      { x: 1000, y: 800 }   // Vertical segment
    ],
    type: CurveType.POLYLINE,
    isClosed: false
  },
  thickness: 200,
  wallType: 'Layout'
});

// The system automatically handles the corner with appropriate join type
const cornerQuality = lShapedWall.bimGeometry?.qualityMetrics.geometricAccuracy;
console.log(`Corner quality: ${cornerQuality}`);
```

### Controlling Join Types

```typescript
// Create L-shaped wall with specific join type
const bevelCornerWall = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 1500, y: 0 },
      { x: 1500, y: 1200 }
    ],
    type: CurveType.POLYLINE,
    isClosed: false
  },
  thickness: 250,
  wallType: 'Layout',
  joinType: OffsetJoinType.BEVEL  // Force bevel joins
});
```

## Rectangular Room

### Closed Wall Loop

```typescript
// Create a rectangular room with closed wall loop
const rectangularRoom = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },     // Bottom wall
      { x: 4000, y: 3000 },  // Right wall
      { x: 0, y: 3000 },     // Top wall
      { x: 0, y: 0 }         // Close the loop
    ],
    type: CurveType.POLYLINE,
    isClosed: true
  },
  thickness: 200,
  wallType: 'Layout'
});

// Validate the closed geometry
const validation = await bimSystem.validateGeometry([rectangularRoom]);
if (validation.isValid) {
  console.log('Room geometry is valid');
  console.log(`Room area: ${calculateRoomArea(rectangularRoom)}mm²`);
} else {
  console.log('Geometry issues:', validation.issues);
}
```

### Room with Optimized Corners

```typescript
// Create room with automatic corner optimization
const optimizedRoom = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
      { x: 5000, y: 4000 },
      { x: 0, y: 4000 },
      { x: 0, y: 0 }
    ],
    type: CurveType.POLYLINE,
    isClosed: true
  },
  thickness: 200,
  wallType: 'Layout'
});

// Apply optimization to improve corner geometry
const optimization = await bimSystem.optimizeWallNetwork([optimizedRoom]);
console.log(`Optimization improved quality by ${optimization.qualityImprovement}%`);
```

## Curved Walls

### Bezier Curve Wall

```typescript
// Create a wall following a Bezier curve
const curvedWall = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },        // Start point
      { x: 500, y: -200 },   // Control point 1
      { x: 1500, y: 200 },   // Control point 2
      { x: 2000, y: 0 }      // End point
    ],
    type: CurveType.BEZIER,
    isClosed: false
  },
  thickness: 180,
  wallType: 'Layout'
});

// Curved walls may require healing for optimal geometry
const healing = await bimSystem.healGeometry([curvedWall]);
console.log(`Applied ${healing.operationsApplied.length} healing operations`);
```

### Arc-Based Wall

```typescript
// Create a wall following a circular arc
const arcWall = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 1000, y: 0 },     // Start point
      { x: 1414, y: 414 },   // Point on arc
      { x: 2000, y: 0 }      // End point
    ],
    type: CurveType.ARC,
    isClosed: false
  },
  thickness: 200,
  wallType: 'Layout'
});

// Arc walls benefit from round joins
const arcWithRoundJoins = await bimSystem.updateWall(arcWall.id, {
  joinType: OffsetJoinType.ROUND
});
```

## Complex Geometry

### Multi-Segment Wall

```typescript
// Create a complex wall with multiple segments and different angles
const complexWall = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },     // Horizontal
      { x: 1500, y: 500 },   // Diagonal
      { x: 2000, y: 500 },   // Horizontal
      { x: 2000, y: 1000 },  // Vertical
      { x: 1000, y: 1500 },  // Diagonal
      { x: 0, y: 1000 }      // Diagonal back
    ],
    type: CurveType.POLYLINE,
    isClosed: false
  },
  thickness: 200,
  wallType: 'Layout'
});

// Complex geometry may benefit from simplification
const simplified = await bimSystem.simplifyGeometry([complexWall], {
  preserveArchitecturalFeatures: true,
  simplificationTolerance: 10
});
```

### Wall with Sharp Angles

```typescript
// Create a wall with sharp angles that require special handling
const sharpAngleWall = await bimSystem.createWall({
  baseline: {
    points: [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1050, y: 50 },    // Very sharp angle
      { x: 2000, y: 100 }
    ],
    type: CurveType.POLYLINE,
    isClosed: false
  },
  thickness: 200,
  wallType: 'Layout'
});

// Sharp angles automatically use bevel joins to prevent issues
const joinTypes = sharpAngleWall.bimGeometry?.wallSolid.joinTypes;
console.log('Join types used:', Array.from(joinTypes?.values() || []));
```

## Error Handling

### Handling Invalid Geometry

```typescript
try {
  // Attempt to create a wall with invalid geometry
  const invalidWall = await bimSystem.createWall({
    baseline: {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 }  // Zero-length segment
      ],
      type: CurveType.POLYLINE,
      isClosed: false
    },
    thickness: 200,
    wallType: 'Layout'
  });
} catch (error) {
  if (error instanceof GeometricError) {
    console.log(`Geometric error: ${error.message}`);
    console.log(`Suggested fix: ${error.suggestedFix}`);
    
    // Try with corrected geometry
    const correctedWall = await bimSystem.createWall({
      baseline: {
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }  // Minimum length segment
        ],
        type: CurveType.POLYLINE,
        isClosed: false
      },
      thickness: 200,
      wallType: 'Layout'
    });
  }
}
```

### Validation Before Creation

```typescript
// Validate geometry before creating the wall
function validateWallDefinition(definition: WallDefinition): ValidationResult {
  const issues: string[] = [];
  
  // Check minimum segment length
  for (let i = 0; i < definition.baseline.points.length - 1; i++) {
    const p1 = definition.baseline.points[i];
    const p2 = definition.baseline.points[i + 1];
    const length = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    
    if (length < 10) {  // Minimum 10mm segment
      issues.push(`Segment ${i} is too short: ${length}mm`);
    }
  }
  
  // Check thickness
  if (definition.thickness < 50 || definition.thickness > 1000) {
    issues.push(`Invalid thickness: ${definition.thickness}mm`);
  }
  
  return {
    isValid: issues.length === 0,
    issues: issues
  };
}

// Use validation before creation
const wallDef = {
  baseline: { /* ... */ },
  thickness: 200,
  wallType: 'Layout' as const
};

const validation = validateWallDefinition(wallDef);
if (validation.isValid) {
  const wall = await bimSystem.createWall(wallDef);
} else {
  console.log('Validation issues:', validation.issues);
}
```

## Performance Considerations

### Batch Wall Creation

```typescript
// Create multiple walls efficiently
const wallDefinitions = [
  { baseline: /* wall 1 */ },
  { baseline: /* wall 2 */ },
  { baseline: /* wall 3 */ }
];

// Create walls in batch for better performance
const walls = await Promise.all(
  wallDefinitions.map(def => bimSystem.createWall(def))
);

// Optimize the entire network at once
const networkOptimization = await bimSystem.optimizeWallNetwork(walls);
```

### Memory Management

```typescript
// Monitor memory usage during wall creation
const initialMetrics = bimSystem.getPerformanceMetrics();

const largeWall = await bimSystem.createWall({
  baseline: {
    points: generateManyPoints(1000),  // 1000 points
    type: CurveType.POLYLINE,
    isClosed: false
  },
  thickness: 200,
  wallType: 'Layout'
});

const finalMetrics = bimSystem.getPerformanceMetrics();
const memoryIncrease = finalMetrics.memoryUsage - initialMetrics.memoryUsage;
console.log(`Memory increase: ${memoryIncrease}MB`);

// Optimize performance if needed
if (memoryIncrease > 100) {  // More than 100MB increase
  await bimSystem.optimizePerformance();
}
```

## Utility Functions

### Helper Functions for Wall Creation

```typescript
/**
 * Creates a rectangular wall outline
 */
function createRectangularWall(
  width: number, 
  height: number, 
  thickness: number
): WallDefinition {
  return {
    baseline: {
      points: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
        { x: 0, y: 0 }
      ],
      type: CurveType.POLYLINE,
      isClosed: true
    },
    thickness,
    wallType: 'Layout'
  };
}

/**
 * Creates a circular wall
 */
function createCircularWall(
  centerX: number, 
  centerY: number, 
  radius: number, 
  thickness: number,
  segments: number = 32
): WallDefinition {
  const points: Point[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  }
  
  return {
    baseline: {
      points,
      type: CurveType.POLYLINE,
      isClosed: true
    },
    thickness,
    wallType: 'Layout'
  };
}

// Usage examples
const room = await bimSystem.createWall(createRectangularWall(4000, 3000, 200));
const tower = await bimSystem.createWall(createCircularWall(0, 0, 1000, 250));
```

## See Also

- [Complex Intersections](./complex-intersections.md) - Handling wall intersections
- [Performance Tuning](./performance-tuning.md) - Optimizing wall operations
- [BIMWallSystem API](../core/BIMWallSystem.md) - Complete API reference
- [Mathematical Concepts](../guides/mathematical-concepts.md) - Understanding the algorithms