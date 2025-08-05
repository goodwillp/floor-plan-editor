import type { WallTypeString, Wall } from './types'
import { FloorPlanModel } from './FloorPlanModel'
import { WALL_THICKNESS } from './types'

/**
 * Service for editing wall properties
 * Requirements: 2.3, 2.4, 2.5
 */
export class WallEditingService {
  private model: FloorPlanModel

  constructor(model: FloorPlanModel) {
    this.model = model
  }

  /**
   * Update wall type and thickness
   * Requirements: 2.3, 2.4
   * 
   * @param wallId The ID of the wall to update
   * @param newType The new wall type
   * @returns Success status and updated wall
   */
  updateWallType(wallId: string, newType: WallTypeString): {success: boolean, wall?: Wall, error?: string} {
    const wall = this.model.getWall(wallId)
    if (!wall) {
      return {success: false, error: 'Wall not found'}
    }

    const success = this.model.updateWall(wallId, {type: newType})
    if (success) {
      const updatedWall = this.model.getWall(wallId)!
      return {success: true, wall: updatedWall}
    } else {
      return {success: false, error: 'Failed to update wall type'}
    }
  }

  /**
   * Update wall visibility
   * Requirements: 2.3, 2.4
   * 
   * @param wallId The ID of the wall to update
   * @param visible The new visibility state
   * @returns Success status and updated wall
   */
  updateWallVisibility(wallId: string, visible: boolean): {success: boolean, wall?: Wall, error?: string} {
    const wall = this.model.getWall(wallId)
    if (!wall) {
      return {success: false, error: 'Wall not found'}
    }

    const success = this.model.updateWall(wallId, {visible})
    if (success) {
      const updatedWall = this.model.getWall(wallId)!
      return {success: true, wall: updatedWall}
    } else {
      return {success: false, error: 'Failed to update wall visibility'}
    }
  }

