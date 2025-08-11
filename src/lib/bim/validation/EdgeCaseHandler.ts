import { Curve } from '../geometry/Curve';
import { BIMPoint } from '../geometry/BIMPoint';
import { Vector2D } from '../geometry/Vector2D';
import { WallSolid } from '../geometry/WallSolid';
import { EdgeCaseDetector, EdgeCaseResult, EdgeCaseType } from './EdgeCaseDetector';
import { GeometricError, GeometricErrorType, ErrorSeverity } from './GeometricError';

/**
 * Result of edge case handling operation
 */
export interface EdgeCaseHandlingResult {
  success: boolean;
  originalIssueCount: number;
  resolvedIssueCount: number;
  remainingIssues: EdgeCaseResult[];
  appliedFixes: string[];
  modifiedElements: string[];
  processingTime: number;
  warnings: string[];
}

/**
 * Configuration for edge case handling
 */
export interface EdgeCaseHandlingConfig {
  autoFixEnabled: boolean;
  maxIterations: number;
  preserveOriginalGeometry: boolean;
  aggressiveHealing: boolean;
  minSegmentLengthAfterFix: number;
  angleSnapTolerance: number;
}

/**
 * Comprehensive edge case handling system that can automatically fix detected issues
 */
export class EdgeCaseHandler {
  private detector: EdgeCaseDetector;
  private config: EdgeCaseHandlingConfig;

  constructor(
    detector: EdgeCaseDetector,
    config?: Partial<EdgeCaseHandlingConfig>
  ) {
    this.detector = detector;
    this.config = {
      autoFixEnabled: true,
      maxIterations: 5,
      preserveOriginalGeometry: false,
      aggressiveHealing: false,
      minSegmentLengthAfterFix: 1e-3,
      angleSnapTolerance: Math.PI / 180, // 1 degree
      ...config
    };
  }

  /**
   * Handle all edge cases in a curve
   */
  async handleCurveEdgeCases(curve: Curve): Promise<EdgeCaseHandlingResult> {
    const startTime = performance.now();
    const originalCurve = this.cloneCurve(curve);
    
    let currentCurve = curve;
    let iteration = 0;
    let totalIssuesResolved = 0;
    const appliedFixes: string[] = [];
    const warnings: string[] = [];
    const modifiedElements: string[] = [];

    // Initial detection
    let issues = this.detector.detectCurveEdgeCases(currentCurve);
    const originalIssueCount = issues.length;

    while (issues.length > 0 && iteration < this.config.maxIterations) {
      iteration++;
      let iterationFixCount = 0;

      // Process each type of edge case in priority order
      const prioritizedIssues = this.prioritizeIssues(issues);

      for (const issue of prioritizedIssues) {
        if (!issue.canAutoFix || !this.config.autoFixEnabled) {
          continue;
        }

        const fixResult = await this.applyFix(currentCurve, issue);
        if (fixResult.success) {
          appliedFixes.push(fixResult.fixDescription);
          modifiedElements.push(...fixResult.modifiedElements);
          iterationFixCount++;
          totalIssuesResolved++;

          if (fixResult.warnings.length > 0) {
            warnings.push(...fixResult.warnings);
          }
        }
      }

      // Re-detect issues after fixes
      issues = this.detector.detectCurveEdgeCases(currentCurve);

      // Break if no progress was made
      if (iterationFixCount === 0) {
        warnings.push(`No progress made in iteration ${iteration}, stopping`);
        break;
      }
    }

    const processingTime = performance.now() - startTime;

    return {
      success: totalIssuesResolved > 0,
      originalIssueCount,
      resolvedIssueCount: totalIssuesResolved,
      remainingIssues: issues,
      appliedFixes,
      modifiedElements: [...new Set(modifiedElements)],
      processingTime,
      warnings
    };
  }

