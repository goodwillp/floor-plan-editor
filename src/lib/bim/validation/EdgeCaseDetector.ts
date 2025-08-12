import { Curve } from '../geometry/Curve';
import { BIMPoint, BIMPointImpl } from '../geometry/BIMPoint';
import { Vector2DImpl } from '../geometry/Vector2D';
import { WallSolid } from '../geometry/WallSolid';
import { GeometricError, GeometricErrorType, ErrorSeverity } from './GeometricError';

/**
 * Edge case types that can occur in geometric operations
 */
export enum EdgeCaseType {
  ZERO_LENGTH_SEGMENT = 'zero_length_segment',
  DEGENERATE_GEOMETRY = 'degenerate_geometry',
  SELF_INTERSECTION = 'self_intersection',
  EXTREME_ANGLE = 'extreme_angle',
  NUMERICAL_INSTABILITY = 'numerical_instability',
  COINCIDENT_POINTS = 'coincident_points',
  INVALID_CURVE = 'invalid_curve',
  MICRO_SEGMENT = 'micro_segment'
}

/**
 * Edge case detection result
 */
export interface EdgeCaseResult {
  hasEdgeCase: boolean;
  edgeCaseType: EdgeCaseType;
  severity: ErrorSeverity;
  description: string;
  affectedElements: string[];
  suggestedFix: string;
  canAutoFix: boolean;
  tolerance: number;
}

/**
 * Configuration for edge case detection
 */
export interface EdgeCaseConfig {
  minSegmentLength: number;
  minAngleTolerance: number;
  maxAngleTolerance: number;
  numericalPrecision: number;
  selfIntersectionTolerance: number;
  coincidentPointTolerance: number;
}

/**
 * Comprehensive edge case detection system for BIM geometric operations
 */
export class EdgeCaseDetector {
  private config: EdgeCaseConfig;

  constructor(config?: Partial<EdgeCaseConfig>) {
    this.config = {
      minSegmentLength: 1e-6,
      minAngleTolerance: 1e-3, // ~0.06 degrees
      maxAngleTolerance: Math.PI - 1e-3, // ~179.94 degrees
      numericalPrecision: 1e-12,
      selfIntersectionTolerance: 1e-6,
      coincidentPointTolerance: 1e-8,
      ...config
    };
  }

  /**
   * Detect all edge cases in a curve
   */
  detectCurveEdgeCases(curve: Curve): EdgeCaseResult[] {
    const results: EdgeCaseResult[] = [];

    // Check for zero-length segments
    const zeroLengthResult = this.detectZeroLengthSegments(curve);
    if (zeroLengthResult.hasEdgeCase) {
      results.push(zeroLengthResult);
    }

    // Check for degenerate geometry
    const degenerateResult = this.detectDegenerateGeometry(curve);
    if (degenerateResult.hasEdgeCase) {
      results.push(degenerateResult);
    }

    // Check for self-intersections
    const selfIntersectionResult = this.detectSelfIntersections(curve);
    if (selfIntersectionResult.hasEdgeCase) {
      results.push(selfIntersectionResult);
    }

    // Check for extreme angles
    const extremeAngleResult = this.detectExtremeAngles(curve);
    if (extremeAngleResult.hasEdgeCase) {
      results.push(extremeAngleResult);
    }

    // Check for coincident points
    const coincidentResult = this.detectCoincidentPoints(curve);
    if (coincidentResult.hasEdgeCase) {
      results.push(coincidentResult);
    }

    // Check for micro segments
    const microSegmentResult = this.detectMicroSegments(curve);
    if (microSegmentResult.hasEdgeCase) {
      results.push(microSegmentResult);
    }

    return results;
  }

