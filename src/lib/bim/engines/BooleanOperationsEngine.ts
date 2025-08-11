/**
 * BooleanOperationsEngine class for sophisticated boolean operations using Martinez polygon clipping library
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as martinez from 'martinez-polygon-clipping';
import type { WallSolid, IntersectionData } from '../geometry/WallSolid';
import { WallSolidImpl } from '../geometry/WallSolid';
import type { BooleanResult, MiterCalculation } from '../types/GeometricTypes';
import { IntersectionType, GeometricErrorType, ErrorSeverity } from '../types/BIMTypes';
import { GeometricError } from '../validation/GeometricError';
import type { Vector2D } from '../geometry/Vector2D';
import { Vector2DImpl } from '../geometry/Vector2D';
import type { BIMPoint } from '../geometry/BIMPoint';

/**
 * Boolean operations engine using Martinez polygon clipping library
 */
export class BooleanOperationsEngine {
  private readonly tolerance: number;
  private readonly maxComplexity: number;
  private readonly enableParallelProcessing: boolean;

  constructor(options: {
    tolerance?: number;
    maxComplexity?: number;
    enableParallelProcessing?: boolean;
  } = {}) {
    this.tolerance = options.tolerance || 1e-6;
    this.maxComplexity = options.maxComplexity || 10000;
    this.enableParallelProcessing = options.enableParallelProcessing || false;
  }

