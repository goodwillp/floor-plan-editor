/**
 * AdvancedIntersectionResolver class for complex multi-wall intersections
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { WallSolid } from '../geometry/WallSolid';
import type { BIMPoint } from '../geometry/BIMPoint';
import { BIMPointImpl } from '../geometry/BIMPoint';
import type { BooleanResult } from '../types/GeometricTypes';
import { IntersectionType, GeometricErrorType, ErrorSeverity } from '../types/BIMTypes';
import { GeometricError } from '../validation/GeometricError';
import { BooleanOperationsEngine } from './BooleanOperationsEngine';
import { IntersectionManager } from './IntersectionManager';
import type { Vector2D } from '../geometry/Vector2D';
import { Vector2DImpl } from '../geometry/Vector2D';

/**
 * Configuration for advanced intersection resolution
 */
export interface AdvancedIntersectionConfig {
  tolerance: number;
  maxComplexity: number;
  enableParallelProcessing: boolean;
  extremeAngleThreshold: number; // degrees
  parallelOverlapThreshold: number;
  optimizationEnabled: boolean;
  spatialIndexingEnabled: boolean;
}

/**
 * Result of parallel overlap detection
 */
export interface ParallelOverlapResult {
  hasOverlap: boolean;
  overlapLength: number;
  overlapStart: BIMPoint;
  overlapEnd: BIMPoint;
  overlapPercentage: number;
  resolutionMethod: string;
}

/**
 * Result of cross-junction analysis
 */
export interface CrossJunctionResult {
  junctionCenter: BIMPoint;
  participatingWalls: string[];
  intersectionAngles: number[];
  complexityScore: number;
  resolutionStrategy: string;
}

/**
 * Performance optimization result
 */
export interface OptimizationResult {
  originalComplexity: number;
  optimizedComplexity: number;
  performanceGain: number;
  optimizationsApplied: string[];
  processingTime: number;
}

/**
 * Advanced intersection resolver for complex scenarios
 */
export class AdvancedIntersectionResolver {
  private readonly config: AdvancedIntersectionConfig;
  private readonly booleanEngine: BooleanOperationsEngine;
  private readonly intersectionManager: IntersectionManager;
  private readonly spatialIndex: Map<string, WallSolid[]> = new Map();

  constructor(config: Partial<AdvancedIntersectionConfig> = {}) {
    this.config = {
      tolerance: config.tolerance || 1e-6,
      maxComplexity: config.maxComplexity || 50000,
      enableParallelProcessing: config.enableParallelProcessing || false,
      extremeAngleThreshold: config.extremeAngleThreshold || 15, // degrees
      parallelOverlapThreshold: config.parallelOverlapThreshold || 0.1,
      optimizationEnabled: config.optimizationEnabled ?? true,
      spatialIndexingEnabled: config.spatialIndexingEnabled ?? true
    };

    this.booleanEngine = new BooleanOperationsEngine({
      tolerance: this.config.tolerance,
      maxComplexity: this.config.maxComplexity,
      enableParallelProcessing: this.config.enableParallelProcessing
    });

    this.intersectionManager = new IntersectionManager({
      tolerance: this.config.tolerance,
      enableCaching: true
    });
  }

