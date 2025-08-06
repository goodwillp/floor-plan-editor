import { describe, it, expect, beforeEach } from 'vitest'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { WallType } from '@/lib/types'

describe('FloorPlanModel - Comprehensive Tests', () => {
  let model: FloorPlanModel

  beforeEach(() => {
    model = new FloorPlanModel()
  })

  describe('Node Management', () => {
    it('should create nodes with unique IDs', () => {
      const node1 = model.createNode(100, 100)
      const node2 = model.createNode(200, 200)
      
      expect(node1.id).not.toBe(node2.id)
      expect(node1.x).toBe(100)
      expect(node1.y).toBe(100)
      expect(node2.x).toBe(200)
      expect(node2.y).toBe(200)
    })

    it('should track connected segments for nodes', () => {
      const node1 = model.createNode(100, 100)
      const node2 = model.createNode(200, 100)
      const node3 = model.createNode(300, 100)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node2.id, node3.id)
      
      const updatedNode2 = model.getNode(node2.id)!
      expect(updatedNode2.connectedSegments).toContain(segment1.id)
      expect(updatedNode2.connectedSegments).toContain(segment2.id)
      expect(updatedNode2.connectedSegments).toHaveLength(2)
    })

    it('should delete nodes and update connected segments', () => {
      const node1 = model.createNode(100, 100)
      const node2 = model.createNode(200, 100)
      const segment = model.createSegment(node1.id, node2.id)
      
      model.deleteNode(node1.id)
      
      expect(model.getNode(node1.id)).toBeUndefined()
      expect(model.getSegment(segment.id)).toBeUndefined()
    })

    it('should find nodes by position with tolerance', () => {
      const node = model.createNode(100, 100)
      
      const found = model.findNodeAt(102, 98, 5)
      expect(found).toBe(node)
      
      const notFound = model.findNodeAt(110, 110, 5)
      expect(notFound).toBeUndefined()
    })
  })

  describe('Segment Management', () => {
    it('should create segments with calculated length and angle', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      
      const segment = model.createSegment(node1.id, node2.id)
      
      expect(segment.length).toBe(100)
      expect(segment.angle).toBe(0)
    })

    it('should calculate correct angles for different orientations', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(0, 100) // Vertical up
      const node3 = model.createNode(100, 100) // Diagonal
      
      const verticalSegment = model.createSegment(node1.id, node2.id)
      const diagonalSegment = model.createSegment(node1.id, node3.id)
      
      expect(verticalSegment.angle).toBe(Math.PI / 2) // 90 degrees
      expect(diagonalSegment.angle).toBe(Math.PI / 4) // 45 degrees
    })

    it('should update segment properties when nodes move', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)
      
      // Move node2
      model.updateNode(node2.id, { x: 200, y: 0 })
      
      const updatedSegment = model.getSegment(segment.id)!
      expect(updatedSegment.length).toBe(200)
    })

    it('should subdivide segments at intersection points', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(200, 0)
      const segment = model.createSegment(node1.id, node2.id)
      
      const newSegments = model.subdivideSegment(segment.id, { x: 100, y: 0 })
      
      expect(newSegments).toHaveLength(2)
      expect(model.getSegment(segment.id)).toBeUndefined() // Original should be deleted
      
      const segment1 = newSegments[0]
      const segment2 = newSegments[1]
      
      expect(segment1.length).toBe(100)
      expect(segment2.length).toBe(100)
    })
  })

  describe('Wall Management', () => {
    it('should create walls with correct thickness based on type', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)
      
      const layoutWall = model.createWall(WallType.LAYOUT, [segment.id])
      const zoneWall = model.createWall(WallType.ZONE, [segment.id])
      const areaWall = model.createWall(WallType.AREA, [segment.id])
      
      expect(layoutWall.thickness).toBe(350)
      expect(zoneWall.thickness).toBe(250)
      expect(areaWall.thickness).toBe(150)
    })

    it('should handle multi-segment walls', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(100, 100)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node2.id, node3.id)
      
      const wall = model.createWall(WallType.LAYOUT, [segment1.id, segment2.id])
      
      expect(wall.segmentIds).toContain(segment1.id)
      expect(wall.segmentIds).toContain(segment2.id)
      expect(wall.segmentIds).toHaveLength(2)
    })

    it('should delete walls and clean up orphaned nodes', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(200, 0)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node2.id, node3.id)
      
      const wall1 = model.createWall(WallType.LAYOUT, [segment1.id])
      const wall2 = model.createWall(WallType.ZONE, [segment2.id])
      
      model.deleteWall(wall1.id)
      
      expect(model.getWall(wall1.id)).toBeUndefined()
      expect(model.getSegment(segment1.id)).toBeUndefined()
      
      // Node2 should still exist because it's connected to segment2
      expect(model.getNode(node2.id)).toBeDefined()
      
      // Node1 should be deleted as it's orphaned
      expect(model.getNode(node1.id)).toBeUndefined()
    })

    it('should update wall properties', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)
      const wall = model.createWall(WallType.LAYOUT, [segment.id])
      
      model.updateWall(wall.id, { type: WallType.ZONE })
      
      const updatedWall = model.getWall(wall.id)!
      expect(updatedWall.type).toBe(WallType.ZONE)
      expect(updatedWall.thickness).toBe(250)
    })
  })

  describe('Intersection Processing', () => {
    it('should detect and process intersections between segments', () => {
      // Create two intersecting segments
      const node1 = model.createNode(0, 100)
      const node2 = model.createNode(200, 100)
      const node3 = model.createNode(100, 0)
      const node4 = model.createNode(100, 200)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node3.id, node4.id)
      
      const wall1 = model.createWall(WallType.LAYOUT, [segment1.id])
      const wall2 = model.createWall(WallType.ZONE, [segment2.id])
      
      const intersections = model.processIntersections()
      
      expect(intersections).toHaveLength(1)
      expect(intersections[0].point).toEqual({ x: 100, y: 100 })
      
      // Original segments should be subdivided
      expect(model.getSegment(segment1.id)).toBeUndefined()
      expect(model.getSegment(segment2.id)).toBeUndefined()
      
      // New segments should be created
      const allSegments = model.getAllSegments()
      expect(allSegments).toHaveLength(4) // 2 segments subdivided into 4
    })

    it('should handle multiple intersections on the same segment', () => {
      // Create one horizontal segment and two vertical segments intersecting it
      const node1 = model.createNode(0, 100)
      const node2 = model.createNode(300, 100)
      
      const node3 = model.createNode(100, 0)
      const node4 = model.createNode(100, 200)
      
      const node5 = model.createNode(200, 0)
      const node6 = model.createNode(200, 200)
      
      const horizontalSegment = model.createSegment(node1.id, node2.id)
      const vertical1 = model.createSegment(node3.id, node4.id)
      const vertical2 = model.createSegment(node5.id, node6.id)
      
      model.createWall(WallType.LAYOUT, [horizontalSegment.id])
      model.createWall(WallType.ZONE, [vertical1.id])
      model.createWall(WallType.AREA, [vertical2.id])
      
      const intersections = model.processIntersections()
      
      expect(intersections).toHaveLength(2)
      
      // Horizontal segment should be subdivided into 3 parts
      const allSegments = model.getAllSegments()
      const horizontalSegments = allSegments.filter(s => {
        const startNode = model.getNode(s.startNodeId)!
        const endNode = model.getNode(s.endNodeId)!
        return startNode.y === 100 && endNode.y === 100
      })
      
      expect(horizontalSegments).toHaveLength(3)
    })
  })

  describe('Node Cleanup', () => {
    it('should merge colinear segments when middle node is removed', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(200, 0)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node2.id, node3.id)
      
      model.createWall(WallType.LAYOUT, [segment1.id])
      model.createWall(WallType.LAYOUT, [segment2.id])
      
      const cleanupResult = model.performNodeCleanup(node2.id)
      
      expect(cleanupResult.merged).toBe(true)
      expect(model.getNode(node2.id)).toBeUndefined()
      expect(model.getSegment(segment1.id)).toBeUndefined()
      expect(model.getSegment(segment2.id)).toBeUndefined()
      
      // Should have one merged segment
      const remainingSegments = model.getAllSegments()
      expect(remainingSegments).toHaveLength(1)
      expect(remainingSegments[0].length).toBe(200)
    })

    it('should not merge non-colinear segments', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(100, 100)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node2.id, node3.id)
      
      model.createWall(WallType.LAYOUT, [segment1.id])
      model.createWall(WallType.LAYOUT, [segment2.id])
      
      const cleanupResult = model.performNodeCleanup(node2.id)
      
      expect(cleanupResult.merged).toBe(false)
      expect(model.getNode(node2.id)).toBeDefined()
      expect(model.getSegment(segment1.id)).toBeDefined()
      expect(model.getSegment(segment2.id)).toBeDefined()
    })
  })

  describe('Data Integrity', () => {
    it('should maintain referential integrity when deleting elements', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)
      const wall = model.createWall(WallType.LAYOUT, [segment.id])
      
      // Delete wall should clean up segment and orphaned nodes
      model.deleteWall(wall.id)
      
      expect(model.getWall(wall.id)).toBeUndefined()
      expect(model.getSegment(segment.id)).toBeUndefined()
      expect(model.getNode(node1.id)).toBeUndefined()
      expect(model.getNode(node2.id)).toBeUndefined()
    })

    it('should validate segment references in walls', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)
      
      // Try to create wall with non-existent segment
      expect(() => {
        model.createWall(WallType.LAYOUT, [segment.id, 'non-existent-id'])
      }).toThrow()
    })

    it('should validate node references in segments', () => {
      const node1 = model.createNode(0, 0)
      
      // Try to create segment with non-existent node
      expect(() => {
        model.createSegment(node1.id, 'non-existent-id')
      }).toThrow()
    })
  })

  describe('Statistics and Queries', () => {
    it('should provide accurate statistics', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(200, 0)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node2.id, node3.id)
      
      const wall1 = model.createWall(WallType.LAYOUT, [segment1.id])
      const wall2 = model.createWall(WallType.ZONE, [segment2.id])
      
      const stats = model.getStatistics()
      
      expect(stats.nodeCount).toBe(3)
      expect(stats.segmentCount).toBe(2)
      expect(stats.wallCount).toBe(2)
      expect(stats.wallsByType.layout).toBe(1)
      expect(stats.wallsByType.zone).toBe(1)
      expect(stats.wallsByType.area).toBe(0)
    })

    it('should find walls by type', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(200, 0)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node2.id, node3.id)
      
      const layoutWall = model.createWall(WallType.LAYOUT, [segment1.id])
      const zoneWall = model.createWall(WallType.ZONE, [segment2.id])
      
      const layoutWalls = model.getWallsByType(WallType.LAYOUT)
      const zoneWalls = model.getWallsByType(WallType.ZONE)
      const areaWalls = model.getWallsByType(WallType.AREA)
      
      expect(layoutWalls).toHaveLength(1)
      expect(layoutWalls[0]).toBe(layoutWall)
      expect(zoneWalls).toHaveLength(1)
      expect(zoneWalls[0]).toBe(zoneWall)
      expect(areaWalls).toHaveLength(0)
    })

    it('should find segments by wall', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(100, 100)
      
      const segment1 = model.createSegment(node1.id, node2.id)
      const segment2 = model.createSegment(node2.id, node3.id)
      
      const wall = model.createWall(WallType.LAYOUT, [segment1.id, segment2.id])
      
      const segments = model.getSegmentsByWall(wall.id)
      
      expect(segments).toHaveLength(2)
      expect(segments.map(s => s.id)).toContain(segment1.id)
      expect(segments.map(s => s.id)).toContain(segment2.id)
    })
  })
})