  /**
   * Handle edge cases in a wall solid
   */
  async handleWallSolidEdgeCases(wallSolid: WallSolid): Promise<EdgeCaseHandlingResult> {
    const startTime = performance.now();
    let totalResults: EdgeCaseHandlingResult = {
      success: false,
      originalIssueCount: 0,
      resolvedIssueCount: 0,
      remainingIssues: [],
      appliedFixes: [],
      modifiedElements: [],
      processingTime: 0,
      warnings: []
    };

    // Handle baseline curve
    const baselineResult = await this.handleCurveEdgeCases(wallSolid.baseline);
    this.mergeResults(totalResults, baselineResult, 'baseline');

    // Handle offset curves if they exist
    if (wallSolid.leftOffset) {
      const leftResult = await this.handleCurveEdgeCases(wallSolid.leftOffset);
      this.mergeResults(totalResults, leftResult, 'left_offset');
    }

    if (wallSolid.rightOffset) {
      const rightResult = await this.handleCurveEdgeCases(wallSolid.rightOffset);
      this.mergeResults(totalResults, rightResult, 'right_offset');
    }

    // Handle wall-specific edge cases
    const wallSpecificResult = await this.handleWallSpecificEdgeCases(wallSolid);
    this.mergeResults(totalResults, wallSpecificResult, 'wall_specific');

    totalResults.processingTime = performance.now() - startTime;
    totalResults.success = totalResults.resolvedIssueCount > 0;

    return totalResults;
  }

  /**
   * Apply a specific fix for an edge case
   */
  private async applyFix(curve: Curve, issue: EdgeCaseResult): Promise<{
    success: boolean;
    fixDescription: string;
    modifiedElements: string[];
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const modifiedElements: string[] = [];

    try {
      switch (issue.edgeCaseType) {
        case EdgeCaseType.ZERO_LENGTH_SEGMENT:
          return this.fixZeroLengthSegments(curve, issue);

        case EdgeCaseType.COINCIDENT_POINTS:
          return this.fixCoincidentPoints(curve, issue);

        case EdgeCaseType.MICRO_SEGMENT:
          return this.fixMicroSegments(curve, issue);

        case EdgeCaseType.EXTREME_ANGLE:
          return this.fixExtremeAngles(curve, issue);

        case EdgeCaseType.DEGENERATE_GEOMETRY:
          return this.fixDegenerateGeometry(curve, issue);

        default:
          return {
            success: false,
            fixDescription: `No automatic fix available for ${issue.edgeCaseType}`,
            modifiedElements: [],
            warnings: [`Cannot automatically fix ${issue.edgeCaseType}`]
          };
      }
    } catch (error) {
      return {
        success: false,
        fixDescription: `Fix failed: ${error.message}`,
        modifiedElements: [],
        warnings: [`Error applying fix: ${error.message}`]
      };
    }
  }

  /**
   * Fix zero-length segments by removing them
   */
  private fixZeroLengthSegments(curve: Curve, issue: EdgeCaseResult): {
    success: boolean;
    fixDescription: string;
    modifiedElements: string[];
    warnings: string[];
  } {
    const originalPointCount = curve.points.length;
    const newPoints: BIMPoint[] = [];
    let removedCount = 0;

    // Keep first point
    if (curve.points.length > 0) {
      newPoints.push(curve.points[0]);
    }

    // Check each subsequent point
    for (let i = 1; i < curve.points.length; i++) {
      const prevPoint = newPoints[newPoints.length - 1];
      const currentPoint = curve.points[i];
      
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - prevPoint.x, 2) + 
        Math.pow(currentPoint.y - prevPoint.y, 2)
      );