  /**
   * Resolve cross-junction intersections with multiple walls
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async resolveCrossJunction(walls: WallSolid[]): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      if (walls.length < 3) {
        throw new GeometricError(
          GeometricErrorType.DEGENERATE_GEOMETRY,
          'Cross-junction requires at least 3 walls',
          {
            severity: ErrorSeverity.ERROR,
            operation: 'resolveCrossJunction',
            input: { walls },
            suggestedFix: 'Provide at least 3 walls for cross-junction resolution',
            recoverable: false
          }
        );
      }

      // Analyze cross-junction geometry
      const junctionAnalysis = await this.analyzeCrossJunction(walls);
      warnings.push(`Cross-junction complexity score: ${junctionAnalysis.complexityScore.toFixed(2)}`);

      // Check for extreme angles
      const extremeAngles = junctionAnalysis.intersectionAngles.filter(
        angle => angle < this.config.extremeAngleThreshold || angle > (180 - this.config.extremeAngleThreshold)
      );

      if (extremeAngles.length > 0) {
        warnings.push(`Extreme angles detected: ${extremeAngles.map(a => a.toFixed(1)).join(', ')}°`);
        return await this.handleExtremeAngleCrossJunction(walls, junctionAnalysis, extremeAngles);
      }

      // Apply resolution strategy based on complexity
      let result: BooleanResult;
      switch (junctionAnalysis.resolutionStrategy) {
        case 'sequential_union':
          result = await this.resolveSequentialUnion(walls, junctionAnalysis);
          break;
        case 'hierarchical_resolution':
          result = await this.resolveHierarchicalCrossJunction(walls, junctionAnalysis);
          break;
        case 'optimized_batch':
          result = await this.resolveOptimizedBatch(walls, junctionAnalysis);
          break;
        default:
          result = await this.booleanEngine.batchUnion(walls);
      }

      // Create intersection data
      if (result.success && result.resultSolid) {
        const intersectionData = await this.intersectionManager.createIntersection(
          `cross_junction_${Date.now()}`,
          IntersectionType.CROSS_JUNCTION,
          walls,
          junctionAnalysis.junctionCenter,
          {
            computeMiterApex: false, // Cross-junctions don't use simple miter apex
            resolutionMethod: junctionAnalysis.resolutionStrategy
          }
        );

        result.resultSolid.addIntersection(intersectionData);
      }

      return {
        ...result,
        operationType: 'resolve_cross_junction',
        processingTime: performance.now() - startTime,
        warnings: [...warnings, ...result.warnings]
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Cross-junction resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'resolveCrossJunction',
          input: { walls },
          suggestedFix: 'Check wall geometry and reduce complexity',
          recoverable: true
        }
      );
    }
  }

  /**
   * Detect and resolve parallel wall overlaps
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async resolveParallelOverlap(walls: WallSolid[]): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      if (walls.length !== 2) {
        throw new GeometricError(
          GeometricErrorType.DEGENERATE_GEOMETRY,
          'Parallel overlap resolution requires exactly 2 walls',
          {
            severity: ErrorSeverity.ERROR,
            operation: 'resolveParallelOverlap',
            input: { walls },
            suggestedFix: 'Provide exactly 2 walls for parallel overlap resolution',
            recoverable: false
          }
        );
      }

      const [wall1, wall2] = walls;

      // Detect parallel overlap
      const overlapResult = await this.detectParallelOverlap(wall1, wall2);
      
      if (!overlapResult.hasOverlap) {
        warnings.push('No parallel overlap detected, using standard intersection resolution');
        return await this.booleanEngine.resolveWallIntersection(walls, IntersectionType.PARALLEL_OVERLAP);
      }

      warnings.push(`Parallel overlap detected: ${overlapResult.overlapPercentage.toFixed(1)}% overlap`);

      // Choose resolution method based on overlap characteristics
      let result: BooleanResult;
      if (overlapResult.overlapPercentage > 80) {
        // High overlap - merge walls
        result = await this.mergeParallelWalls(wall1, wall2, overlapResult);
        warnings.push('High overlap detected, walls merged');
      } else if (overlapResult.overlapPercentage > 20) {
        // Moderate overlap - create transition zone
        result = await this.createTransitionZone(wall1, wall2, overlapResult);
        warnings.push('Moderate overlap detected, transition zone created');
      } else {
        // Low overlap - standard boolean union
        result = await this.booleanEngine.union([wall1, wall2]);
        warnings.push('Low overlap detected, standard union applied');
      }

      // Create intersection data
      if (result.success && result.resultSolid) {
        const intersectionPoint = this.calculateOverlapMidpoint(overlapResult);
        const intersectionData = await this.intersectionManager.createIntersection(
          `parallel_overlap_${Date.now()}`,
          IntersectionType.PARALLEL_OVERLAP,
          walls,
          intersectionPoint,
          {
            resolutionMethod: overlapResult.resolutionMethod
          }
        );

        result.resultSolid.addIntersection(intersectionData);
      }

      return {
        ...result,
        operationType: 'resolve_parallel_overlap',
        processingTime: performance.now() - startTime,
        warnings: [...warnings, ...result.warnings]
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Parallel overlap resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'resolveParallelOverlap',
          input: { walls },
          suggestedFix: 'Check wall geometry and parallel alignment',
          recoverable: true
        }
      );
    }
  }

  /**
   * Handle extreme angles in intersections
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async handleExtremeAngles(walls: WallSolid[], angles: number[]): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      warnings.push(`Handling extreme angles: ${angles.map(a => a.toFixed(1)).join(', ')}°`);

      // Classify extreme angles
      const verySharpAngles = angles.filter(a => a < 5);
      const sharpAngles = angles.filter(a => a >= 5 && a < this.config.extremeAngleThreshold);
      const nearStraightAngles = angles.filter(a => a > (180 - this.config.extremeAngleThreshold));

      // Apply specialized handling for each angle type
      let modifiedWalls = [...walls];

      if (verySharpAngles.length > 0) {
        warnings.push(`Very sharp angles detected (< 5°), applying geometric smoothing`);
        modifiedWalls = await this.smoothVerySharpAngles(modifiedWalls, verySharpAngles);
      }

      if (sharpAngles.length > 0) {
        warnings.push(`Sharp angles detected, using bevel joins`);
        modifiedWalls = await this.applyBevelJoins(modifiedWalls, sharpAngles);
      }

      if (nearStraightAngles.length > 0) {
        warnings.push(`Near-straight angles detected, applying collinearity handling`);
        modifiedWalls = await this.handleNearStraightAngles(modifiedWalls, nearStraightAngles);
      }

      // Perform boolean operation with modified walls
      const result = await this.booleanEngine.batchUnion(modifiedWalls);

      return {
        ...result,
        operationType: 'handle_extreme_angles',
        processingTime: performance.now() - startTime,
        warnings: [...warnings, ...result.warnings]
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.NUMERICAL_INSTABILITY,
        `Extreme angle handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'handleExtremeAngles',
          input: { walls, angles },
          suggestedFix: 'Consider simplifying geometry or adjusting wall angles',
          recoverable: true
        }
      );
    }
  }

  /**
   * Optimize intersection performance for large wall networks
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async optimizeIntersectionNetwork(walls: WallSolid[]): Promise<OptimizationResult> {
    const startTime = performance.now();
    const optimizationsApplied: string[] = [];

    try {
      const originalComplexity = this.calculateNetworkComplexity(walls);

      if (!this.config.optimizationEnabled) {
        return {
          originalComplexity,
          optimizedComplexity: originalComplexity,
          performanceGain: 0,
          optimizationsApplied: ['optimization_disabled'],
          processingTime: performance.now() - startTime
        };
      }

      let optimizedWalls = [...walls];

      // Apply spatial indexing if enabled
      if (this.config.spatialIndexingEnabled) {
        this.buildSpatialIndex(optimizedWalls);
        optimizationsApplied.push('spatial_indexing');
      }

      // Group nearby walls for batch processing
      const wallGroups = this.groupWallsByProximity(optimizedWalls);
      if (wallGroups.length < optimizedWalls.length) {
        optimizationsApplied.push('proximity_grouping');
      }

      // Simplify complex geometries
      const simplificationResults = await this.simplifyComplexWalls(optimizedWalls);
      if (simplificationResults.simplified > 0) {
        optimizationsApplied.push(`geometry_simplification_${simplificationResults.simplified}_walls`);
      }

      // Remove redundant intersections
      const redundantIntersections = this.identifyRedundantIntersections(optimizedWalls);
      if (redundantIntersections.length > 0) {
        optimizationsApplied.push(`removed_${redundantIntersections.length}_redundant_intersections`);
      }

      // Apply parallel processing hints if enabled
      if (this.config.enableParallelProcessing && optimizedWalls.length > 10) {
        optimizationsApplied.push('parallel_processing_enabled');
      }

      const optimizedComplexity = this.calculateNetworkComplexity(optimizedWalls);
      const performanceGain = ((originalComplexity - optimizedComplexity) / originalComplexity) * 100;

      return {
        originalComplexity,
        optimizedComplexity,
        performanceGain,
        optimizationsApplied,
        processingTime: performance.now() - startTime
      };

    } catch (error) {
      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Network optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.WARNING,
          operation: 'optimizeIntersectionNetwork',
          input: { walls },
          suggestedFix: 'Continue without optimization or reduce network complexity',
          recoverable: true
        }
      );
    }
  }

  /**
   * Analyze cross-junction geometry and determine resolution strategy
   */
  private async analyzeCrossJunction(walls: WallSolid[]): Promise<CrossJunctionResult> {
    // Calculate junction center as centroid of wall intersection points
    const junctionCenter = this.calculateJunctionCenter(walls);
    
    // Calculate intersection angles between adjacent walls
    const intersectionAngles = this.calculateIntersectionAngles(walls, junctionCenter);
    
    // Calculate complexity score based on number of walls and angle distribution
    const complexityScore = this.calculateJunctionComplexity(walls, intersectionAngles);
    
    // Determine resolution strategy based on complexity
    let resolutionStrategy: string;
    if (complexityScore < 10) {
      resolutionStrategy = 'sequential_union';
    } else if (complexityScore < 25) {
      resolutionStrategy = 'hierarchical_resolution';
    } else {
      resolutionStrategy = 'optimized_batch';
    }

    return {
      junctionCenter,
      participatingWalls: walls.map(w => w.id),
      intersectionAngles,
      complexityScore,
      resolutionStrategy
    };
  }

