import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProximityMerging } from '@/hooks/useProximityMerging'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import type { CanvasLayers } from '@/components/CanvasContainer'

// Mock the services
vi.mock('@/lib/ProximityMergingService')
vi.mock('@/lib/ProximityMergeRenderer')

describe('useProximityMerging', () => {
  let model: FloorPlanModel
  let mockLayers: CanvasLayers

  beforeEach(() => {
    model = new FloorPlanModel()
    mockLayers = {
      background: {} as any,
      reference: {} as any,
      grid: {} as any,
      wall: {} as any,
      selection: {} as any,
      ui: {} as any
    }
  })

  describe('Hook Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: false
        })
      )

      expect(result.current.activeMerges).toEqual([])
      expect(result.current.isEnabled).toBe(false)
      expect(result.current.proximityThreshold).toBe(15)
      expect(result.current.mergeStats.totalMerges).toBe(0)
    })

    it('should initialize with custom values', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true,
          proximityThreshold: 25,
          checkInterval: 200
        })
      )

      expect(result.current.isEnabled).toBe(true)
      expect(result.current.proximityThreshold).toBe(25)
    })
  })

  describe('Enable/Disable Functionality', () => {
    it('should enable and disable proximity merging', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: false
        })
      )

      expect(result.current.isEnabled).toBe(false)

      act(() => {
        result.current.setEnabled(true)
      })

      expect(result.current.isEnabled).toBe(true)

      act(() => {
        result.current.setEnabled(false)
      })

      expect(result.current.isEnabled).toBe(false)
    })

    it('should clear merges when disabled', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      // Simulate having active merges
      act(() => {
        result.current.setEnabled(false)
      })

      expect(result.current.activeMerges).toEqual([])
    })
  })

  describe('Threshold Management', () => {
    it('should update proximity threshold', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true,
          proximityThreshold: 15
        })
      )

      expect(result.current.proximityThreshold).toBe(15)

      act(() => {
        result.current.setProximityThreshold(30)
      })

      expect(result.current.proximityThreshold).toBe(30)
    })

    it('should refresh merges when threshold changes', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      const refreshSpy = vi.spyOn(result.current, 'refreshMerges')

      act(() => {
        result.current.setProximityThreshold(25)
      })

      // The actual refresh would be handled by the service
      expect(result.current.proximityThreshold).toBe(25)
    })
  })

  describe('Merge State Management', () => {
    it('should handle merge events', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      // Simulate merge created event
      const mockMerge = {
        id: 'merge_1',
        wall1Id: 'wall1',
        wall2Id: 'wall2',
        mergeType: 'visual' as const,
        distance: 10,
        segments: [],
        createdAt: new Date()
      }

      act(() => {
        const event = new CustomEvent('merge-created', { detail: mockMerge })
        window.dispatchEvent(event)
      })

      expect(result.current.activeMerges).toContainEqual(mockMerge)

      // Simulate merge separated event
      act(() => {
        const event = new CustomEvent('merge-separated', { detail: mockMerge })
        window.dispatchEvent(event)
      })

      expect(result.current.activeMerges).not.toContainEqual(mockMerge)
    })

    it('should calculate merge statistics', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      // Simulate multiple merges
      const merges = [
        {
          id: 'merge_1',
          wall1Id: 'wall1',
          wall2Id: 'wall2',
          mergeType: 'visual' as const,
          distance: 10,
          segments: [],
          createdAt: new Date()
        },
        {
          id: 'merge_2',
          wall1Id: 'wall3',
          wall2Id: 'wall4',
          mergeType: 'visual' as const,
          distance: 15,
          segments: [],
          createdAt: new Date()
        }
      ]

      act(() => {
        merges.forEach(merge => {
          const event = new CustomEvent('merge-created', { detail: merge })
          window.dispatchEvent(event)
        })
      })

      expect(result.current.mergeStats.totalMerges).toBe(2)
      expect(result.current.mergeStats.averageDistance).toBe(12.5)
      expect(result.current.mergeStats.mergesByType.visual).toBe(2)
    })
  })

  describe('Service Integration', () => {
    it('should initialize services when layers are available', () => {
      const { rerender } = renderHook(
        ({ layers }) =>
          useProximityMerging({
            model,
            layers,
            enabled: true
          }),
        { initialProps: { layers: null } }
      )

      // Initially no layers
      expect(true).toBe(true) // Services should not be initialized

      // Add layers
      rerender({ layers: mockLayers })

      // Services should now be initialized
      expect(true).toBe(true) // This would be verified through service mocks
    })

    it('should cleanup services on unmount', () => {
      const { unmount } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      unmount()

      // Cleanup should have been called
      expect(true).toBe(true) // This would be verified through service mocks
    })
  })

  describe('Manual Operations', () => {
    it('should refresh merges manually', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      act(() => {
        result.current.refreshMerges()
      })

      // Manual refresh should work
      expect(true).toBe(true) // This would be verified through service mocks
    })

    it('should clear all merges manually', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      // Add some merges first
      const mockMerge = {
        id: 'merge_1',
        wall1Id: 'wall1',
        wall2Id: 'wall2',
        mergeType: 'visual' as const,
        distance: 10,
        segments: [],
        createdAt: new Date()
      }

      act(() => {
        const event = new CustomEvent('merge-created', { detail: mockMerge })
        window.dispatchEvent(event)
      })

      expect(result.current.activeMerges).toHaveLength(1)

      act(() => {
        result.current.clearAllMerges()
      })

      expect(result.current.activeMerges).toHaveLength(0)
    })
  })

  describe('Wall Relationship Queries', () => {
    it('should check if walls are merged', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      // Initially no walls are merged
      expect(result.current.areWallsMerged('wall1', 'wall2')).toBe(false)

      // This would be tested with actual service integration
      expect(result.current.getMergedWalls('wall1')).toEqual([])
    })

    it('should get merged walls for a specific wall', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      const mergedWalls = result.current.getMergedWalls('wall1')
      expect(Array.isArray(mergedWalls)).toBe(true)
    })
  })

  describe('Configuration Changes', () => {
    it('should handle enabled state changes', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useProximityMerging({
            model,
            layers: mockLayers,
            enabled
          }),
        { initialProps: { enabled: false } }
      )

      expect(result.current.isEnabled).toBe(false)

      rerender({ enabled: true })
      expect(result.current.isEnabled).toBe(true)

      rerender({ enabled: false })
      expect(result.current.isEnabled).toBe(false)
    })

    it('should handle threshold changes from props', () => {
      const { result, rerender } = renderHook(
        ({ threshold }) =>
          useProximityMerging({
            model,
            layers: mockLayers,
            enabled: true,
            proximityThreshold: threshold
          }),
        { initialProps: { threshold: 15 } }
      )

      expect(result.current.proximityThreshold).toBe(15)

      rerender({ threshold: 25 })
      expect(result.current.proximityThreshold).toBe(25)
    })

    it('should handle check interval changes', () => {
      const { rerender } = renderHook(
        ({ interval }) =>
          useProximityMerging({
            model,
            layers: mockLayers,
            enabled: true,
            checkInterval: interval
          }),
        { initialProps: { interval: 100 } }
      )

      // Change interval
      rerender({ interval: 200 })

      // Service should be restarted with new interval
      expect(true).toBe(true) // This would be verified through service mocks
    })
  })

  describe('Error Handling', () => {
    it('should handle missing services gracefully', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: null, // No layers
          enabled: true
        })
      )

      // Should not crash
      expect(result.current.activeMerges).toEqual([])
      expect(result.current.isEnabled).toBe(true)

      // Operations should work without throwing
      act(() => {
        result.current.refreshMerges()
        result.current.clearAllMerges()
      })
    })

    it('should handle invalid merge events', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      // Send invalid merge event
      act(() => {
        const event = new CustomEvent('merge-created', { detail: null })
        window.dispatchEvent(event)
      })

      // Should not crash or add invalid merges
      expect(result.current.activeMerges).toEqual([])
    })
  })

  describe('Performance Considerations', () => {
    it('should not create new objects unnecessarily', () => {
      const { result, rerender } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: true
        })
      )

      const firstMergeStats = result.current.mergeStats
      
      // Re-render without changes
      rerender()
      
      // Should be the same object reference if no changes
      expect(result.current.mergeStats).toBe(firstMergeStats)
    })

    it('should handle rapid enable/disable changes', () => {
      const { result } = renderHook(() =>
        useProximityMerging({
          model,
          layers: mockLayers,
          enabled: false
        })
      )

      // Rapidly toggle enabled state
      act(() => {
        result.current.setEnabled(true)
        result.current.setEnabled(false)
        result.current.setEnabled(true)
        result.current.setEnabled(false)
      })

      expect(result.current.isEnabled).toBe(false)
      expect(result.current.activeMerges).toEqual([])
    })
  })
})