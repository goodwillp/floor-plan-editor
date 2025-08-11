# Developer Onboarding Guide

## Welcome to the BIM Wall System

This guide will help you get started with developing, extending, and maintaining the BIM Wall System. Whether you're fixing bugs, adding features, or integrating with other systems, this guide provides the foundation you need.

## Prerequisites

### Required Knowledge

- **TypeScript/JavaScript**: Advanced proficiency required
- **Computational Geometry**: Understanding of basic geometric algorithms
- **Software Architecture**: Familiarity with modular design patterns
- **Testing**: Experience with unit and integration testing
- **Git**: Version control and collaborative development

### Recommended Background

- **CAD/BIM Software**: Experience with AutoCAD, Revit, or similar
- **Mathematical Libraries**: Familiarity with geometric computation libraries
- **Performance Optimization**: Understanding of algorithmic complexity
- **Database Systems**: Knowledge of spatial databases (SQLite, PostgreSQL)

## System Architecture Overview

### Core Principles

The BIM Wall System follows these architectural principles:

1. **Separation of Concerns**: Each engine handles a specific aspect of geometry processing
2. **Modularity**: Components can be developed and tested independently
3. **Extensibility**: New algorithms can be added without breaking existing functionality
4. **Performance**: Optimized for real-time interaction with large datasets
5. **Robustness**: Comprehensive error handling and fallback mechanisms

### Directory Structure

```
src/lib/bim/
├── engines/           # Core geometric processing engines
├── geometry/          # Enhanced geometric data structures
├── validation/        # Error handling and quality assurance
├── persistence/       # Database abstraction and caching
├── visualization/     # Advanced rendering and debugging
├── adapters/          # Integration with existing systems
├── types/            # TypeScript type definitions
├── data/             # Data management and preservation
├── performance/      # Performance monitoring and optimization
└── __tests__/        # Comprehensive test suites
```

### Key Components

#### Engines (Core Processing)
- **RobustOffsetEngine**: Baseline curve offsetting with join handling
- **BooleanOperationsEngine**: Intersection resolution using Martinez library
- **ShapeHealingEngine**: Geometry optimization and cleanup
- **AdaptiveToleranceManager**: Dynamic tolerance calculation
- **GeometrySimplificationEngine**: RDP-style curve simplification

#### Data Structures
- **WallSolid**: Enhanced wall representation with BIM metadata
- **UnifiedWallData**: Mode-compatible wall data structure
- **IntersectionData**: Intersection metadata and resolved geometry
- **QualityMetrics**: Geometric quality assessment data

#### Validation & Error Handling
- **GeometryValidator**: Comprehensive geometric validation
- **BIMErrorHandler**: Centralized error management
- **EdgeCaseHandler**: Specialized handling for geometric edge cases

## Development Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd floor-plan-editor
npm install
```

### 2. Development Tools

```bash
# Install recommended VS Code extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode

# Set up pre-commit hooks
npm run prepare
```

### 3. Build and Test

```bash
# Build the project
npm run build

# Run all tests
npm test

# Run BIM-specific tests
npm test -- --testPathPattern=bim

# Run tests in watch mode
npm test -- --watch
```

### 4. Development Server

```bash
# Start development server
npm run dev

# Open in browser
open http://localhost:5173
```

## Code Organization Patterns

### Engine Pattern

All geometric processing engines follow a consistent pattern:

```typescript
/**
 * Template for BIM processing engines
 */
export class ExampleEngine {
  private config: EngineConfiguration;
  private cache: Map<string, any>;
  
  constructor(config?: Partial<EngineConfiguration>) {
    this.config = { ...defaultConfig, ...config };
    this.cache = new Map();
  }
  
  /**
   * Main processing method
   */
  async process(input: InputType): Promise<ResultType> {
    // 1. Validate input
    this.validateInput(input);
    
    // 2. Check cache
    const cacheKey = this.generateCacheKey(input);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // 3. Perform processing
    const result = await this.performProcessing(input);
    
    // 4. Validate result
    this.validateResult(result);
    
    // 5. Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  private validateInput(input: InputType): void {
    // Input validation logic
  }
  
