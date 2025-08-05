import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { ProximityMergingService, type ProximityMerge } from '@/lib/ProximityMergingService'

// Mock window.setInterval and window.clearInterval
const mockSetInterval = vi.fn()
const mockClearInterval = vi.fn()
const mockDispatchEvent = vi.fn()

Object.defineProperty(window, 'setInterval', {
  writable: true,
  value: mockSetInterval
})

Object.defineProperty(window, 'clearInterval', {
  writable: true,
  value: mockClearInterval
})

Object.defineProperty(window, 'dispatchEvent', {
  writable: true,
  value: mockDispatchEvent
})

describe('ProximityMergingService', () => {
  let model: FloorPlanModel
  let service: ProximityMergingService

  beforeEach(() => {
    model = new FloorPlanModel()
    service = new ProximityMergingService(model)
    vi.clearAllMocks()
  })

  afterEach(() => {
    service.destroy()
  })

  describe('Service Configuration', () => {
    it('should initialize with default proximity threshold', () => {
      expect(service.getProximityThreshold()).toBe(15)
    })

    it('should allow setting custom proximity threshold', () => {
      service.setProximityThreshold(25)
      expect(service.getProximityThreshold()).toBe(25)
    })

    it('should start and stop proximity checking', () => {
      service.startProximityChecking(100)
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 100)

      service.stopProximityChecking()
      expect(mockClearInterval).toHaveBeenCalled()
    })

    it('should use default check interval when not specified', () => {
      service.startProximityChecking()
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 100)
    })
  })

  describe('Proximity Detection', () => {
    it('should detect nearby walls within threshold', () => {
      // Create two parallel walls close together
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 10) // 10 pixels apart
      const node4 = model.createNode(100, 10)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      service.updateProximityMerges()
      const activeMerges = service.getActiveMerges()

      expect(activeMerges).toHaveLength(1)
      expect(activeMerges[0].wall1Id).toBe(wall1.id)
      expect(activeMerges[0].wall2Id).toBe(wall2.id)
      expect(activeMerges[0].distance).toBeLessThan(15)
    })

    it('should not detect walls beyond threshold', () => {
      // Create two parallel walls far apart
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 50) // 50 pixels apart, beyond default threshold
      const node4 = model.createNode(100, 50)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])

      service.updateProximityMerges()
      const activeMerges = service.getActiveMerges()

      expect(activeMerges).toHaveLength(0)
    })

    it('should ignore invisible walls', () => {
      // Create two close walls, make one invisible
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 5)
      const node4 = model.createNode(100, 5)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      // Make wall2 invisible
      model.updateWall(wall2.id, { visible: false })

      service.updateProximityMerges()
      const activeMerges = service.getActiveMerges()

      expect(activeMerges).toHaveLength(0)
    })

    it('should support merging between different wall types', () => {
      // Create walls of different types that are close
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 8)
      const node4 = model.createNode(100, 8)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      const wall1 = model.createWall('layout', [segment1.id]) // 350mm
      const wall2 = model.createWall('area', [segment2.id])   // 150mm

      service.updateProximityMerges()
      const activeMerges = service.getActiveMerges()

      expect(activeMerges).toHaveLength(1)
      expect(activeMerges[0].wall1Id).toBe(wall1.id)
      expect(activeMerges[0].wall2Id).toBe(wall2.id)
    })
  })

  describe('Visual Merging', () => {
    it('should create visual merges without modifying segments', () => {
      // Create two close walls
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 12)
      const node4 = model.createNode(100, 12)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      // Store original segment data
      const originalSegment1 = { ...segment1 }
      const originalSegment2 = { ...segment2 }

      service.updateProximityMerges()
      const activeMerges = service.getActiveMerges()

      expect(activeMerges).toHaveLength(1)
      expect(activeMerges[0].mergeType).toBe('visual')

      // Verify segments are unchanged
      const currentSegment1 = model.getSegment(segment1.id)!
      const currentSegment2 = model.getSegment(segment2.id)!

      expect(currentSegment1.startNodeId).toBe(originalSegment1.startNodeId)
      expect(currentSegment1.endNodeId).toBe(originalSegment1.endNodeId)
      expect(currentSegment2.startNodeId).toBe(originalSegment2.startNodeId)
      expect(currentSegment2.endNodeId).toBe(originalSegment2.endNodeId)
    })

    it('should calculate merge points between segments', () => {
      // Create two close walls
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 10)
      const node4 = model.createNode(100, 10)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])

      service.updateProximityMerges()
      const activeMerges = service.getActiveMerges()

      expect(activeMerges).toHaveLength(1)
      expect(activeMerges[0].segments).toHaveLength(1)
      expect(activeMerges[0].segments[0].mergePoints.length).toBeGreaterThan(0)
    })
  })

  describe('Multi-Segment Walls', () => {
    it('should handle walls with multiple segments', () => {
      // Create an L-shaped wall close to a straight wall
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(50, 0)
      const node3 = model.createNode(50, 50)
      const node4 = model.createNode(0, 8)
      const node5 = model.createNode(100, 8)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node2.id, node3.id)!
      const segment3 = model.createSegment(node4.id, node5.id)!

      const wall1 = model.createWall('layout', [segment1.id, segment2.id]) // L-shaped
      const wall2 = model.createWall('zone', [segment3.id]) // Straight

      service.updateProximityMerges()
      const activeMerges = service.getActiveMerges()

      expect(activeMerges).toHaveLength(1)
      expect(activeMerges[0].segments.length).toBeGreaterThan(0)
    })

    it('should find minimum distance between multi-segment walls', () => {
      // Create two multi-segment walls with varying distances
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(50, 0)
      const node3 = model.createNode(100, 0)
      const node4 = model.createNode(0, 5)   // Close to first segment
      const node5 = model.createNode(50, 20) // Far from second segment
      const node6 = model.createNode(100, 5) // Close to third segment

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node2.id, node3.id)!
      const segment3 = model.createSegment(node4.id, node5.id)!
      const segment4 = model.createSegment(node5.id, node6.id)!

      model.createWall('layout', [segment1.id, segment2.id])
      model.createWall('zone', [segment3.id, segment4.id])

      service.updateProximityMerges()
      const activeMerges = service.getActiveMerges()

      expect(activeMerges).toHaveLength(1)
      expect(activeMerges[0].distance).toBe(5) // Minimum distance
    })
  })

  describe('Automatic Separation', () => {
    it('should remove merges when walls move apart', () => {
      // Create two close walls
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 10)
      const node4 = model.createNode(100, 10)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])

      service.updateProximityMerges()
      expect(service.getActiveMerges()).toHaveLength(1)

      // Move walls apart by updating node positions
      model.updateNode(node3.id, { y: 50 }) // Move to 50 pixels apart
      model.updateNode(node4.id, { y: 50 })

      service.updateProximityMerges()
      expect(service.getActiveMerges()).toHaveLength(0)
    })

    it('should emit separation events when merges are removed', () => {
      // Create and then separate walls
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 10)
      const node4 = model.createNode(100, 10)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])

      service.updateProximityMerges()
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'merge-created'
        })
      )

      // Clear previous calls
      vi.clearAllMocks()

      // Move walls apart
      model.updateNode(node3.id, { y: 50 })
      model.updateNode(node4.id, { y: 50 })

      service.updateProximityMerges()
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'merge-separated'
        })
      )
    })
  })

  describe('Merge Management', () => {
    it('should provide consistent merge IDs', () => {
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 10)
      const node4 = model.createNode(100, 10)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])

      service.updateProximityMerges()
      const merge1 = service.getMerge(wall1.id, wall2.id)
      const merge2 = service.getMerge(wall2.id, wall1.id) // Reversed order

      expect(merge1).toBeTruthy()
      expect(merge2).toBeTruthy()
      expect(merge1!.id).toBe(merge2!.id) // Should be the same merge
    })

    it('should track merged walls correctly', () => {
      // Create three walls where wall1 is close to both wall2 and wall3
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 8)
      const node4 = model.createNode(100, 8)
      const node5 = model.createNode(0, 16)
      const node6 = model.createNode(100, 16)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!
      const segment3 = model.createSegment(node5.id, node6.id)!

      const wall1 = model.createWall('layout', [segment1.id])
      const wall2 = model.createWall('zone', [segment2.id])
      const wall3 = model.createWall('area', [segment3.id])

      service.updateProximityMerges()

      expect(service.areWallsMerged(wall1.id, wall2.id)).toBe(true)
      expect(service.areWallsMerged(wall1.id, wall3.id)).toBe(true)
      expect(service.areWallsMerged(wall2.id, wall3.id)).toBe(false) // Too far apart

      const mergedWithWall1 = service.getMergedWalls(wall1.id)
      expect(mergedWithWall1).toContain(wall2.id)
      expect(mergedWithWall1).toContain(wall3.id)
    })

    it('should clear all merges', () => {
      // Create multiple merges
      const walls = []
      for (let i = 0; i < 3; i++) {
        const node1 = model.createNode(0, i * 12)
        const node2 = model.createNode(100, i * 12)
        const segment = model.createSegment(node1.id, node2.id)!
        const wall = model.createWall('layout', [segment.id])
        walls.push(wall)
      }

      service.updateProximityMerges()
      expect(service.getActiveMerges().length).toBeGreaterThan(0)

      service.clearAllMerges()
      expect(service.getActiveMerges()).toHaveLength(0)
    })
  })

  describe('Statistics and Analysis', () => {
    it('should provide merge statistics', () => {
      // Create multiple merges with different distances
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 5)
      const node4 = model.createNode(100, 5)
      const node5 = model.createNode(0, 15)
      const node6 = model.createNode(100, 15)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!
      const segment3 = model.createSegment(node5.id, node6.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])
      model.createWall('area', [segment3.id])

      service.updateProximityMerges()
      const stats = service.getMergeStatistics()

      expect(stats.totalMerges).toBeGreaterThan(0)
      expect(stats.averageDistance).toBeGreaterThan(0)
      expect(stats.mergesByType.visual).toBeGreaterThan(0)
      expect(stats.oldestMerge).toBeInstanceOf(Date)
      expect(stats.newestMerge).toBeInstanceOf(Date)
    })

    it('should handle empty merge statistics', () => {
      const stats = service.getMergeStatistics()

      expect(stats.totalMerges).toBe(0)
      expect(stats.averageDistance).toBe(0)
      expect(stats.mergesByType).toEqual({})
      expect(stats.oldestMerge).toBeNull()
      expect(stats.newestMerge).toBeNull()
    })
  })

  describe('Threshold Sensitivity', () => {
    it('should respect custom proximity thresholds', () => {
      // Create walls 20 pixels apart
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 20)
      const node4 = model.createNode(100, 20)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])

      // Default threshold (15px) - should not merge
      service.updateProximityMerges()
      expect(service.getActiveMerges()).toHaveLength(0)

      // Increase threshold to 25px - should merge
      service.setProximityThreshold(25)
      service.updateProximityMerges()
      expect(service.getActiveMerges()).toHaveLength(1)
    })

    it('should update merges when threshold changes', () => {
      // Create walls at medium distance
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 18)
      const node4 = model.createNode(100, 18)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])

      // Start with small threshold
      service.setProximityThreshold(10)
      service.updateProximityMerges()
      expect(service.getActiveMerges()).toHaveLength(0)

      // Increase threshold
      service.setProximityThreshold(20)
      service.updateProximityMerges()
      expect(service.getActiveMerges()).toHaveLength(1)

      // Decrease threshold again
      service.setProximityThreshold(10)
      service.updateProximityMerges()
      expect(service.getActiveMerges()).toHaveLength(0)
    })
  })

  describe('Resource Management', () => {
    it('should properly destroy and cleanup', () => {
      service.startProximityChecking()
      
      // Create some merges
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 10)
      const node4 = model.createNode(100, 10)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])

      service.updateProximityMerges()
      expect(service.getActiveMerges()).toHaveLength(1)

      service.destroy()

      expect(mockClearInterval).toHaveBeenCalled()
      expect(service.getActiveMerges()).toHaveLength(0)
    })

    it('should handle refresh operations', () => {
      // Create walls
      const node1 = model.createNode(0, 0)
      const node2 = model.createNode(100, 0)
      const node3 = model.createNode(0, 10)
      const node4 = model.createNode(100, 10)

      const segment1 = model.createSegment(node1.id, node2.id)!
      const segment2 = model.createSegment(node3.id, node4.id)!

      model.createWall('layout', [segment1.id])
      model.createWall('zone', [segment2.id])

      service.refresh()
      expect(service.getActiveMerges()).toHaveLength(1)
    })
  })
})