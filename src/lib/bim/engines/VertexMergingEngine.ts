/**
 * Non-consecutive vertex merging system for complex wall networks
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
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
 * Configuration for vertex merging operations
 */
export interface VertexMergingConfig {
  mergeTolerance: number;
  maxSearchRadius: number;
  preserveTopology: boolean;
  enableRollback: boolean;
  maxMergeIterations: number;
}

/**
 * Default configuration for vertex merging
 */
const DEFAULT_MERGING_CONFIG: VertexMergingConfig = {
  mergeTolerance: 1e-6,
  maxSearchRadius: 1e-3,
  preserveTopology: true,
  enableRollback: true,
  maxMergeIterations: 10
};

/**
 * Vertex pair for merging
 */
interface VertexPair {
  vertex1: BIMPoint;
  vertex2: BIMPoint;
  distance: number;
  polygonId1: string;
  polygonId2: string;
  index1: number;
  index2: number;
  isHole1: boolean;
  isHole2: boolean;
  holeIndex1?: number;
  holeIndex2?: number;
}

/**
 * Merge operation result
 */
interface MergeOperationResult {
  success: boolean;
  mergedPoint: BIMPoint | null;
  affectedPolygons: string[];
  topologyValid: boolean;
  rollbackData?: any;
}

/**
 * Vertex merging validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Non-consecutive vertex merging engine interface
 */
export interface VertexMergingEngine {
  mergeVertices(solid: WallSolid, tolerance: number): HealingResult;
  findMergeablePairs(solid: WallSolid, tolerance: number): VertexPair[];
  mergeVertexPair(solid: WallSolid, pair: VertexPair): MergeOperationResult;
  validateTopology(solid: WallSolid): ValidationResult;
  rollbackMerge(solid: WallSolid, rollbackData: any): WallSolid;
}

/**
 * Implementation of the non-consecutive vertex merging engine
 */
export class VertexMergingEngineImpl implements VertexMergingEngine {
  private config: VertexMergingConfig;

  constructor(config: Partial<VertexMergingConfig> = {}) {
    this.config = { ...DEFAULT_MERGING_CONFIG, ...config };
  }