  private async performProcessing(input: InputType): Promise<ResultType> {
    // Core processing logic
  }
  
  private validateResult(result: ResultType): void {
    // Result validation logic
  }
}
```

### Error Handling Pattern

All operations use consistent error handling:

```typescript
import { GeometricError, ToleranceError, BooleanError } from '../validation/GeometricError';

export class ExampleOperation {
  async performOperation(input: any): Promise<any> {
    try {
      // Validate input
      if (!this.isValidInput(input)) {
        throw new GeometricError(
          GeometricErrorType.INVALID_INPUT,
          'Input validation failed',
          'Check input parameters and try again',
          true // recoverable
        );
      }
      
      // Perform operation
      const result = await this.executeOperation(input);
      
      // Validate result
      if (!this.isValidResult(result)) {
        throw new GeometricError(
          GeometricErrorType.INVALID_RESULT,
          'Operation produced invalid result',
          'Try with different parameters or contact support',
          false // not recoverable
        );
      }
      
      return result;
      
    } catch (error) {
      // Log error for debugging
      console.error('Operation failed:', error);
      
      // Attempt recovery if possible
      if (error.recoverable) {
        return this.attemptRecovery(input, error);
      }
      
      // Re-throw if not recoverable
      throw error;
    }
  }
}
```

### Testing Pattern

All components include comprehensive tests:

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ExampleEngine } from '../ExampleEngine';

describe('ExampleEngine', () => {
  let engine: ExampleEngine;
  
  beforeEach(() => {
    engine = new ExampleEngine();
  });
  
  afterEach(() => {
    engine.cleanup();
  });
  
  describe('Basic Operations', () => {
    test('should process valid input correctly', async () => {
      const input = createValidInput();
      const result = await engine.process(input);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toMatchSnapshot();
    });
    
    test('should handle invalid input gracefully', async () => {
      const invalidInput = createInvalidInput();
      
      await expect(engine.process(invalidInput))
        .rejects
        .toThrow(GeometricError);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle zero-length segments', async () => {
      const edgeCaseInput = createZeroLengthInput();
      const result = await engine.process(edgeCaseInput);
      
      expect(result.warnings).toContain('Zero-length segment detected');
    });
    
    test('should handle extreme angles', async () => {
      const extremeAngleInput = createExtremeAngleInput();
      const result = await engine.process(extremeAngleInput);
      
      expect(result.joinType).toBe(OffsetJoinType.BEVEL);
    });
  });
  
  describe('Performance', () => {
    test('should complete within acceptable time limits', async () => {
      const largeInput = createLargeInput(1000);
      const startTime = performance.now();
      
      await engine.process(largeInput);
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(1000); // 1 second limit
    });
  });
});
```

## Adding New Features

### 1. Planning Phase

Before implementing a new feature:

1. **Review Requirements**: Understand the geometric requirements
2. **Research Algorithms**: Find appropriate computational geometry algorithms
3. **Design API**: Design the public interface
4. **Plan Tests**: Identify test cases including edge cases
5. **Consider Performance**: Analyze computational complexity

### 2. Implementation Phase

#### Step 1: Create Types

```typescript
// src/lib/bim/types/NewFeatureTypes.ts
export interface NewFeatureInput {
  // Define input structure
}

export interface NewFeatureResult {
  success: boolean;
  data?: any;
  warnings: string[];
  processingTime: number;
}

export enum NewFeatureErrorType {
  INVALID_INPUT = 'invalid_input',
  PROCESSING_FAILED = 'processing_failed'
}
```

#### Step 2: Implement Engine

```typescript
// src/lib/bim/engines/NewFeatureEngine.ts
import { NewFeatureInput, NewFeatureResult } from '../types/NewFeatureTypes';

export class NewFeatureEngine {
  async processFeature(input: NewFeatureInput): Promise<NewFeatureResult> {
    // Implementation
  }
}
```

#### Step 3: Add Tests