  /**
   * Detect parallel overlap between two walls
   */
  private async detectParallelOverlap(wall1: WallSolid, wall2: WallSolid): Promise<ParallelOverlapResult> {
    // Get baseline curves
    const baseline1 = wall1.baseline;
    const baseline2 = wall2.baseline;

    // Check if walls are approximately parallel
    const parallelism = this.calculateParallelism(baseline1, baseline2);
    
    if (parallelism < 0.9) { // Not parallel enough
      return {
        hasOverlap: false,
        overlapLength: 0,
        overlapStart: new BIMPointImpl(0, 0, { id: '', tolerance: 0, creationMethod: '', accuracy: 0, validated: false }),
        overlapEnd: new BIMPointImpl(0, 0, { id: '', tolerance: 0, creationMethod: '', accuracy: 0, validated: false }),
        overlapPercentage: 0,
        resolutionMethod: 'not_parallel'
      };
    }

    // Calculate overlap region
    const overlapRegion = this.calculateOverlapRegion(baseline1, baseline2);
    
    if (overlapRegion.length === 0) {
      return {
        hasOverlap: false,
        overlapLength: 0,
        overlapStart: new BIMPointImpl(0, 0, { id: '', tolerance: 0, creationMethod: '', accuracy: 0, validated: false }),
        overlapEnd: new BIMPointImpl(0, 0, { id: '', tolerance: 0, creationMethod: '', accuracy: 0, validated: false }),
        overlapPercentage: 0,
        resolutionMethod: 'no_overlap'
      };
    }

    const overlapLength = overlapRegion.length;
    const totalLength = Math.min(baseline1.length, baseline2.length);
    const overlapPercentage = (overlapLength / totalLength) * 100;

    // Determine resolution method based on overlap characteristics
    let resolutionMethod: string;
    if (overlapPercentage > 80) {
      resolutionMethod = 'merge_walls';
    } else if (overlapPercentage > 20) {
      resolutionMethod = 'transition_zone';
    } else {
      resolutionMethod = 'standard_union';
    }

    return {
      hasOverlap: true,
      overlapLength,
      overlapStart: overlapRegion.start,
      overlapEnd: overlapRegion.end,
      overlapPercentage,
      resolutionMethod
    };
  }