  /**
   * Detect edge cases in a wall solid
   */
  detectWallSolidEdgeCases(wallSolid: WallSolid): EdgeCaseResult[] {
    const results: EdgeCaseResult[] = [];

    // Check baseline curve
    const baselineResults = this.detectCurveEdgeCases(wallSolid.baseline);
    results.push(...baselineResults);

    // Check offset curves if they exist
    if (wallSolid.leftOffset) {
      const leftResults = this.detectCurveEdgeCases(wallSolid.leftOffset);
      results.push(...leftResults.map(r => ({
        ...r,
        description: `Left offset: ${r.description}`
      })));
    }

    if (wallSolid.rightOffset) {
      const rightResults = this.detectCurveEdgeCases(wallSolid.rightOffset);
      results.push(...rightResults.map(r => ({
        ...r,
        description: `Right offset: ${r.description}`
      })));
    }

    // Check for numerical instability in thickness
    if (wallSolid.thickness < this.config.numericalPrecision) {
      results.push({
        hasEdgeCase: true,
        edgeCaseType: EdgeCaseType.NUMERICAL_INSTABILITY,
        severity: ErrorSeverity.ERROR,
        description: `Wall thickness ${wallSolid.thickness} is below numerical precision`,
        affectedElements: [wallSolid.id],
        suggestedFix: 'Increase wall thickness to a reasonable value',
        canAutoFix: false,
        tolerance: this.config.numericalPrecision
      });
    }

    return results;
  }

  /**
   * Detect zero-length segments in a curve
   */
  private detectZeroLengthSegments(curve: Curve): EdgeCaseResult {
    const zeroLengthSegments: number[] = [];

    for (let i = 0; i < curve.points.length - 1; i++) {
      const p1 = curve.points[i];
      const p2 = curve.points[i + 1];
      const distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );

      if (distance < this.config.minSegmentLength) {
        zeroLengthSegments.push(i);
      }
    }

    if (zeroLengthSegments.length > 0) {
      return {
        hasEdgeCase: true,
        edgeCaseType: EdgeCaseType.ZERO_LENGTH_SEGMENT,
        severity: ErrorSeverity.WARNING,
        description: `Found ${zeroLengthSegments.length} zero-length segments`,
        affectedElements: zeroLengthSegments.map(i => `segment_${i}`),
        suggestedFix: 'Remove zero-length segments or merge coincident points',
        canAutoFix: true,
        tolerance: this.config.minSegmentLength
      };
    }

