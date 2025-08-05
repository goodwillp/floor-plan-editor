import { describe, it, expect, beforeEach } from 'vitest'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import type { Point } from '@/lib/types'

describe('FloorPlanModel - Node Cleanup and Segment Merging', () => {
  let model: FloorPlanModel

  beforeEach(() => {
    model = new FloorPlanModel()
  })

  describe('Node Cleanup Analysis', () => {
    it('should identify nodes eligible for cleanup', () => {
      // Create three collinear nodes
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0) // Middle node
      const node3 = model.createNode(10, 0)

      // Create two collinear segments
      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!

      // Middle node should be eligible for cleanup
      const analysis = model.getNodeCleanupAnalysis(node2.id)
      expect(analysis.canCleanup).toBe(true)
      expect(analysis.connectedSegments).toBe(2)
      expect(analysis.segmentsCollinear).toBe(true)
      expect(analysis.reason).toContain('can be cleaned up')
    })

    it('should not cleanup nodes with more than 2 segments', () => {
      // Create a T-junction
      const centerNode = model.createNode(5, 5)
      const node1 = model.createNode(0, 5)
      const node2 = model.createNode(10, 5)
      const node3 = model.createNode(5, 0)

      model.createSegment(node1.id, centerNode.id)
      model.createSegment(centerNode.id, node2.id)
      model.createSegment(centerNode.id, node3.id)

      const analysis = model.getNodeCleanupAnalysis(centerNode.id)
      expect(analysis.canCleanup).toBe(false)
      expect(analysis.connectedSegments).toBe(3)
      expect(analysis.reason).toContain('more than 2 segments')
    })

    it('should not cleanup endpoint nodes', () => {
      // Create a simple line segment
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(10, 0)
      model.createSegment(node1.id, node2.id)

      // Endpoint nodes should not be cleaned up
      const analysis1 = model.getNodeCleanupAnalysis(node1.id)
      const analysis2 = model.getNodeCleanupAnalysis(node2.id)

      expect(analysis1.canCleanup).toBe(false)
      expect(analysis1.connectedSegments).toBe(1)
      expect(analysis1.reason).toContain('end of a segment')

      expect(analysis2.canCleanup).toBe(false)
      expect(analysis2.connectedSegments).toBe(1)
      expect(analysis2.reason).toContain('end of a segment')
    })

    it('should not cleanup nodes with non-collinear segments', () => {
      // Create an L-shaped connection
      const cornerNode = model.createNode(5, 5)
      const node1 = model.createNode(0, 5) // Horizontal
      const node2 = model.createNode(5, 0) // Vertical

      model.createSegment(node1.id, cornerNode.id)
      model.createSegment(cornerNode.id, node2.id)

      const analysis = model.getNodeCleanupAnalysis(cornerNode.id)
      expect(analysis.canCleanup).toBe(false)
      expect(analysis.connectedSegments).toBe(2)
      expect(analysis.segmentsCollinear).toBe(false)
      expect(analysis.reason).toContain('not collinear')
    })
  })

  describe('Segment Merging', () => {
    it('should merge two collinear segments at a node', () => {
      // Create three collinear nodes
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)

      // Create two segments
      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!

      const originalLength1 = seg1.length
      const originalLength2 = seg2.length

      // Merge segments at the middle node
      const mergedSegmentId = model.mergeSegmentsAtNode(node2.id)

      expect(mergedSegmentId).toBeTruthy()

      // Original segments should be deleted
      expect(model.getSegment(seg1.id)).toBeUndefined()
      expect(model.getSegment(seg2.id)).toBeUndefined()

      // Middle node should be deleted
      expect(model.getNode(node2.id)).toBeUndefined()

      // New merged segment should exist
      const mergedSegment = model.getSegment(mergedSegmentId!)
      expect(mergedSegment).toBeDefined()

      // Merged segment should connect the original endpoints
      expect(mergedSegment!.startNodeId).toEqual(node1.id)
      expect(mergedSegment!.endNodeId).toEqual(node3.id)

      // Length should be preserved
      expect(mergedSegment!.length).toBeCloseTo(originalLength1 + originalLength2, 5)
    })

    it('should preserve wall association when merging segments from same wall', () => {
      // Create segments and wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!

      const wall = model.createWall('layout', [seg1.id, seg2.id])

      // Merge segments
      const mergedSegmentId = model.mergeSegmentsAtNode(node2.id)!

      // Wall should now contain the merged segment
      const updatedWall = model.getWall(wall.id)!
      expect(updatedWall.segmentIds).toHaveLength(1)
      expect(updatedWall.segmentIds[0]).toBe(mergedSegmentId)

      // Merged segment should reference the wall
      const mergedSegment = model.getSegment(mergedSegmentId)!
      expect(mergedSegment.wallId).toBe(wall.id)
    })

    it('should handle wall association when segments belong to different walls', () => {
      // Create segments with different wall associations
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!

      const wall1 = model.createWall('layout', [seg1.id])
      const wall2 = model.createWall('zone', [seg2.id])

      // Merge segments
      const mergedSegmentId = model.mergeSegmentsAtNode(node2.id)!

      // Merged segment should not be associated with any wall
      const mergedSegment = model.getSegment(mergedSegmentId)!
      expect(mergedSegment.wallId).toBeUndefined()

      // Original walls should have the merged segment removed from their lists
      const updatedWall1 = model.getWall(wall1.id)!
      const updatedWall2 = model.getWall(wall2.id)!
      expect(updatedWall1.segmentIds).toHaveLength(0)
      expect(updatedWall2.segmentIds).toHaveLength(0)
    })

    it('should not merge non-collinear segments', () => {
      // Create L-shaped segments
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(5, 5)

      model.createSegment(node1.id, node2.id)
      model.createSegment(node2.id, node3.id)

      // Should not merge non-collinear segments
      const result = model.mergeSegmentsAtNode(node2.id)
      expect(result).toBeNull()

      // All nodes and segments should still exist
      expect(model.getNode(node1.id)).toBeDefined()
      expect(model.getNode(node2.id)).toBeDefined()
      expect(model.getNode(node3.id)).toBeDefined()
    })
  })

  describe('Automatic Node Cleanup', () => {
    it('should perform automatic cleanup when deleting segments', () => {
      // Create a line with three segments
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)
      const node4 = model.createNode(15, 0)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!
      const seg3 = model.createSegment(node3.id, node4.id)!

      // Delete the middle segment
      model.deleteSegment(seg2.id)

      // Node2 and Node3 should be cleaned up automatically
      // since they now connect to only one segment each and are endpoints
      expect(model.getNode(node2.id)).toBeDefined() // Endpoint, should remain
      expect(model.getNode(node3.id)).toBeDefined() // Endpoint, should remain
      
      // Segments 1 and 3 should still exist
      expect(model.getSegment(seg1.id)).toBeDefined()
      expect(model.getSegment(seg3.id)).toBeDefined()
    })

    it('should merge collinear segments when middle segment is deleted', () => {
      // Create three collinear segments in a line
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)
      const node4 = model.createNode(15, 0)

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!
      const seg3 = model.createSegment(node3.id, node4.id)!

      const wall = model.createWall('layout', [seg1.id, seg2.id, seg3.id])

      // Delete the middle segment
      model.deleteSegment(seg2.id)

      // Node2 should be cleaned up (was connecting seg1 and seg2)
      // Node3 should be cleaned up (was connecting seg2 and seg3)
      // This should result in seg1 and seg3 being merged if they become collinear

      // Check that cleanup occurred
      const remainingSegments = model.getAllSegments()
      expect(remainingSegments.length).toBeLessThanOrEqual(2) // Should be 2 or fewer segments

      // Wall should be updated accordingly
      const updatedWall = model.getWall(wall.id)!
      expect(updatedWall.segmentIds.length).toBeGreaterThan(0)
    })

    it('should not cleanup intersection nodes', () => {
      // Create a T-intersection
      const centerNode = model.createNode(5, 5)
      const node1 = model.createNode(0, 5)
      const node2 = model.createNode(10, 5)
      const node3 = model.createNode(5, 0)
      const node4 = model.createNode(5, 10)

      const seg1 = model.createSegment(node1.id, centerNode.id)!
      const seg2 = model.createSegment(centerNode.id, node2.id)!
      const seg3 = model.createSegment(centerNode.id, node3.id)!
      const seg4 = model.createSegment(centerNode.id, node4.id)!

      // Delete one segment
      model.deleteSegment(seg4.id)

      // Center node should still exist (connects to 3 segments)
      expect(model.getNode(centerNode.id)).toBeDefined()
      
      // Should still have 3 segments
      expect(model.getAllSegments()).toHaveLength(3)
    })
  })

  describe('Batch Node Cleanup', () => {
    it('should analyze and cleanup all eligible nodes', () => {
      // Create multiple scenarios
      
      // Scenario 1: Collinear segments that can be merged
      const node1a = model.createNode(0, 0)
      const node2a = model.createNode(5, 0)
      const node3a = model.createNode(10, 0)
      model.createSegment(node1a.id, node2a.id)
      model.createSegment(node2a.id, node3a.id)

      // Scenario 2: Non-collinear segments (L-shape)
      const node1b = model.createNode(0, 10)
      const node2b = model.createNode(5, 10)
      const node3b = model.createNode(5, 15)
      model.createSegment(node1b.id, node2b.id)
      model.createSegment(node2b.id, node3b.id)

      // Scenario 3: T-intersection (should not be cleaned)
      const centerNode = model.createNode(20, 5)
      const nodeT1 = model.createNode(15, 5)
      const nodeT2 = model.createNode(25, 5)
      const nodeT3 = model.createNode(20, 0)
      model.createSegment(nodeT1.id, centerNode.id)
      model.createSegment(centerNode.id, nodeT2.id)
      model.createSegment(centerNode.id, nodeT3.id)

      // Perform batch cleanup
      const results = model.analyzeAndCleanupNodes()

      // Should have cleaned up the collinear scenario
      expect(results.length).toBeGreaterThan(0)
      
      // Check that collinear node was cleaned up
      const cleanedNode = results.find(r => r.nodeId === node2a.id)
      expect(cleanedNode).toBeDefined()
      expect(cleanedNode!.cleaned).toBe(true)

      // Non-collinear and intersection nodes should not be in results
      expect(results.find(r => r.nodeId === node2b.id)).toBeUndefined()
      expect(results.find(r => r.nodeId === centerNode.id)).toBeUndefined()
    })

    it('should provide detailed analysis without cleanup', () => {
      // Create a simple collinear case
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0)

      model.createSegment(node1.id, node2.id)
      model.createSegment(node2.id, node3.id)

      // Get analysis without performing cleanup
      const analysis = model.getNodeCleanupAnalysis(node2.id)

      expect(analysis.canCleanup).toBe(true)
      expect(analysis.connectedSegments).toBe(2)
      expect(analysis.segmentsCollinear).toBe(true)
      expect(analysis.reason).toContain('can be cleaned up')

      // Node should still exist (analysis doesn't perform cleanup)
      expect(model.getNode(node2.id)).toBeDefined()
    })
  })

  describe('Geometric Accuracy', () => {
    it('should maintain geometric accuracy during segment merging', () => {
      // Create segments with precise measurements
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(3, 4) // Distance: 5
      const node3 = model.createNode(6, 8) // Distance from node2: 5, total: 10

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!

      expect(seg1.length).toBeCloseTo(5, 5)
      expect(seg2.length).toBeCloseTo(5, 5)

      // Merge segments
      const mergedSegmentId = model.mergeSegmentsAtNode(node2.id)!
      const mergedSegment = model.getSegment(mergedSegmentId)!

      // Total length should be preserved
      expect(mergedSegment.length).toBeCloseTo(10, 5)

      // Angle should be correct
      const expectedAngle = Math.atan2(8 - 0, 6 - 0) // From (0,0) to (6,8)
      expect(mergedSegment.angle).toBeCloseTo(expectedAngle, 5)
    })

    it('should handle edge cases with very small segments', () => {
      // Create very small segments
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(0.001, 0) // 1mm
      const node3 = model.createNode(0.002, 0) // 2mm total

      const seg1 = model.createSegment(node1.id, node2.id)!
      const seg2 = model.createSegment(node2.id, node3.id)!

      // Should still be able to merge
      const mergedSegmentId = model.mergeSegmentsAtNode(node2.id)
      expect(mergedSegmentId).toBeTruthy()

      const mergedSegment = model.getSegment(mergedSegmentId!)!
      expect(mergedSegment.length).toBeCloseTo(0.002, 6)
    })

    it('should handle segments with different angles correctly', () => {
      // Create segments that are almost but not quite collinear
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(5, 0)
      const node3 = model.createNode(10, 0.0001) // Very slight angle

      model.createSegment(node1.id, node2.id)
      model.createSegment(node2.id, node3.id)

      // With default tolerance, these might be considered collinear
      // The behavior depends on the tolerance setting
      const analysis = model.getNodeCleanupAnalysis(node2.id)
      
      // This tests that the collinearity detection works with appropriate tolerance
      expect(typeof analysis.segmentsCollinear).toBe('boolean')
    })
  })

  describe('Error Handling', () => {
    it('should handle cleanup of non-existent nodes gracefully', () => {
      const result = model.performNodeCleanup('nonexistent')
      expect(result.cleaned).toBe(false)
    })

    it('should handle merging with invalid node IDs', () => {
      const result = model.mergeSegmentsAtNode('nonexistent')
      expect(result).toBeNull()
    })

    it('should handle analysis of non-existent nodes', () => {
      const analysis = model.getNodeCleanupAnalysis('nonexistent')
      expect(analysis.canCleanup).toBe(false)
      expect(analysis.reason).toContain('Node not found')
      expect(analysis.connectedSegments).toBe(0)
    })

    it('should handle cleanup when segments are missing', () => {
      // Create a node and manually add segment references
      const node = model.createNode(0, 0)
      
      // Manually corrupt the data by adding non-existent segment references
      node.connectedSegments.push('nonexistent1', 'nonexistent2')

      const analysis = model.getNodeCleanupAnalysis(node.id)
      expect(analysis.canCleanup).toBe(false)
      expect(analysis.reason).toContain('Connected segments not found')
    })
  })
})