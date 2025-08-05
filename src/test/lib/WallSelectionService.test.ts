import { describe, it, expect, beforeEach } from 'vitest'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { WallSelectionService } from '@/lib/WallSelectionService'
import type { Point } from '@/lib/types'

describe('WallSelectionService', () => {
  let model: FloorPlanModel
  let selectionService: WallSelectionService

  beforeEach(() => {
    model = new FloorPlanModel()
    selectionService = new WallSelectionService(model)
  })

  describe('Wall Hit Detection', () => {
    it('should find wall at click point within tolerance', () => {
      // Create a horizontal wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      // Click near the wall (within tolerance)
      const clickPoint: Point = { x: 50, y: 5 } // 5 pixels away from wall
      const result = selectionService.findWallAtPoint(clickPoint)

      expect(result).toBeTruthy()
      expect(result!.wallId).toBe(wall.id)
      expect(result!.distance).toBeLessThan(10) // Default tolerance
    })

    it('should not find wall outside tolerance', () => {
      // Create a horizontal wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      model.createWall('layout', [segment.id])

      // Click far from the wall (outside tolerance)
      const clickPoint: Point = { x: 50, y: 50 } // 50 pixels away from wall
      const result = selectionService.findWallAtPoint(clickPoint)

      expect(result).toBeNull()
    })

    it('should find closest wall when multiple walls are within tolerance', () => {
      // Create two parallel walls
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 20)
      const node4 = model.createNode(100, 20)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!
      
      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      // Click closer to first wall
      const clickPoint: Point = { x: 50, y: 5 }
      const result = selectionService.findWallAtPoint(clickPoint)

      expect(result).toBeTruthy()
      expect(result!.wallId).toBe(wall1.id)
      expect(result!.distance).toBeLessThan(10)
    })

    it('should ignore invisible walls', () => {
      // Create a wall and make it invisible
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])
      
      model.updateWall(wall.id, { visible: false })

      // Click on the invisible wall
      const clickPoint: Point = { x: 50, y: 0 }
      const result = selectionService.findWallAtPoint(clickPoint)

      expect(result).toBeNull()
    })

    it('should handle multi-segment walls correctly', () => {
      // Create an L-shaped wall with two segments
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(50, 0)
      const node3 = model.createNode(50, 50)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node2.id, node3.id)!
      
      const wall = model.createWall('layout', [segment1.id, segment2.id])

      // Click near the first segment
      const clickPoint1: Point = { x: 25, y: 5 }
      const result1 = selectionService.findWallAtPoint(clickPoint1)
      expect(result1?.wallId).toBe(wall.id)

      // Click near the second segment
      const clickPoint2: Point = { x: 55, y: 25 }
      const result2 = selectionService.findWallAtPoint(clickPoint2)
      expect(result2?.wallId).toBe(wall.id)
    })
  })

  describe('Area Selection', () => {
    it('should find walls within rectangular selection area', () => {
      // Create walls in different positions
      const node1 = model.createNode(10, 10)
      const node2 = model.createNode(30, 10)
      const node3 = model.createNode(60, 60)
      const node4 = model.createNode(80, 60)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!
      
      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      // Select area that includes first wall but not second
      const topLeft: Point = { x: 0, y: 0 }
      const bottomRight: Point = { x: 40, y: 20 }
      
      const selectedWalls = selectionService.findWallsInArea(topLeft, bottomRight)

      expect(selectedWalls).toHaveLength(1)
      expect(selectedWalls[0]).toBe(wall1.id)
    })

    it('should find walls that partially intersect selection area', () => {
      // Create a wall that extends beyond selection area
      const node1 = model.createNode(0, 10)
      const node2 = model.createNode(100, 10)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      // Select area that only covers part of the wall
      const topLeft: Point = { x: 20, y: 0 }
      const bottomRight: Point = { x: 40, y: 20 }
      
      const selectedWalls = selectionService.findWallsInArea(topLeft, bottomRight)

      expect(selectedWalls).toHaveLength(1)
      expect(selectedWalls[0]).toBe(wall.id)
    })

    it('should handle empty selection areas', () => {
      // Create a wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      model.createWall('layout', [segment.id])

      // Select area that doesn't include any walls
      const topLeft: Point = { x: 200, y: 200 }
      const bottomRight: Point = { x: 300, y: 300 }
      
      const selectedWalls = selectionService.findWallsInArea(topLeft, bottomRight)

      expect(selectedWalls).toHaveLength(0)
    })
  })

  describe('Wall Information', () => {
    it('should provide detailed wall information', () => {
      // Create a wall with known properties
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(100, 50)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node2.id, node3.id)!
      
      const wall = model.createWall('layout', [segment1.id, segment2.id])

      const wallInfo = selectionService.getWallInfo(wall.id)

      expect(wallInfo).toBeTruthy()
      expect(wallInfo!.wall.id).toBe(wall.id)
      expect(wallInfo!.segments).toHaveLength(2)
      expect(wallInfo!.nodes).toHaveLength(3) // Three unique nodes
      expect(wallInfo!.totalLength).toBeCloseTo(150) // 100 + 50
      expect(wallInfo!.boundingBox.topLeft.x).toBe(0)
      expect(wallInfo!.boundingBox.topLeft.y).toBe(0)
      expect(wallInfo!.boundingBox.bottomRight.x).toBe(100)
      expect(wallInfo!.boundingBox.bottomRight.y).toBe(50)
    })

    it('should return null for non-existent wall', () => {
      const wallInfo = selectionService.getWallInfo('nonexistent')
      expect(wallInfo).toBeNull()
    })
  })

  describe('Connected Walls', () => {
    it('should find walls connected through shared nodes', () => {
      // Create a T-junction with three walls
      const centerNode = model.createNode(50, 50)
      const node1 = model.createNode(0, 50)
      const node2 = model.createNode(100, 50)
      const node3 = model.createNode(50, 0)

      const segment1 = model.createSegment(node1.id, centerNode.id)!
      const segment2 = model.createSegment(centerNode.id, node2.id)!
      const segment3 = model.createSegment(centerNode.id, node3.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])
      const wall3 = model.createWall('area', [segment3.id])

      const connectedToWall1 = selectionService.findConnectedWalls(wall1.id)

      expect(connectedToWall1).toHaveLength(2)
      expect(connectedToWall1).toContain(wall2.id)
      expect(connectedToWall1).toContain(wall3.id)
    })

    it('should return empty array for isolated walls', () => {
      // Create an isolated wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      const connectedWalls = selectionService.findConnectedWalls(wall.id)

      expect(connectedWalls).toHaveLength(0)
    })
  })

  describe('Deletion Impact Analysis', () => {
    it('should analyze deletion impact correctly', () => {
      // Create connected walls
      const centerNode = model.createNode(50, 50)
      const node1 = model.createNode(0, 50)
      const node2 = model.createNode(100, 50)

      const segment1 = model.createSegment(node1.id, centerNode.id)!
      const segment2 = model.createSegment(centerNode.id, node2.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      const analysis = selectionService.analyzeDeletionImpact(wall1.id)

      expect(analysis.canDelete).toBe(true)
      expect(analysis.connectedWalls).toContain(wall2.id)
      expect(analysis.warnings.length).toBeGreaterThan(0)
    })

    it('should identify orphaned nodes', () => {
      // Create a wall with isolated endpoint
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      const analysis = selectionService.analyzeDeletionImpact(wall.id)

      expect(analysis.canDelete).toBe(true)
      expect(analysis.orphanedNodes).toContain(node1.id)
      expect(analysis.orphanedNodes).toContain(node2.id)
    })

    it('should handle non-existent walls', () => {
      const analysis = selectionService.analyzeDeletionImpact('nonexistent')

      expect(analysis.canDelete).toBe(false)
      expect(analysis.warnings).toContain('Wall not found')
    })
  })

  describe('Selection Tolerance', () => {
    it('should respect custom selection tolerance', () => {
      // Create a wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      model.createWall('layout', [segment.id])

      // Set very small tolerance
      selectionService.setSelectionTolerance(2)

      // Click just outside the new tolerance
      const clickPoint: Point = { x: 50, y: 3 }
      const result = selectionService.findWallAtPoint(clickPoint)

      expect(result).toBeNull()

      // Click within the new tolerance
      const clickPoint2: Point = { x: 50, y: 1 }
      const result2 = selectionService.findWallAtPoint(clickPoint2)

      expect(result2).toBeTruthy()
    })
  })
})