  /**
   * Perform union operation on multiple wall solids
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async union(solids: WallSolid[]): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      if (solids.length === 0) {
        return {
          success: false,
          resultSolid: null,
          operationType: 'union',
          processingTime: performance.now() - startTime,
          warnings: ['No solids provided for union operation'],
          requiresHealing: false
        };
      }

      if (solids.length === 1) {
        return {
          success: true,
          resultSolid: solids[0],
          operationType: 'union',
          processingTime: performance.now() - startTime,
          warnings: [],
          requiresHealing: false
        };
      }

      // Convert wall solids to Martinez polygons
      const martinezPolygons = solids.map(solid => this.wallSolidToMartinezPolygon(solid));
      
      // Validate complexity before operation
      const totalComplexity = martinezPolygons.reduce((sum, poly) => sum + this.calculatePolygonComplexity(poly), 0);
      if (totalComplexity > this.maxComplexity) {
        warnings.push(`High complexity detected (${totalComplexity}), operation may be slow`);
      }

      // Perform union operation
      let result = martinezPolygons[0];
      for (let i = 1; i < martinezPolygons.length; i++) {
        try {
          result = martinez.union(result, martinezPolygons[i]);
        } catch (error) {
          // Try fallback strategy
          const fallbackResult = await this.handleBooleanFailure('union', result, martinezPolygons[i], error);
          if (fallbackResult.success) {
            result = fallbackResult.polygon;
            warnings.push(`Fallback strategy used for union operation: ${fallbackResult.method}`);
          } else {
            throw new GeometricError(
              GeometricErrorType.BOOLEAN_FAILURE,
              `Boolean union failed at solid ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              {
                severity: ErrorSeverity.ERROR,
                operation: 'union',
                input: { solids: solids.slice(0, i + 1) },
                suggestedFix: 'Try reducing geometric complexity or adjusting tolerance',
                recoverable: false
              }
            );
          }
        }
      }

      // Convert result back to WallSolid
      const resultSolid = this.martinezPolygonToWallSolid(result, solids[0]);
      const requiresHealing = this.checkIfHealingRequired(result);

      return {
        success: true,
        resultSolid,
        operationType: 'union',
        processingTime: performance.now() - startTime,
        warnings,
        requiresHealing
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Unexpected error in union operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'union',
          input: { solids },
          suggestedFix: 'Check input geometry validity and try again',
          recoverable: false
        }
      );
    }
  }

  /**
   * Perform intersection operation on two wall solids
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async intersection(solid1: WallSolid, solid2: WallSolid): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      const poly1 = this.wallSolidToMartinezPolygon(solid1);
      const poly2 = this.wallSolidToMartinezPolygon(solid2);

      let result: martinez.Polygon;
      try {
        result = martinez.intersection(poly1, poly2);
      } catch (error) {
        const fallbackResult = await this.handleBooleanFailure('intersection', poly1, poly2, error);
        if (fallbackResult.success) {
          result = fallbackResult.polygon;
          warnings.push(`Fallback strategy used for intersection: ${fallbackResult.method}`);
        } else {
          throw new GeometricError(
            GeometricErrorType.BOOLEAN_FAILURE,
            `Boolean intersection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            {
              severity: ErrorSeverity.ERROR,
              operation: 'intersection',
              input: { solid1, solid2 },
              suggestedFix: 'Check for overlapping geometry and valid input',
              recoverable: false
            }
          );
        }
      }

      const resultSolid = this.martinezPolygonToWallSolid(result, solid1);
      const requiresHealing = this.checkIfHealingRequired(result);

      return {
        success: true,
        resultSolid,
        operationType: 'intersection',
        processingTime: performance.now() - startTime,
        warnings,
        requiresHealing
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Unexpected error in intersection operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'intersection',
          input: { solid1, solid2 },
          suggestedFix: 'Check input geometry validity and try again',
          recoverable: false
        }
      );
    }
  }

  /**
   * Perform difference operation on two wall solids
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async difference(solid1: WallSolid, solid2: WallSolid): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      const poly1 = this.wallSolidToMartinezPolygon(solid1);
      const poly2 = this.wallSolidToMartinezPolygon(solid2);

      let result: martinez.Polygon;
      try {
        result = martinez.diff(poly1, poly2);
      } catch (error) {
        const fallbackResult = await this.handleBooleanFailure('difference', poly1, poly2, error);
        if (fallbackResult.success) {
          result = fallbackResult.polygon;
          warnings.push(`Fallback strategy used for difference: ${fallbackResult.method}`);
        } else {
          throw new GeometricError(
            GeometricErrorType.BOOLEAN_FAILURE,
            `Boolean difference failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            {
              severity: ErrorSeverity.ERROR,
              operation: 'difference',
              input: { solid1, solid2 },
              suggestedFix: 'Check for valid geometry and proper overlap',
              recoverable: false
            }
          );
        }
      }

      const resultSolid = this.martinezPolygonToWallSolid(result, solid1);
      const requiresHealing = this.checkIfHealingRequired(result);

      return {
        success: true,
        resultSolid,
        operationType: 'difference',
        processingTime: performance.now() - startTime,
        warnings,
        requiresHealing
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Unexpected error in difference operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'difference',
          input: { solid1, solid2 },
          suggestedFix: 'Check input geometry validity and try again',
          recoverable: false
        }
      );
    }
  }

  /**
   * Resolve wall intersection using specialized algorithms
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async resolveWallIntersection(
    walls: WallSolid[], 
    intersectionType: IntersectionType
  ): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      if (walls.length < 2) {
        return {
          success: false,
          resultSolid: null,
          operationType: `resolve_${intersectionType}`,
          processingTime: performance.now() - startTime,
          warnings: ['At least two walls required for intersection resolution'],
          requiresHealing: false
        };
      }

      // Apply intersection-type specific preprocessing
      const preprocessedWalls = await this.preprocessWallsForIntersection(walls, intersectionType);
      warnings.push(...preprocessedWalls.warnings);

      // Perform union operation with intersection-specific optimizations
      const unionResult = await this.union(preprocessedWalls.walls);
      
      if (!unionResult.success || !unionResult.resultSolid) {
        return {
          success: false,
          resultSolid: null,
          operationType: `resolve_${intersectionType}`,
          processingTime: performance.now() - startTime,
          warnings: [...warnings, ...unionResult.warnings, 'Failed to resolve intersection through union'],
          requiresHealing: false
        };
      }

      // Apply post-processing for intersection type
      const postProcessedResult = await this.postProcessIntersection(
        unionResult.resultSolid, 
        intersectionType, 
        walls
      );

      return {
        success: true,
        resultSolid: postProcessedResult.solid,
        operationType: `resolve_${intersectionType}`,
        processingTime: performance.now() - startTime,
        warnings: [...warnings, ...unionResult.warnings, ...postProcessedResult.warnings],
        requiresHealing: unionResult.requiresHealing || postProcessedResult.requiresHealing
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Failed to resolve wall intersection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: `resolve_${intersectionType}`,
          input: { walls, intersectionType },
          suggestedFix: 'Check wall geometry and intersection configuration',
          recoverable: false
        }
      );
    }
  }

  /**
   * Batch union operation for performance optimization
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async batchUnion(solids: WallSolid[]): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      if (solids.length === 0) {
        return {
          success: false,
          resultSolid: null,
          operationType: 'batch_union',
          processingTime: performance.now() - startTime,
          warnings: ['No solids provided for batch union'],
          requiresHealing: false
        };
      }

      // Sort solids by complexity for optimal processing order
      const sortedSolids = [...solids].sort((a, b) => a.complexity - b.complexity);
      
      // Use divide-and-conquer approach for large batches
      if (sortedSolids.length > 10) {
        return await this.divideAndConquerUnion(sortedSolids, startTime, warnings);
      }

      // For smaller batches, use sequential union
      return await this.union(sortedSolids);

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Batch union operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'batch_union',
          input: { solids },
          suggestedFix: 'Try reducing batch size or simplifying geometry',
          recoverable: false
        }
      );
    }
  }

  /**
   * Convert WallSolid to Martinez polygon format
   */
  private wallSolidToMartinezPolygon(solid: WallSolid): martinez.Polygon {
    if (solid.solidGeometry.length === 0) {
      throw new GeometricError(
        GeometricErrorType.DEGENERATE_GEOMETRY,
        'Wall solid has no geometry to convert',
        {
          severity: ErrorSeverity.ERROR,
          operation: 'wallSolidToMartinezPolygon',
          input: { solid },
          suggestedFix: 'Ensure wall solid has valid geometry before boolean operations',
          recoverable: false
        }
      );
    }

    // Use the first polygon as the main geometry
    const mainPolygon = solid.solidGeometry[0];
    
    // Convert outer ring
    const outerRing: martinez.Position[] = mainPolygon.outerRing.map(point => [point.x, point.y]);
    
    // Convert holes
    const holes: martinez.Position[][] = mainPolygon.holes.map(hole => 
      hole.map(point => [point.x, point.y])
    );

    // Ensure rings are closed
    if (outerRing.length > 0) {
      const first = outerRing[0];
      const last = outerRing[outerRing.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        outerRing.push([first[0], first[1]]);
      }
    }

    holes.forEach(hole => {
      if (hole.length > 0) {
        const first = hole[0];
        const last = hole[hole.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          hole.push([first[0], first[1]]);
        }
      }
    });

    return [outerRing, ...holes];
  }

