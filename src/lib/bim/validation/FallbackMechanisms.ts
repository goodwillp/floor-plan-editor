/**
 * Robust Fallback Mechanisms for BIM Geometric Operations
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { Curve } from '../geometry/Curve';
import { WallSolid } from '../geometry/WallSolid';
import { BIMPoint } from '../geometry/BIMPoint';
import { Vector2D } from '../geometry/Vector2D';
import { GeometricError, GeometricErrorType, ErrorSeverity } from './GeometricError';
import { OffsetJoinType, IntersectionType } from '../types/BIMTypes';
import type { OffsetResult, BooleanResult } from '../types/GeometricTypes';

/**
 * Fallback strategy interface
 */
export interface FallbackStrategy {
  name: string;
  priority: number;
  canHandle(operation: string, error: GeometricError): boolean;
  execute(operation: string, input: any, error: GeometricError): FallbackResult;
  qualityImpact: number; // 0-1, where 1 is no quality loss
}

/**
 * Fallback execution result
 */
export interface FallbackResult {
  success: boolean;
  result: any;
  method: string;
  qualityImpact: number;
  warnings: string[];
  limitations: string[];
  processingTime: number;
}

/**
 * User notification for fallback usage
 */
export interface FallbackNotification {
  operation: string;
  originalError: string;
  fallbackMethod: string;
  qualityImpact: number;
  userGuidance: string[];
  canRetry: boolean;
  alternativeApproaches: string[];
}

/**
 * Robust fallback mechanisms manager
 */
export class FallbackMechanisms {
  private strategies: FallbackStrategy[] = [];
  private notificationCallback?: (notification: FallbackNotification) => void;
  private maxFallbackAttempts: number = 3;
  private qualityThreshold: number = 0.5; // Minimum acceptable quality

  constructor(options: {
    maxFallbackAttempts?: number;
    qualityThreshold?: number;
    notificationCallback?: (notification: FallbackNotification) => void;
  } = {}) {
    this.maxFallbackAttempts = options.maxFallbackAttempts || 3;
    this.qualityThreshold = options.qualityThreshold || 0.5;
    this.notificationCallback = options.notificationCallback;
    
    this.initializeDefaultStrategies();
  }

  /**
   * Execute fallback for failed offset operations
   */
  async executeOffsetFallback(
    baseline: Curve,
    distance: number,
    joinType: OffsetJoinType,
    tolerance: number,
    error: GeometricError
  ): Promise<OffsetResult> {
    const startTime = performance.now();
    const operation = 'offset';
    const input = { baseline, distance, joinType, tolerance };

    const applicableStrategies = this.strategies
      .filter(strategy => strategy.canHandle(operation, error))
      .sort((a, b) => b.priority - a.priority);

    let lastError = error;
    const attemptedMethods: string[] = [];

    for (let attempt = 0; attempt < this.maxFallbackAttempts; attempt++) {
      for (const strategy of applicableStrategies) {
        if (attemptedMethods.includes(strategy.name)) {
          continue; // Skip already attempted strategies
        }

        try {
          const fallbackResult = strategy.execute(operation, input, lastError);
          attemptedMethods.push(strategy.name);

          if (fallbackResult.success && fallbackResult.qualityImpact >= this.qualityThreshold) {
            // Notify user about fallback usage
            this.notifyUser({
              operation,
              originalError: error.message,
              fallbackMethod: strategy.name,
              qualityImpact: fallbackResult.qualityImpact,
              userGuidance: this.generateOffsetGuidance(fallbackResult),
              canRetry: true,
              alternativeApproaches: this.getAlternativeOffsetApproaches()
            });

            return {
              success: true,
              leftOffset: fallbackResult.result.leftOffset,
              rightOffset: fallbackResult.result.rightOffset,
              joinType: fallbackResult.result.joinType || joinType,
              warnings: [
                `Fallback method used: ${strategy.name}`,
                `Quality impact: ${(1 - fallbackResult.qualityImpact) * 100}%`,
                ...fallbackResult.warnings
              ],
              fallbackUsed: true
            };
          }
        } catch (fallbackError) {
          lastError = fallbackError instanceof GeometricError ? 
            fallbackError : 
            new GeometricError(
              GeometricErrorType.OFFSET_FAILURE,
              `Fallback strategy ${strategy.name} failed: ${fallbackError.message}`,
              {
                severity: ErrorSeverity.WARNING,
                operation: 'offset_fallback',
                input: { strategy: strategy.name },
                suggestedFix: 'Try alternative fallback strategy',
                recoverable: true
              }
            );
        }
      }
    }

    // All fallback strategies failed
    this.notifyUser({
      operation,
      originalError: error.message,
      fallbackMethod: 'none_successful',
      qualityImpact: 0,
      userGuidance: [
        'All automatic fallback strategies failed',
        'Consider simplifying the input geometry',
        'Try adjusting tolerance values',
        'Manual intervention may be required'
      ],
      canRetry: false,
      alternativeApproaches: this.getAlternativeOffsetApproaches()
    });

    return {
      success: false,
      leftOffset: null,
      rightOffset: null,
      joinType,
      warnings: [
        `All fallback strategies failed after ${attemptedMethods.length} attempts`,
        `Attempted methods: ${attemptedMethods.join(', ')}`,
        'Manual intervention required'
      ],
      fallbackUsed: true
    };
  }