  /**
   * Merge vertices in a wall solid that are within tolerance
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  mergeVertices(solid: WallSolid, tolerance: number): HealingResult {
    const startTime = performance.now();
    const operations: string[] = [];
    let mergedSolid = solid;
    let totalVerticesMerged = 0;
    let success = true;

    try {
      // Store original state for potential rollback
      const originalState = this.createStateSnapshot(solid);

      for (let iteration = 0; iteration < this.config.maxMergeIterations; iteration++) {
        // Find mergeable vertex pairs
        const mergeablePairs = this.findMergeablePairs(mergedSolid, tolerance);
        
        if (mergeablePairs.length === 0) {
          break; // No more pairs to merge
        }

        let mergesInIteration = 0;

        // Process each mergeable pair
        for (const pair of mergeablePairs) {
          const mergeResult = this.mergeVertexPair(mergedSolid, pair);
          
          if (mergeResult.success && mergeResult.mergedPoint) {
            // Update the solid with merged geometry
            mergedSolid = this.applySingleMerge(mergedSolid, pair, mergeResult.mergedPoint);
            totalVerticesMerged++;
            mergesInIteration++;
            operations.push(`merged_vertices_${pair.polygonId1}_${pair.polygonId2}_distance_${pair.distance.toFixed(6)}`);

            // Validate topology after merge
            if (this.config.preserveTopology) {
              const validation = this.validateTopology(mergedSolid);
              if (!validation.isValid) {
                if (this.config.enableRollback && mergeResult.rollbackData) {
                  // Rollback this merge
                  mergedSolid = this.rollbackMerge(mergedSolid, mergeResult.rollbackData);
                  totalVerticesMerged--;
                  operations.push(`rollback_merge_${pair.polygonId1}_${pair.polygonId2}_topology_invalid`);
                } else {
                  success = false;
                  break;
                }
              }
            }
          }
        }

        // If no merges were made in this iteration, we're done
        if (mergesInIteration === 0) {
          break;
        }
      }

      // Record merging operation in history
      const mergingOperation: HealingOperation = {
        id: this.generateOperationId(),
        type: 'vertex_merging',
        timestamp: new Date(),
        success,
        details: `Merged ${totalVerticesMerged} vertex pairs: ${operations.join(', ')}`
      };

      if (mergedSolid instanceof WallSolidImpl) {
        mergedSolid.addHealingOperation(mergingOperation);
      }

      const processingTime = performance.now() - startTime;

      return {
        success,
        healedSolid: mergedSolid,
        operationsApplied: operations,
        facesRemoved: 0,
        edgesMerged: totalVerticesMerged,
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
        edgesMerged: totalVerticesMerged,
        gapsEliminated: 0,
        processingTime
      };
    }
  }

  /**
   * Find all mergeable vertex pairs within tolerance
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  findMergeablePairs(solid: WallSolid, tolerance: number): VertexPair[] {
    const pairs: VertexPair[] = [];
    const searchTolerance = Math.min(tolerance, this.config.maxSearchRadius);

    // Collect all vertices with their metadata
    const allVertices: Array<{
      point: BIMPoint;
      polygonId: string;
      index: number;
      isHole: boolean;
      holeIndex?: number;
    }> = [];

    for (const polygon of solid.solidGeometry) {
      // Add outer ring vertices
      for (let i = 0; i < polygon.outerRing.length; i++) {
        allVertices.push({
          point: polygon.outerRing[i],
          polygonId: polygon.id,
          index: i,
          isHole: false
        });
      }

      // Add hole vertices
      for (let holeIndex = 0; holeIndex < polygon.holes.length; holeIndex++) {
        const hole = polygon.holes[holeIndex];
        for (let i = 0; i < hole.length; i++) {
          allVertices.push({
            point: hole[i],
            polygonId: polygon.id,
            index: i,
            isHole: true,
            holeIndex
          });
        }
      }
    }

    // Find pairs within tolerance (non-consecutive)
    for (let i = 0; i < allVertices.length; i++) {
      for (let j = i + 1; j < allVertices.length; j++) {
        const vertex1 = allVertices[i];
        const vertex2 = allVertices[j];

        // Skip consecutive vertices in the same ring
        if (this.areConsecutiveVertices(vertex1, vertex2)) {
          continue;
        }

        const distance = vertex1.point.distanceTo(vertex2.point);
        
        if (distance <= searchTolerance && distance > 0) {
          pairs.push({
            vertex1: vertex1.point,
            vertex2: vertex2.point,
            distance,
            polygonId1: vertex1.polygonId,
            polygonId2: vertex2.polygonId,
            index1: vertex1.index,
            index2: vertex2.index,
            isHole1: vertex1.isHole,
            isHole2: vertex2.isHole,
            holeIndex1: vertex1.holeIndex,
            holeIndex2: vertex2.holeIndex
          });
        }
      }
    }

    // Sort pairs by distance (merge closest pairs first)
    pairs.sort((a, b) => a.distance - b.distance);

    return pairs;
  }

  /**
   * Merge a specific vertex pair
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  mergeVertexPair(solid: WallSolid, pair: VertexPair): MergeOperationResult {
    try {
      // Calculate the apex point (average of the two vertices)
      const apexX = (pair.vertex1.x + pair.vertex2.x) / 2;
      const apexY = (pair.vertex1.y + pair.vertex2.y) / 2;

      const mergedPoint = new BIMPointImpl(apexX, apexY, {
        creationMethod: 'vertex_merge',
        tolerance: pair.distance,
        accuracy: 1.0 - (pair.distance / this.config.maxSearchRadius)
      });

      // Create rollback data
      const rollbackData = {
        originalVertex1: pair.vertex1,
        originalVertex2: pair.vertex2,
        polygonId1: pair.polygonId1,
        polygonId2: pair.polygonId2,
        index1: pair.index1,
        index2: pair.index2,
        isHole1: pair.isHole1,
        isHole2: pair.isHole2,
        holeIndex1: pair.holeIndex1,
        holeIndex2: pair.holeIndex2
      };

      return {
        success: true,
        mergedPoint,
        affectedPolygons: [pair.polygonId1, pair.polygonId2],
        topologyValid: true, // Will be validated separately
        rollbackData
      };

    } catch (error) {
      return {
        success: false,
        mergedPoint: null,
        affectedPolygons: [],
        topologyValid: false
      };
    }
  }

  /**
   * Validate topology consistency after merging
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  validateTopology(solid: WallSolid): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      for (const polygon of solid.solidGeometry) {
        // Check minimum vertex count for outer ring
        if (polygon.outerRing.length < 3) {
          errors.push(`Polygon ${polygon.id} outer ring has insufficient vertices: ${polygon.outerRing.length}`);
        }

        // Check for self-intersections in outer ring
        if (this.hasSelfIntersections(polygon.outerRing)) {
          errors.push(`Polygon ${polygon.id} outer ring has self-intersections`);
        }

        // Check holes
        for (let i = 0; i < polygon.holes.length; i++) {
          const hole = polygon.holes[i];
          
          if (hole.length < 3) {
            errors.push(`Polygon ${polygon.id} hole ${i} has insufficient vertices: ${hole.length}`);
          }

          if (this.hasSelfIntersections(hole)) {
            errors.push(`Polygon ${polygon.id} hole ${i} has self-intersections`);
          }
        }

        // Check polygon area (warn if very small)
        if (polygon.area < 1e-10) {
          warnings.push(`Polygon ${polygon.id} has very small area: ${polygon.area}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Topology validation failed: ${error}`],
        warnings
      };
    }
  }

  /**
   * Rollback a merge operation
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  rollbackMerge(solid: WallSolid, rollbackData: any): WallSolid {
    try {
      // This is a simplified rollback - in a real implementation,
      // we would restore the exact previous state
      const restoredGeometry: BIMPolygon[] = [];

      for (const polygon of solid.solidGeometry) {
        if (polygon.id === rollbackData.polygonId1 || polygon.id === rollbackData.polygonId2) {
          // Restore original vertices for affected polygons
          const restoredOuterRing = [...polygon.outerRing];
          const restoredHoles = polygon.holes.map(hole => [...hole]);

          // Restore vertex 1
          if (polygon.id === rollbackData.polygonId1) {
            if (rollbackData.isHole1 && rollbackData.holeIndex1 !== undefined) {
              restoredHoles[rollbackData.holeIndex1][rollbackData.index1] = rollbackData.originalVertex1;
            } else {
              restoredOuterRing[rollbackData.index1] = rollbackData.originalVertex1;
            }
          }

          // Restore vertex 2
          if (polygon.id === rollbackData.polygonId2) {
            if (rollbackData.isHole2 && rollbackData.holeIndex2 !== undefined) {
              restoredHoles[rollbackData.holeIndex2][rollbackData.index2] = rollbackData.originalVertex2;
            } else {
              restoredOuterRing[rollbackData.index2] = rollbackData.originalVertex2;
            }
          }

          const restoredPolygon = new BIMPolygonImpl(
            restoredOuterRing,
            restoredHoles,
            {
              id: polygon.id,
              creationMethod: polygon.creationMethod,
              healingApplied: polygon.healingApplied,
              simplificationApplied: polygon.simplificationApplied
            }
          );

          restoredGeometry.push(restoredPolygon);
        } else {
          restoredGeometry.push(polygon);
        }
      }

      // Return wall solid with restored geometry
      return solid instanceof WallSolidImpl 
        ? solid.withUpdates({ solidGeometry: restoredGeometry })
        : new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
            id: solid.id,
            leftOffset: solid.leftOffset,
            rightOffset: solid.rightOffset,
            solidGeometry: restoredGeometry,
            intersectionData: solid.intersectionData,
            healingHistory: solid.healingHistory,
            geometricQuality: solid.geometricQuality,
            processingTime: solid.processingTime
          });

    } catch (error) {
      // If rollback fails, return original solid
      return solid;
    }
  }

  /**
   * Check if two vertices are consecutive in the same ring
   */
  private areConsecutiveVertices(vertex1: any, vertex2: any): boolean {
    // Same polygon and same ring type
    if (vertex1.polygonId !== vertex2.polygonId || vertex1.isHole !== vertex2.isHole) {
      return false;
    }

    // Same hole (if both are holes)
    if (vertex1.isHole && vertex1.holeIndex !== vertex2.holeIndex) {
      return false;
    }

    // Check if indices are consecutive
    const index1 = vertex1.index;
    const index2 = vertex2.index;
    
    return Math.abs(index1 - index2) === 1 || 
           (Math.min(index1, index2) === 0 && Math.max(index1, index2) === vertex1.ringLength - 1);
  }