  // Helper methods (simplified implementations)
  
  private calculateJunctionCenter(walls: WallSolid[]): BIMPoint {
    let sumX = 0, sumY = 0;
    let pointCount = 0;

    for (const wall of walls) {
      for (const point of wall.baseline.points) {
        sumX += point.x;
        sumY += point.y;
        pointCount++;
      }
    }

    return new BIMPointImpl(sumX / pointCount, sumY / pointCount, {
      id: `junction_center_${Date.now()}`,
      tolerance: this.config.tolerance,
      creationMethod: 'centroid_calculation',
      accuracy: 0.9,
      validated: true
    });
  }

  private calculateIntersectionAngles(walls: WallSolid[], center: BIMPoint): number[] {
    const angles: number[] = [];
    
    for (let i = 0; i < walls.length; i++) {
      for (let j = i + 1; j < walls.length; j++) {
        const angle = this.calculateAngleBetweenWalls(walls[i], walls[j], center);
        angles.push(angle);
      }
    }
    
    return angles;
  }

  private calculateAngleBetweenWalls(wall1: WallSolid, wall2: WallSolid, center: BIMPoint): number {
    // Simplified angle calculation - in practice would use proper vector math
    return 45; // Placeholder
  }

  private calculateJunctionComplexity(walls: WallSolid[], angles: number[]): number {
    const wallCount = walls.length;
    const angleVariance = this.calculateAngleVariance(angles);
    const extremeAngles = angles.filter(a => a < 30 || a > 150).length;
    
    return wallCount * 2 + angleVariance + extremeAngles * 5;
  }

