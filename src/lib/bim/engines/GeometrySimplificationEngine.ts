/**
 * Geometry Simplification Engine with RDP-style algorithm and thickness-based tolerance
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type { WallSolid } from '../geometry/WallSolid';
import type { BIMPolygon } from '../geometry/BIMPolygon';
import type { BIMPoint } from '../geometry/BIMPoint';
import type { SimplificationResult } from '../types/GeometricTypes';
import type { HealingOperation, IntersectionType } from '../types/BIMTypes';
import { WallSolidImpl } from '../geometry/WallSolid';
import { BIMPolygonImpl } from '../geometry/BIMPolygon';
import { BIMPointImpl } from '../geometry/BIMPoint';

/**
 * Configuration for geometry simplification operations
 */
export interface GeometrySimplificationConfig {
  rdpTolerance: number;
  angleThreshold: number; // In radians
  distanceThreshold: number;
  preserveArchitecturalFeatures: boolean;
  maxSimplificationIterations: number;
  minVerticesPerRing: number;
}

/**
 * Default configuration for geometry simplification
 */
const DEFAULT_SIMPLIFICATION_CONFIG: GeometrySimplificationConfig = {
  rdpTolerance: 1e-4,
  angleThreshold: Math.PI / 180, // 1 degree in radians
  distanceThreshold: 1e-5,
  preserveArchitecturalFeatures: true,
  maxSimplificationIterations: 5,
  minVerticesPerRing: 3
};

/**
 * Simplification operation result
 */
interface SimplificationOperationResult {
  success: boolean;
  simplifiedPoints: BIMPoint[];
  pointsRemoved: number;
  operationType: string;
}

/**
 * Geometry Simplification Engine interface
 */
export interface GeometrySimplificationEngine {
  simplifyWallGeometry(solid: WallSolid, thicknessBasedTolerance: number): SimplificationResult;
  eliminateCollinearPoints(curve: BIMPoint[], angleTolerance: number): BIMPoint[];
  removeRedundantVertices(polygon: BIMPolygon, distanceTolerance: number): BIMPolygon;
  optimizeComplexJunctions(solid: WallSolid, simplificationLevel: number): WallSolid;
  rdpSimplify(points: BIMPoint[], tolerance: number): BIMPoint[];
}

/**
 * Implementation of the Geometry Simplification Engine
 */
export class GeometrySimplificationEngineImpl implements GeometrySimplificationEngine {
  private config: GeometrySimplificationConfig;

  constructor(config: Partial<GeometrySimplificationConfig> = {}) {
    this.config = { ...DEFAULT_SIMPLIFICATION_CONFIG, ...config };
  }