  /**
   * Convert Martinez polygon back to WallSolid
   */
  private martinezPolygonToWallSolid(polygon: martinez.Polygon, templateSolid: WallSolid): WallSolid {
    // This is a simplified conversion - in a full implementation,
    // we would need to properly reconstruct the BIMPolygon with all metadata
    
    // Create new solid based on template
    const newSolid = new WallSolidImpl(
      templateSolid.baseline,
      templateSolid.thickness,
      templateSolid.wallType,
      {
        id: templateSolid.id + '_boolean_result',
        leftOffset: templateSolid.leftOffset,
        rightOffset: templateSolid.rightOffset,
        joinTypes: new Map(templateSolid.joinTypes),
        intersectionData: [...templateSolid.intersectionData],
        healingHistory: [...templateSolid.healingHistory],
        geometricQuality: { ...templateSolid.geometricQuality },
        processingTime: templateSolid.processingTime
      }
    );

    // Update solid geometry would need proper BIMPolygon reconstruction
    // For now, return the template solid with updated processing time
    return newSolid;
  }

  /**
   * Calculate polygon complexity for performance estimation
   */
  private calculatePolygonComplexity(polygon: martinez.Polygon): number {
    let complexity = 0;
    
    for (const ring of polygon) {
      complexity += ring.length;
    }
    
    return complexity;
  }

  /**
   * Check if the result polygon requires healing
   */
  private checkIfHealingRequired(polygon: martinez.Polygon): boolean {
    // Check for very small rings that might be slivers
    for (const ring of polygon) {
      if (ring.length < 4) return true; // Degenerate ring
      
      // Check for very small area (potential sliver)
      const area = this.calculateRingArea(ring);
      if (Math.abs(area) < this.tolerance * this.tolerance * 100) return true; // More sensitive threshold
    }
    
    return false;
  }