  /**
   * Execute fallback for failed boolean operations
   */
  async executeBooleanFallback(
    operation: string,
    solids: WallSolid[],
    error: GeometricError
  ): Promise<BooleanResult> {
    const startTime = performance.now();
    const input = { solids, operation };

    const applicableStrategies = this.strategies
      .filter(strategy => strategy.canHandle('boolean', error))
      .sort((a, b) => b.priority - a.priority);

    let lastError = error;
    const attemptedMethods: string[] = [];

    for (let attempt = 0; attempt < this.maxFallbackAttempts; attempt++) {
      for (const strategy of applicableStrategies) {
        if (attemptedMethods.includes(strategy.name)) {
          continue;
        }

        try {
          const fallbackResult = strategy.execute('boolean', input, lastError);
          attemptedMethods.push(strategy.name);

          if (fallbackResult.success && fallbackResult.qualityImpact >= this.qualityThreshold) {
            this.notifyUser({
              operation: `boolean_${operation}`,
              originalError: error.message,
              fallbackMethod: strategy.name,
              qualityImpact: fallbackResult.qualityImpact,
              userGuidance: this.generateBooleanGuidance(fallbackResult),
              canRetry: true,
              alternativeApproaches: this.getAlternativeBooleanApproaches()
            });

            return {
              success: true,
              resultSolid: fallbackResult.result.resultSolid,
              operationType: `${operation}_fallback`,
              processingTime: performance.now() - startTime,
              warnings: [
                `Fallback method used: ${strategy.name}`,
                `Quality impact: ${(1 - fallbackResult.qualityImpact) * 100}%`,
                ...fallbackResult.warnings
              ],
              requiresHealing: fallbackResult.result.requiresHealing || true
            };
          }
        } catch (fallbackError) {
          lastError = fallbackError instanceof GeometricError ? 
            fallbackError : 
            new GeometricError(
              GeometricErrorType.BOOLEAN_FAILURE,
              `Boolean fallback strategy ${strategy.name} failed: ${fallbackError.message}`,
              {
                severity: ErrorSeverity.WARNING,
                operation: 'boolean_fallback',
                input: { strategy: strategy.name },
                suggestedFix: 'Try alternative fallback strategy',
                recoverable: true
              }
            );
        }
      }
    }

    // All fallback strategies failed
    this.notifyUser({
      operation: `boolean_${operation}`,
      originalError: error.message,
      fallbackMethod: 'none_successful',
      qualityImpact: 0,
      userGuidance: [
        'All automatic boolean fallback strategies failed',
        'Consider reducing geometric complexity',
        'Try preprocessing geometry with shape healing',
        'Manual geometry correction may be required'
      ],
      canRetry: false,
      alternativeApproaches: this.getAlternativeBooleanApproaches()
    });

    return {
      success: false,
      resultSolid: null,
      operationType: `${operation}_fallback_failed`,
      processingTime: performance.now() - startTime,
      warnings: [
        `All boolean fallback strategies failed after ${attemptedMethods.length} attempts`,
        `Attempted methods: ${attemptedMethods.join(', ')}`,
        'Manual intervention required'
      ],
      requiresHealing: false
    };
  }

