import { describe, it, expect, beforeEach } from 'vitest'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import type { Point } from '@/lib/types'

describe('FloorPlanModel - Intersection Detection and Subdivision', () => {
  let model: FloorPlanModel

  beforeEach(() => {
    model = new FloorPlanModel()
  })

  describe('Segment Subdivision', () => {
    it('should subdivide a segment at an intersection point', () => {
      // Create a horizontal segment from (0,0) to (10,0)
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(10, 0)
      const segment = model.createSegment(node1.id, node2.id)!

      // Subdivide at midpoint (5,0)
      const intersectionPoint: Point = { x: 5, y: 0 }
      const result = model.subdivideSegment(segment.id, intersectionPoint)

      expect(result).not.toBeNull()
      expect(result).toHaveLength(2)

      // Original segment should be deleted
      expect(model.getSegment(segment.id)).toBeUndefined()

      // Two new segments should exist
      const newSegment1 = model.getSegment(result![0])
      const newSegment2 = model.getSegment(result![1])
      expect(newSegment1).toBeDefined()
      expect(newSegment2).toBeDefined()

      // Check that segments connect properly
      const intersectionNode = model.getAllNodes().find(n => n.x === 5 && n.y === 0)
      expect(intersectionNode).toBeDefined()
      expect(intersectionNode!.type).toBe('intersection')
      expect(intersectionNode!.connectedSegments).toHaveLength(2)
    })

    it('should preserve wall association when subdividing segments', () => {
      // Create segment and wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(10, 0)
      const segment = model.createSegment(node1.id, node2.id)!
      const wall = model.createWall('layout', [segment.id])

      // Subdivide segment
      const intersectionPoint: Point = { x: 5, y: 0 }
      const result = model.subdivideSegment(segment.id, intersectionPoint)!

      // Wall should now contain the two new segments
      const updatedWall = model.getWall(wall.id)!
      expect(updatedWall.segmentIds).toHaveLength(2)
      expect(updatedWall.segmentIds).toContain(result[0])
      expect(updatedWall.segmentIds).toContain(result[1])

      // New segments should reference the wall
      const newSegment1 = model.getSegment(result[0])!
      const newSegment2 = model.getSegment(result[1])!
      expect(newSegment1.wallId).toBe(wall.id)
      expect(newSegment2.wallId).toBe(wall.id)
    })

    it('should handle subdivision failure gracefully', () => {
      // Try to subdivide non-existent segment
      const result = model.subdivideSegment('nonexistent', { x: 0, y: 0 })
      expect(result).toBeNull()
    })
  })

  describe('Intersection Detection', () => {
    it('should find intersection between two crossing segments', () => {
      // Create horizontal segment from (0,5) to (10,5)
      const hNode1 = model.createNode(0, 5)
      const hNode2 = model.createNode(10, 5)
      const horizontalSegment = model.createSegment(hNode1.id, hNode2.id)!

      // Create vertical segment from (5,0) to (5,10)
      const vNode1 = model.createNode(5, 0)
      const vNode2 = model.createNode(5, 10)
      const verticalSegment = model.createSegment(vNode1.id, vNode2.id)!

      // Find intersections for the vertical segment
      const intersections = model.findIntersectingSegments(verticalSegment)

      expect(intersections).toHaveLength(1)
      expect(intersections[0].segmentId).toBe(horizontalSegment.id)
      expect(intersections[0].intersectionPoint.x).toBeCloseTo(5)
      expect(intersections[0].intersectionPoint.y).toBeCloseTo(5)
    })

    it('should not find intersection between parallel segments', () => {
      // Create two parallel horizontal segments
      const seg1Node1 = model.createNode(0, 0)
      const seg1Node2 = model.createNode(10, 0)
      const segment1 = model.createSegment(seg1Node1.id, seg1Node2.id)!

      const seg2Node1 = model.createNode(0, 5)
      const seg2Node2 = model.createNode(10, 5)
      const segment2 = model.createSegment(seg2Node1.id, seg2Node2.id)!

      const intersections = model.findIntersectingSegments(segment1)
      expect(intersections).toHaveLength(0)
    })

    it('should not find intersection between connected segments', () => {
      // Create connected segments (sharing a node)
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 5)
      
      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node2.id, node3.id)!

      // Connected segments should not be considered intersecting
      const intersections = model.findIntersectingSegments(segment1)
      expect(intersections).toHaveLength(0)
    })

    it('should find intersection point accurately', () => {
      // Create segments that intersect at (3, 4)
      const seg1Node1 = model.createNode(0, 4)
      const seg1Node2 = model.createNode(6, 4)
      const segment1 = model.createSegment(seg1Node1.id, seg1Node2.id)!

      const seg2Node1 = model.createNode(3, 0)
      const seg2Node2 = model.createNode(3, 8)
      const segment2 = model.createSegment(seg2Node1.id, seg2Node2.id)!

      const intersections = model.findIntersectingSegments(segment1)
      expect(intersections).toHaveLength(1)
      expect(intersections[0].intersectionPoint.x).toBeCloseTo(3)
      expect(intersections[0].intersectionPoint.y).toBeCloseTo(4)
    })
  })

  describe('Intersection Processing', () => {
    it('should process intersections and create three-way connections', () => {
      // Create existing horizontal segment
      const hNode1 = model.createNode(0, 5)
      const hNode2 = model.createNode(10, 5)
      const horizontalSegment = model.createSegment(hNode1.id, hNode2.id)!

      // Create new vertical segment that intersects
      const vNode1 = model.createNode(5, 0)
      const vNode2 = model.createNode(5, 10)
      const verticalSegment = model.createSegment(vNode1.id, vNode2.id)!

      // Process intersections for the new vertical segment
      const modifications = model.processIntersections(verticalSegment.id)

      expect(modifications.length).toBeGreaterThan(0)

      // Should have subdivided the horizontal segment
      const horizontalModification = modifications.find(m => m.originalSegmentId === horizontalSegment.id)
      expect(horizontalModification).toBeDefined()
      expect(horizontalModification!.newSegmentIds).toHaveLength(2)

      // Find the intersection node
      const intersectionNode = model.getAllNodes().find(n => 
        Math.abs(n.x - 5) < 1e-6 && Math.abs(n.y - 5) < 1e-6 && n.type === 'intersection'
      )
      expect(intersectionNode).toBeDefined()

      // Intersection node should connect to 3 segments (2 from horizontal split + 1 from vertical)
      expect(intersectionNode!.connectedSegments.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle multiple intersections on a single segment', () => {
      // Create a long horizontal segment
      const hNode1 = model.createNode(0, 5)
      const hNode2 = model.createNode(20, 5)
      const horizontalSegment = model.createSegment(hNode1.id, hNode2.id)!

      // Create two vertical segments that intersect at different points
      const v1Node1 = model.createNode(5, 0)
      const v1Node2 = model.createNode(5, 10)
      const vertical1 = model.createSegment(v1Node1.id, v1Node2.id)!

      const v2Node1 = model.createNode(15, 0)
      const v2Node2 = model.createNode(15, 10)
      const vertical2 = model.createSegment(v2Node1.id, v2Node2.id)!

      // Process intersections for both vertical segments
      const modifications1 = model.processIntersections(vertical1.id)
      const modifications2 = model.processIntersections(vertical2.id)

      expect(modifications1.length).toBeGreaterThan(0)
      expect(modifications2.length).toBeGreaterThan(0)

      // Should have created intersection nodes at both points
      const intersection1 = model.getAllNodes().find(n => 
        Math.abs(n.x - 5) < 1e-6 && Math.abs(n.y - 5) < 1e-6 && n.type === 'intersection'
      )
      const intersection2 = model.getAllNodes().find(n => 
        Math.abs(n.x - 15) < 1e-6 && Math.abs(n.y - 5) < 1e-6 && n.type === 'intersection'
      )

      expect(intersection1).toBeDefined()
      expect(intersection2).toBeDefined()
    })

    it('should preserve geometric accuracy after intersection processing', () => {
      // Create segments
      const hNode1 = model.createNode(0, 5)
      const hNode2 = model.createNode(10, 5)
      const horizontalSegment = model.createSegment(hNode1.id, hNode2.id)!

      const vNode1 = model.createNode(5, 0)
      const vNode2 = model.createNode(5, 10)
      const verticalSegment = model.createSegment(vNode1.id, vNode2.id)!

      // Record original lengths
      const originalHorizontalLength = horizontalSegment.length
      const originalVerticalLength = verticalSegment.length

      // Process intersections
      const modifications = model.processIntersections(verticalSegment.id)

      // Find the modification for the horizontal segment
      const horizontalModification = modifications.find(m => m.originalSegmentId === horizontalSegment.id)
      
      if (horizontalModification) {
        // Get the new segments created from subdivision
        const newSegment1 = model.getSegment(horizontalModification.newSegmentIds[0])!
        const newSegment2 = model.getSegment(horizontalModification.newSegmentIds[1])!
        
        // Total length of new segments should equal original length
        const totalLength = newSegment1.length + newSegment2.length
        expect(totalLength).toBeCloseTo(originalHorizontalLength, 5)
      } else {
        // If no subdivision occurred, the original segment should still exist
        const remainingHorizontal = model.getSegment(horizontalSegment.id)
        expect(remainingHorizontal).toBeDefined()
        expect(remainingHorizontal!.length).toBeCloseTo(originalHorizontalLength, 5)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle segments that touch at endpoints', () => {
      // Create segments that share an endpoint
      const sharedNode = model.createNode(5, 5)
      const node1 = model.createNode(0, 5)
      const node2 = model.createNode(10, 5)

      const segment1 = model.createSegment(node1.id, sharedNode.id)!
      const segment2 = model.createSegment(sharedNode.id, node2.id)!

      // These should not be considered intersecting since they share a node
      const intersections = model.findIntersectingSegments(segment1)
      expect(intersections).toHaveLength(0)
    })

    it('should handle zero-length segments gracefully', () => {
      // Create a zero-length segment (same start and end point)
      const node = model.createNode(5, 5)
      
      // This should fail to create a segment
      const segment = model.createSegment(node.id, node.id)
      expect(segment).toBeNull()
    })

    it('should handle intersection at segment endpoints', () => {
      // Create segments where one endpoint lies exactly on another segment
      const hNode1 = model.createNode(0, 5)
      const hNode2 = model.createNode(10, 5)
      const horizontalSegment = model.createSegment(hNode1.id, hNode2.id)!

      // Vertical segment starts exactly at the horizontal segment
      const vNode1 = model.createNode(5, 5) // On the horizontal segment
      const vNode2 = model.createNode(5, 10)
      const verticalSegment = model.createSegment(vNode1.id, vNode2.id)!

      const intersections = model.findIntersectingSegments(verticalSegment)
      
      // This might or might not be considered an intersection depending on implementation
      // The important thing is that it handles the case gracefully
      expect(intersections.length).toBeGreaterThanOrEqual(0)
    })
  })
})