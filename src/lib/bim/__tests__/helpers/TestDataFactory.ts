/**
 * Test Data Factory
 * 
 * Creates test data for BIM wall system testing
 */

import { UnifiedWallData, BasicGeometry, BIMGeometry } from '../../types/UnifiedWallData';
import { QualityMetrics, QualityIssue, QualityIssueType } from '../../types/QualityMetrics';
import { IntersectionData } from '../../geometry/IntersectionData';
import { WallSolid } from '../../geometry/WallSolid';
import { Curve } from '../../geometry/Curve';
import { CurveType } from '../../types/BIMTypes';
import { BIMPoint } from '../../geometry/BIMPoint';
import { WallTypeString } from '../../types/WallTypes';
import { IntersectionType } from '../../types/IntersectionTypes';
import { OffsetJoinType } from '../../types/OffsetTypes';

export interface TestWallOptions {
  id: string;
  type: WallTypeString;
  thickness: number;
  visible?: boolean;
  includeBIMGeometry?: boolean;
  baselinePoints?: Array<{ x: number; y: number }>;
  projectId?: string;
}

export interface TestQualityMetricsOptions {
  geometricAccuracy?: number;
  topologicalConsistency?: number;
  manufacturability?: number;
  architecturalCompliance?: number;
  sliverFaceCount?: number;
  microGapCount?: number;
  selfIntersectionCount?: number;
  degenerateElementCount?: number;
  complexity?: number;
  processingEfficiency?: number;
  memoryUsage?: number;
  issues?: QualityIssue[];
  recommendations?: string[];
}

export interface TestIntersectionDataOptions {
  id: string;
  type: IntersectionType;
  participatingWalls: string[];
  intersectionPoint: { x: number; y: number };
  miterApex?: { x: number; y: number } | null;
  resolutionMethod?: string;
  geometricAccuracy?: number;
  validated?: boolean;
}

/**
 * Create a test wall with specified options
 */