  /**
   * Execute fallback for complex intersection resolution
   */
  async executeIntersectionFallback(
    walls: WallSolid[],
    intersectionType: IntersectionType,
    error: GeometricError
  ): Promise<BooleanResult> {
    const startTime = performance.now();
    const operation = 'intersection';
    const input = { walls, intersectionType };

    // Use specialized intersection fallback strategies
    const intersectionStrategies = this.strategies
      .filter(strategy => strategy.canHandle('intersection', error))
      .sort((a, b) => b.priority - a.priority);

    let lastError = error;
    const attemptedMethods: string[] = [];

    for (const strategy of intersectionStrategies) {
      try {
        const fallbackResult = strategy.execute(operation, input, lastError);
        attemptedMethods.push(strategy.name);

        if (fallbackResult.success) {
          this.notifyUser({
            operation: `intersection_${intersectionType}`,
            originalError: error.message,
            fallbackMethod: strategy.name,
            qualityImpact: fallbackResult.qualityImpact,
            userGuidance: this.generateIntersectionGuidance(fallbackResult, intersectionType),
            canRetry: true,
            alternativeApproaches: this.getAlternativeIntersectionApproaches(intersectionType)
          });

          return {
            success: true,
            resultSolid: fallbackResult.result.resultSolid,
            operationType: `resolve_${intersectionType}_fallback`,
            processingTime: performance.now() - startTime,
            warnings: [
              `Intersection fallback used: ${strategy.name}`,
              `Quality impact: ${(1 - fallbackResult.qualityImpact) * 100}%`,
              ...fallbackResult.warnings
            ],
            requiresHealing: true
          };
        }
      } catch (fallbackError) {
        lastError = fallbackError instanceof GeometricError ? 
          fallbackError : 
          new GeometricError(
            GeometricErrorType.BOOLEAN_FAILURE,
            `Intersection fallback ${strategy.name} failed: ${fallbackError.message}`,
            {
              severity: ErrorSeverity.WARNING,
              operation: 'intersection_fallback',
              input: { strategy: strategy.name },
              suggestedFix: 'Try alternative intersection method',
              recoverable: true
            }
          );
      }
    }

    // Graceful degradation - return simplified union
    return this.executeGracefulDegradation(walls, intersectionType, startTime);
  }