  /**
   * Simplify wall geometry using RDP-style algorithm with thickness-based tolerance
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  simplifyWallGeometry(solid: WallSolid, thicknessBasedTolerance: number): SimplificationResult {
    const startTime = performance.now();
    let totalPointsRemoved = 0;
    let complexityReduction = 0;
    let accuracyPreserved = true;

    try {
      const originalComplexity = this.calculateComplexity(solid);
      const simplifiedGeometry: BIMPolygon[] = [];

      // Calculate adaptive tolerance based on wall thickness
      const adaptiveTolerance = Math.max(
        thicknessBasedTolerance,
        solid.thickness * 0.01 // 1% of wall thickness
      );

      for (const polygon of solid.solidGeometry) {
        // Simplify outer ring
        const simplifiedOuterRing = this.simplifyPolygonRing(
          polygon.outerRing,
          adaptiveTolerance
        );
        
        if (simplifiedOuterRing.pointsRemoved > 0) {
          totalPointsRemoved += simplifiedOuterRing.pointsRemoved;
        }

        // Simplify holes
        const simplifiedHoles: BIMPoint[][] = [];
        for (const hole of polygon.holes) {
          const simplifiedHole = this.simplifyPolygonRing(hole, adaptiveTolerance);
          
          if (simplifiedHole.pointsRemoved > 0) {
            totalPointsRemoved += simplifiedHole.pointsRemoved;
          }

          // Only keep holes with sufficient vertices
          if (simplifiedHole.simplifiedPoints.length >= this.config.minVerticesPerRing) {
            simplifiedHoles.push(simplifiedHole.simplifiedPoints);
          }
        }

        // Create simplified polygon if it has sufficient vertices
        if (simplifiedOuterRing.simplifiedPoints.length >= this.config.minVerticesPerRing) {
          const simplifiedPolygon = new BIMPolygonImpl(
            simplifiedOuterRing.simplifiedPoints,
            simplifiedHoles,
            {
              id: polygon.id,
              creationMethod: polygon.creationMethod,
              healingApplied: polygon.healingApplied,
              simplificationApplied: true
            }
          );

          simplifiedGeometry.push(simplifiedPolygon);
        } else {
          // If simplification would make polygon invalid, keep original
          simplifiedGeometry.push(polygon);
          accuracyPreserved = false;
        }
      }

      // Create simplified wall solid
      const simplifiedSolid = solid instanceof WallSolidImpl 
        ? solid.withUpdates({ solidGeometry: simplifiedGeometry })
        : new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
            id: solid.id,
            leftOffset: solid.leftOffset,
            rightOffset: solid.rightOffset,
            solidGeometry: simplifiedGeometry,
            intersectionData: solid.intersectionData,
            healingHistory: solid.healingHistory,
            geometricQuality: solid.geometricQuality,
            processingTime: solid.processingTime
          });

      // Calculate complexity reduction
      const newComplexity = this.calculateComplexity(simplifiedSolid);
      complexityReduction = ((originalComplexity - newComplexity) / originalComplexity) * 100;

      // Record simplification operation in history
      const simplificationOperation: HealingOperation = {
        id: this.generateOperationId(),
        type: 'geometry_simplification',
        timestamp: new Date(),
        success: true,
        details: `Simplified geometry: removed ${totalPointsRemoved} points, ${complexityReduction.toFixed(2)}% complexity reduction`
      };

      if (simplifiedSolid instanceof WallSolidImpl) {
        simplifiedSolid.addHealingOperation(simplificationOperation);
      }

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        simplifiedSolid,
        pointsRemoved: totalPointsRemoved,
        complexityReduction,
        accuracyPreserved,
        processingTime
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        success: false,
        simplifiedSolid: solid,
        pointsRemoved: totalPointsRemoved,
        complexityReduction,
        accuracyPreserved: false,
        processingTime
      };
    }
  }

  /**
   * Eliminate collinear points with angle threshold calculations
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  eliminateCollinearPoints(curve: BIMPoint[], angleTolerance: number): BIMPoint[] {
    if (curve.length <= 2) return [...curve];

    const simplified: BIMPoint[] = [curve[0]];
    
    for (let i = 1; i < curve.length - 1; i++) {
      const prev = curve[i - 1];
      const current = curve[i];
      const next = curve[i + 1];

      // Calculate vectors
      const v1 = {
        x: current.x - prev.x,
        y: current.y - prev.y
      };
      
      const v2 = {
        x: next.x - current.x,
        y: next.y - current.y
      };

      // Calculate angle between vectors
      const angle = this.calculateAngleBetweenVectors(v1, v2);
      
      // Keep point if angle is significant (not collinear)
      if (Math.abs(angle) > angleTolerance) {
        simplified.push(current);
      }
    }

    // Always keep the last point
    simplified.push(curve[curve.length - 1]);

    return simplified;
  }

  /**
   * Remove redundant vertices with distance-based filtering
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  removeRedundantVertices(polygon: BIMPolygon, distanceTolerance: number): BIMPolygon {
    // Remove redundant vertices from outer ring
    const filteredOuterRing = this.filterRedundantVertices(
      polygon.outerRing,
      distanceTolerance
    );

    // Remove redundant vertices from holes
    const filteredHoles: BIMPoint[][] = [];
    for (const hole of polygon.holes) {
      const filteredHole = this.filterRedundantVertices(hole, distanceTolerance);
      
      // Only keep holes with sufficient vertices
      if (filteredHole.length >= this.config.minVerticesPerRing) {
        filteredHoles.push(filteredHole);
      }
    }

    // Create new polygon with filtered vertices
    return new BIMPolygonImpl(
      filteredOuterRing,
      filteredHoles,
      {
        id: polygon.id,
        creationMethod: polygon.creationMethod,
        healingApplied: polygon.healingApplied,
        simplificationApplied: true
      }
    );
  }

  /**
   * Optimize complex junctions for intersection simplification
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  optimizeComplexJunctions(solid: WallSolid, simplificationLevel: number): WallSolid {
    try {
      // Calculate tolerance based on simplification level (0-1)
      const junctionTolerance = solid.thickness * simplificationLevel * 0.1;
      
      const optimizedGeometry: BIMPolygon[] = [];

      for (const polygon of solid.solidGeometry) {
        // Apply junction-specific simplification
        const optimizedPolygon = this.optimizePolygonJunctions(polygon, junctionTolerance);
        optimizedGeometry.push(optimizedPolygon);
      }

      // Update intersection data to reflect optimizations
      const optimizedIntersections = solid.intersectionData.map(intersection => ({
        ...intersection,
        resolutionMethod: `${intersection.resolutionMethod}_optimized`,
        geometricAccuracy: Math.max(0.8, intersection.geometricAccuracy - simplificationLevel * 0.1)
      }));

      // Create optimized wall solid
      const optimizedSolid = solid instanceof WallSolidImpl 
        ? solid.withUpdates({ 
            solidGeometry: optimizedGeometry,
            intersectionData: optimizedIntersections
          })
        : new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
            id: solid.id,
            leftOffset: solid.leftOffset,
            rightOffset: solid.rightOffset,
            solidGeometry: optimizedGeometry,
            intersectionData: optimizedIntersections,
            healingHistory: solid.healingHistory,
            geometricQuality: solid.geometricQuality,
            processingTime: solid.processingTime
          });

      return optimizedSolid;

    } catch (error) {
      // Return original solid if optimization fails
      return solid;
    }
  }

  /**
   * RDP (Ramer-Douglas-Peucker) simplification algorithm
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  rdpSimplify(points: BIMPoint[], tolerance: number): BIMPoint[] {
    if (points.length <= 2) return [...points];

    return this.rdpSimplifyRecursive(points, 0, points.length - 1, tolerance);
  }

  /**
   * Recursive RDP simplification
   */
  private rdpSimplifyRecursive(
    points: BIMPoint[],
    startIndex: number,
    endIndex: number,
    tolerance: number
  ): BIMPoint[] {
    if (endIndex <= startIndex + 1) {
      return [points[startIndex], points[endIndex]];
    }

    // Find the point with maximum distance from the line segment
    let maxDistance = 0;
    let maxIndex = startIndex;

    const startPoint = points[startIndex];
    const endPoint = points[endIndex];

    for (let i = startIndex + 1; i < endIndex; i++) {
      const distance = this.perpendicularDistance(points[i], startPoint, endPoint);
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If the maximum distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftSegment = this.rdpSimplifyRecursive(points, startIndex, maxIndex, tolerance);
      const rightSegment = this.rdpSimplifyRecursive(points, maxIndex, endIndex, tolerance);
      
      // Combine segments (remove duplicate point at junction)
      return [...leftSegment.slice(0, -1), ...rightSegment];
    } else {
      // All points between start and end are within tolerance, keep only endpoints
      return [points[startIndex], points[endIndex]];
    }
  }