```typescript
// src/lib/bim/__tests__/engines/NewFeatureEngine.test.ts
import { describe, test, expect } from 'vitest';
import { NewFeatureEngine } from '../../engines/NewFeatureEngine';

describe('NewFeatureEngine', () => {
  // Comprehensive tests
});
```

#### Step 4: Integration

```typescript
// src/lib/bim/BIMWallSystem.ts
import { NewFeatureEngine } from './engines/NewFeatureEngine';

export class BIMWallSystem {
  private newFeatureEngine: NewFeatureEngine;
  
  constructor() {
    this.newFeatureEngine = new NewFeatureEngine();
  }
  
  async useNewFeature(input: NewFeatureInput): Promise<NewFeatureResult> {
    return this.newFeatureEngine.processFeature(input);
  }
}
```

### 3. Documentation Phase

1. **API Documentation**: Add JSDoc comments
2. **Usage Examples**: Create practical examples
3. **Integration Guide**: Document integration steps
4. **Performance Notes**: Document complexity and limitations

## Debugging and Troubleshooting

### Common Issues

#### Geometric Precision Issues

```typescript
// Problem: Floating-point precision errors
const badComparison = (a === b); // Don't do this

// Solution: Use tolerance-based comparison
const goodComparison = Math.abs(a - b) < tolerance;

// Better: Use the built-in utility
import { approximatelyEqual } from '../utils/MathUtils';
const bestComparison = approximatelyEqual(a, b, tolerance);
```

#### Performance Problems

```typescript
// Problem: O(n²) algorithm in hot path
for (let i = 0; i < walls.length; i++) {
  for (let j = 0; j < walls.length; j++) {
    checkIntersection(walls[i], walls[j]); // Expensive!
  }
}

// Solution: Use spatial indexing
const spatialIndex = new SpatialIndex();
walls.forEach(wall => spatialIndex.insert(wall));

walls.forEach(wall => {
  const candidates = spatialIndex.query(wall.boundingBox);
  candidates.forEach(candidate => {
    checkIntersection(wall, candidate);
  });
});
```

#### Memory Leaks

```typescript
// Problem: Circular references
class WallSolid {
  intersections: IntersectionData[];
}

class IntersectionData {
  participatingWalls: WallSolid[]; // Circular reference!
}

// Solution: Use weak references or IDs
class IntersectionData {
  participatingWallIds: string[]; // Use IDs instead
}
```

### Debugging Tools

#### Visual Debugging

```typescript
// Enable visual debugging
const bimSystem = new BIMWallSystem({
  enableVisualDebugging: true,
  debugVisualizationMode: BIMVisualizationModes.OFFSET_CURVES
});

// Show intermediate steps
await bimSystem.createWall(definition, {
  showIntermediateSteps: true,
  pauseAtStep: 'boolean_operations'
});
```

#### Performance Profiling

```typescript
// Enable performance monitoring
const bimSystem = new BIMWallSystem({
  enablePerformanceMonitoring: true,
  detailedProfiling: true
});

// Get performance metrics
const metrics = bimSystem.getPerformanceMetrics();
console.log('Bottlenecks:', metrics.bottlenecks);
console.log('Memory usage:', metrics.memoryUsage);
```

#### Error Diagnostics

```typescript
try {
  await bimSystem.createWall(definition);
} catch (error) {
  if (error instanceof GeometricError) {
    console.log('Error type:', error.type);
    console.log('Suggested fix:', error.suggestedFix);
    console.log('Debug info:', error.debugInfo);
    
    // Get detailed diagnostics
    const diagnostics = await bimSystem.getDiagnostics(error);
    console.log('Diagnostics:', diagnostics);
  }
}
```

## Testing Guidelines

### Test Categories

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test component interactions
3. **Visual Tests**: Test rendering output
4. **Performance Tests**: Test speed and memory usage
5. **Acceptance Tests**: Test user scenarios

### Test Data Management

```typescript
// src/lib/bim/__tests__/helpers/TestDataFactory.ts
export class TestDataFactory {
  static createSimpleWall(): WallDefinition {
    return {
      baseline: {
        points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }],
        type: CurveType.POLYLINE
      },
      thickness: 200,
      wallType: 'Layout'
    };
  }
  
  static createComplexIntersection(): WallDefinition[] {
    // Return complex test scenario
  }
  
  static createPerformanceTestData(size: number): WallDefinition[] {
    // Generate large datasets for performance testing
  }
}
```

