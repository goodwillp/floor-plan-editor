/**
 * MiterCalculation class for apex computation and join type determination
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { BIMPoint } from './BIMPoint';
import { BIMPointImpl } from './BIMPoint';
import type { Vector2D } from './Vector2D';
import { Vector2DImpl } from './Vector2D';
import { OffsetJoinType, GeometricErrorType, ErrorSeverity } from '../types/BIMTypes';
import { GeometricError } from '../validation/GeometricError';

/**
 * Interface for miter calculation results
 */
export interface MiterCalculation {
  apex: BIMPoint;
  leftOffsetIntersection: BIMPoint;
  rightOffsetIntersection: BIMPoint;
  angle: number;
  joinType: OffsetJoinType;
  fallbackUsed: boolean;
  
  // Additional metadata
  calculationMethod: string;
  accuracy: number;
  processingTime: number;
}

/**
 * Implementation of MiterCalculation with advanced geometric algorithms
 */
export class MiterCalculationImpl implements MiterCalculation {
  public readonly apex: BIMPoint;
  public readonly leftOffsetIntersection: BIMPoint;
  public readonly rightOffsetIntersection: BIMPoint;
  public readonly angle: number;
  public readonly joinType: OffsetJoinType;
  public readonly fallbackUsed: boolean;
  public readonly calculationMethod: string;
  public readonly accuracy: number;
  public readonly processingTime: number;

  constructor(data: {
    apex: BIMPoint;
    leftOffsetIntersection: BIMPoint;
    rightOffsetIntersection: BIMPoint;
    angle: number;
    joinType: OffsetJoinType;
    fallbackUsed: boolean;
    calculationMethod: string;
    accuracy: number;
    processingTime: number;
  }) {
    this.apex = data.apex;
    this.leftOffsetIntersection = data.leftOffsetIntersection;
    this.rightOffsetIntersection = data.rightOffsetIntersection;
    this.angle = data.angle;
    this.joinType = data.joinType;
    this.fallbackUsed = data.fallbackUsed;
    this.calculationMethod = data.calculationMethod;
    this.accuracy = data.accuracy;
    this.processingTime = data.processingTime;
  }

  /**
   * Validate the miter calculation for geometric consistency
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate angle range
    if (this.angle < 0 || this.angle > Math.PI) {
      errors.push(`Invalid angle: ${this.angle}. Must be between 0 and π`);
    }

    // Validate accuracy
    if (this.accuracy < 0 || this.accuracy > 1) {
      errors.push(`Invalid accuracy: ${this.accuracy}. Must be between 0 and 1`);
    }

    // Check for degenerate apex
    if (this.apex.x === this.leftOffsetIntersection.x && 
        this.apex.y === this.leftOffsetIntersection.y) {
      warnings.push('Apex coincides with left offset intersection');
    }

    if (this.apex.x === this.rightOffsetIntersection.x && 
        this.apex.y === this.rightOffsetIntersection.y) {
      warnings.push('Apex coincides with right offset intersection');
    }

    // Validate join type consistency
    const expectedJoinType = MiterCalculationEngine.determineOptimalJoinType(this.angle, 0.1); // Using default thickness
    if (this.joinType !== expectedJoinType && !this.fallbackUsed) {
      warnings.push(`Join type ${this.joinType} may not be optimal for angle ${this.angle}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: this.calculateQualityScore()
    };
  }

  /**
   * Calculate quality score for this miter calculation
   */
  private calculateQualityScore(): number {
    let score = this.accuracy;

    // Penalize fallback usage
    if (this.fallbackUsed) {
      score -= 0.2;
    }

    // Reward fast processing
    if (this.processingTime < 5) {
      score += 0.05;
    } else if (this.processingTime > 50) {
      score -= 0.05;
    }

    // Adjust based on angle (extreme angles are harder to handle accurately)
    const normalizedAngle = Math.abs(this.angle - Math.PI / 2) / (Math.PI / 2);
    score -= normalizedAngle * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): any {
    return {
      apex: this.apex,
      leftOffsetIntersection: this.leftOffsetIntersection,
      rightOffsetIntersection: this.rightOffsetIntersection,
      angle: this.angle,
      joinType: this.joinType,
      fallbackUsed: this.fallbackUsed,
      calculationMethod: this.calculationMethod,
      accuracy: this.accuracy,
      processingTime: this.processingTime
    };
  }
}

/**
 * Engine for computing miter calculations with various algorithms
 */
export class MiterCalculationEngine {
  private readonly tolerance: number;
  private readonly miterLimit: number;

