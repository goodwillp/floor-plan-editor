import { describe, it, expect, beforeEach } from 'vitest'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { WallEditingService } from '@/lib/WallEditingService'
import type { WallTypeString } from '@/lib/types'

describe('WallEditingService', () => {
  let model: FloorPlanModel
  let editingService: WallEditingService

  beforeEach(() => {
    model = new FloorPlanModel()
    editingService = new WallEditingService(model)
  })

  describe('Wall Type Updates', () => {
    it('should update wall type successfully', () => {
      // Create a layout wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      const result = editingService.updateWallType(wall.id, 'zone')

      expect(result.success).toBe(true)
      expect(result.wall?.type).toBe('zone')
      expect(result.wall?.thickness).toBe(250) // Zone wall thickness
    })

    it('should handle non-existent wall', () => {
      const result = editingService.updateWallType('nonexistent', 'area')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Wall not found')
    })

    it('should update wall thickness when type changes', () => {
      // Create an area wall (150mm)
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('area', [segment.id])

      // Change to layout wall (350mm)
      const result = editingService.updateWallType(wall.id, 'layout')

      expect(result.success).toBe(true)
      expect(result.wall?.thickness).toBe(350)
    })
  })

  describe('Wall Visibility Updates', () => {
    it('should update wall visibility successfully', () => {
      // Create a visible wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      const result = editingService.updateWallVisibility(wall.id, false)

      expect(result.success).toBe(true)
      expect(result.wall?.visible).toBe(false)
    })

    it('should handle non-existent wall for visibility update', () => {
      const result = editingService.updateWallVisibility('nonexistent', false)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Wall not found')
    })
  })

  describe('Wall Deletion', () => {
    it('should delete wall with segments successfully', () => {
      // Create a wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      const result = editingService.deleteWall(wall.id, true)

      expect(result.success).toBe(true)
      expect(result.cleanedNodes.length).toBeGreaterThan(0)
      expect(model.getWall(wall.id)).toBeUndefined()
      expect(model.getSegment(segment.id)).toBeUndefined()
    })

    it('should delete wall without segments', () => {
      // Create a wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      const result = editingService.deleteWall(wall.id, false)

      expect(result.success).toBe(true)
      expect(model.getWall(wall.id)).toBeUndefined()
      expect(model.getSegment(segment.id)).toBeDefined() // Segment still exists
    })

    it('should identify affected walls', () => {
      // Create connected walls
      const centerNode = model.createNode(50, 50)
      const node1 = model.createNode(0, 50)
      const node2 = model.createNode(100, 50)

      const segment1 = model.createSegment(node1.id, centerNode.id)!
      const segment2 = model.createSegment(centerNode.id, node2.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      const result = editingService.deleteWall(wall1.id, true)

      expect(result.success).toBe(true)
      expect(result.affectedWalls.length).toBeGreaterThan(0)
    })

    it('should handle non-existent wall deletion', () => {
      const result = editingService.deleteWall('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Wall not found')
    })
  })

  describe('Batch Wall Deletion', () => {
    it('should delete multiple walls successfully', () => {
      // Create multiple walls
      const walls = []
      for (let i = 0; i < 3; i++) {
        const node1 = model.createNode(i * 50, 0)
        const node2 = model.createNode((i + 1) * 50, 0)
        const segment = model.createSegment(node1.id, node2.id)!
        const wall = model.createWall('layout', [segment.id])
        walls.push(wall.id)
      }

      const result = editingService.deleteWalls(walls, true)

      expect(result.success).toBe(true)
      expect(result.deletedWalls).toHaveLength(3)
      expect(result.failedWalls).toHaveLength(0)
    })

    it('should handle mixed success/failure in batch deletion', () => {
      // Create one valid wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      const wallIds = [wall.id, 'nonexistent1', 'nonexistent2']
      const result = editingService.deleteWalls(wallIds, true)

      expect(result.success).toBe(false) // Not all succeeded
      expect(result.deletedWalls).toHaveLength(1)
      expect(result.failedWalls).toHaveLength(2)
      expect(result.errors).toHaveLength(2)
    })
  })

  describe('Wall Properties', () => {
    it('should get comprehensive wall properties', () => {
      // Create a multi-segment wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(50, 0)
      const node3 = model.createNode(50, 50)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node2.id, node3.id)!
      
      const wall = model.createWall('layout', [segment1.id, segment2.id])

      const properties = editingService.getWallProperties(wall.id)

      expect(properties).toBeTruthy()
      expect(properties!.id).toBe(wall.id)
      expect(properties!.type).toBe('layout')
      expect(properties!.thickness).toBe(350)
      expect(properties!.visible).toBe(true)
      expect(properties!.segmentCount).toBe(2)
      expect(properties!.totalLength).toBe(100) // 50 + 50
      expect(properties!.nodeCount).toBe(3) // Three unique nodes
    })

    it('should return null for non-existent wall properties', () => {
      const properties = editingService.getWallProperties('nonexistent')
      expect(properties).toBeNull()
    })

    it('should get properties for multiple walls', () => {
      // Create multiple walls
      const walls = []
      for (let i = 0; i < 3; i++) {
        const node1 = model.createNode(i * 50, 0)
        const node2 = model.createNode((i + 1) * 50, 0)
        const segment = model.createSegment(node1.id, node2.id)!
        const wall = model.createWall('layout', [segment.id])
        walls.push(wall.id)
      }

      const properties = editingService.getMultipleWallProperties(walls)

      expect(properties).toHaveLength(3)
      expect(properties.every(p => p !== null)).toBe(true)
    })
  })

  describe('Wall Merging', () => {
    it('should check if walls can be merged', () => {
      // Create two connected walls of the same type
      const centerNode = model.createNode(50, 0)
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)

      const segment1 = model.createSegment(node1.id, centerNode.id)!
      const segment2 = model.createSegment(centerNode.id, node2.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('layout', [segment2.id])

      const canMerge = editingService.canMergeWalls(wall1.id, wall2.id)

      expect(canMerge.canMerge).toBe(true)
      expect(canMerge.sharedNodes).toContain(centerNode.id)
    })

    it('should reject merging walls of different types', () => {
      // Create two connected walls of different types
      const centerNode = model.createNode(50, 0)
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)

      const segment1 = model.createSegment(node1.id, centerNode.id)!
      const segment2 = model.createSegment(centerNode.id, node2.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      const canMerge = editingService.canMergeWalls(wall1.id, wall2.id)

      expect(canMerge.canMerge).toBe(false)
      expect(canMerge.reason).toContain('different types')
    })

    it('should reject merging disconnected walls', () => {
      // Create two separate walls
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(50, 0)
      const node3 = model.createNode(100, 0)
      const node4 = model.createNode(150, 0)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('layout', [segment2.id])

      const canMerge = editingService.canMergeWalls(wall1.id, wall2.id)

      expect(canMerge.canMerge).toBe(false)
      expect(canMerge.reason).toContain('not connected')
    })

    it('should merge compatible walls successfully', () => {
      // Create two connected walls of the same type
      const centerNode = model.createNode(50, 0)
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)

      const segment1 = model.createSegment(node1.id, centerNode.id)!
      const segment2 = model.createSegment(centerNode.id, node2.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('layout', [segment2.id])

      const result = editingService.mergeWalls(wall1.id, wall2.id)

      expect(result.success).toBe(true)
      expect(result.mergedWallId).toBe(wall1.id)
      expect(model.getWall(wall2.id)).toBeUndefined() // Wall2 should be deleted
      
      const mergedWall = model.getWall(wall1.id)!
      expect(mergedWall.segmentIds).toHaveLength(2) // Should contain both segments
    })
  })

  describe('Wall Validation', () => {
    it('should validate and fix wall issues', () => {
      // Create a wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      // Manually corrupt the wall data
      wall.thickness = 999 // Invalid thickness for layout wall

      const result = editingService.validateAndFixWall(wall.id)

      expect(result.isValid).toBe(true) // Should be valid after fixes
      expect(result.fixesApplied.length).toBeGreaterThan(0)
      expect(wall.thickness).toBe(350) // Should be fixed to correct thickness
    })

    it('should identify walls with missing segments', () => {
      // Create a wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      // Manually delete the segment but leave it in wall's segment list
      model.deleteSegment(segment.id)

      const result = editingService.validateAndFixWall(wall.id)

      expect(result.fixesApplied.length).toBeGreaterThan(0)
      expect(result.fixesApplied[0]).toContain('invalid segment references')
    })

    it('should handle validation of non-existent walls', () => {
      const result = editingService.validateAndFixWall('nonexistent')

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Wall not found')
    })
  })

  describe('Error Handling', () => {
    it('should handle model errors gracefully', () => {
      // Try to update a wall that doesn't exist
      const result = editingService.updateWallType('nonexistent', 'layout')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should provide meaningful error messages', () => {
      const result = editingService.deleteWall('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Wall not found')
    })
  })
})