### Visual Regression Testing

```typescript
// src/lib/bim/__tests__/visual/WallRendering.test.ts
import { describe, test, expect } from 'vitest';
import { renderWallToCanvas } from '../helpers/VisualTestUtils';

describe('Wall Rendering Visual Tests', () => {
  test('should render T-junction correctly', async () => {
    const walls = TestDataFactory.createTJunction();
    const canvas = await renderWallToCanvas(walls);
    
    // Compare with reference image
    expect(canvas).toMatchImageSnapshot({
      threshold: 0.01,
      customDiffConfig: {
        threshold: 0.1
      }
    });
  });
});
```

## Performance Optimization

### Profiling

```typescript
// Enable detailed profiling
const profiler = new PerformanceProfiler();
profiler.start('wall_creation');

const wall = await bimSystem.createWall(definition);

const profile = profiler.end('wall_creation');
console.log('Time breakdown:', profile.breakdown);
console.log('Memory usage:', profile.memoryUsage);
```

### Optimization Strategies

1. **Spatial Indexing**: Use R-trees for geometric queries
2. **Caching**: Cache expensive computations
3. **Batch Processing**: Process multiple operations together
4. **Lazy Evaluation**: Compute results only when needed
5. **Memory Pooling**: Reuse objects to reduce GC pressure

### Memory Management

```typescript
// Use object pooling for frequently created objects
class PointPool {
  private pool: Point[] = [];
  
  acquire(): Point {
    return this.pool.pop() || { x: 0, y: 0 };
  }
  
  release(point: Point): void {
    point.x = 0;
    point.y = 0;
    this.pool.push(point);
  }
}
```

## Contributing Guidelines

### Code Style

- Follow TypeScript strict mode
- Use meaningful variable and function names
- Add JSDoc comments for all public APIs
- Include examples in documentation
- Write comprehensive tests

### Pull Request Process

1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Implement Changes**: Follow the patterns described above
3. **Add Tests**: Ensure comprehensive test coverage
4. **Update Documentation**: Add or update relevant documentation
5. **Run Tests**: Ensure all tests pass
6. **Submit PR**: Include detailed description and test results

### Code Review Checklist

- [ ] Code follows established patterns
- [ ] All public APIs have JSDoc documentation
- [ ] Tests cover happy path and edge cases
- [ ] Performance impact is acceptable
- [ ] Error handling is comprehensive
- [ ] Documentation is updated

## Resources

### Internal Documentation

- [API Reference](../README.md) - Complete API documentation
- [Mathematical Concepts](./mathematical-concepts.md) - Algorithm explanations
- [Performance Guide](./performance-optimization.md) - Optimization techniques
- [Error Handling](./error-handling.md) - Error management patterns

### External Resources

- [Computational Geometry Algorithms](https://www.cs.cmu.edu/~quake/robust.html)
- [Martinez Polygon Clipping](https://github.com/w8r/martinez)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Testing Framework](https://vitest.dev/)

### Community

- **Slack Channel**: #bim-development
- **Weekly Meetings**: Thursdays 2 PM EST
- **Code Reviews**: All PRs require 2 approvals
- **Architecture Decisions**: Documented in ADR format

## Getting Help

### Internal Support

1. **Documentation**: Check this guide and API docs first
2. **Code Examples**: Look at existing implementations
3. **Tests**: Examine test cases for usage patterns
4. **Team Chat**: Ask questions in #bim-development
5. **Office Hours**: Tuesdays 3-4 PM EST

### Escalation Path

1. **Technical Issues**: Senior developers
2. **Architecture Decisions**: Tech lead
3. **Performance Problems**: Performance team
4. **Mathematical Questions**: Geometry specialists

Welcome to the team! The BIM Wall System is a sophisticated piece of software that requires attention to detail and understanding of computational geometry. Take your time to understand the patterns and don't hesitate to ask questions.