  constructor(options: {
    tolerance?: number;
    miterLimit?: number;
  } = {}) {
    this.tolerance = options.tolerance || 1e-6;
    this.miterLimit = options.miterLimit || 10.0;
  }

  /**
   * Compute miter apex from offset line intersections
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  computeMiterApex(
    leftIntersection: BIMPoint,
    rightIntersection: BIMPoint,
    baselinePoint: BIMPoint,
    wallThickness: number
  ): MiterCalculation {
    const startTime = performance.now();

    try {
      // Calculate vectors from baseline to offset intersections
      const leftVector = new Vector2DImpl(
        leftIntersection.x - baselinePoint.x,
        leftIntersection.y - baselinePoint.y
      );
      
      const rightVector = new Vector2DImpl(
        rightIntersection.x - baselinePoint.x,
        rightIntersection.y - baselinePoint.y
      );

      // Calculate angle between vectors
      const angle = this.calculateAngleBetweenVectors(leftVector, rightVector);
      
      // Determine optimal join type
      const joinType = MiterCalculationEngine.determineOptimalJoinType(angle, wallThickness);
      
      // Compute apex based on join type
      let apex: BIMPoint;
      let calculationMethod: string;
      let accuracy: number;
      let fallbackUsed = false;

      switch (joinType) {
        case OffsetJoinType.MITER:
          const miterResult = this.computeMiterApexPoint(leftVector, rightVector, baselinePoint, angle);
          apex = miterResult.apex;
          calculationMethod = miterResult.method;
          accuracy = miterResult.accuracy;
          fallbackUsed = miterResult.fallbackUsed;
          break;

        case OffsetJoinType.BEVEL:
          apex = this.computeBevelApexPoint(leftIntersection, rightIntersection);
          calculationMethod = 'bevel_midpoint';
          accuracy = 0.9;
          break;

        case OffsetJoinType.ROUND:
          apex = this.computeRoundApexPoint(leftIntersection, rightIntersection, baselinePoint);
          calculationMethod = 'round_center';
          accuracy = 0.85;
          break;

        default:
          throw new GeometricError(
            GeometricErrorType.NUMERICAL_INSTABILITY,
            `Unknown join type: ${joinType}`,
            {
              severity: ErrorSeverity.ERROR,
              operation: 'computeMiterApex',
              input: { leftIntersection, rightIntersection, baselinePoint, wallThickness },
              suggestedFix: 'Use a valid join type (miter, bevel, or round)',
              recoverable: false
            }
          );
      }

      return new MiterCalculationImpl({
        apex,
        leftOffsetIntersection: leftIntersection,
        rightOffsetIntersection: rightIntersection,
        angle,
        joinType,
        fallbackUsed,
        calculationMethod,
        accuracy,
        processingTime: performance.now() - startTime
      });

    } catch (error) {
      // Fallback to simple midpoint calculation
      const fallbackApex: BIMPoint = new BIMPointImpl(
        (leftIntersection.x + rightIntersection.x) / 2,
        (leftIntersection.y + rightIntersection.y) / 2,
        {
          id: `fallback_apex_${Date.now()}`,
          tolerance: this.tolerance,
          creationMethod: 'fallback_midpoint',
          accuracy: 0.5,
          validated: false
        }
      );

      return new MiterCalculationImpl({
        apex: fallbackApex,
        leftOffsetIntersection: leftIntersection,
        rightOffsetIntersection: rightIntersection,
        angle: Math.PI / 2, // Default angle
        joinType: OffsetJoinType.BEVEL,
        fallbackUsed: true,
        calculationMethod: 'fallback_midpoint',
        accuracy: 0.5,
        processingTime: performance.now() - startTime
      });
    }
  }

  /**
   * Determine optimal join type based on angle and thickness
   */
  static determineOptimalJoinType(angle: number, wallThickness: number): OffsetJoinType {
    const angleInDegrees = (angle * 180) / Math.PI;

    // Use miter for moderate angles
    if (angleInDegrees >= 30 && angleInDegrees <= 150) {
      return OffsetJoinType.MITER;
    }

    // Use round for very sharp angles (better visual quality)
    if (angleInDegrees < 15 || angleInDegrees > 165) {
      return OffsetJoinType.ROUND;
    }

    // Use bevel for other cases
    return OffsetJoinType.BEVEL;
  }

  /**
   * Calculate angle between two vectors
   */
  private calculateAngleBetweenVectors(v1: Vector2D, v2: Vector2D): number {
    const dot = v1.dot(v2);
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 < this.tolerance || mag2 < this.tolerance) {
      return Math.PI / 2; // Default to 90 degrees for degenerate vectors
    }