      if (distance >= this.config.minSegmentLengthAfterFix) {
        newPoints.push(currentPoint);
      } else {
        removedCount++;
      }
    }

    // Update curve points
    curve.points = newPoints;
    
    // Recalculate curve properties
    this.recalculateCurveProperties(curve);

    return {
      success: removedCount > 0,
      fixDescription: `Removed ${removedCount} zero-length segments`,
      modifiedElements: [curve.id],
      warnings: removedCount > originalPointCount * 0.5 ? 
        ['Removed more than 50% of points, geometry may be significantly altered'] : []
    };
  }

  /**
   * Fix coincident points by merging them
   */
  private fixCoincidentPoints(curve: Curve, issue: EdgeCaseResult): {
    success: boolean;
    fixDescription: string;
    modifiedElements: string[];
    warnings: string[];
  } {
    const tolerance = issue.tolerance;
    const originalPointCount = curve.points.length;
    const mergedPoints: BIMPoint[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < curve.points.length; i++) {
      if (processed.has(i)) continue;

      const currentPoint = curve.points[i];
      const coincidentIndices = [i];

      // Find all points coincident with current point
      for (let j = i + 1; j < curve.points.length; j++) {
        if (processed.has(j)) continue;

        const distance = Math.sqrt(
          Math.pow(curve.points[j].x - currentPoint.x, 2) + 
          Math.pow(curve.points[j].y - currentPoint.y, 2)
        );

        if (distance < tolerance) {
          coincidentIndices.push(j);
        }
      }

      // Mark all coincident points as processed
      coincidentIndices.forEach(idx => processed.add(idx));

      // Create merged point (average position)
      if (coincidentIndices.length > 1) {
        const avgX = coincidentIndices.reduce((sum, idx) => sum + curve.points[idx].x, 0) / coincidentIndices.length;
        const avgY = coincidentIndices.reduce((sum, idx) => sum + curve.points[idx].y, 0) / coincidentIndices.length;

        mergedPoints.push({
          id: `merged_${currentPoint.id}`,
          x: avgX,
          y: avgY,
          tolerance: currentPoint.tolerance,
          creationMethod: 'coincident_merge',
          accuracy: 0.9, // Slightly reduced accuracy due to averaging
          validated: false
        });
      } else {
        mergedPoints.push(currentPoint);
      }
    }

    const mergedCount = originalPointCount - mergedPoints.length;
    curve.points = mergedPoints;
    this.recalculateCurveProperties(curve);

    return {
      success: mergedCount > 0,
      fixDescription: `Merged ${mergedCount} coincident points`,
      modifiedElements: [curve.id],
      warnings: []
    };
  }

  /**
   * Fix micro segments by merging them with adjacent segments
   */
  private fixMicroSegments(curve: Curve, issue: EdgeCaseResult): {
    success: boolean;
    fixDescription: string;
    modifiedElements: string[];
    warnings: string[];
  } {
    const microThreshold = issue.tolerance;
    const newPoints: BIMPoint[] = [];
    let mergedCount = 0;

    if (curve.points.length === 0) {
      return {
        success: false,
        fixDescription: 'Cannot fix micro segments in empty curve',
        modifiedElements: [],
        warnings: ['Curve has no points']
      };
    }

    newPoints.push(curve.points[0]);

    for (let i = 1; i < curve.points.length; i++) {
      const prevPoint = newPoints[newPoints.length - 1];
      const currentPoint = curve.points[i];
      
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - prevPoint.x, 2) + 
        Math.pow(currentPoint.y - prevPoint.y, 2)
      );

      if (distance < microThreshold && i < curve.points.length - 1) {
        // Skip this point (merge with next segment)
        mergedCount++;
      } else {
        newPoints.push(currentPoint);
      }
    }

    curve.points = newPoints;
    this.recalculateCurveProperties(curve);

    return {
      success: mergedCount > 0,
      fixDescription: `Merged ${mergedCount} micro segments`,
      modifiedElements: [curve.id],
      warnings: []
    };
  }

  /**
   * Fix extreme angles by adjusting geometry
   */
  private fixExtremeAngles(curve: Curve, issue: EdgeCaseResult): {
    success: boolean;
    fixDescription: string;
    modifiedElements: string[];
    warnings: string[];
  } {
    let fixedCount = 0;
    const warnings: string[] = [];

    for (let i = 1; i < curve.points.length - 1; i++) {
      const p1 = curve.points[i - 1];
      const p2 = curve.points[i];
      const p3 = curve.points[i + 1];

      const v1 = new Vector2D(p2.x - p1.x, p2.y - p1.y);
      const v2 = new Vector2D(p3.x - p2.x, p3.y - p2.y);

      const angle = this.calculateAngleBetweenVectors(v1, v2);

      // Fix extremely small angles by removing the middle point
      if (angle < this.config.angleSnapTolerance) {
        curve.points.splice(i, 1);
        i--; // Adjust index after removal
        fixedCount++;
      }
      // Fix extremely large angles by adding intermediate points
      else if (angle > Math.PI - this.config.angleSnapTolerance) {
        if (this.config.aggressiveHealing) {
          const midX = (p1.x + p3.x) / 2;
          const midY = (p1.y + p3.y) / 2;
          
          curve.points[i] = {
            id: `angle_fix_${p2.id}`,
            x: midX,
            y: midY,
            tolerance: p2.tolerance,
            creationMethod: 'angle_fix',
            accuracy: 0.8,
            validated: false
          };
          fixedCount++;
        } else {
          warnings.push(`Extreme angle at point ${i} requires manual intervention`);
        }
      }
    }

    if (fixedCount > 0) {
      this.recalculateCurveProperties(curve);
    }

    return {
      success: fixedCount > 0,
      fixDescription: `Fixed ${fixedCount} extreme angles`,
      modifiedElements: [curve.id],
      warnings
    };
  }

  /**
   * Fix degenerate geometry
   */
  private fixDegenerateGeometry(curve: Curve, issue: EdgeCaseResult): {
    success: boolean;
    fixDescription: string;
    modifiedElements: string[];
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Cannot fix curves with less than 2 points
    if (curve.points.length < 2) {
      return {
        success: false,
        fixDescription: 'Cannot fix curve with less than 2 points',
        modifiedElements: [],
        warnings: ['Curve requires manual reconstruction']
      };
    }

    // Fix all identical points by spreading them slightly
    const firstPoint = curve.points[0];
    const allIdentical = curve.points.every(p => 
      Math.abs(p.x - firstPoint.x) < 1e-10 &&
      Math.abs(p.y - firstPoint.y) < 1e-10
    );

    if (allIdentical && curve.points.length > 1) {
      const spreadDistance = this.config.minSegmentLengthAfterFix;
      
      for (let i = 1; i < curve.points.length; i++) {
        const angle = (i - 1) * (2 * Math.PI / (curve.points.length - 1));
        curve.points[i] = {
          ...curve.points[i],
          x: firstPoint.x + spreadDistance * Math.cos(angle),
          y: firstPoint.y + spreadDistance * Math.sin(angle),
          creationMethod: 'degenerate_fix',
          accuracy: 0.5,
          validated: false
        };
      }

      this.recalculateCurveProperties(curve);
      warnings.push('Spread identical points in circular pattern');

      return {
        success: true,
        fixDescription: 'Fixed degenerate geometry by spreading identical points',
        modifiedElements: [curve.id],
        warnings
      };
    }

    return {
      success: false,
      fixDescription: 'No degenerate geometry fix applied',
      modifiedElements: [],
      warnings: []
    };
  }

  /**
   * Handle wall-specific edge cases
   */
  private async handleWallSpecificEdgeCases(wallSolid: WallSolid): Promise<EdgeCaseHandlingResult> {
    const appliedFixes: string[] = [];
    const warnings: string[] = [];
    const modifiedElements: string[] = [];
    let resolvedCount = 0;

    // Fix extremely thin walls
    if (wallSolid.thickness < 1e-6) {
      wallSolid.thickness = Math.max(wallSolid.thickness, 0.001);
      appliedFixes.push('Increased wall thickness to minimum value');
      modifiedElements.push(wallSolid.id);
      resolvedCount++;
    }

    // Validate offset curves exist and are valid
    if (!wallSolid.leftOffset || !wallSolid.rightOffset) {
      warnings.push('Wall missing offset curves - may need regeneration');
    }

    return {
      success: resolvedCount > 0,
      originalIssueCount: resolvedCount,
      resolvedIssueCount: resolvedCount,
      remainingIssues: [],
      appliedFixes,
      modifiedElements,
      processingTime: 0,
      warnings
    };
  }

  /**
   * Prioritize issues by severity and fixability
   */
  private prioritizeIssues(issues: EdgeCaseResult[]): EdgeCaseResult[] {
    return issues.sort((a, b) => {
      // First by severity (ERROR > WARNING)
      if (a.severity !== b.severity) {
        return a.severity === ErrorSeverity.ERROR ? -1 : 1;
      }

      // Then by fixability
      if (a.canAutoFix !== b.canAutoFix) {
        return a.canAutoFix ? -1 : 1;
      }

      // Then by type priority
      const typePriority = {
        [EdgeCaseType.DEGENERATE_GEOMETRY]: 1,
        [EdgeCaseType.ZERO_LENGTH_SEGMENT]: 2,
        [EdgeCaseType.COINCIDENT_POINTS]: 3,
        [EdgeCaseType.MICRO_SEGMENT]: 4,
        [EdgeCaseType.EXTREME_ANGLE]: 5,
        [EdgeCaseType.SELF_INTERSECTION]: 6,
        [EdgeCaseType.NUMERICAL_INSTABILITY]: 7,
        [EdgeCaseType.INVALID_CURVE]: 8
      };

      return (typePriority[a.edgeCaseType] || 99) - (typePriority[b.edgeCaseType] || 99);
    });
  }

  /**
   * Merge handling results
   */
  private mergeResults(
    target: EdgeCaseHandlingResult, 
    source: EdgeCaseHandlingResult, 
    prefix: string
  ): void {
    target.originalIssueCount += source.originalIssueCount;
    target.resolvedIssueCount += source.resolvedIssueCount;
    target.remainingIssues.push(...source.remainingIssues.map(issue => ({
      ...issue,
      description: `${prefix}: ${issue.description}`
    })));
    target.appliedFixes.push(...source.appliedFixes.map(fix => `${prefix}: ${fix}`));
    target.modifiedElements.push(...source.modifiedElements);
    target.warnings.push(...source.warnings.map(warning => `${prefix}: ${warning}`));
  }

  /**
   * Clone a curve for backup purposes
   */
  private cloneCurve(curve: Curve): Curve {
    return {
      ...curve,
      points: curve.points.map(p => ({ ...p })),
      tangents: curve.tangents ? curve.tangents.map(t => ({ ...t })) : undefined,
      curvature: curve.curvature ? [...curve.curvature] : undefined
    };
  }

  /**
   * Recalculate curve properties after modification
   */
  private recalculateCurveProperties(curve: Curve): void {
    // Recalculate length
    let totalLength = 0;
    for (let i = 0; i < curve.points.length - 1; i++) {
      const p1 = curve.points[i];
      const p2 = curve.points[i + 1];
      totalLength += Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
    }
    curve.length = totalLength;

    // Recalculate bounding box
    if (curve.points.length > 0) {
      let minX = curve.points[0].x;
      let maxX = curve.points[0].x;
      let minY = curve.points[0].y;
      let maxY = curve.points[0].y;

      for (const point of curve.points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }

      curve.boundingBox = {
        minX, maxX, minY, maxY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
  }

  /**
   * Calculate angle between two vectors
   */
  private calculateAngleBetweenVectors(v1: Vector2D, v2: Vector2D): number {
    const dot = v1.dot(v2);
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 < 1e-12 || mag2 < 1e-12) {
      return 0;
    }

    const cosAngle = dot / (mag1 * mag2);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    return Math.acos(clampedCos);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EdgeCaseHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): EdgeCaseHandlingConfig {
    return { ...this.config };
  }
}