    return {
      hasEdgeCase: false,
      edgeCaseType: EdgeCaseType.ZERO_LENGTH_SEGMENT,
      severity: ErrorSeverity.WARNING,
      description: 'No zero-length segments detected',
      affectedElements: [],
      suggestedFix: '',
      canAutoFix: false,
      tolerance: this.config.minSegmentLength
    };
  }

  /**
   * Detect degenerate geometry (curves with less than 2 points, etc.)
   */
  private detectDegenerateGeometry(curve: Curve): EdgeCaseResult {
    const issues: string[] = [];

    // Check minimum point count
    if (curve.points.length < 2) {
      issues.push('Curve has less than 2 points');
    }

    // Check for all points being identical
    if (curve.points.length >= 2) {
      const firstPoint = curve.points[0];
      const allIdentical = curve.points.every(p => 
        Math.abs(p.x - firstPoint.x) < this.config.coincidentPointTolerance &&
        Math.abs(p.y - firstPoint.y) < this.config.coincidentPointTolerance
      );

      if (allIdentical) {
        issues.push('All points in curve are identical');
      }
    }

    // Check for invalid curve length
    if (curve.length !== undefined && curve.length < this.config.minSegmentLength) {
      issues.push(`Curve length ${curve.length} is below minimum threshold`);
    }

    if (issues.length > 0) {
      return {
        hasEdgeCase: true,
        edgeCaseType: EdgeCaseType.DEGENERATE_GEOMETRY,
        severity: ErrorSeverity.ERROR,
        description: issues.join('; '),
        affectedElements: [curve.id],
        suggestedFix: 'Reconstruct curve with valid geometry',
        canAutoFix: false,
        tolerance: this.config.minSegmentLength
      };
    }

    return {
      hasEdgeCase: false,
      edgeCaseType: EdgeCaseType.DEGENERATE_GEOMETRY,
      severity: ErrorSeverity.WARNING,
      description: 'No degenerate geometry detected',
      affectedElements: [],
      suggestedFix: '',
      canAutoFix: false,
      tolerance: this.config.minSegmentLength
    };
  }

  /**
   * Detect self-intersections in a curve
   */
  private detectSelfIntersections(curve: Curve): EdgeCaseResult {
    const intersections: Array<{segment1: number, segment2: number, point: BIMPoint}> = [];

    // Check each segment against every other non-adjacent segment
    for (let i = 0; i < curve.points.length - 1; i++) {
      for (let j = i + 2; j < curve.points.length - 1; j++) {
        // Skip adjacent segments and last-first segment for closed curves
        if (curve.isClosed && i === 0 && j === curve.points.length - 2) {
          continue;
        }

        const intersection = this.findSegmentIntersection(
          curve.points[i], curve.points[i + 1],
          curve.points[j], curve.points[j + 1]
        );

        if (intersection) {
          intersections.push({
            segment1: i,
            segment2: j,
            point: intersection
          });
        }
      }
    }

    if (intersections.length > 0) {
      return {
        hasEdgeCase: true,
        edgeCaseType: EdgeCaseType.SELF_INTERSECTION,
        severity: ErrorSeverity.ERROR,
        description: `Found ${intersections.length} self-intersections`,
        affectedElements: intersections.map(i => `intersection_${i.segment1}_${i.segment2}`),
        suggestedFix: 'Resolve self-intersections by modifying curve geometry',
        canAutoFix: false,
        tolerance: this.config.selfIntersectionTolerance
      };
    }

    return {
      hasEdgeCase: false,
      edgeCaseType: EdgeCaseType.SELF_INTERSECTION,
      severity: ErrorSeverity.WARNING,
      description: 'No self-intersections detected',
      affectedElements: [],
      suggestedFix: '',
      canAutoFix: false,
      tolerance: this.config.selfIntersectionTolerance
    };
  }

  /**
   * Detect extreme angles that could cause numerical instability
   */
  private detectExtremeAngles(curve: Curve): EdgeCaseResult {
    const extremeAngles: Array<{index: number, angle: number}> = [];

    for (let i = 1; i < curve.points.length - 1; i++) {
      const p1 = curve.points[i - 1];
      const p2 = curve.points[i];
      const p3 = curve.points[i + 1];

      const v1 = new Vector2DImpl(p2.x - p1.x, p2.y - p1.y);
      const v2 = new Vector2DImpl(p3.x - p2.x, p3.y - p2.y);

      const angle = this.calculateAngleBetweenVectors(v1, v2);

      // Check for extremely small angles (near 0°)
      if (angle < this.config.minAngleTolerance) {
        extremeAngles.push({index: i, angle});
      }
      // Check for extremely large angles (near 180°)
      else if (angle > this.config.maxAngleTolerance) {
        extremeAngles.push({index: i, angle});
      }
    }

    if (extremeAngles.length > 0) {
      const severity = extremeAngles.some(a => 
        a.angle < this.config.minAngleTolerance * 0.1 || 
        a.angle > this.config.maxAngleTolerance * 1.1
      ) ? ErrorSeverity.ERROR : ErrorSeverity.WARNING;

      return {
        hasEdgeCase: true,
        edgeCaseType: EdgeCaseType.EXTREME_ANGLE,
        severity,
        description: `Found ${extremeAngles.length} extreme angles`,
        affectedElements: extremeAngles.map(a => `angle_${a.index}`),
        suggestedFix: 'Adjust geometry to avoid extreme angles or use specialized handling',
        canAutoFix: true,
        tolerance: this.config.minAngleTolerance
      };
    }

    return {
      hasEdgeCase: false,
      edgeCaseType: EdgeCaseType.EXTREME_ANGLE,
      severity: ErrorSeverity.WARNING,
      description: 'No extreme angles detected',
      affectedElements: [],
      suggestedFix: '',
      canAutoFix: false,
      tolerance: this.config.minAngleTolerance
    };
  }

  /**
   * Detect coincident points in a curve
   */
  private detectCoincidentPoints(curve: Curve): EdgeCaseResult {
    const coincidentPairs: Array<{index1: number, index2: number}> = [];

    for (let i = 0; i < curve.points.length; i++) {
      for (let j = i + 1; j < curve.points.length; j++) {
        const p1 = curve.points[i];
        const p2 = curve.points[j];
        const distance = Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
        );

        if (distance < this.config.coincidentPointTolerance) {
          coincidentPairs.push({index1: i, index2: j});
        }
      }
    }

    if (coincidentPairs.length > 0) {
      return {
        hasEdgeCase: true,
        edgeCaseType: EdgeCaseType.COINCIDENT_POINTS,
        severity: ErrorSeverity.WARNING,
        description: `Found ${coincidentPairs.length} pairs of coincident points`,
        affectedElements: coincidentPairs.map(p => `points_${p.index1}_${p.index2}`),
        suggestedFix: 'Merge coincident points or increase point separation',
        canAutoFix: true,
        tolerance: this.config.coincidentPointTolerance
      };
    }

    return {
      hasEdgeCase: false,
      edgeCaseType: EdgeCaseType.COINCIDENT_POINTS,
      severity: ErrorSeverity.WARNING,
      description: 'No coincident points detected',
      affectedElements: [],
      suggestedFix: '',
      canAutoFix: false,
      tolerance: this.config.coincidentPointTolerance
    };
  }

  /**
   * Detect micro segments that are too small for reliable processing
   */
  private detectMicroSegments(curve: Curve): EdgeCaseResult {
    const microSegments: number[] = [];
    const microThreshold = this.config.minSegmentLength * 10; // 10x minimum for micro detection

    for (let i = 0; i < curve.points.length - 1; i++) {
      const p1 = curve.points[i];
      const p2 = curve.points[i + 1];
      const distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );

      if (distance > this.config.minSegmentLength && distance < microThreshold) {
        microSegments.push(i);
      }
    }

    if (microSegments.length > 0) {
      return {
        hasEdgeCase: true,
        edgeCaseType: EdgeCaseType.MICRO_SEGMENT,
        severity: ErrorSeverity.WARNING,
        description: `Found ${microSegments.length} micro segments`,
        affectedElements: microSegments.map(i => `segment_${i}`),
        suggestedFix: 'Consider merging micro segments or increasing segment length',
        canAutoFix: true,
        tolerance: microThreshold
      };
    }

    return {
      hasEdgeCase: false,
      edgeCaseType: EdgeCaseType.MICRO_SEGMENT,
      severity: ErrorSeverity.WARNING,
      description: 'No micro segments detected',
      affectedElements: [],
      suggestedFix: '',
      canAutoFix: false,
      tolerance: microThreshold
    };
  }

  /**
   * Find intersection point between two line segments
   */
  private findSegmentIntersection(
    p1: BIMPoint, p2: BIMPoint, 
    p3: BIMPoint, p4: BIMPoint
  ): BIMPoint | null {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    if (Math.abs(denom) < this.config.numericalPrecision) {
      return null; // Lines are parallel
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // Check if intersection is within both segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return new BIMPointImpl(
        x1 + t * (x2 - x1),
        y1 + t * (y2 - y1),
        {
          id: `intersection_${Date.now()}`,
          tolerance: this.config.selfIntersectionTolerance,
          creationMethod: 'segment_intersection',
          accuracy: 1.0,
          validated: true
        }
      );
    }

    return null;
  }

  /**
   * Calculate angle between two vectors
   */
  private calculateAngleBetweenVectors(v1: any, v2: any): number {
    const dot = v1.dot(v2);
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 < this.config.numericalPrecision || mag2 < this.config.numericalPrecision) {
      return 0; // One of the vectors is too small
    }

    const cosAngle = dot / (mag1 * mag2);
    // Clamp to avoid numerical errors in acos
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    return Math.acos(clampedCos);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EdgeCaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): EdgeCaseConfig {
    return { ...this.config };
  }
}