    const cosAngle = dot / (mag1 * mag2);
    // Clamp to avoid numerical errors
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    return Math.acos(clampedCos);
  }

  /**
   * Compute miter apex point using line intersection
   */
  private computeMiterApexPoint(
    leftVector: Vector2D,
    rightVector: Vector2D,
    baselinePoint: BIMPoint,
    angle: number
  ): { apex: BIMPoint; method: string; accuracy: number; fallbackUsed: boolean } {
    try {
      // Check if miter limit is exceeded
      const miterLength = 1 / Math.sin(angle / 2);
      if (miterLength > this.miterLimit) {
        throw new Error('Miter limit exceeded');
      }

      // Calculate bisector direction
      const leftNorm = leftVector.normalize();
      const rightNorm = rightVector.normalize();
      const bisector = new Vector2DImpl(
        (leftNorm.x + rightNorm.x) / 2,
        (leftNorm.y + rightNorm.y) / 2
      ).normalize();

      // Calculate apex position along bisector
      const apexDistance = Math.abs(leftVector.magnitude()) / Math.cos(angle / 2);
    const apex: BIMPoint = new BIMPointImpl(
      baselinePoint.x + bisector.x * apexDistance,
      baselinePoint.y + bisector.y * apexDistance,
      {
        id: `miter_apex_${Date.now()}`,
        tolerance: this.tolerance,
        creationMethod: 'miter_bisector',
        accuracy: 0.95,
        validated: true
      }
    );

      return {
        apex,
        method: 'miter_bisector_intersection',
        accuracy: 0.95,
        fallbackUsed: false
      };

    } catch (error) {
      // Fallback to line intersection method
      return this.computeMiterApexByLineIntersection(leftVector, rightVector, baselinePoint);
    }
  }

  /**
   * Fallback miter apex calculation using line intersection
   */
  private computeMiterApexByLineIntersection(
    leftVector: Vector2D,
    rightVector: Vector2D,
    baselinePoint: BIMPoint
  ): { apex: BIMPoint; method: string; accuracy: number; fallbackUsed: boolean } {
    // Extend vectors to create lines and find their intersection
    const leftEnd = {
      x: baselinePoint.x + leftVector.x * 1000, // Extend far enough
      y: baselinePoint.y + leftVector.y * 1000
    };

    const rightEnd = {
      x: baselinePoint.x + rightVector.x * 1000,
      y: baselinePoint.y + rightVector.y * 1000
    };

    // Find intersection of the two lines
    const intersection = this.findLineIntersection(
      baselinePoint, leftEnd,
      baselinePoint, rightEnd
    );

    const apex: BIMPoint = new BIMPointImpl(
      intersection.x,
      intersection.y,
      {
        id: `miter_apex_fallback_${Date.now()}`,
        tolerance: this.tolerance,
        creationMethod: 'line_intersection_fallback',
        accuracy: 0.8,
        validated: true
      }
    );

    return {
      apex,
      method: 'line_intersection_fallback',
      accuracy: 0.8,
      fallbackUsed: true
    };
  }

  /**
   * Compute bevel apex point (midpoint of offset intersections)
   */
  private computeBevelApexPoint(leftIntersection: BIMPoint, rightIntersection: BIMPoint): BIMPoint {
    return new BIMPointImpl(
      (leftIntersection.x + rightIntersection.x) / 2,
      (leftIntersection.y + rightIntersection.y) / 2,
      {
        id: `bevel_apex_${Date.now()}`,
        tolerance: this.tolerance,
        creationMethod: 'bevel_midpoint',
        accuracy: 0.9,
        validated: true
      }
    );
  }

  /**
   * Compute round apex point (center of arc)
   */
  private computeRoundApexPoint(
    leftIntersection: BIMPoint,
    rightIntersection: BIMPoint,
    baselinePoint: BIMPoint
  ): BIMPoint {
    // For round joins, the apex is typically the baseline point
    return new BIMPointImpl(
      baselinePoint.x,
      baselinePoint.y,
      {
        id: `round_apex_${Date.now()}`,
        tolerance: this.tolerance,
        creationMethod: 'round_center',
        accuracy: 0.85,
        validated: true
      }
    );
  }

  /**
   * Find intersection point of two lines
   */
  private findLineIntersection(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ): { x: number; y: number } {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    
    if (Math.abs(denom) < this.tolerance) {
      // Lines are parallel, return midpoint
      return {
        x: (p1.x + p3.x) / 2,
        y: (p1.y + p3.y) / 2
      };
    }

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    };
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
}