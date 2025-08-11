/**
 * Shape Healing Engine for removing sliver faces, duplicate edges, and micro-gaps
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import type { WallSolid } from '../geometry/WallSolid';
import type { BIMPolygon } from '../geometry/BIMPolygon';
import type { BIMPoint } from '../geometry/BIMPoint';
import type { HealingResult } from '../types/GeometricTypes';
import type { HealingOperation } from '../types/BIMTypes';
import { WallSolidImpl } from '../geometry/WallSolid';
import { BIMPolygonImpl } from '../geometry/BIMPolygon';
import { BIMPointImpl } from '../geometry/BIMPoint';

/**
 * Configuration for shape healing operations
 */
export interface ShapeHealingConfig {
  sliverFaceThreshold: number;
  duplicateEdgeTolerance: number;
  microGapThreshold: number;
  maxHealingIterations: number;
  preserveArchitecturalFeatures: boolean;
}

/**
 * Default configuration for shape healing
 */
const DEFAULT_HEALING_CONFIG: ShapeHealingConfig = {
  sliverFaceThreshold: 1e-3,
  duplicateEdgeTolerance: 1e-6,
  microGapThreshold: 1e-4,
  maxHealingIterations: 10,
  preserveArchitecturalFeatures: true
};

/**
 * Shape Healing Engine interface
 */
export interface ShapeHealingEngine {
  healShape(solid: WallSolid, tolerance: number): HealingResult;
  removeSliverFaces(solid: WallSolid, tolerance: number): HealingResult;
  mergeDuplicateEdges(solid: WallSolid, tolerance: number): HealingResult;
  eliminateMicroGaps(solid: WallSolid, tolerance: number): HealingResult;
}

/**
 * Implementation of the Shape Healing Engine
 */
export class ShapeHealingEngineImpl implements ShapeHealingEngine {
  private config: ShapeHealingConfig;

  constructor(config: Partial<ShapeHealingConfig> = {}) {
    this.config = { ...DEFAULT_HEALING_CONFIG, ...config };
  }