  /**
   * Simplify a polygon ring (outer ring or hole)
   */
  private simplifyPolygonRing(
    ring: BIMPoint[],
    tolerance: number
  ): SimplificationOperationResult {
    const originalCount = ring.length;
    
    try {
      // Apply multiple simplification techniques
      let simplified = [...ring];

      // 1. RDP simplification
      simplified = this.rdpSimplify(simplified, tolerance);

      // 2. Eliminate collinear points
      simplified = this.eliminateCollinearPoints(simplified, this.config.angleThreshold);

      // 3. Remove redundant vertices
      simplified = this.filterRedundantVertices(simplified, this.config.distanceThreshold);

      const pointsRemoved = originalCount - simplified.length;

      return {
        success: true,
        simplifiedPoints: simplified,
        pointsRemoved,
        operationType: 'ring_simplification'
      };

    } catch (error) {
      return {
        success: false,
        simplifiedPoints: ring,
        pointsRemoved: 0,
        operationType: 'ring_simplification_failed'
      };
    }
  }

  /**
   * Filter redundant vertices based on distance
   */
  private filterRedundantVertices(vertices: BIMPoint[], tolerance: number): BIMPoint[] {
    if (vertices.length <= 1) return [...vertices];

    const filtered: BIMPoint[] = [vertices[0]];
    
    for (let i = 1; i < vertices.length; i++) {
      const current = vertices[i];
      const last = filtered[filtered.length - 1];
      
      // Keep vertex if it's far enough from the last kept vertex
      if (current.distanceTo(last) > tolerance) {
        filtered.push(current);
      }
    }

    // Ensure we have at least the minimum number of vertices
    if (filtered.length < this.config.minVerticesPerRing && vertices.length >= this.config.minVerticesPerRing) {
      // If filtering removed too many vertices, use original
      return vertices;
    }

    return filtered;
  }