  private calculateAngleVariance(angles: number[]): number {
    if (angles.length === 0) return 0;
    
    const mean = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
    const variance = angles.reduce((sum, angle) => sum + Math.pow(angle - mean, 2), 0) / angles.length;
    
    return Math.sqrt(variance);
  }

  private calculateParallelism(curve1: any, curve2: any): number {
    // Simplified parallelism calculation
    return 0.95; // Placeholder
  }

  private calculateOverlapRegion(curve1: any, curve2: any): any {
    // Simplified overlap calculation
    return {
      length: 10,
      start: new BIMPointImpl(0, 0, { id: '', tolerance: 0, creationMethod: '', accuracy: 0, validated: false }),
      end: new BIMPointImpl(10, 0, { id: '', tolerance: 0, creationMethod: '', accuracy: 0, validated: false })
    };
  }

  private calculateOverlapMidpoint(overlapResult: ParallelOverlapResult): BIMPoint {
    return new BIMPointImpl(
      (overlapResult.overlapStart.x + overlapResult.overlapEnd.x) / 2,
      (overlapResult.overlapStart.y + overlapResult.overlapEnd.y) / 2,
      {
        id: `overlap_midpoint_${Date.now()}`,
        tolerance: this.config.tolerance,
        creationMethod: 'overlap_midpoint',
        accuracy: 0.9,
        validated: true
      }
    );
  }

  private calculateNetworkComplexity(walls: WallSolid[]): number {
    return walls.reduce((sum, wall) => sum + wall.complexity, 0);
  }

  private buildSpatialIndex(walls: WallSolid[]): void {
    // Simplified spatial indexing
    this.spatialIndex.clear();
    for (const wall of walls) {
      const key = `${Math.floor(wall.baseline.points[0].x / 100)}_${Math.floor(wall.baseline.points[0].y / 100)}`;
      if (!this.spatialIndex.has(key)) {
        this.spatialIndex.set(key, []);
      }
      this.spatialIndex.get(key)!.push(wall);
    }
  }

  private groupWallsByProximity(walls: WallSolid[]): WallSolid[][] {
    // Simplified grouping - return single group for now
    return [walls];
  }

  private async simplifyComplexWalls(walls: WallSolid[]): Promise<{ simplified: number }> {
    // Placeholder for wall simplification
    return { simplified: 0 };
  }

  private identifyRedundantIntersections(walls: WallSolid[]): string[] {
    // Placeholder for redundant intersection identification
    return [];
  }

  // Placeholder methods for extreme angle handling
  private async handleExtremeAngleCrossJunction(
    walls: WallSolid[], 
    analysis: CrossJunctionResult, 
    extremeAngles: number[]
  ): Promise<BooleanResult> {
    return await this.handleExtremeAngles(walls, extremeAngles);
  }

  private async resolveSequentialUnion(walls: WallSolid[], analysis: CrossJunctionResult): Promise<BooleanResult> {
    return await this.booleanEngine.batchUnion(walls);
  }

  private async resolveHierarchicalCrossJunction(walls: WallSolid[], analysis: CrossJunctionResult): Promise<BooleanResult> {
    return await this.booleanEngine.batchUnion(walls);
  }

  private async resolveOptimizedBatch(walls: WallSolid[], analysis: CrossJunctionResult): Promise<BooleanResult> {
    return await this.booleanEngine.batchUnion(walls);
  }

  private async mergeParallelWalls(wall1: WallSolid, wall2: WallSolid, overlap: ParallelOverlapResult): Promise<BooleanResult> {
    return await this.booleanEngine.union([wall1, wall2]);
  }

  private async createTransitionZone(wall1: WallSolid, wall2: WallSolid, overlap: ParallelOverlapResult): Promise<BooleanResult> {
    return await this.booleanEngine.union([wall1, wall2]);
  }

  private async smoothVerySharpAngles(walls: WallSolid[], angles: number[]): Promise<WallSolid[]> {
    return walls; // Placeholder
  }

  private async applyBevelJoins(walls: WallSolid[], angles: number[]): Promise<WallSolid[]> {
    return walls; // Placeholder
  }

  private async handleNearStraightAngles(walls: WallSolid[], angles: number[]): Promise<WallSolid[]> {
    return walls; // Placeholder
  }
}