  /**
   * Apply comprehensive healing operations to a wall solid
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  healShape(solid: WallSolid, tolerance: number): HealingResult {
    const startTime = performance.now();
    const operations: string[] = [];
    let healedSolid = solid;
    let totalFacesRemoved = 0;
    let totalEdgesMerged = 0;
    let totalGapsEliminated = 0;
    let success = true;

    try {
      // Apply healing operations in sequence
      for (let iteration = 0; iteration < this.config.maxHealingIterations; iteration++) {
        let changesInIteration = false;

        // 1. Remove sliver faces
        const sliverResult = this.removeSliverFaces(healedSolid, tolerance);
        if (sliverResult.success && sliverResult.healedSolid) {
          healedSolid = sliverResult.healedSolid;
          totalFacesRemoved += sliverResult.facesRemoved;
          operations.push(...sliverResult.operationsApplied);
          if (sliverResult.facesRemoved > 0) changesInIteration = true;
        }

        // 2. Merge duplicate edges
        const edgeResult = this.mergeDuplicateEdges(healedSolid, tolerance);
        if (edgeResult.success && edgeResult.healedSolid) {
          healedSolid = edgeResult.healedSolid;
          totalEdgesMerged += edgeResult.edgesMerged;
          operations.push(...edgeResult.operationsApplied);
          if (edgeResult.edgesMerged > 0) changesInIteration = true;
        }

        // 3. Eliminate micro-gaps
        const gapResult = this.eliminateMicroGaps(healedSolid, tolerance);
        if (gapResult.success && gapResult.healedSolid) {
          healedSolid = gapResult.healedSolid;
          totalGapsEliminated += gapResult.gapsEliminated;
          operations.push(...gapResult.operationsApplied);
          if (gapResult.gapsEliminated > 0) changesInIteration = true;
        }

        // If no changes were made in this iteration, we're done
        if (!changesInIteration) {
          break;
        }
      }

      // Record healing operation in history
      const healingOperation: HealingOperation = {
        id: this.generateOperationId(),
        type: 'comprehensive_healing',
        timestamp: new Date(),
        success: true,
        details: `Applied ${operations.length} healing operations: ${operations.join(', ')}`
      };

      if (healedSolid instanceof WallSolidImpl) {
        healedSolid.addHealingOperation(healingOperation);
      }

      const processingTime = performance.now() - startTime;

      return {
        success,
        healedSolid,
        operationsApplied: operations,
        facesRemoved: totalFacesRemoved,
        edgesMerged: totalEdgesMerged,
        gapsEliminated: totalGapsEliminated,
        processingTime
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        success: false,
        healedSolid: null,
        operationsApplied: operations,
        facesRemoved: totalFacesRemoved,
        edgesMerged: totalEdgesMerged,
        gapsEliminated: totalGapsEliminated,
        processingTime
      };
    }
  }

  /**
   * Remove sliver faces from the wall solid
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  removeSliverFaces(solid: WallSolid, tolerance: number): HealingResult {
    const startTime = performance.now();
    const operations: string[] = [];
    let facesRemoved = 0;

    try {
      const healedGeometry: BIMPolygon[] = [];
      const sliverThreshold = Math.max(tolerance, this.config.sliverFaceThreshold);

      for (const polygon of solid.solidGeometry) {
        if (this.isSliverFace(polygon, sliverThreshold)) {
          facesRemoved++;
          operations.push(`removed_sliver_face_${polygon.id}`);
          // Skip this polygon (remove it)
          continue;
        }

        // Check and clean holes that might be slivers
        const cleanedHoles: BIMPoint[][] = [];
        for (const hole of polygon.holes) {
          const holePolygon = new BIMPolygonImpl(hole, [], {
            creationMethod: 'hole_validation'
          });
          
          if (!this.isSliverFace(holePolygon, sliverThreshold)) {
            cleanedHoles.push(hole);
          } else {
            facesRemoved++;
            operations.push(`removed_sliver_hole_${holePolygon.id}`);
          }
        }

        // Create cleaned polygon
        const cleanedPolygon = new BIMPolygonImpl(
          polygon.outerRing,
          cleanedHoles,
          {
            id: polygon.id,
            creationMethod: polygon.creationMethod,
            healingApplied: true,
            simplificationApplied: polygon.simplificationApplied
          }
        );

        healedGeometry.push(cleanedPolygon);
      }

      // Create healed wall solid
      const healedSolid = solid instanceof WallSolidImpl 
        ? solid.withUpdates({ solidGeometry: healedGeometry })
        : new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
            id: solid.id,
            leftOffset: solid.leftOffset,
            rightOffset: solid.rightOffset,
            solidGeometry: healedGeometry,
            intersectionData: solid.intersectionData,
            healingHistory: solid.healingHistory,
            geometricQuality: solid.geometricQuality,
            processingTime: solid.processingTime
          });

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        healedSolid,
        operationsApplied: operations,
        facesRemoved,
        edgesMerged: 0,
        gapsEliminated: 0,
        processingTime
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        success: false,
        healedSolid: null,
        operationsApplied: operations,
        facesRemoved,
        edgesMerged: 0,
        gapsEliminated: 0,
        processingTime
      };
    }
  }

  /**
   * Merge duplicate edges in the wall solid
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  mergeDuplicateEdges(solid: WallSolid, tolerance: number): HealingResult {
    const startTime = performance.now();
    const operations: string[] = [];
    let edgesMerged = 0;

    try {
      const healedGeometry: BIMPolygon[] = [];
      const edgeTolerance = Math.max(tolerance, this.config.duplicateEdgeTolerance);

      for (const polygon of solid.solidGeometry) {
        // Clean outer ring
        const cleanedOuterRing = this.removeDuplicateVertices(polygon.outerRing, edgeTolerance);
        if (cleanedOuterRing.length < polygon.outerRing.length) {
          const removed = polygon.outerRing.length - cleanedOuterRing.length;
          edgesMerged += removed;
          operations.push(`merged_${removed}_duplicate_vertices_outer_ring_${polygon.id}`);
        }

        // Clean holes
        const cleanedHoles: BIMPoint[][] = [];
        for (let i = 0; i < polygon.holes.length; i++) {
          const hole = polygon.holes[i];
          const cleanedHole = this.removeDuplicateVertices(hole, edgeTolerance);
          
          if (cleanedHole.length < hole.length) {
            const removed = hole.length - cleanedHole.length;
            edgesMerged += removed;
            operations.push(`merged_${removed}_duplicate_vertices_hole_${i}_${polygon.id}`);
          }
          
          if (cleanedHole.length >= 3) {
            cleanedHoles.push(cleanedHole);
          }
        }

        // Create cleaned polygon if it's still valid
        if (cleanedOuterRing.length >= 3) {
          const cleanedPolygon = new BIMPolygonImpl(
            cleanedOuterRing,
            cleanedHoles,
            {
              id: polygon.id,
              creationMethod: polygon.creationMethod,
              healingApplied: true,
              simplificationApplied: polygon.simplificationApplied
            }
          );

          healedGeometry.push(cleanedPolygon);
        }
      }

      // Create healed wall solid
      const healedSolid = solid instanceof WallSolidImpl 
        ? solid.withUpdates({ solidGeometry: healedGeometry })
        : new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
            id: solid.id,
            leftOffset: solid.leftOffset,
            rightOffset: solid.rightOffset,
            solidGeometry: healedGeometry,
            intersectionData: solid.intersectionData,
            healingHistory: solid.healingHistory,
            geometricQuality: solid.geometricQuality,
            processingTime: solid.processingTime
          });

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        healedSolid,
        operationsApplied: operations,
        facesRemoved: 0,
        edgesMerged,
        gapsEliminated: 0,
        processingTime
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        success: false,
        healedSolid: null,
        operationsApplied: operations,
        facesRemoved: 0,
        edgesMerged,
        gapsEliminated: 0,
        processingTime
      };
    }
  }

  /**
   * Eliminate micro-gaps in the wall solid
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  eliminateMicroGaps(solid: WallSolid, tolerance: number): HealingResult {
    const startTime = performance.now();
    const operations: string[] = [];
    let gapsEliminated = 0;

    try {
      const healedGeometry: BIMPolygon[] = [];
      const gapThreshold = Math.max(tolerance, this.config.microGapThreshold);

      for (const polygon of solid.solidGeometry) {
        // Close micro-gaps in outer ring
        const closedOuterRing = this.closeMicroGaps(polygon.outerRing, gapThreshold);
        if (closedOuterRing.gapsClosed > 0) {
          gapsEliminated += closedOuterRing.gapsClosed;
          operations.push(`closed_${closedOuterRing.gapsClosed}_micro_gaps_outer_ring_${polygon.id}`);
        }

        // Close micro-gaps in holes
        const closedHoles: BIMPoint[][] = [];
        for (let i = 0; i < polygon.holes.length; i++) {
          const hole = polygon.holes[i];
          const closedHole = this.closeMicroGaps(hole, gapThreshold);
          
          if (closedHole.gapsClosed > 0) {
            gapsEliminated += closedHole.gapsClosed;
            operations.push(`closed_${closedHole.gapsClosed}_micro_gaps_hole_${i}_${polygon.id}`);
          }
          
          closedHoles.push(closedHole.points);
        }

        // Create healed polygon
        const healedPolygon = new BIMPolygonImpl(
          closedOuterRing.points,
          closedHoles,
          {
            id: polygon.id,
            creationMethod: polygon.creationMethod,
            healingApplied: true,
            simplificationApplied: polygon.simplificationApplied
          }
        );

        healedGeometry.push(healedPolygon);
      }

      // Create healed wall solid
      const healedSolid = solid instanceof WallSolidImpl 
        ? solid.withUpdates({ solidGeometry: healedGeometry })
        : new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
            id: solid.id,
            leftOffset: solid.leftOffset,
            rightOffset: solid.rightOffset,
            solidGeometry: healedGeometry,
            intersectionData: solid.intersectionData,
            healingHistory: solid.healingHistory,
            geometricQuality: solid.geometricQuality,
            processingTime: solid.processingTime
          });

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        healedSolid,
        operationsApplied: operations,
        facesRemoved: 0,
        edgesMerged: 0,
        gapsEliminated,
        processingTime
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        success: false,
        healedSolid: null,
        operationsApplied: operations,
        facesRemoved: 0,
        edgesMerged: 0,
        gapsEliminated,
        processingTime
      };
    }
  }

  /**
   * Check if a polygon is a sliver face
   */
  private isSliverFace(polygon: BIMPolygon, threshold: number): boolean {
    // Check area-to-perimeter ratio
    if (polygon.area === 0 || polygon.perimeter === 0) {
      return true;
    }

    const aspectRatio = (4 * Math.PI * polygon.area) / (polygon.perimeter * polygon.perimeter);
    
    // Very thin polygons have low aspect ratios
    if (aspectRatio < threshold) {
      return true;
    }

    // Check for very small area
    if (polygon.area < threshold * threshold) {
      return true;
    }

    // Check for degenerate triangles (if it's a triangle)
    if (polygon.outerRing.length === 3) {
      const [p1, p2, p3] = polygon.outerRing;
      const area = Math.abs(
        (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
      ) / 2;
      
      if (area < threshold * threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Remove duplicate vertices from a point array
   */
  private removeDuplicateVertices(points: BIMPoint[], tolerance: number): BIMPoint[] {
    if (points.length <= 1) return [...points];

    const cleaned: BIMPoint[] = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const last = cleaned[cleaned.length - 1];
      
      if (current.distanceTo(last) > tolerance) {
        cleaned.push(current);
      }
    }

    // Check if the last point is too close to the first (for closed polygons)
    if (cleaned.length > 2) {
      const first = cleaned[0];
      const last = cleaned[cleaned.length - 1];
      
      if (first.distanceTo(last) <= tolerance) {
        cleaned.pop();
      }
    }

    return cleaned;
  }

  /**
   * Close micro-gaps in a point array
   */
  private closeMicroGaps(points: BIMPoint[], threshold: number): { points: BIMPoint[]; gapsClosed: number } {
    if (points.length <= 2) return { points: [...points], gapsClosed: 0 };

    const closed: BIMPoint[] = [];
    let gapsClosed = 0;

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      
      closed.push(current);
      
      // Check for micro-gap
      const distance = current.distanceTo(next);
      if (distance > 0 && distance <= threshold) {
        // Create intermediate point to close the gap
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        
        const midPoint = new BIMPointImpl(midX, midY, {
          creationMethod: 'micro_gap_closure',
          tolerance: threshold
        });
        
        closed.push(midPoint);
        gapsClosed++;
      }
    }

    return { points: closed, gapsClosed };
  }

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    return `healing_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ShapeHealingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ShapeHealingConfig {
    return { ...this.config };
  }
}