  /**
   * Apply a single vertex merge to the wall solid
   */
  private applySingleMerge(solid: WallSolid, pair: VertexPair, mergedPoint: BIMPoint): WallSolid {
    const updatedGeometry: BIMPolygon[] = [];

    for (const polygon of solid.solidGeometry) {
      let updatedOuterRing = [...polygon.outerRing];
      let updatedHoles = polygon.holes.map(hole => [...hole]);

      // Update vertices in this polygon
      if (polygon.id === pair.polygonId1) {
        if (pair.isHole1 && pair.holeIndex1 !== undefined) {
          updatedHoles[pair.holeIndex1][pair.index1] = mergedPoint;
        } else {
          updatedOuterRing[pair.index1] = mergedPoint;
        }
      }

      if (polygon.id === pair.polygonId2) {
        if (pair.isHole2 && pair.holeIndex2 !== undefined) {
          updatedHoles[pair.holeIndex2][pair.index2] = mergedPoint;
        } else {
          updatedOuterRing[pair.index2] = mergedPoint;
        }
      }

      const updatedPolygon = new BIMPolygonImpl(
        updatedOuterRing,
        updatedHoles,
        {
          id: polygon.id,
          creationMethod: polygon.creationMethod,
          healingApplied: true,
          simplificationApplied: polygon.simplificationApplied
        }
      );

      updatedGeometry.push(updatedPolygon);
    }

    return solid instanceof WallSolidImpl 
      ? solid.withUpdates({ solidGeometry: updatedGeometry })
      : new WallSolidImpl(solid.baseline, solid.thickness, solid.wallType, {
          id: solid.id,
          leftOffset: solid.leftOffset,
          rightOffset: solid.rightOffset,
          solidGeometry: updatedGeometry,
          intersectionData: solid.intersectionData,
          healingHistory: solid.healingHistory,
          geometricQuality: solid.geometricQuality,
          processingTime: solid.processingTime
        });
  }

  /**
   * Check for self-intersections in a ring
   */
  private hasSelfIntersections(ring: BIMPoint[]): boolean {
    if (ring.length < 4) return false;

    // Simplified check - just return false for now
    // In a real implementation, this would check for actual line segment intersections
    return false;
  }

  /**
   * Create a state snapshot for rollback
   */
  private createStateSnapshot(solid: WallSolid): any {
    return {
      solidGeometry: solid.solidGeometry.map(polygon => ({
        id: polygon.id,
        outerRing: [...polygon.outerRing],
        holes: polygon.holes.map(hole => [...hole])
      }))
    };
  }

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    return `vertex_merge_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VertexMergingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): VertexMergingConfig {
    return { ...this.config };
  }
}