export function createTestWall(options: TestWallOptions): UnifiedWallData {
  const {
    id,
    type,
    thickness,
    visible = true,
    includeBIMGeometry = false,
    baselinePoints = [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    projectId
  } = options;

  // Create baseline curve
  const baseline = createTestCurve({
    id: `${id}-baseline`,
    points: baselinePoints,
    type: CurveType.POLYLINE
  });

  // Create basic geometry
  const basicGeometry: BasicGeometry = {
    segments: [
      {
        id: `${id}-segment-1`,
        startPoint: baselinePoints[0],
        endPoint: baselinePoints[1],
        thickness
      }
    ],
    nodes: baselinePoints.map((point, index) => ({
      id: `${id}-node-${index}`,
      x: point.x,
      y: point.y
    })),
    polygons: [
      {
        id: `${id}-polygon`,
        points: [
          { x: baselinePoints[0].x, y: baselinePoints[0].y - thickness / 2 },
          { x: baselinePoints[1].x, y: baselinePoints[1].y - thickness / 2 },
          { x: baselinePoints[1].x, y: baselinePoints[1].y + thickness / 2 },
          { x: baselinePoints[0].x, y: baselinePoints[0].y + thickness / 2 }
        ]
      }
    ]
  };

  // Create BIM geometry if requested
  let bimGeometry: BIMGeometry | undefined;
  if (includeBIMGeometry) {
    bimGeometry = createTestBIMGeometry({
      wallId: id,
      baseline,
      thickness,
      type
    });
  }

  const now = new Date();

  return {
    id,
    type,
    thickness,
    visible,
    baseline,
    basicGeometry,
    bimGeometry,
    isBasicModeValid: true,
    isBIMModeValid: includeBIMGeometry,
    lastModifiedMode: includeBIMGeometry ? 'bim' : 'basic',
    requiresSync: false,
    createdAt: now,
    updatedAt: now,
    version: 1,
    projectId,
    processingHistory: [
      {
        timestamp: now,
        operation: 'create',
        mode: 'basic',
        success: true,
        processingTime: 10,
        warnings: [],
        errors: []
      }
    ]
  };
}

/**
 * Create a test curve
 */
export function createTestCurve(options: {
  id: string;
  points: Array<{ x: number; y: number }>;
  type: CurveType;
  isClosed?: boolean;
}): Curve {
  const { id, points, type, isClosed = false } = options;

  const bimPoints: BIMPoint[] = points.map((point, index) => ({
    x: point.x,
    y: point.y,
    id: `${id}-point-${index}`,
    tolerance: 0.1,
    creationMethod: 'manual',
    accuracy: 1.0,
    validated: true
  }));

  // Calculate length
  let length = 0;
  for (let i = 1; i < bimPoints.length; i++) {
    const dx = bimPoints[i].x - bimPoints[i - 1].x;
    const dy = bimPoints[i].y - bimPoints[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate bounding box
  const xs = bimPoints.map(p => p.x);
  const ys = bimPoints.map(p => p.y);
  const boundingBox = {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };

  return {
    id,
    points: bimPoints,
    type,
    isClosed,
    length,
    boundingBox,
    curvature: bimPoints.map(() => 0), // Straight lines have zero curvature
    tangents: bimPoints.map((_, index) => {
      if (index === bimPoints.length - 1) {
        return { x: 1, y: 0 }; // Default tangent for last point
      }
      const next = bimPoints[index + 1];
      const current = bimPoints[index];
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      return length > 0 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
    })
  };
}

/**
 * Create test BIM geometry
 */
function createTestBIMGeometry(options: {
  wallId: string;
  baseline: Curve;
  thickness: number;
  type: WallTypeString;
}): BIMGeometry {
  const { wallId, baseline, thickness, type } = options;

  // Create offset curves
  const leftOffset = createOffsetCurve(baseline, thickness / 2, 'left');
  const rightOffset = createOffsetCurve(baseline, thickness / 2, 'right');

  // Create wall solid
  const wallSolid: WallSolid = {
    id: wallId,
    baseline,
    thickness,
    wallType: type,
    leftOffset,
    rightOffset,
    solidGeometry: [
      {
        id: `${wallId}-solid-polygon`,
        outerRing: [
          ...leftOffset.points,
          ...rightOffset.points.reverse()
        ],
        holes: [],
        area: thickness * baseline.length,
        perimeter: 2 * (baseline.length + thickness),
        centroid: {
          x: (baseline.boundingBox.minX + baseline.boundingBox.maxX) / 2,
          y: (baseline.boundingBox.minY + baseline.boundingBox.maxY) / 2,
          id: `${wallId}-centroid`,
          tolerance: 0.1,
          creationMethod: 'calculated',
          accuracy: 1.0,
          validated: true
        },
        boundingBox: {
          minX: Math.min(leftOffset.boundingBox.minX, rightOffset.boundingBox.minX),
          minY: Math.min(leftOffset.boundingBox.minY, rightOffset.boundingBox.minY),
          maxX: Math.max(leftOffset.boundingBox.maxX, rightOffset.boundingBox.maxX),
          maxY: Math.max(leftOffset.boundingBox.maxY, rightOffset.boundingBox.maxY)
        },
        isValid: true,
        selfIntersects: false,
        hasSliversFaces: false,
        creationMethod: 'offset',
        healingApplied: false,
        simplificationApplied: false
      }
    ],
    joinTypes: new Map([
      ['start', OffsetJoinType.MITER],
      ['end', OffsetJoinType.MITER]
    ]),
    intersectionData: [],
    healingHistory: [],
    geometricQuality: createTestQualityMetrics({
      geometricAccuracy: 0.98,
      topologicalConsistency: 1.0,
      manufacturability: 0.95
    }),
    lastValidated: new Date(),
    processingTime: 15,
    complexity: 1.0
  };

  return {
    wallSolid,
    offsetCurves: [leftOffset, rightOffset],
    intersectionData: [],
    qualityMetrics: wallSolid.geometricQuality
  };
}

/**
 * Create an offset curve from a baseline
 */
function createOffsetCurve(baseline: Curve, distance: number, side: 'left' | 'right'): Curve {
  const offsetPoints: BIMPoint[] = baseline.points.map((point, index) => {
    const tangent = baseline.tangents[index];
    const normal = side === 'left' 
      ? { x: -tangent.y, y: tangent.x }
      : { x: tangent.y, y: -tangent.x };

    return {
      x: point.x + normal.x * distance,
      y: point.y + normal.y * distance,
      id: `${baseline.id}-offset-${side}-${index}`,
      tolerance: (point as BIMPoint).tolerance,
      creationMethod: 'offset',
      accuracy: (point as BIMPoint).accuracy,
      validated: true
    };
  });

  // Calculate bounding box for offset curve
  const xs = offsetPoints.map(p => p.x);
  const ys = offsetPoints.map(p => p.y);
  const boundingBox = {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };

  return {
    id: `${baseline.id}-offset-${side}`,
    points: offsetPoints,
    type: baseline.type,
    isClosed: baseline.isClosed,
    length: baseline.length, // Approximation
    boundingBox,
    curvature: baseline.curvature,
    tangents: baseline.tangents
  };
}

/**
 * Create test quality metrics
 */
export function createTestQualityMetrics(options: TestQualityMetricsOptions = {}): QualityMetrics {
  const {
    geometricAccuracy = 0.95,
    topologicalConsistency = 0.98,
    manufacturability = 0.92,
    architecturalCompliance = 0.96,
    sliverFaceCount = 0,
    microGapCount = 0,
    selfIntersectionCount = 0,
    degenerateElementCount = 0,
    complexity = 1.0,
    processingEfficiency = 0.85,
    memoryUsage = 1024,
    issues = [],
    recommendations = []
  } = options;

  return {
    geometricAccuracy,
    topologicalConsistency,
    manufacturability,
    architecturalCompliance,
    sliverFaceCount,
    microGapCount,
    selfIntersectionCount,
    degenerateElementCount,
    complexity,
    processingEfficiency,
    memoryUsage,
    calculatedAt: new Date(),
    calculationMethod: 'test',
    toleranceUsed: 0.1,
    issues,
    recommendations
  };
}

/**
 * Create test intersection data
 */
export function createTestIntersectionData(options: TestIntersectionDataOptions): IntersectionData {
  const {
    id,
    type,
    participatingWalls,
    intersectionPoint,
    miterApex = null,
    resolutionMethod = 'miter_calculation',
    geometricAccuracy = 0.95,
    validated = true
  } = options;

  return {
    id,
    type,
    participatingWalls,
    intersectionPoint,
    miterApex,
    offsetIntersections: [
      { x: intersectionPoint.x - 10, y: intersectionPoint.y },
      { x: intersectionPoint.x + 10, y: intersectionPoint.y }
    ],
    resolvedGeometry: {
      id: `${id}-resolved`,
      outerRing: [
        { x: intersectionPoint.x - 20, y: intersectionPoint.y - 20, id: `${id}-p1`, tolerance: 0.1, creationMethod: 'intersection', accuracy: 1.0, validated: true },
        { x: intersectionPoint.x + 20, y: intersectionPoint.y - 20, id: `${id}-p2`, tolerance: 0.1, creationMethod: 'intersection', accuracy: 1.0, validated: true },
        { x: intersectionPoint.x + 20, y: intersectionPoint.y + 20, id: `${id}-p3`, tolerance: 0.1, creationMethod: 'intersection', accuracy: 1.0, validated: true },
        { x: intersectionPoint.x - 20, y: intersectionPoint.y + 20, id: `${id}-p4`, tolerance: 0.1, creationMethod: 'intersection', accuracy: 1.0, validated: true }
      ],
      holes: [],
      area: 1600,
      perimeter: 160,
      centroid: {
        x: intersectionPoint.x,
        y: intersectionPoint.y,
        id: `${id}-centroid`,
        tolerance: 0.1,
        creationMethod: 'calculated',
        accuracy: 1.0,
        validated: true
      },
      boundingBox: {
        minX: intersectionPoint.x - 20,
        minY: intersectionPoint.y - 20,
        maxX: intersectionPoint.x + 20,
        maxY: intersectionPoint.y + 20
      },
      isValid: true,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'intersection_resolution',
      healingApplied: false,
      simplificationApplied: false
    },
    resolutionMethod,
    geometricAccuracy,
    validated
  };
}

/**
 * Create test quality issue
 */
export function createTestQualityIssue(options: {
  type: QualityIssueType;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  location?: { x: number; y: number };
  suggestedFix?: string;
  autoFixable?: boolean;
}): QualityIssue {
  const {
    type,
    severity = 'medium',
    description = `Test ${type} issue`,
    location,
    suggestedFix = 'Apply appropriate fix',
    autoFixable = true
  } = options;

  return {
    type,
    severity,
    description,
    location,
    suggestedFix,
    autoFixable
  };
}

/**
 * Create test wall solid (simplified version for visualization tests)
 */
export function createTestWallSolid(id: string, thickness: number): WallSolid {
  const baseline = createTestCurve({
    id: `${id}-baseline`,
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
    type: CurveType.POLYLINE
  });

  const leftOffset = createOffsetCurve(baseline, thickness / 2, 'left');
  const rightOffset = createOffsetCurve(baseline, thickness / 2, 'right');

  return {
    id,
    baseline,
    thickness,
    wallType: 'Layout' as WallTypeString,
    leftOffset,
    rightOffset,
    solidGeometry: [
      {
        id: `${id}-solid`,
        outerRing: [
          ...leftOffset.points,
          ...rightOffset.points.reverse()
        ],
        holes: [],
        area: thickness * baseline.length,
        perimeter: 2 * (baseline.length + thickness),
        centroid: {
          x: 50,
          y: 50,
          id: `${id}-centroid`,
          tolerance: 0.1,
          creationMethod: 'calculated',
          accuracy: 1.0,
          validated: true
        },
        boundingBox: {
          minX: 0,
          minY: 0,
          maxX: 100,
          maxY: 100
        },
        isValid: true,
        selfIntersects: false,
        hasSliversFaces: false,
        creationMethod: 'test',
        healingApplied: false,
        simplificationApplied: false
      }
    ],
    joinTypes: new Map(),
    intersectionData: [],
    healingHistory: [],
    geometricQuality: createTestQualityMetrics(),
    lastValidated: new Date(),
    processingTime: 10,
    complexity: 1.0
  };
}

/**
 * TestDataFactory object for compatibility with existing tests
 */
export const TestDataFactory = {
  createTestWallSolid,
  createTestQualityMetrics,
  createTestIntersectionData,
  createTestWall,
  createTestCurve,
  createTestQualityIssue
};

/**
 * Extended TestDataFactory class for comprehensive testing
 */
export class ExtendedTestDataFactory {
  createValidWallSolid(): WallSolid {
    return createTestWallSolid('valid-wall', 100);
  }

  createWallSolidWithInvalidBaseline(): WallSolid {
    const wall = this.createValidWallSolid();
    wall.baseline.points = []; // Empty baseline - invalid
    return wall;
  }

  createWallSolidWithTopologyIssues(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create polygon with insufficient vertices
    wall.solidGeometry = [{
      id: 'topology-issue',
      outerRing: [
        { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
        { x: 100, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
        // Missing third point for valid polygon
      ],
      holes: [],
      area: 0,
      perimeter: 100,
      centroid: { x: 50, y: 0, id: 'centroid', tolerance: 0.001, creationMethod: 'calculated', accuracy: 1.0, validated: true },
      boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 0 },
      isValid: false,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'test',
      healingApplied: false,
      simplificationApplied: false
    }];
    
    return wall;
  }

  createWallSolidWithNumericalIssues(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Add micro-segments that cause numerical instability
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 0.000001, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }, // Micro-segment
      { x: 100, y: 0, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    return wall;
  }

  createWallSolidWithMultipleIssues(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Add multiple issues
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 0, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }, // Duplicate
      { x: 100, y: 0, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    wall.thickness = -10; // Invalid thickness
    
    return wall;
  }

  createWallSolidWithSelfIntersections(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create self-intersecting baseline
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 100, y: 100, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 100, y: 0, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 0, y: 100, id: 'p4', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true } // Creates intersection
    ];
    
    return wall;
  }

  createComplexWallSolid(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create complex geometry with many vertices
    const points = [];
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      points.push({
        x: Math.cos(angle) * 100 + Math.sin(angle * 5) * 20,
        y: Math.sin(angle) * 100 + Math.cos(angle * 3) * 15,
        id: `complex_${i}`,
        tolerance: 0.001,
        creationMethod: 'generated',
        accuracy: 1.0,
        validated: true
      });
    }
    
    wall.baseline.points = points;
    wall.complexity = 10;
    wall.processingTime = 500;
    
    return wall;
  }

  createWallSolidWithDuplicateVertices(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Add duplicate consecutive vertices
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 50, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 50, y: 0, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }, // Duplicate
      { x: 100, y: 0, id: 'p4', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    return wall;
  }

  // Additional test data creation methods for stress tests
  createComplexIntersectionNetwork(wallCount: number): WallSolid[] {
    const walls: WallSolid[] = [];
    const gridSize = Math.ceil(Math.sqrt(wallCount));
    
    for (let i = 0; i < wallCount; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      const wall = this.createValidWallSolid();
      wall.id = `network_wall_${i}`;
      
      // Create intersecting grid pattern
      if (i % 2 === 0) {
        // Horizontal walls
        wall.baseline.points = [
          { x: col * 200, y: row * 200, id: `h_${i}_1`, tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
          { x: (col + 1) * 200, y: row * 200, id: `h_${i}_2`, tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
        ];
      } else {
        // Vertical walls
        wall.baseline.points = [
          { x: col * 200, y: row * 200, id: `v_${i}_1`, tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
          { x: col * 200, y: (row + 1) * 200, id: `v_${i}_2`, tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
        ];
      }
      
      walls.push(wall);
    }
    
    return walls;
  }

  createHighVertexCountWall(vertexCount: number): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create a complex curve with many vertices
    const points = [];
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 4; // Multiple loops
      const radius = 100 + Math.sin(angle * 3) * 20; // Varying radius
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        id: `vertex_${i}`,
        tolerance: 0.001,
        creationMethod: 'generated',
        accuracy: 1.0,
        validated: true
      });
    }
    
    wall.baseline.points = points;
    wall.baseline.length = this.calculateCurveLength(points);
    wall.complexity = vertexCount / 100; // Complexity based on vertex count
    
    return wall;
  }

  createWallSolidWithMinorIssues(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Add minor issues that are easily recoverable
    wall.baseline.points.push({
      x: wall.baseline.points[wall.baseline.points.length - 1].x + 0.0001, // Very close duplicate
      y: wall.baseline.points[wall.baseline.points.length - 1].y,
      id: 'minor_duplicate',
      tolerance: 0.001,
      creationMethod: 'user',
      accuracy: 1.0,
      validated: true
    });
    
    return wall;
  }

  createWallSolidWithRecoverableIssues(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Add issues that can be automatically recovered
    wall.thickness = 0; // Invalid thickness but recoverable
    
    // Add duplicate consecutive vertices
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 0, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }, // Duplicate
      { x: 100, y: 0, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    return wall;
  }

  createWallSolidWithInvalidThickness(): WallSolid {
    const wall = this.createValidWallSolid();
    wall.thickness = -50; // Invalid negative thickness
    return wall;
  }

  createWallSolidWithMicroSegments(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Add micro-segments
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 0.000001, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }, // Micro-segment
      { x: 100, y: 0, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    return wall;
  }

  createWallSolidWithMixedQuality(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Set mixed quality metrics
    wall.geometricQuality = {
      geometricAccuracy: 0.6,
      topologicalConsistency: 0.8,
      manufacturability: 0.7,
      architecturalCompliance: 0.5,
      sliverFaceCount: 2,
      microGapCount: 1,
      selfIntersectionCount: 0,
      degenerateElementCount: 1,
      complexity: 3,
      processingEfficiency: 0.4,
      memoryUsage: 2048,
      calculatedAt: new Date(),
      calculationMethod: 'test',
      toleranceUsed: 0.1,
      issues: [],
      recommendations: []
    };
    
    return wall;
  }

  createWallSolidRequiringSignificantRecovery(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create issues that require significant recovery with high quality impact
    wall.baseline.points = Array(1000).fill(null).map((_, i) => ({
      x: i * 0.1, // Very dense points
      y: Math.sin(i * 0.1) * 10,
      id: `dense_${i}`,
      tolerance: 0.001,
      creationMethod: 'generated',
      accuracy: 1.0,
      validated: true
    }));
    
    wall.complexity = 50; // Very high complexity
    
    return wall;
  }

  createWallSolidWithWrongOrientation(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create polygon with counter-clockwise orientation (wrong for our system)
    wall.solidGeometry = [{
      id: 'wrong_orientation',
      outerRing: [
        { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
        { x: 0, y: 100, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
        { x: 100, y: 100, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
        { x: 100, y: 0, id: 'p4', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
      ], // Counter-clockwise
      holes: [],
      area: 10000,
      perimeter: 400,
      centroid: { x: 50, y: 50, id: 'centroid', tolerance: 0.001, creationMethod: 'calculated', accuracy: 1.0, validated: true },
      boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      isValid: true,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'offset_operation',
      healingApplied: false,
      simplificationApplied: false
    }];
    
    return wall;
  }

  createWallSolidWithCascadingIssues(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create issues where fixing one might create another
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 50, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 25, y: 0.001, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }, // Near-collinear
      { x: 100, y: 0, id: 'p4', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    wall.thickness = 0.001; // Very thin, might cause issues after simplification
    
    return wall;
  }

  createWallSolidWithCriticalIssues(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create critical issues that are hard to recover from
    wall.baseline.points = []; // Empty baseline - critical issue
    wall.thickness = NaN; // Invalid thickness
    wall.solidGeometry = null as any; // Null geometry
    
    return wall;
  }

  createVeryLargeWallSolid(vertexCount: number): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create very large wall with many vertices and complex geometry
    const points = [];
    for (let i = 0; i < vertexCount; i++) {
      points.push({
        x: Math.random() * 10000,
        y: Math.random() * 10000,
        id: `large_vertex_${i}`,
        tolerance: 0.001,
        creationMethod: 'generated',
        accuracy: 1.0,
        validated: true
      });
    }
    
    wall.baseline.points = points;
    wall.complexity = vertexCount / 10;
    
    // Create large solid geometry
    wall.solidGeometry = Array(Math.floor(vertexCount / 100)).fill(null).map((_, i) => ({
      id: `large_polygon_${i}`,
      outerRing: points.slice(i * 100, (i + 1) * 100).slice(0, 50), // Take subset for polygon
      holes: [],
      area: 1000000,
      perimeter: 4000,
      centroid: { x: 5000, y: 5000, id: `centroid_${i}`, tolerance: 0.001, creationMethod: 'calculated', accuracy: 1.0, validated: true },
      boundingBox: { minX: 0, minY: 0, maxX: 10000, maxY: 10000 },
      isValid: true,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'offset_operation',
      healingApplied: false,
      simplificationApplied: false
    }));
    
    return wall;
  }

  // Extreme and pathological test cases
  createWallSolidWithExtremeAngles(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create walls with very sharp angles
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 100, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 100.001, y: 0, id: 'p3', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }, // Nearly 180° angle
      { x: 200, y: 0, id: 'p4', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    return wall;
  }

  createWallSolidWithMicroscopicFeatures(): WallSolid {
    const wall = this.createValidWallSolid();
    
    wall.thickness = 1e-10; // Microscopic thickness
    wall.baseline.points = [
      { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 1e-9, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true } // Microscopic length
    ];
    
    return wall;
  }

  createWallSolidWithGiantCoordinates(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create walls with very large coordinates
    wall.baseline.points = [
      { x: 1e12, y: 1e12, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 1e12 + 100, y: 1e12, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    return wall;
  }

  createLargeFloorPlan(wallCount: number): any {
    // Create a large floor plan with the specified number of walls
    const walls = [];
    const gridSize = Math.ceil(Math.sqrt(wallCount));
    
    for (let i = 0; i < wallCount; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      const wall = this.createValidWallSolid();
      wall.id = `large_plan_wall_${i}`;
      
      // Create grid pattern
      wall.baseline.points = [
        { x: col * 100, y: row * 100, id: `lp_${i}_1`, tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
        { x: (col + 1) * 100, y: row * 100, id: `lp_${i}_2`, tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
      ];
      
      walls.push(wall);
    }
    
    return {
      walls,
      wallCount,
      complexity: wallCount / 100,
      estimatedProcessingTime: wallCount * 10
    };
  }

  createWallsWithCompatibilityIssues(): any[] {
    return [
      this.createWallSolidWithInvalidBaseline(),
      this.createWallSolidWithTopologyIssues(),
      this.createWallSolidWithNumericalIssues()
    ];
  }

  private calculateCurveLength(points: Array<{ x: number; y: number }>): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  createWallSolidWithNearZeroThickness(): WallSolid {
    const wall = this.createValidWallSolid();
    wall.thickness = Number.MIN_VALUE; // Near-zero thickness
    return wall;
  }

  createWallSolidWithCircularReferences(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create circular reference in intersection data
    const intersection1 = {
      id: 'int1',
      type: 'T_JUNCTION' as any,
      participatingWalls: ['wall1', 'wall2'],
      intersectionPoint: { x: 50, y: 50, id: 'int_point', tolerance: 0.001, creationMethod: 'calculated', accuracy: 1.0, validated: true },
      miterApex: null,
      offsetIntersections: [],
      resolvedGeometry: wall.solidGeometry![0],
      resolutionMethod: 'miter_calculation',
      geometricAccuracy: 1.0,
      validated: true
    };
    
    const intersection2 = {
      id: 'int2',
      type: 'L_JUNCTION' as any,
      participatingWalls: ['wall2', 'wall1'],
      intersectionPoint: { x: 75, y: 75, id: 'int_point2', tolerance: 0.001, creationMethod: 'calculated', accuracy: 1.0, validated: true },
      miterApex: null,
      offsetIntersections: [],
      resolvedGeometry: wall.solidGeometry![0],
      resolutionMethod: 'miter_calculation',
      geometricAccuracy: 1.0,
      validated: true
    };
    
    // Create circular reference
    (intersection1 as any).relatedIntersection = intersection2;
    (intersection2 as any).relatedIntersection = intersection1;
    
    wall.intersectionData = [intersection1, intersection2];
    
    return wall;
  }

  createWallSolidWithInfiniteLoop(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Create a structure that could cause infinite loops in processing
    const points = [];
    for (let i = 0; i < 10; i++) {
      points.push({
        x: Math.cos(i * Math.PI / 5) * 100,
        y: Math.sin(i * Math.PI / 5) * 100,
        id: `loop_${i}`,
        tolerance: 0.001,
        creationMethod: 'user',
        accuracy: 1.0,
        validated: true
      });
    }
    
    // Close the loop by connecting back to start
    points.push(points[0]);
    wall.baseline.points = points;
    wall.baseline.isClosed = true;
    
    return wall;
  }

  createWallSolidWithNaNValues(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Introduce NaN values
    wall.baseline.points = [
      { x: NaN, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 100, y: NaN, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    wall.thickness = NaN;
    
    return wall;
  }

  createWallSolidWithNegativeInfinity(): WallSolid {
    const wall = this.createValidWallSolid();
    
    wall.baseline.points = [
      { x: -Infinity, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true },
      { x: 100, y: -Infinity, id: 'p2', tolerance: 0.001, creationMethod: 'user', accuracy: 1.0, validated: true }
    ];
    
    return wall;
  }

  createWallSolidWithEmptyGeometry(): WallSolid {
    const wall = this.createValidWallSolid();
    
    wall.baseline.points = [];
    wall.solidGeometry = [];
    wall.leftOffset = null as any;
    wall.rightOffset = null as any;
    
    return wall;
  }

  createWallSolidWithCorruptedData(): WallSolid {
    const wall = this.createValidWallSolid();
    
    // Corrupt various data fields
    (wall as any).baseline = "corrupted_string";
    (wall as any).thickness = { invalid: "object" };
    (wall as any).solidGeometry = [null, undefined, "invalid"];
    
    return wall;
  }

  createCorruptedWallSolid(): WallSolid {
    return this.createWallSolidWithCorruptedData();
  }

  // Helper method for calculating curve length
  private calculateCurveLength(points: any[]): number {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  // Create geometric error with optional parameters
  createGeometricError(
    type: any, 
    severity: any = 'ERROR',
    recoverable: boolean = true
  ): any {
    return {
      type,
      severity,
      operation: 'test_operation',
      input: { test: 'data' },
      message: `Test error of type ${type}`,
      suggestedFix: 'Test suggested fix',
      recoverable
    };
  }

  // Create quality metrics for testing
  createQualityMetrics(): any {
    return {
      geometricAccuracy: Math.random(),
      topologicalConsistency: Math.random(),
      manufacturability: Math.random(),
      architecturalCompliance: Math.random(),
      sliverFaceCount: Math.floor(Math.random() * 5),
      microGapCount: Math.floor(Math.random() * 3),
      selfIntersectionCount: Math.floor(Math.random() * 2),
      degenerateElementCount: Math.floor(Math.random() * 3),
      complexity: Math.random() * 10,
      processingEfficiency: Math.random(),
      memoryUsage: Math.floor(Math.random() * 10000),
      calculatedAt: new Date(),
      calculationMethod: 'test',
      toleranceUsed: 0.1,
      issues: [],
      recommendations: []
    };
  }
}