  /**
   * Delete a wall with proper cleanup
   * Requirements: 2.5
   * 
   * @param wallId The ID of the wall to delete
   * @param deleteSegments Whether to delete the wall's segments (default: true)
   * @returns Deletion result with cleanup information
   */
  deleteWall(wallId: string, deleteSegments: boolean = true): {
    success: boolean,
    cleanedNodes: string[],
    affectedWalls: string[],
    error?: string
  } {
    const wall = this.model.getWall(wallId)
    if (!wall) {
      return {
        success: false,
        cleanedNodes: [],
        affectedWalls: [],
        error: 'Wall not found'
      }
    }

    // Track nodes that might be cleaned up
    const wallNodeIds = new Set<string>()
    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        wallNodeIds.add(segment.startNodeId)
        wallNodeIds.add(segment.endNodeId)
      }
    }

    // Find connected walls before deletion
    const affectedWalls = this.findConnectedWalls(wallId)

    // Delete the wall
    const success = this.model.deleteWall(wallId, deleteSegments)
    
    if (success) {
      // Check which nodes were actually cleaned up
      const cleanedNodes: string[] = []
      for (const nodeId of wallNodeIds) {
        if (!this.model.getNode(nodeId)) {
          cleanedNodes.push(nodeId)
        }
      }

      return {
        success: true,
        cleanedNodes,
        affectedWalls,
      }
    } else {
      return {
        success: false,
        cleanedNodes: [],
        affectedWalls: [],
        error: 'Failed to delete wall'
      }
    }
  }

  /**
   * Delete multiple walls
   * Requirements: 2.5
   * 
   * @param wallIds Array of wall IDs to delete
   * @param deleteSegments Whether to delete segments (default: true)
   * @returns Batch deletion results
   */
  deleteWalls(wallIds: string[], deleteSegments: boolean = true): {
    success: boolean,
    deletedWalls: string[],
    failedWalls: string[],
    cleanedNodes: string[],
    affectedWalls: string[],
    errors: string[]
  } {
    const deletedWalls: string[] = []
    const failedWalls: string[] = []
    const cleanedNodes = new Set<string>()
    const affectedWalls = new Set<string>()
    const errors: string[] = []

    for (const wallId of wallIds) {
      const result = this.deleteWall(wallId, deleteSegments)
      
      if (result.success) {
        deletedWalls.push(wallId)
        result.cleanedNodes.forEach(nodeId => cleanedNodes.add(nodeId))
        result.affectedWalls.forEach(wallId => affectedWalls.add(wallId))
      } else {
        failedWalls.push(wallId)
        if (result.error) {
          errors.push(`${wallId}: ${result.error}`)
        }
      }
    }

    return {
      success: failedWalls.length === 0,
      deletedWalls,
      failedWalls,
      cleanedNodes: Array.from(cleanedNodes),
      affectedWalls: Array.from(affectedWalls),
      errors
    }
  }

  /**
   * Get wall properties for editing
   * Requirements: 2.3
   * 
   * @param wallId The ID of the wall to get properties for
   * @returns Wall properties or null if not found
   */
  getWallProperties(wallId: string): {
    id: string,
    type: WallTypeString,
    thickness: number,
    visible: boolean,
    segmentCount: number,
    totalLength: number,
    nodeCount: number,
    createdAt: Date,
    updatedAt: Date
  } | null {
    const wall = this.model.getWall(wallId)
    if (!wall) return null

    // Calculate total length
    let totalLength = 0
    const nodeIds = new Set<string>()

    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        totalLength += segment.length
        nodeIds.add(segment.startNodeId)
        nodeIds.add(segment.endNodeId)
      }
    }

    return {
      id: wall.id,
      type: wall.type,
      thickness: wall.thickness,
      visible: wall.visible,
      segmentCount: wall.segmentIds.length,
      totalLength: Math.round(totalLength * 100) / 100, // Round to 2 decimal places
      nodeCount: nodeIds.size,
      createdAt: wall.createdAt,
      updatedAt: wall.updatedAt
    }
  }

  /**
   * Get properties for multiple walls
   * Requirements: 2.3
   * 
   * @param wallIds Array of wall IDs
   * @returns Array of wall properties
   */
  getMultipleWallProperties(wallIds: string[]): Array<ReturnType<typeof this.getWallProperties>> {
    return wallIds.map(wallId => this.getWallProperties(wallId)).filter(Boolean)
  }

  /**
   * Check if walls can be merged (same type and connected)
   * Requirements: 2.3
   * 
   * @param wallId1 First wall ID
   * @param wallId2 Second wall ID
   * @returns Whether walls can be merged and merge information
   */
  canMergeWalls(wallId1: string, wallId2: string): {
    canMerge: boolean,
    reason: string,
    sharedNodes?: string[]
  } {
    const wall1 = this.model.getWall(wallId1)
    const wall2 = this.model.getWall(wallId2)

    if (!wall1 || !wall2) {
      return {canMerge: false, reason: 'One or both walls not found'}
    }

    if (wall1.type !== wall2.type) {
      return {canMerge: false, reason: 'Walls have different types'}
    }

    // Find shared nodes
    const wall1Nodes = new Set<string>()
    const wall2Nodes = new Set<string>()

    for (const segmentId of wall1.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        wall1Nodes.add(segment.startNodeId)
        wall1Nodes.add(segment.endNodeId)
      }
    }

    for (const segmentId of wall2.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        wall2Nodes.add(segment.startNodeId)
        wall2Nodes.add(segment.endNodeId)
      }
    }

    const sharedNodes = Array.from(wall1Nodes).filter(nodeId => wall2Nodes.has(nodeId))

    if (sharedNodes.length === 0) {
      return {canMerge: false, reason: 'Walls are not connected'}
    }

    return {
      canMerge: true,
      reason: 'Walls can be merged',
      sharedNodes
    }
  }

  /**
   * Merge two walls into one
   * Requirements: 2.3
   * 
   * @param wallId1 First wall ID (will be kept)
   * @param wallId2 Second wall ID (will be deleted)
   * @returns Merge result
   */
  mergeWalls(wallId1: string, wallId2: string): {
    success: boolean,
    mergedWallId?: string,
    error?: string
  } {
    const mergeCheck = this.canMergeWalls(wallId1, wallId2)
    if (!mergeCheck.canMerge) {
      return {success: false, error: mergeCheck.reason}
    }

    const wall2 = this.model.getWall(wallId2)!

    // Add wall2's segments to wall1
    const success = this.model.addSegmentsToWall(wallId1, wall2.segmentIds)
    
    if (success) {
      // Delete wall2 without deleting its segments (they now belong to wall1)
      this.model.deleteWall(wallId2, false)
      
      return {
        success: true,
        mergedWallId: wallId1
      }
    } else {
      return {
        success: false,
        error: 'Failed to merge walls'
      }
    }
  }

  /**
   * Find walls connected to the given wall
   * Requirements: 2.5
   */
  private findConnectedWalls(wallId: string): string[] {
    const wall = this.model.getWall(wallId)
    if (!wall) return []

    const connectedWallIds = new Set<string>()
    const wallNodeIds = new Set<string>()

    // Collect all node IDs from this wall's segments
    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        wallNodeIds.add(segment.startNodeId)
        wallNodeIds.add(segment.endNodeId)
      }
    }

    // Find other walls that share these nodes
    const allWalls = this.model.getAllWalls()
    for (const otherWall of allWalls) {
      if (otherWall.id === wallId) continue

      for (const segmentId of otherWall.segmentIds) {
        const segment = this.model.getSegment(segmentId)
        if (segment) {
          if (wallNodeIds.has(segment.startNodeId) || wallNodeIds.has(segment.endNodeId)) {
            connectedWallIds.add(otherWall.id)
            break
          }
        }
      }
    }

    return Array.from(connectedWallIds)
  }

  /**
   * Validate wall state and fix issues
   * Requirements: 2.4
   * 
   * @param wallId The ID of the wall to validate
   * @returns Validation result and fixes applied
   */
  validateAndFixWall(wallId: string): {
    isValid: boolean,
    issues: string[],
    fixesApplied: string[]
  } {
    const wall = this.model.getWall(wallId)
    if (!wall) {
      return {
        isValid: false,
        issues: ['Wall not found'],
        fixesApplied: []
      }
    }

    const issues: string[] = []
    const fixesApplied: string[] = []

    // Check if all segments exist
    const validSegmentIds: string[] = []
    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        validSegmentIds.push(segmentId)
      } else {
        issues.push(`Segment ${segmentId} not found`)
      }
    }

    // Fix missing segments
    if (validSegmentIds.length !== wall.segmentIds.length) {
      wall.segmentIds = validSegmentIds
      wall.updatedAt = new Date()
      fixesApplied.push('Removed invalid segment references')
    }

    // Check if wall has any segments
    if (validSegmentIds.length === 0) {
      issues.push('Wall has no valid segments')
    }

    // Check thickness matches type
    const expectedThickness = WALL_THICKNESS[wall.type]
    if (wall.thickness !== expectedThickness) {
      issues.push(`Wall thickness (${wall.thickness}) doesn't match type (${wall.type}: ${expectedThickness})`)
      wall.thickness = expectedThickness
      wall.updatedAt = new Date()
      fixesApplied.push('Fixed wall thickness to match type')
    }

    return {
      isValid: issues.length === 0,
      issues,
      fixesApplied
    }
  }
}