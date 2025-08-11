/**
 * Robust Offset Engine for curve offsetting with miter/bevel/round join support
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import type { Curve } from '../geometry/Curve';
import type { OffsetResult } from '../types/GeometricTypes';
import { OffsetJoinType } from '../types/BIMTypes';
import { CurveImpl } from '../geometry/Curve';
import { BIMPointImpl } from '../geometry/BIMPoint';
import { Vector2DImpl } from '../geometry/Vector2D';
import { OffsetError, GeometricErrorFactory } from '../validation/GeometricError';

/**
 * Offset operation parameters
 */
interface OffsetParameters {
  distance: number;
  joinType: OffsetJoinType;
  tolerance: number;
  miterLimit?: number;
  roundSegments?: number;
}

/**
 * Join calculation result
 */
interface JoinCalculation {
  joinType: OffsetJoinType;
  points: BIMPointImpl[];
  miterApex?: BIMPointImpl;
  confidence: number;
}

/**
 * Offset segment data
 */
interface OffsetSegment {
  start: BIMPointImpl;
  end: BIMPointImpl;
  normal: Vector2DImpl;
  length: number;
  originalIndex: number;
}

/**
 * Robust Offset Engine implementation
 */
export class RobustOffsetEngine {
  private defaultMiterLimit: number = 10.0;
  private defaultRoundSegments: number = 8;
  private minSegmentLength: number = 1e-6;

  constructor(options: {
    defaultMiterLimit?: number;
    defaultRoundSegments?: number;
    minSegmentLength?: number;
  } = {}) {
    this.defaultMiterLimit = options.defaultMiterLimit || 10.0;
    this.defaultRoundSegments = options.defaultRoundSegments || 8;
    this.minSegmentLength = options.minSegmentLength || 1e-6;
  }

