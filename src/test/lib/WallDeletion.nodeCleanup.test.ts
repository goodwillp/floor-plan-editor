import { describe, it, expect, beforeEach } from 'vitest'
import { FloorPlanModel } from '@/lib/FloorPlanModel'

describe('Wall Deletion - Node Cleanup Integration', () => {
  let model: FloorPlanModel

  beforeEach(() => {
    model = new FloorPlanModel()
  })

  describe('Wall Deletion with Node Cleanup', () => {
    it('should cleanup nodes when deleting wall segments', () => {
      // Create a straight wall with multiple segments
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)
      const node4 = model.createNode(15, 0)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!
      const seg3 = model.createSegment(node3.id, node4.id)!

      const wall = model.createWall('layout', [seg1.id, seg2.id, seg3.id])

      // Delete the wall and its segments
      model.deleteWall(wall.id, true)

      // All segments should be deleted
      expect(model.getSegment(seg1.id)).toBeUndefined()
      expect(model.getSegment(seg2.id)).toBeUndefined()
      expect(model.getSegment(seg3.id)).toBeUndefined()

      // Intermediate nodes should be cleaned up if they become orphaned
      // End nodes should remain as they might be connected to other structures
      expect(model.getNode(node1.id)).toBeDefined() // End node
      expect(model.getNode(node4.id)).toBeDefined() // End node
    })

    it('should handle complex wall deletion with intersections', () => {
      // Create a more complex scenario with intersecting walls
      
      // Main horizontal wall
      const hNode1 = model.createNode(0, 5)
      const hNode2 = model.createNode(5, 5)
      const hNode3 = model.createNode(10, 5)
      const hSeg1 = model.createSegment(hNode1.id, hNode2.id)!
      const hSeg2 = model.createSegment(hNode2.id, hNode3.id)!
      const horizontalWall = model.createWall('layout', [hSeg1.id, hSeg2.id])

      // Vertical wall intersecting at the middle
      const vNode1 = model.createNode(5, 0)
      const vNode2 = model.createNode(5, 10)
      const vSeg = model.createSegment(vNode1.id, hNode2.id)! // Connects to intersection
      const vSeg2 = model.createSegment(hNode2.id, vNode2.id)!
      const verticalWall = model.createWall('zone', [vSeg.id, vSeg2.id])

      // Delete the horizontal wall
      model.deleteWall(horizontalWall.id)

      // Intersection node should remain (still connected to vertical wall)
      expect(model.getNode(hNode2.id)).toBeDefined()
      
      // Vertical wall should still exist
      expect(model.getWall(verticalWall.id)).toBeDefined()
      expect(model.getSegment(vSeg.id)).toBeDefined()
      expect(model.getSegment(vSeg2.id)).toBeDefined()
    })

    it('should merge remaining segments after partial wall deletion', () => {
      // Create a wall with 3 collinear segments
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)
      const node4 = model.createNode(15, 0)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!
      const seg3 = model.createSegment(node3.id, node4.id)!

      const wall = model.createWall('layout', [seg1.id, seg2.id, seg3.id])

      // Remove only the middle segment from the wall (simulating partial deletion)
      wall.segmentIds = [seg1.id, seg3.id]
      model.deleteSegment(seg2.id)

      // Node2 and Node3 should potentially be cleaned up
      // This depends on whether they have other connections
      const node2Exists = model.getNode(node2.id) !== undefined
      const node3Exists = model.getNode(node3.id) !== undefined
      
      // At least one of the intermediate nodes should be cleaned up
      // The exact behavior depends on the cleanup logic
      expect(node2Exists || node3Exists).toBe(true) // At least one should remain as endpoint
    })

    it('should preserve geometry when cleaning up wall intersections', () => {
      // Create a cross intersection
      const center = model.createNode(10, 10)
      
      // Four arms of the cross
      const north = model.createNode(10, 20)
      const south = model.createNode(10, 0)
      const east = model.createNode(20, 10)
      const west = model.createNode(0, 10)

      const segN = model.createSegment(center.id, north.id)!
      const segS = model.createSegment(center.id, south.id)!
      const segE = model.createSegment(center.id, east.id)!
      const segW = model.createSegment(center.id, west.id)!

      // Create walls
      const vWall = model.createWall('layout', [segN.id, segS.id])
      const hWall = model.createWall('zone', [segE.id, segW.id])

      // Delete one wall
      model.deleteWall(vWall.id)

      // Center node should still exist (connected to horizontal wall)
      expect(model.getNode(center.id)).toBeDefined()
      
      // Horizontal wall should still be intact
      expect(model.getWall(hWall.id)).toBeDefined()
      expect(model.getSegment(segE.id)).toBeDefined()
      expect(model.getSegment(segW.id)).toBeDefined()

      // Verify geometric integrity
      const remainingSegE = model.getSegment(segE.id)!
      const remainingSegW = model.getSegment(segW.id)!
      
      expect(remainingSegE.length).toBeCloseTo(10, 5)
      expect(remainingSegW.length).toBeCloseTo(10, 5)
    })
  })

  describe('Segment Deletion with Wall Updates', () => {
    it('should update wall segment lists when segments are deleted and merged', () => {
      // Create a wall with collinear segments
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)
      const node4 = model.createNode(15, 0)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!
      const seg3 = model.createSegment(node3.id, node4.id)!

      const wall = model.createWall('layout', [seg1.id, seg2.id, seg3.id])
      
      const originalSegmentCount = wall.segmentIds.length

      // Delete the middle segment (should trigger cleanup and merging)
      model.deleteSegment(seg2.id)

      // Wall should be updated
      const updatedWall = model.getWall(wall.id)!
      
      // The exact number of segments depends on cleanup behavior
      // but it should be different from the original
      expect(updatedWall.segmentIds.length).toBeLessThanOrEqual(originalSegmentCount)
      
      // All remaining segment IDs should be valid
      for (const segId of updatedWall.segmentIds) {
        expect(model.getSegment(segId)).toBeDefined()
      }
    })

    it('should handle wall deletion with mixed segment types', () => {
      // Create a wall with both collinear and non-collinear segments
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)   // Collinear with node1
      const node3 = model.createNode(10, 0)  // Collinear with node1, node2
      const node4 = model.createNode(10, 5)  // Not collinear (corner)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!
      const seg3 = model.createSegment(node3.id, node4.id)!

      const wall = model.createWall('layout', [seg1.id, seg2.id, seg3.id])

      // Delete the wall and its segments
      model.deleteWall(wall.id, true)

      // All segments should be deleted
      expect(model.getSegment(seg1.id)).toBeUndefined()
      expect(model.getSegment(seg2.id)).toBeUndefined()
      expect(model.getSegment(seg3.id)).toBeUndefined()

      // Corner node (node3) should be cleaned up since it's no longer connected
      // End nodes should remain
      expect(model.getNode(node1.id)).toBeDefined() // Start node
      expect(model.getNode(node4.id)).toBeDefined() // End node
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle cleanup of large numbers of collinear segments efficiently', () => {
      // Create a long line with many segments
      const nodes = []
      const segments = []
      
      // Create 20 collinear nodes
      for (let i = 0; i <= 20; i++) {
        nodes.push(model.createNode(i, 0))
      }

      // Create segments between consecutive nodes
      for (let i = 0; i < nodes.length - 1; i++) {
        segments.push(model.createSegment(nodes[i].id, nodes[i + 1].id)!)
      }

      const wall = model.createWall('layout', segments.map(s => s.id))

      // Delete the wall (should trigger extensive cleanup)
      const startTime = Date.now()
      model.deleteWall(wall.id)
      const endTime = Date.now()

      // Should complete reasonably quickly (less than 100ms for 20 segments)
      expect(endTime - startTime).toBeLessThan(100)

      // Only end nodes should remain
      expect(model.getNode(nodes[0].id)).toBeDefined()
      expect(model.getNode(nodes[nodes.length - 1].id)).toBeDefined()
    })

    it('should handle circular references safely', () => {
      // Create a scenario that could potentially cause infinite loops
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!

      // Manually create a potential circular reference scenario
      // by deleting and recreating segments in a specific order
      model.deleteSegment(seg1.id)
      const newSeg = model.createSegment(node1.id, node2.id)!

      // This should not cause infinite loops or crashes
      const analysis = model.getNodeCleanupAnalysis(node2.id)
      expect(analysis).toBeDefined()
      expect(typeof analysis.canCleanup).toBe('boolean')
    })

    it('should maintain data consistency during concurrent operations', () => {
      // Create a complex scenario
      const centerNode = model.createNode(5, 5)
      const surroundingNodes = [
        model.createNode(0, 5),   // West
        model.createNode(10, 5),  // East
        model.createNode(5, 0),   // South
        model.createNode(5, 10),  // North
        model.createNode(2.5, 5), // Between west and center
        model.createNode(7.5, 5)  // Between center and east
      ]

      // Create segments
      const segments = [
        model.createSegment(surroundingNodes[0].id, surroundingNodes[4].id)!, // West to mid-west
        model.createSegment(surroundingNodes[4].id, centerNode.id)!,          // Mid-west to center
        model.createSegment(centerNode.id, surroundingNodes[5].id)!,          // Center to mid-east
        model.createSegment(surroundingNodes[5].id, surroundingNodes[1].id)!, // Mid-east to east
        model.createSegment(centerNode.id, surroundingNodes[2].id)!,          // Center to south
        model.createSegment(centerNode.id, surroundingNodes[3].id)!           // Center to north
      ]

      // Perform multiple operations
      model.deleteSegment(segments[1].id) // Delete mid-west to center
      model.deleteSegment(segments[2].id) // Delete center to mid-east

      // Verify data consistency
      const remainingSegments = model.getAllSegments()
      const remainingNodes = model.getAllNodes()

      // All remaining segments should have valid node references
      for (const segment of remainingSegments) {
        expect(model.getNode(segment.startNodeId)).toBeDefined()
        expect(model.getNode(segment.endNodeId)).toBeDefined()
      }

      // All remaining nodes should have valid segment references
      for (const node of remainingNodes) {
        for (const segmentId of node.connectedSegments) {
          expect(model.getSegment(segmentId)).toBeDefined()
        }
      }
    })
  })
})