  /**
   * Optimize polygon junctions
   */
  private optimizePolygonJunctions(polygon: BIMPolygon, tolerance: number): BIMPolygon {
    // This is a simplified implementation
    // In a real system, this would analyze junction geometry and optimize accordingly
    
    const optimizedOuterRing = this.smoothJunctionVertices(polygon.outerRing, tolerance);
    const optimizedHoles = polygon.holes.map(hole => 
      this.smoothJunctionVertices(hole, tolerance)
    );

    return new BIMPolygonImpl(
      optimizedOuterRing,
      optimizedHoles,
      {
        id: polygon.id,
        creationMethod: polygon.creationMethod,
        healingApplied: polygon.healingApplied,
        simplificationApplied: true
      }
    );
  }

  /**
   * Smooth vertices at junctions
   */
  private smoothJunctionVertices(vertices: BIMPoint[], tolerance: number): BIMPoint[] {
    if (vertices.length <= 2) return [...vertices];

    const smoothed: BIMPoint[] = [];
    
    for (let i = 0; i < vertices.length; i++) {
      const current = vertices[i];
      const prev = vertices[(i - 1 + vertices.length) % vertices.length];
      const next = vertices[(i + 1) % vertices.length];

      // Calculate angle at current vertex
      const v1 = { x: current.x - prev.x, y: current.y - prev.y };
      const v2 = { x: next.x - current.x, y: next.y - current.y };
      const angle = this.calculateAngleBetweenVectors(v1, v2);

      // If angle is very sharp, apply smoothing
      if (Math.abs(angle) > Math.PI * 0.8) { // Very sharp angle
        // Create smoothed point slightly offset from original
        const smoothedPoint = new BIMPointImpl(
          current.x + Math.random() * tolerance * 0.1 - tolerance * 0.05,
          current.y + Math.random() * tolerance * 0.1 - tolerance * 0.05,
          {
            creationMethod: 'junction_smoothing',
            tolerance: tolerance,
            accuracy: current.accuracy * 0.95
          }
        );
        smoothed.push(smoothedPoint);
      } else {
        smoothed.push(current);
      }
    }

    return smoothed;
  }

  /**
   * Calculate perpendicular distance from point to line segment
   */
  private perpendicularDistance(
    point: BIMPoint,
    lineStart: BIMPoint,
    lineEnd: BIMPoint
  ): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line segment is actually a point
      return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;

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

  /**
   * Calculate angle between two vectors
   */
  private calculateAngleBetweenVectors(
    v1: { x: number; y: number },
    v2: { x: number; y: number }
  ): number {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const cross = v1.x * v2.y - v1.y * v2.x;
    
    return Math.atan2(cross, dot);
  }

  /**
   * Calculate complexity of a wall solid
   */
  private calculateComplexity(solid: WallSolid): number {
    let complexity = 0;
    
    for (const polygon of solid.solidGeometry) {
      complexity += polygon.outerRing.length;
      complexity += polygon.holes.reduce((sum, hole) => sum + hole.length, 0);
    }
    
    complexity += solid.intersectionData.length * 2;
    
    return complexity;
  }

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    return `simplification_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GeometrySimplificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): GeometrySimplificationConfig {
    return { ...this.config };
  }
}