  /**
   * Generate offset curves from baseline curve
   */
  offsetCurve(
    baseline: Curve,
    distance: number,
    joinType: OffsetJoinType,
    tolerance: number
  ): OffsetResult {
    const startTime = Date.now();

    try {
      // Validate input parameters
      this.validateOffsetParameters(baseline, distance, tolerance);

      // Prepare offset parameters
      const params: OffsetParameters = {
        distance,
        joinType,
        tolerance,
        miterLimit: this.defaultMiterLimit,
        roundSegments: this.defaultRoundSegments
      };

      // Generate offset curves
      const leftOffset = this.generateOffsetCurve(baseline, distance, params, 'left');
      const rightOffset = this.generateOffsetCurve(baseline, -distance, params, 'right');

      // Validate results
      this.validateOffsetResults(leftOffset, rightOffset, baseline);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        leftOffset,
        rightOffset,
        joinType,
        warnings: [],
        fallbackUsed: false
      };

    } catch (error) {
      return this.handleOffsetFailure(baseline, distance, error as Error);
    }
  }

  /**
   * Select optimal join type based on geometry
   */
  selectOptimalJoinType(
    angle: number,
    thickness: number,
    localCurvature: number
  ): OffsetJoinType {
    const angleDegrees = Math.abs(angle) * 180 / Math.PI;

    // Very sharp angles (< 15°) - use round to avoid numerical issues
    if (angleDegrees < 15) {
      return OffsetJoinType.ROUND;
    }

    // Sharp angles (15° - 45°) - consider thickness and curvature
    if (angleDegrees < 45) {
      // For thick walls or high curvature, use bevel
      if (thickness > 200 || localCurvature > 0.01) {
        return OffsetJoinType.BEVEL;
      }
      // Otherwise use round for smooth appearance
      return OffsetJoinType.ROUND;
    }

    // Moderate angles (45° - 120°) - miter is usually good
    if (angleDegrees < 120) {
      // Check if miter would be too long
      const miterLength = thickness / Math.sin(angle / 2);
      if (miterLength > thickness * this.defaultMiterLimit) {
        return OffsetJoinType.BEVEL;
      }
      return OffsetJoinType.MITER;
    }

    // Obtuse angles (> 120°) - miter works well
    return OffsetJoinType.MITER;
  }

  /**
   * Handle offset operation failures with fallback strategies
   */
  handleOffsetFailure(baseline: Curve, distance: number, error: Error): OffsetResult {
    const warnings: string[] = [];
    let fallbackUsed = false;

    // Try different fallback strategies
    const fallbackStrategies = [
      () => this.trySimplifiedOffset(baseline, distance),
      () => this.tryReducedPrecisionOffset(baseline, distance),
      () => this.trySegmentedOffset(baseline, distance)
    ];

    for (const strategy of fallbackStrategies) {
      try {
        const result = strategy();
        if (result.leftOffset && result.rightOffset) {
          warnings.push(`Fallback strategy used due to: ${error.message}`);
          return {
            success: true,
            leftOffset: result.leftOffset,
            rightOffset: result.rightOffset,
            joinType: OffsetJoinType.BEVEL, // Safe default
            warnings,
            fallbackUsed: true
          };
        }
      } catch (fallbackError) {
        warnings.push(`Fallback strategy failed: ${fallbackError}`);
      }
    }

    // All strategies failed
    return {
      success: false,
      leftOffset: null,
      rightOffset: null,
      joinType: OffsetJoinType.BEVEL,
      warnings: [...warnings, `All offset strategies failed: ${error.message}`],
      fallbackUsed: true
    };
  }

  /**
   * Generate offset curve for one side
   */
  private generateOffsetCurve(
    baseline: Curve,
    distance: number,
    params: OffsetParameters,
    side: 'left' | 'right'
  ): CurveImpl {
    // Generate offset segments
    const offsetSegments = this.generateOffsetSegments(baseline, distance);

    // Calculate joins between segments
    const offsetPoints = this.calculateOffsetPoints(offsetSegments, params);

    // Create the offset curve
    return new CurveImpl(offsetPoints, baseline.type, {
      isClosed: baseline.isClosed
    });
  }

  /**
   * Generate offset segments from baseline
   */
  private generateOffsetSegments(baseline: Curve, distance: number): OffsetSegment[] {
    const segments: OffsetSegment[] = [];
    const points = baseline.points;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Skip zero-length segments
      const segmentLength = p1.distanceTo(p2);
      if (segmentLength < this.minSegmentLength) {
        continue;
      }

      // Calculate segment direction and normal
      const direction = Vector2DImpl.fromPoints(p1, p2).normalize();
      const normal = direction.perpendicular().normalize();

      // Calculate offset points
      const offsetStart = new BIMPointImpl(
        p1.x + normal.x * distance,
        p1.y + normal.y * distance,
        { creationMethod: 'offset_calculation' }
      );

      const offsetEnd = new BIMPointImpl(
        p2.x + normal.x * distance,
        p2.y + normal.y * distance,
        { creationMethod: 'offset_calculation' }
      );

      segments.push({
        start: offsetStart,
        end: offsetEnd,
        normal,
        length: segmentLength,
        originalIndex: i
      });
    }

    return segments;
  }

  /**
   * Calculate offset points with proper joins
   */
  private calculateOffsetPoints(
    segments: OffsetSegment[],
    params: OffsetParameters
  ): BIMPointImpl[] {
    if (segments.length === 0) {
      return [];
    }

    const points: BIMPointImpl[] = [];

    // Add first point
    points.push(segments[0].start);

    // Process joins between segments
    for (let i = 0; i < segments.length - 1; i++) {
      const currentSegment = segments[i];
      const nextSegment = segments[i + 1];

      // Calculate join
      const joinPoints = this.calculateJoin(
        currentSegment,
        nextSegment,
        params
      );

      // Add join points
      points.push(...joinPoints.points);
    }

    // Add last point
    points.push(segments[segments.length - 1].end);

    return points;
  }

  /**
   * Calculate join between two offset segments
   */
  private calculateJoin(
    segment1: OffsetSegment,
    segment2: OffsetSegment,
    params: OffsetParameters
  ): JoinCalculation {
    // Calculate angle between segments
    const angle = this.calculateSegmentAngle(segment1, segment2);
    
    // Select join type if not specified
    let joinType = params.joinType;
    if (joinType === OffsetJoinType.MITER) {
      // Check if miter is feasible
      const miterLength = Math.abs(params.distance) / Math.sin(Math.abs(angle) / 2);
      if (miterLength > Math.abs(params.distance) * (params.miterLimit || this.defaultMiterLimit)) {
        joinType = OffsetJoinType.BEVEL;
      }
    }

    switch (joinType) {
      case OffsetJoinType.MITER:
        return this.calculateMiterJoin(segment1, segment2, params);
      case OffsetJoinType.BEVEL:
        return this.calculateBevelJoin(segment1, segment2, params);
      case OffsetJoinType.ROUND:
        return this.calculateRoundJoin(segment1, segment2, params);
      default:
        return this.calculateBevelJoin(segment1, segment2, params);
    }
  }

  /**
   * Calculate miter join
   */
  private calculateMiterJoin(
    segment1: OffsetSegment,
    segment2: OffsetSegment,
    params: OffsetParameters
  ): JoinCalculation {
    // Find intersection of offset lines
    const intersection = this.findLineIntersection(
      segment1.end,
      Vector2DImpl.fromPoints(segment1.start, segment1.end),
      segment2.start,
      Vector2DImpl.fromPoints(segment2.start, segment2.end)
    );

    if (intersection) {
      return {
        joinType: OffsetJoinType.MITER,
        points: [intersection],
        miterApex: intersection,
        confidence: 1.0
      };
    } else {
      // Fallback to bevel if intersection fails
      return this.calculateBevelJoin(segment1, segment2, params);
    }
  }

  /**
   * Calculate bevel join
   */
  private calculateBevelJoin(
    segment1: OffsetSegment,
    segment2: OffsetSegment,
    params: OffsetParameters
  ): JoinCalculation {
    return {
      joinType: OffsetJoinType.BEVEL,
      points: [segment1.end, segment2.start],
      confidence: 1.0
    };
  }

  /**
   * Calculate round join
   */
  private calculateRoundJoin(
    segment1: OffsetSegment,
    segment2: OffsetSegment,
    params: OffsetParameters
  ): JoinCalculation {
    const roundSegments = params.roundSegments || this.defaultRoundSegments;
    const points: BIMPointImpl[] = [];

    // Calculate center point (intersection of original segments)
    const dir1 = Vector2DImpl.fromPoints(segment1.start, segment1.end).normalize();
    const dir2 = Vector2DImpl.fromPoints(segment2.start, segment2.end).normalize();
    
    // For simplicity, use the midpoint between segment ends
    const centerX = (segment1.end.x + segment2.start.x) / 2;
    const centerY = (segment1.end.y + segment2.start.y) / 2;
    const center = new BIMPointImpl(centerX, centerY, { creationMethod: 'round_join_center' });

    // Calculate arc points
    const startAngle = Math.atan2(segment1.end.y - center.y, segment1.end.x - center.x);
    const endAngle = Math.atan2(segment2.start.y - center.y, segment2.start.x - center.x);
    const radius = Math.abs(params.distance);

    let angleDiff = endAngle - startAngle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    for (let i = 1; i < roundSegments; i++) {
      const t = i / roundSegments;
      const angle = startAngle + angleDiff * t;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      points.push(new BIMPointImpl(x, y, { creationMethod: 'round_join_point' }));
    }

    return {
      joinType: OffsetJoinType.ROUND,
      points,
      confidence: 0.9
    };
  }

  /**
   * Calculate angle between two segments
   */
  private calculateSegmentAngle(segment1: OffsetSegment, segment2: OffsetSegment): number {
    const dir1 = Vector2DImpl.fromPoints(segment1.start, segment1.end).normalize();
    const dir2 = Vector2DImpl.fromPoints(segment2.start, segment2.end).normalize();
    
    return dir1.angleTo(dir2);
  }

  /**
   * Find intersection of two lines
   */
  private findLineIntersection(
    point1: BIMPointImpl,
    direction1: Vector2DImpl,
    point2: BIMPointImpl,
    direction2: Vector2DImpl
  ): BIMPointImpl | null {
    const det = direction1.cross(direction2);
    
    if (Math.abs(det) < 1e-10) {
      return null; // Lines are parallel
    }

    const dp = Vector2DImpl.fromPoints(point1, point2);
    const t = dp.cross(direction2) / det;

    const intersectionX = point1.x + t * direction1.x;
    const intersectionY = point1.y + t * direction1.y;

    return new BIMPointImpl(intersectionX, intersectionY, {
      creationMethod: 'line_intersection'
    });
  }

  /**
   * Validate offset parameters
   */
  private validateOffsetParameters(baseline: Curve, distance: number, tolerance: number): void {
    if (baseline.points.length < 2) {
      throw GeometricErrorFactory.createOffsetError(
        'Baseline must have at least 2 points',
        distance,
        { curveType: baseline.type }
      );
    }

    if (Math.abs(distance) < tolerance) {
      throw GeometricErrorFactory.createOffsetError(
        'Offset distance is too small relative to tolerance',
        distance,
        { curveType: baseline.type }
      );
    }

    if (tolerance <= 0) {
      throw GeometricErrorFactory.createOffsetError(
        'Tolerance must be positive',
        distance,
        { curveType: baseline.type }
      );
    }
  }

  /**
   * Validate offset results
   */
  private validateOffsetResults(
    leftOffset: CurveImpl | null,
    rightOffset: CurveImpl | null,
    baseline: Curve
  ): void {
    if (!leftOffset || !rightOffset) {
      throw new Error('Failed to generate offset curves');
    }

    if (leftOffset.points.length === 0 || rightOffset.points.length === 0) {
      throw new Error('Generated offset curves have no points');
    }

    // Additional validation could be added here
  }

  /**
   * Fallback: Try simplified offset with reduced complexity
   */
  private trySimplifiedOffset(baseline: Curve, distance: number): {
    leftOffset: CurveImpl | null;
    rightOffset: CurveImpl | null;
  } {
    // Simplify the baseline by removing intermediate points
    const simplifiedPoints = this.simplifyBaseline(baseline.points);
    const simplifiedBaseline = new CurveImpl(simplifiedPoints, baseline.type);

    const params: OffsetParameters = {
      distance,
      joinType: OffsetJoinType.BEVEL, // Use simple bevel joins
      tolerance: 1e-3 // Relaxed tolerance
    };

    const leftOffset = this.generateOffsetCurve(simplifiedBaseline, distance, params, 'left');
    const rightOffset = this.generateOffsetCurve(simplifiedBaseline, -distance, params, 'right');

    return { leftOffset, rightOffset };
  }

  /**
   * Fallback: Try offset with reduced precision
   */
  private tryReducedPrecisionOffset(baseline: Curve, distance: number): {
    leftOffset: CurveImpl | null;
    rightOffset: CurveImpl | null;
  } {
    const params: OffsetParameters = {
      distance,
      joinType: OffsetJoinType.BEVEL,
      tolerance: 1e-2, // Much more relaxed tolerance
      miterLimit: 2.0 // Reduced miter limit
    };

    const leftOffset = this.generateOffsetCurve(baseline, distance, params, 'left');
    const rightOffset = this.generateOffsetCurve(baseline, -distance, params, 'right');

    return { leftOffset, rightOffset };
  }

  /**
   * Fallback: Try segmented offset (process in smaller chunks)
   */
  private trySegmentedOffset(baseline: Curve, distance: number): {
    leftOffset: CurveImpl | null;
    rightOffset: CurveImpl | null;
  } {
    const segmentSize = Math.max(3, Math.floor(baseline.points.length / 4));
    const leftPoints: BIMPointImpl[] = [];
    const rightPoints: BIMPointImpl[] = [];

    for (let i = 0; i < baseline.points.length - 1; i += segmentSize - 1) {
      const endIndex = Math.min(i + segmentSize, baseline.points.length);
      const segmentPoints = baseline.points.slice(i, endIndex);
      
      if (segmentPoints.length < 2) continue;

      const segment = new CurveImpl(segmentPoints, baseline.type);
      const params: OffsetParameters = {
        distance,
        joinType: OffsetJoinType.BEVEL,
        tolerance: 1e-3
      };

      try {
        const leftSegment = this.generateOffsetCurve(segment, distance, params, 'left');
        const rightSegment = this.generateOffsetCurve(segment, -distance, params, 'right');

        // Merge points (skip first point of subsequent segments to avoid duplication)
        if (i === 0) {
          leftPoints.push(...leftSegment.points);
          rightPoints.push(...rightSegment.points);
        } else {
          leftPoints.push(...leftSegment.points.slice(1));
          rightPoints.push(...rightSegment.points.slice(1));
        }
      } catch (segmentError) {
        // Skip problematic segments
        continue;
      }
    }

    if (leftPoints.length < 2 || rightPoints.length < 2) {
      return { leftOffset: null, rightOffset: null };
    }

    return {
      leftOffset: new CurveImpl(leftPoints, baseline.type),
      rightOffset: new CurveImpl(rightPoints, baseline.type)
    };
  }

  /**
   * Simplify baseline by removing intermediate points
   */
  private simplifyBaseline(points: BIMPointImpl[]): BIMPointImpl[] {
    if (points.length <= 3) return points;

    const simplified: BIMPointImpl[] = [points[0]];
    const tolerance = 1.0; // 1mm tolerance for simplification

    for (let i = 1; i < points.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const current = points[i];
      const next = points[i + 1];

      // Check if current point is necessary (not collinear within tolerance)
      const distance = this.pointToLineDistance(current, prev, next);
      if (distance > tolerance) {
        simplified.push(current);
      }
    }

    simplified.push(points[points.length - 1]);
    return simplified;
  }

  /**
   * Calculate distance from point to line
   */
  private pointToLineDistance(point: BIMPointImpl, lineStart: BIMPointImpl, lineEnd: BIMPointImpl): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq < 1e-10) {
      return point.distanceTo(lineStart);
    }

    const param = dot / lenSq;
    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}