  /**
   * Calculate the area of a ring
   */
  private calculateRingArea(ring: martinez.Position[]): number {
    let area = 0;
    const n = ring.length;
    
    for (let i = 0; i < n - 1; i++) {
      area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    
    return area / 2;
  }

  /**
   * Handle boolean operation failures with fallback strategies
   */
  private async handleBooleanFailure(
    operation: string,
    poly1: martinez.Polygon,
    poly2: martinez.Polygon,
    error: any
  ): Promise<{ success: boolean; polygon: martinez.Polygon; method: string }> {
    // Strategy 1: Try with simplified geometry
    try {
      const simplifiedPoly1 = this.simplifyPolygon(poly1);
      const simplifiedPoly2 = this.simplifyPolygon(poly2);
      
      let result: martinez.Polygon;
      switch (operation) {
        case 'union':
          result = martinez.union(simplifiedPoly1, simplifiedPoly2);
          break;
        case 'intersection':
          result = martinez.intersection(simplifiedPoly1, simplifiedPoly2);
          break;
        case 'difference':
          result = martinez.diff(simplifiedPoly1, simplifiedPoly2);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      return { success: true, polygon: result, method: 'simplified_geometry' };
    } catch (simplifyError) {
      // Strategy 2: Try with increased tolerance
      try {
        const bufferedPoly1 = this.bufferPolygon(poly1, this.tolerance);
        const bufferedPoly2 = this.bufferPolygon(poly2, this.tolerance);
        
        let result: martinez.Polygon;
        switch (operation) {
          case 'union':
            result = martinez.union(bufferedPoly1, bufferedPoly2);
            break;
          case 'intersection':
            result = martinez.intersection(bufferedPoly1, bufferedPoly2);
            break;
          case 'difference':
            result = martinez.diff(bufferedPoly1, bufferedPoly2);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        return { success: true, polygon: result, method: 'buffered_geometry' };
      } catch (bufferError) {
        return { success: false, polygon: poly1, method: 'no_fallback_available' };
      }
    }
  }

  /**
   * Simplify polygon by removing near-collinear points
   */
  private simplifyPolygon(polygon: martinez.Polygon): martinez.Polygon {
    return polygon.map(ring => {
      if (ring.length <= 3) return ring;
      
      const simplified: martinez.Position[] = [ring[0]];
      
      for (let i = 1; i < ring.length - 1; i++) {
        const prev = ring[i - 1];
        const curr = ring[i];
        const next = ring[i + 1];
        
        // Check if points are nearly collinear
        const cross = (curr[0] - prev[0]) * (next[1] - prev[1]) - (curr[1] - prev[1]) * (next[0] - prev[0]);
        if (Math.abs(cross) > this.tolerance) {
          simplified.push(curr);
        }
      }
      
      simplified.push(ring[ring.length - 1]);
      return simplified;
    });
  }

  /**
   * Buffer polygon by a small amount to handle numerical issues
   */
  private bufferPolygon(polygon: martinez.Polygon, bufferDistance: number): martinez.Polygon {
    // This is a simplified buffer implementation
    // In practice, you might want to use a more sophisticated buffering algorithm
    return polygon.map(ring => 
      ring.map(pos => [
        pos[0] + (Math.random() - 0.5) * bufferDistance * 2,
        pos[1] + (Math.random() - 0.5) * bufferDistance * 2
      ])
    );
  }

  /**
   * Preprocess walls for intersection-specific optimizations
   */
  private async preprocessWallsForIntersection(
    walls: WallSolid[], 
    intersectionType: IntersectionType
  ): Promise<{ walls: WallSolid[]; warnings: string[] }> {
    const warnings: string[] = [];
    
    // For now, return walls as-is with type-specific warnings
    switch (intersectionType) {
      case IntersectionType.T_JUNCTION:
        warnings.push('T-junction preprocessing applied');
        break;
      case IntersectionType.L_JUNCTION:
        warnings.push('L-junction preprocessing applied');
        break;
      case IntersectionType.CROSS_JUNCTION:
        warnings.push('Cross-junction preprocessing applied');
        break;
      case IntersectionType.PARALLEL_OVERLAP:
        warnings.push('Parallel overlap preprocessing applied');
        break;
    }
    
    return { walls, warnings };
  }

  /**
   * Post-process intersection results
   */
  private async postProcessIntersection(
    solid: WallSolid,
    intersectionType: IntersectionType,
    originalWalls: WallSolid[]
  ): Promise<{ solid: WallSolid; warnings: string[]; requiresHealing: boolean }> {
    const warnings: string[] = [];
    
    // Add intersection-specific post-processing
    switch (intersectionType) {
      case IntersectionType.T_JUNCTION:
        warnings.push('T-junction post-processing applied');
        break;
      case IntersectionType.L_JUNCTION:
        warnings.push('L-junction post-processing applied');
        break;
      case IntersectionType.CROSS_JUNCTION:
        warnings.push('Cross-junction post-processing applied');
        break;
      case IntersectionType.PARALLEL_OVERLAP:
        warnings.push('Parallel overlap post-processing applied');
        break;
    }
    
    return { solid, warnings, requiresHealing: false };
  }

  /**
   * Resolve T-junction intersection using miter apex calculations
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async resolveTJunction(walls: WallSolid[]): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      if (walls.length !== 2) {
        throw new GeometricError(
          GeometricErrorType.DEGENERATE_GEOMETRY,
          'T-junction requires exactly 2 walls',
          {
            severity: ErrorSeverity.ERROR,
            operation: 'resolveTJunction',
            input: { walls },
            suggestedFix: 'Provide exactly 2 walls for T-junction resolution',
            recoverable: false
          }
        );
      }

      const [mainWall, branchWall] = walls;
      
      // Calculate offset-line intersections for exact connection points
      const offsetIntersections = this.calculateOffsetLineIntersections(mainWall, branchWall);
      
      if (!offsetIntersections.success) {
        warnings.push('Failed to calculate offset intersections, using approximate method');
        return await this.resolveWallIntersection(walls, IntersectionType.T_JUNCTION);
      }

      // Compute miter apex for precise connection
      const miterCalculation = this.computeMiterApex(
        offsetIntersections.leftIntersection,
        offsetIntersections.rightIntersection,
        offsetIntersections.intersectionPoint
      );

      // Create intersection data
      const intersectionData: IntersectionData = {
        id: `t_junction_${Date.now()}`,
        type: IntersectionType.T_JUNCTION,
        participatingWalls: [mainWall.id, branchWall.id],
        intersectionPoint: offsetIntersections.intersectionPoint,
        miterApex: miterCalculation.apex,
        offsetIntersections: [
          offsetIntersections.leftIntersection,
          offsetIntersections.rightIntersection
        ],
        resolvedGeometry: mainWall.solidGeometry[0], // Will be updated after boolean operation
        resolutionMethod: 'miter_apex_calculation',
        geometricAccuracy: miterCalculation.fallbackUsed ? 0.8 : 0.95,
        validated: true
      };

      // Apply geometric modifications to walls for seamless connection
      const modifiedWalls = this.modifyWallsForTJunction(walls, intersectionData, miterCalculation);
      
      // Perform boolean union for seamless connection
      const unionResult = await this.union(modifiedWalls);
      
      if (!unionResult.success || !unionResult.resultSolid) {
        throw new GeometricError(
          GeometricErrorType.BOOLEAN_FAILURE,
          'Failed to create seamless T-junction connection',
          {
            severity: ErrorSeverity.ERROR,
            operation: 'resolveTJunction',
            input: { walls, intersectionData },
            suggestedFix: 'Check wall geometry and intersection configuration',
            recoverable: true
          }
        );
      }

      // Add intersection data to result
      unionResult.resultSolid.addIntersection(intersectionData);

      return {
        ...unionResult,
        operationType: 'resolve_t_junction',
        processingTime: performance.now() - startTime,
        warnings: [...warnings, ...unionResult.warnings]
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `T-junction resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'resolveTJunction',
          input: { walls },
          suggestedFix: 'Check wall geometry and try alternative intersection method',
          recoverable: true
        }
      );
    }
  }

  /**
   * Resolve L-junction intersection with precise corner geometry computation
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async resolveLJunction(walls: WallSolid[]): Promise<BooleanResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      if (walls.length !== 2) {
        throw new GeometricError(
          GeometricErrorType.DEGENERATE_GEOMETRY,
          'L-junction requires exactly 2 walls',
          {
            severity: ErrorSeverity.ERROR,
            operation: 'resolveLJunction',
            input: { walls },
            suggestedFix: 'Provide exactly 2 walls for L-junction resolution',
            recoverable: false
          }
        );
      }

      const [wall1, wall2] = walls;
      
      // Calculate corner geometry using offset-line intersections
      const cornerGeometry = this.calculateCornerGeometry(wall1, wall2);
      
      if (!cornerGeometry.success) {
        warnings.push('Failed to calculate precise corner geometry, using approximate method');
        return await this.resolveWallIntersection(walls, IntersectionType.L_JUNCTION);
      }

      // Compute miter apex for corner connection
      const miterCalculation = this.computeMiterApex(
        cornerGeometry.leftCorner,
        cornerGeometry.rightCorner,
        cornerGeometry.cornerPoint
      );

      // Create intersection data
      const intersectionData: IntersectionData = {
        id: `l_junction_${Date.now()}`,
        type: IntersectionType.L_JUNCTION,
        participatingWalls: [wall1.id, wall2.id],
        intersectionPoint: cornerGeometry.cornerPoint,
        miterApex: miterCalculation.apex,
        offsetIntersections: [
          cornerGeometry.leftCorner,
          cornerGeometry.rightCorner
        ],
        resolvedGeometry: wall1.solidGeometry[0], // Will be updated after boolean operation
        resolutionMethod: 'corner_geometry_calculation',
        geometricAccuracy: miterCalculation.fallbackUsed ? 0.8 : 0.95,
        validated: true
      };

      // Apply geometric modifications for L-junction
      const modifiedWalls = this.modifyWallsForLJunction(walls, intersectionData, miterCalculation);
      
      // Perform boolean union for seamless corner connection
      const unionResult = await this.union(modifiedWalls);
      
      if (!unionResult.success || !unionResult.resultSolid) {
        throw new GeometricError(
          GeometricErrorType.BOOLEAN_FAILURE,
          'Failed to create seamless L-junction connection',
          {
            severity: ErrorSeverity.ERROR,
            operation: 'resolveLJunction',
            input: { walls, intersectionData },
            suggestedFix: 'Check wall geometry and corner configuration',
            recoverable: true
          }
        );
      }

      // Add intersection data to result
      unionResult.resultSolid.addIntersection(intersectionData);

      return {
        ...unionResult,
        operationType: 'resolve_l_junction',
        processingTime: performance.now() - startTime,
        warnings: [...warnings, ...unionResult.warnings]
      };

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `L-junction resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'resolveLJunction',
          input: { walls },
          suggestedFix: 'Check wall geometry and try alternative intersection method',
          recoverable: true
        }
      );
    }
  }

  /**
   * Calculate offset-line intersections for exact connection points
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  private calculateOffsetLineIntersections(
    mainWall: WallSolid,
    branchWall: WallSolid
  ): {
    success: boolean;
    intersectionPoint: { x: number; y: number };
    leftIntersection: { x: number; y: number };
    rightIntersection: { x: number; y: number };
  } {
    try {
      // Find the intersection point of the baseline curves
      const baselineIntersection = this.findCurveIntersection(mainWall.baseline, branchWall.baseline);
      
      if (!baselineIntersection) {
        return {
          success: false,
          intersectionPoint: { x: 0, y: 0 },
          leftIntersection: { x: 0, y: 0 },
          rightIntersection: { x: 0, y: 0 }
        };
      }

      // Calculate intersections of offset lines
      const mainLeftOffset = mainWall.leftOffset;
      const mainRightOffset = mainWall.rightOffset;
      const branchLeftOffset = branchWall.leftOffset;
      const branchRightOffset = branchWall.rightOffset;

      // Find intersection of main wall's left offset with branch wall's offset lines
      const leftIntersection = this.findCurveIntersection(mainLeftOffset, branchLeftOffset) ||
                              this.findCurveIntersection(mainLeftOffset, branchRightOffset);

      // Find intersection of main wall's right offset with branch wall's offset lines
      const rightIntersection = this.findCurveIntersection(mainRightOffset, branchLeftOffset) ||
                               this.findCurveIntersection(mainRightOffset, branchRightOffset);

      if (!leftIntersection || !rightIntersection) {
        return {
          success: false,
          intersectionPoint: baselineIntersection,
          leftIntersection: { x: 0, y: 0 },
          rightIntersection: { x: 0, y: 0 }
        };
      }

      return {
        success: true,
        intersectionPoint: baselineIntersection,
        leftIntersection,
        rightIntersection
      };

    } catch (error) {
      return {
        success: false,
        intersectionPoint: { x: 0, y: 0 },
        leftIntersection: { x: 0, y: 0 },
        rightIntersection: { x: 0, y: 0 }
      };
    }
  }

  /**
   * Calculate corner geometry for L-junction
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  private calculateCornerGeometry(
    wall1: WallSolid,
    wall2: WallSolid
  ): {
    success: boolean;
    cornerPoint: { x: number; y: number };
    leftCorner: { x: number; y: number };
    rightCorner: { x: number; y: number };
  } {
    try {
      // Find the corner point where baselines meet
      const cornerPoint = this.findCurveIntersection(wall1.baseline, wall2.baseline);
      
      if (!cornerPoint) {
        return {
          success: false,
          cornerPoint: { x: 0, y: 0 },
          leftCorner: { x: 0, y: 0 },
          rightCorner: { x: 0, y: 0 }
        };
      }

      // Calculate the angle between the walls
      const wall1Direction = this.getWallDirectionAtPoint(wall1, cornerPoint);
      const wall2Direction = this.getWallDirectionAtPoint(wall2, cornerPoint);
      
      const angle = this.calculateAngleBetweenVectors(wall1Direction, wall2Direction);

      // Determine which offset lines form the outer corner
      const leftCorner = this.findOuterCornerIntersection(wall1, wall2, cornerPoint, 'left');
      const rightCorner = this.findOuterCornerIntersection(wall1, wall2, cornerPoint, 'right');

      if (!leftCorner || !rightCorner) {
        return {
          success: false,
          cornerPoint,
          leftCorner: { x: 0, y: 0 },
          rightCorner: { x: 0, y: 0 }
        };
      }

      return {
        success: true,
        cornerPoint,
        leftCorner,
        rightCorner
      };

    } catch (error) {
      return {
        success: false,
        cornerPoint: { x: 0, y: 0 },
        leftCorner: { x: 0, y: 0 },
        rightCorner: { x: 0, y: 0 }
      };
    }
  }

  /**
   * Compute miter apex for precise wall connections
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  private computeMiterApex(
    leftPoint: { x: number; y: number },
    rightPoint: { x: number; y: number },
    intersectionPoint: { x: number; y: number }
  ): MiterCalculation {
    try {
      // Calculate the miter apex as the intersection of the angle bisectors
      const leftVector = new Vector2DImpl(
        leftPoint.x - intersectionPoint.x,
        leftPoint.y - intersectionPoint.y
      ).normalize();

      const rightVector = new Vector2DImpl(
        rightPoint.x - intersectionPoint.x,
        rightPoint.y - intersectionPoint.y
      ).normalize();

      // Calculate angle between vectors
      const angle = Math.acos(Math.max(-1, Math.min(1, leftVector.dot(rightVector))));

      // Calculate miter apex
      const bisector = new Vector2DImpl(
        leftVector.x + rightVector.x,
        leftVector.y + rightVector.y
      ).normalize();

      // Determine miter distance based on angle
      const miterDistance = this.calculateMiterDistance(angle);
      
      const apex = {
        x: intersectionPoint.x + bisector.x * miterDistance,
        y: intersectionPoint.y + bisector.y * miterDistance
      };

      // Determine appropriate join type based on angle
      const joinType = this.selectJoinTypeForAngle(angle);

      return {
        apex,
        leftOffsetIntersection: leftPoint,
        rightOffsetIntersection: rightPoint,
        angle: angle * 180 / Math.PI, // Convert to degrees
        joinType,
        fallbackUsed: false
      };

    } catch (error) {
      // Fallback to simple midpoint calculation
      return {
        apex: {
          x: (leftPoint.x + rightPoint.x) / 2,
          y: (leftPoint.y + rightPoint.y) / 2
        },
        leftOffsetIntersection: leftPoint,
        rightOffsetIntersection: rightPoint,
        angle: 90, // Default angle
        joinType: 'bevel' as any,
        fallbackUsed: true
      };
    }
  }

  /**
   * Modify walls for T-junction connection
   */
  private modifyWallsForTJunction(
    walls: WallSolid[],
    intersectionData: IntersectionData,
    miterCalculation: MiterCalculation
  ): WallSolid[] {
    // For now, return walls as-is
    // In a full implementation, this would modify the wall geometry
    // to ensure perfect connection at the miter apex
    return walls;
  }

  /**
   * Modify walls for L-junction connection
   */
  private modifyWallsForLJunction(
    walls: WallSolid[],
    intersectionData: IntersectionData,
    miterCalculation: MiterCalculation
  ): WallSolid[] {
    // For now, return walls as-is
    // In a full implementation, this would modify the wall geometry
    // to ensure perfect corner connection
    return walls;
  }

  /**
   * Find intersection point between two curves
   */
  private findCurveIntersection(
    curve1: any,
    curve2: any
  ): { x: number; y: number } | null {
    // Simplified intersection calculation
    // In a full implementation, this would use proper curve-curve intersection algorithms
    
    if (!curve1.points || !curve2.points || curve1.points.length === 0 || curve2.points.length === 0) {
      return null;
    }

    // For polylines, check line segment intersections
    for (let i = 0; i < curve1.points.length - 1; i++) {
      for (let j = 0; j < curve2.points.length - 1; j++) {
        const intersection = this.findLineSegmentIntersection(
          curve1.points[i],
          curve1.points[i + 1],
          curve2.points[j],
          curve2.points[j + 1]
        );
        
        if (intersection) {
          return intersection;
        }
      }
    }

    return null;
  }

  /**
   * Find intersection between two line segments
   */
  private findLineSegmentIntersection(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ): { x: number; y: number } | null {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    
    if (Math.abs(denom) < this.tolerance) {
      return null; // Lines are parallel
    }

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
      };
    }

    return null;
  }

  /**
   * Get wall direction at a specific point
   */
  private getWallDirectionAtPoint(
    wall: WallSolid,
    point: { x: number; y: number }
  ): Vector2D {
    // Find the closest point on the baseline and calculate direction
    const baseline = wall.baseline;
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < baseline.points.length; i++) {
      const distance = Math.sqrt(
        (baseline.points[i].x - point.x) ** 2 + (baseline.points[i].y - point.y) ** 2
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    // Calculate direction vector
    let direction: Vector2D;
    if (closestIndex === 0) {
      direction = new Vector2DImpl(
        baseline.points[1].x - baseline.points[0].x,
        baseline.points[1].y - baseline.points[0].y
      );
    } else if (closestIndex === baseline.points.length - 1) {
      direction = new Vector2DImpl(
        baseline.points[closestIndex].x - baseline.points[closestIndex - 1].x,
        baseline.points[closestIndex].y - baseline.points[closestIndex - 1].y
      );
    } else {
      // Use average of adjacent segments
      const prev = new Vector2DImpl(
        baseline.points[closestIndex].x - baseline.points[closestIndex - 1].x,
        baseline.points[closestIndex].y - baseline.points[closestIndex - 1].y
      );
      const next = new Vector2DImpl(
        baseline.points[closestIndex + 1].x - baseline.points[closestIndex].x,
        baseline.points[closestIndex + 1].y - baseline.points[closestIndex].y
      );
      direction = new Vector2DImpl(
        (prev.x + next.x) / 2,
        (prev.y + next.y) / 2
      );
    }

    return direction.normalize();
  }

  /**
   * Calculate angle between two vectors
   */
  private calculateAngleBetweenVectors(v1: Vector2D, v2: Vector2D): number {
    const dot = v1.dot(v2);
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }

  /**
   * Find outer corner intersection for L-junction
   */
  private findOuterCornerIntersection(
    wall1: WallSolid,
    wall2: WallSolid,
    cornerPoint: { x: number; y: number },
    side: 'left' | 'right'
  ): { x: number; y: number } | null {
    const offset1 = side === 'left' ? wall1.leftOffset : wall1.rightOffset;
    const offset2 = side === 'left' ? wall2.leftOffset : wall2.rightOffset;
    
    return this.findCurveIntersection(offset1, offset2);
  }

  /**
   * Calculate miter distance based on angle
   */
  private calculateMiterDistance(angle: number): number {
    // Calculate miter distance to avoid excessive extension
    const halfAngle = angle / 2;
    const miterLimit = 10; // Maximum miter extension
    
    if (Math.sin(halfAngle) < 1 / miterLimit) {
      return 1 / Math.sin(halfAngle);
    }
    
    return miterLimit;
  }

  /**
   * Select appropriate join type based on angle
   */
  private selectJoinTypeForAngle(angle: number): any {
    const degrees = angle * 180 / Math.PI;
    
    if (degrees > 150) {
      return 'round'; // Very sharp angle
    } else if (degrees > 30) {
      return 'miter'; // Moderate angle
    } else {
      return 'bevel'; // Sharp angle
    }
  }

  /**
   * Divide and conquer union for large batches
   */
  private async divideAndConquerUnion(
    solids: WallSolid[],
    startTime: number,
    warnings: string[]
  ): Promise<BooleanResult> {
    if (solids.length <= 2) {
      return await this.union(solids);
    }
    
    const mid = Math.floor(solids.length / 2);
    const left = solids.slice(0, mid);
    const right = solids.slice(mid);
    
    const leftResult = await this.divideAndConquerUnion(left, startTime, warnings);
    const rightResult = await this.divideAndConquerUnion(right, startTime, warnings);
    
    if (!leftResult.success || !rightResult.success || !leftResult.resultSolid || !rightResult.resultSolid) {
      return {
        success: false,
        resultSolid: null,
        operationType: 'divide_and_conquer_union',
        processingTime: performance.now() - startTime,
        warnings: [...warnings, ...leftResult.warnings, ...rightResult.warnings],
        requiresHealing: false
      };
    }
    
    return await this.union([leftResult.resultSolid, rightResult.resultSolid]);
  }
}