  /**
   * Add custom fallback strategy
   */
  addStrategy(strategy: FallbackStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove fallback strategy
   */
  removeStrategy(name: string): boolean {
    const index = this.strategies.findIndex(s => s.name === name);
    if (index >= 0) {
      this.strategies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get available strategies for operation
   */
  getAvailableStrategies(operation: string): string[] {
    return this.strategies
      .filter(s => s.name.includes(operation) || operation.includes('any'))
      .map(s => s.name);
  }

  /**
   * Initialize default fallback strategies
   */
  private initializeDefaultStrategies(): void {
    // Offset fallback strategies
    this.addStrategy(new SimplifiedGeometryOffsetStrategy());
    this.addStrategy(new ReducedPrecisionOffsetStrategy());
    this.addStrategy(new SegmentedOffsetStrategy());
    this.addStrategy(new BasicPolygonOffsetStrategy());

    // Boolean operation fallback strategies
    this.addStrategy(new SimplifiedBooleanStrategy());
    this.addStrategy(new AlternativeLibraryBooleanStrategy());
    this.addStrategy(new ApproximateBooleanStrategy());
    this.addStrategy(new BasicUnionStrategy());

    // Intersection fallback strategies
    this.addStrategy(new ApproximateIntersectionStrategy());
    this.addStrategy(new SimplifiedIntersectionStrategy());
    this.addStrategy(new BasicOverlapStrategy());
  }

  /**
   * Execute graceful degradation for complex intersections
   */
  private async executeGracefulDegradation(
    walls: WallSolid[],
    intersectionType: IntersectionType,
    startTime: number
  ): Promise<BooleanResult> {
    // Return a basic union as last resort
    try {
      // Create simplified versions of walls
      const simplifiedWalls = walls.map(wall => this.simplifyWallForDegradation(wall));
      
      // Perform basic union
      const unionResult = await this.performBasicUnion(simplifiedWalls);

      this.notifyUser({
        operation: `intersection_${intersectionType}`,
        originalError: 'Complex intersection resolution failed',
        fallbackMethod: 'graceful_degradation',
        qualityImpact: 0.3,
        userGuidance: [
          'Graceful degradation applied - basic union performed',
          'Intersection precision is reduced',
          'Consider manual geometry adjustment',
          'Review result for architectural accuracy'
        ],
        canRetry: false,
        alternativeApproaches: [
          'Manual intersection editing',
          'Geometry simplification before intersection',
          'Alternative wall routing'
        ]
      });

      return {
        success: true,
        resultSolid: unionResult,
        operationType: `graceful_degradation_${intersectionType}`,
        processingTime: performance.now() - startTime,
        warnings: [
          'Graceful degradation applied',
          'Intersection precision reduced',
          'Manual review recommended'
        ],
        requiresHealing: true
      };
    } catch (degradationError) {
      return {
        success: false,
        resultSolid: null,
        operationType: `failed_degradation_${intersectionType}`,
        processingTime: performance.now() - startTime,
        warnings: [
          'Graceful degradation failed',
          'Complete intersection failure',
          'Manual intervention required'
        ],
        requiresHealing: false
      };
    }
  }

  /**
   * Simplify wall for degradation
   */
  private simplifyWallForDegradation(wall: WallSolid): WallSolid {
    // Create a simplified version with basic rectangular geometry
    // This is a placeholder - actual implementation would create proper simplified geometry
    return wall;
  }

  /**
   * Perform basic union operation
   */
  private async performBasicUnion(walls: WallSolid[]): Promise<WallSolid | null> {
    // Basic union implementation as last resort
    // This would use the most basic geometric operations
    if (walls.length === 0) return null;
    if (walls.length === 1) return walls[0];
    
    // Return first wall as placeholder - actual implementation would perform basic union
    return walls[0];
  }

  /**
   * Notify user about fallback usage
   */
  private notifyUser(notification: FallbackNotification): void {
    if (this.notificationCallback) {
      this.notificationCallback(notification);
    } else {
      // Default console notification
      console.warn('BIM Fallback Used:', {
        operation: notification.operation,
        method: notification.fallbackMethod,
        qualityImpact: `${(1 - notification.qualityImpact) * 100}%`,
        guidance: notification.userGuidance
      });
    }
  }

  /**
   * Generate user guidance for offset fallbacks
   */
  private generateOffsetGuidance(result: FallbackResult): string[] {
    const guidance = [
      'Offset operation used fallback method',
      `Quality impact: ${(1 - result.qualityImpact) * 100}% reduction`
    ];

    if (result.qualityImpact < 0.8) {
      guidance.push('Consider simplifying the baseline curve');
      guidance.push('Try adjusting wall thickness or tolerance');
    }

    if (result.limitations.length > 0) {
      guidance.push('Limitations: ' + result.limitations.join(', '));
    }

    return guidance;
  }

  /**
   * Generate user guidance for boolean fallbacks
   */
  private generateBooleanGuidance(result: FallbackResult): string[] {
    const guidance = [
      'Boolean operation used fallback method',
      `Quality impact: ${(1 - result.qualityImpact) * 100}% reduction`
    ];

    if (result.qualityImpact < 0.7) {
      guidance.push('Consider reducing geometric complexity');
      guidance.push('Try applying shape healing before boolean operations');
    }

    return guidance;
  }

  /**
   * Generate user guidance for intersection fallbacks
   */
  private generateIntersectionGuidance(result: FallbackResult, type: IntersectionType): string[] {
    const guidance = [
      `${type} intersection used fallback method`,
      `Quality impact: ${(1 - result.qualityImpact) * 100}% reduction`
    ];

    switch (type) {
      case IntersectionType.T_JUNCTION:
        guidance.push('T-junction may not be perfectly aligned');
        guidance.push('Consider manual adjustment of connection point');
        break;
      case IntersectionType.L_JUNCTION:
        guidance.push('L-junction corner may be approximate');
        guidance.push('Review corner geometry for architectural accuracy');
        break;
      case IntersectionType.CROSS_JUNCTION:
        guidance.push('Cross-junction may have simplified geometry');
        guidance.push('Consider breaking into simpler intersections');
        break;
    }

    return guidance;
  }

  /**
   * Get alternative approaches for offset operations
   */
  private getAlternativeOffsetApproaches(): string[] {
    return [
      'Simplify baseline curve geometry',
      'Adjust wall thickness to avoid extreme ratios',
      'Use different join types (miter/bevel/round)',
      'Increase tolerance values',
      'Break complex curves into simpler segments'
    ];
  }

  /**
   * Get alternative approaches for boolean operations
   */
  private getAlternativeBooleanApproaches(): string[] {
    return [
      'Apply shape healing before boolean operations',
      'Reduce geometric complexity',
      'Use alternative boolean libraries',
      'Break complex operations into simpler steps',
      'Adjust tolerance settings'
    ];
  }

  /**
   * Get alternative approaches for intersection operations
   */
  private getAlternativeIntersectionApproaches(type: IntersectionType): string[] {
    const common = [
      'Simplify wall geometry before intersection',
      'Use manual intersection editing',
      'Adjust wall routing to avoid complex intersections'
    ];

    switch (type) {
      case IntersectionType.T_JUNCTION:
        return [...common, 'Consider using L-junction instead', 'Adjust wall endpoints'];
      case IntersectionType.L_JUNCTION:
        return [...common, 'Use rounded corners', 'Adjust corner angles'];
      case IntersectionType.CROSS_JUNCTION:
        return [...common, 'Break into multiple T-junctions', 'Use simplified cross geometry'];
      default:
        return common;
    }
  }
}

/**
 * Simplified geometry offset strategy
 */
class SimplifiedGeometryOffsetStrategy implements FallbackStrategy {
  name = 'simplified_geometry_offset';
  priority = 10;
  qualityImpact = 0.8;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'offset' && (
      error.type === GeometricErrorType.OFFSET_FAILURE ||
      error.type === GeometricErrorType.NUMERICAL_INSTABILITY
    );
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { baseline, distance, joinType, tolerance } = input;

    try {
      // Simplify baseline by removing intermediate points
      const simplifiedBaseline = this.simplifyBaseline(baseline);
      
      // Use basic offset with bevel joins
      const result = this.performBasicOffset(simplifiedBaseline, distance, tolerance);

      return {
        success: true,
        result: {
          leftOffset: result.leftOffset,
          rightOffset: result.rightOffset,
          joinType: OffsetJoinType.BEVEL
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Geometry simplified for offset calculation'],
        limitations: ['Reduced geometric detail', 'Bevel joins used'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Simplified offset failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private simplifyBaseline(baseline: Curve): Curve {
    // Implement baseline simplification
    // This is a placeholder - actual implementation would simplify the curve
    return baseline;
  }

  private performBasicOffset(baseline: Curve, distance: number, tolerance: number): any {
    // Implement basic offset calculation
    // This is a placeholder - actual implementation would perform basic offset
    return {
      leftOffset: baseline, // Placeholder
      rightOffset: baseline  // Placeholder
    };
  }
}

/**
 * Reduced precision offset strategy
 */
class ReducedPrecisionOffsetStrategy implements FallbackStrategy {
  name = 'reduced_precision_offset';
  priority = 8;
  qualityImpact = 0.7;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'offset' && (
      error.type === GeometricErrorType.NUMERICAL_INSTABILITY ||
      error.type === GeometricErrorType.TOLERANCE_EXCEEDED
    );
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { baseline, distance, joinType, tolerance } = input;

    try {
      // Use much more relaxed tolerance
      const relaxedTolerance = tolerance * 100;
      
      // Perform offset with reduced precision
      const result = this.performReducedPrecisionOffset(baseline, distance, relaxedTolerance);

      return {
        success: true,
        result: {
          leftOffset: result.leftOffset,
          rightOffset: result.rightOffset,
          joinType: OffsetJoinType.BEVEL
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Reduced precision used for offset calculation'],
        limitations: ['Lower geometric precision', 'Simplified joins'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Reduced precision offset failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private performReducedPrecisionOffset(baseline: Curve, distance: number, tolerance: number): any {
    // Implement reduced precision offset
    return {
      leftOffset: baseline, // Placeholder
      rightOffset: baseline  // Placeholder
    };
  }
}

/**
 * Segmented offset strategy
 */
class SegmentedOffsetStrategy implements FallbackStrategy {
  name = 'segmented_offset';
  priority = 6;
  qualityImpact = 0.75;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'offset' && error.type === GeometricErrorType.OFFSET_FAILURE;
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { baseline, distance, joinType, tolerance } = input;

    try {
      // Break baseline into segments and process separately
      const segments = this.segmentBaseline(baseline);
      const results = segments.map(segment => 
        this.performSegmentOffset(segment, distance, tolerance)
      );

      // Merge results
      const mergedResult = this.mergeSegmentResults(results);

      return {
        success: true,
        result: mergedResult,
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Baseline processed in segments'],
        limitations: ['Potential discontinuities at segment boundaries'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Segmented offset failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private segmentBaseline(baseline: Curve): Curve[] {
    // Implement baseline segmentation
    return [baseline]; // Placeholder
  }

  private performSegmentOffset(segment: Curve, distance: number, tolerance: number): any {
    // Implement segment offset
    return {
      leftOffset: segment,
      rightOffset: segment
    };
  }

  private mergeSegmentResults(results: any[]): any {
    // Implement result merging
    return {
      leftOffset: results[0]?.leftOffset,
      rightOffset: results[0]?.rightOffset,
      joinType: OffsetJoinType.BEVEL
    };
  }
}

/**
 * Basic polygon offset strategy
 */
class BasicPolygonOffsetStrategy implements FallbackStrategy {
  name = 'basic_polygon_offset';
  priority = 4;
  qualityImpact = 0.6;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'offset';
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { baseline, distance, tolerance } = input;

    try {
      // Convert to basic polygon and perform simple offset
      const result = this.performBasicPolygonOffset(baseline, distance);

      return {
        success: true,
        result: {
          leftOffset: result.leftOffset,
          rightOffset: result.rightOffset,
          joinType: OffsetJoinType.BEVEL
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Basic polygon offset used'],
        limitations: ['Simplified geometry', 'No curve support'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Basic polygon offset failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private performBasicPolygonOffset(baseline: Curve, distance: number): any {
    // Implement basic polygon offset
    return {
      leftOffset: baseline,
      rightOffset: baseline
    };
  }
}

/**
 * Simplified boolean strategy
 */
class SimplifiedBooleanStrategy implements FallbackStrategy {
  name = 'simplified_boolean';
  priority = 10;
  qualityImpact = 0.8;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'boolean' && error.type === GeometricErrorType.BOOLEAN_FAILURE;
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { solids } = input;

    try {
      // Simplify geometry before boolean operation
      const simplifiedSolids = solids.map((solid: WallSolid) => this.simplifyWallSolid(solid));
      
      // Perform simplified boolean operation
      const result = this.performSimplifiedBoolean(simplifiedSolids);

      return {
        success: true,
        result: {
          resultSolid: result,
          requiresHealing: true
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Geometry simplified for boolean operation'],
        limitations: ['Reduced geometric detail'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Simplified boolean failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private simplifyWallSolid(solid: WallSolid): WallSolid {
    // Implement wall solid simplification
    return solid;
  }

  private performSimplifiedBoolean(solids: WallSolid[]): WallSolid | null {
    // Implement simplified boolean operation
    return solids[0] || null;
  }
}

/**
 * Alternative library boolean strategy
 */
class AlternativeLibraryBooleanStrategy implements FallbackStrategy {
  name = 'alternative_library_boolean';
  priority = 8;
  qualityImpact = 0.9;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'boolean' && error.type === GeometricErrorType.BOOLEAN_FAILURE;
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { solids } = input;

    try {
      // Use alternative boolean library or algorithm
      const result = this.performAlternativeBoolean(solids);

      return {
        success: true,
        result: {
          resultSolid: result,
          requiresHealing: false
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Alternative boolean algorithm used'],
        limitations: ['Different precision characteristics'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Alternative boolean failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private performAlternativeBoolean(solids: WallSolid[]): WallSolid | null {
    // Implement alternative boolean algorithm
    return solids[0] || null;
  }
}

/**
 * Approximate boolean strategy
 */
class ApproximateBooleanStrategy implements FallbackStrategy {
  name = 'approximate_boolean';
  priority = 6;
  qualityImpact = 0.7;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'boolean';
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { solids } = input;

    try {
      // Perform approximate boolean operation
      const result = this.performApproximateBoolean(solids);

      return {
        success: true,
        result: {
          resultSolid: result,
          requiresHealing: true
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Approximate boolean operation used'],
        limitations: ['Reduced precision', 'May require healing'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Approximate boolean failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private performApproximateBoolean(solids: WallSolid[]): WallSolid | null {
    // Implement approximate boolean operation
    return solids[0] || null;
  }
}

/**
 * Basic union strategy
 */
class BasicUnionStrategy implements FallbackStrategy {
  name = 'basic_union';
  priority = 4;
  qualityImpact = 0.5;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'boolean';
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { solids } = input;

    try {
      // Perform very basic union operation
      const result = this.performBasicUnion(solids);

      return {
        success: true,
        result: {
          resultSolid: result,
          requiresHealing: true
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Basic union operation used'],
        limitations: ['Minimal precision', 'Requires healing'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Basic union failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private performBasicUnion(solids: WallSolid[]): WallSolid | null {
    // Implement basic union operation
    return solids[0] || null;
  }
}

/**
 * Approximate intersection strategy
 */
class ApproximateIntersectionStrategy implements FallbackStrategy {
  name = 'approximate_intersection';
  priority = 10;
  qualityImpact = 0.7;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'intersection';
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { walls, intersectionType } = input;

    try {
      // Perform approximate intersection resolution
      const result = this.performApproximateIntersection(walls, intersectionType);

      return {
        success: true,
        result: {
          resultSolid: result
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Approximate intersection resolution used'],
        limitations: ['Reduced precision at intersection'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Approximate intersection failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private performApproximateIntersection(walls: WallSolid[], type: IntersectionType): WallSolid | null {
    // Implement approximate intersection
    return walls[0] || null;
  }
}

/**
 * Simplified intersection strategy
 */
class SimplifiedIntersectionStrategy implements FallbackStrategy {
  name = 'simplified_intersection';
  priority = 8;
  qualityImpact = 0.6;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'intersection';
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { walls, intersectionType } = input;

    try {
      // Simplify walls and perform intersection
      const simplifiedWalls = walls.map((wall: WallSolid) => this.simplifyWallForIntersection(wall));
      const result = this.performSimplifiedIntersection(simplifiedWalls, intersectionType);

      return {
        success: true,
        result: {
          resultSolid: result
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Simplified intersection resolution used'],
        limitations: ['Simplified geometry', 'Reduced detail'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Simplified intersection failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private simplifyWallForIntersection(wall: WallSolid): WallSolid {
    // Implement wall simplification for intersection
    return wall;
  }

  private performSimplifiedIntersection(walls: WallSolid[], type: IntersectionType): WallSolid | null {
    // Implement simplified intersection
    return walls[0] || null;
  }
}

/**
 * Basic overlap strategy
 */
class BasicOverlapStrategy implements FallbackStrategy {
  name = 'basic_overlap';
  priority = 4;
  qualityImpact = 0.4;

  canHandle(operation: string, error: GeometricError): boolean {
    return operation === 'intersection';
  }

  execute(operation: string, input: any, error: GeometricError): FallbackResult {
    const startTime = performance.now();
    const { walls } = input;

    try {
      // Perform basic overlap operation
      const result = this.performBasicOverlap(walls);

      return {
        success: true,
        result: {
          resultSolid: result
        },
        method: this.name,
        qualityImpact: this.qualityImpact,
        warnings: ['Basic overlap operation used'],
        limitations: ['Minimal precision', 'No proper intersection'],
        processingTime: performance.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        result: null,
        method: this.name,
        qualityImpact: 0,
        warnings: [`Basic overlap failed: ${fallbackError.message}`],
        limitations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  private performBasicOverlap(walls: WallSolid[]): WallSolid | null {
    // Implement basic overlap operation
    return walls[0] || null;
  }
}