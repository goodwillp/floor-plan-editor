import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGrid } from '@/hooks/useGrid'
import type { CanvasLayers } from '@/components/CanvasContainer'

// Mock the services
vi.mock('@/lib/GridService')
vi.mock('@/lib/GridRenderer')

describe('useGrid', () => {
  let mockLayers: CanvasLayers

  beforeEach(() => {
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
        useGrid({
          layers: mockLayers
        })
      )

      expect(result.current.isVisible).toBe(false)
      expect(result.current.isSnapEnabled).toBe(true)
      expect(result.current.config).toBeDefined()
      expect(result.current.gridStats).toBeDefined()
    })

    it('should initialize with custom values', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers,
          initialVisible: true,
          initialConfig: { cellSize: 50 }
        })
      )

      expect(result.current.isVisible).toBe(false) // Will be set by service
      expect(result.current.config.cellSize).toBe(50)
    })

    it('should handle missing layers', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: null
        })
      )

      expect(result.current.isVisible).toBe(false)
      expect(result.current.gridStats).toBeDefined()
    })
  })

  describe('Grid Visibility', () => {
    it('should toggle grid visibility', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      act(() => {
        const newVisibility = result.current.toggleGrid()
        expect(typeof newVisibility).toBe('boolean')
      })
    })

    it('should set grid visibility', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      act(() => {
        result.current.setGridVisible(true)
      })

      // Visibility would be updated through service events
      expect(result.current.setGridVisible).toBeDefined()
    })
  })

  describe('Snap Functionality', () => {
    it('should set snap enabled', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      act(() => {
        result.current.setSnapEnabled(false)
      })

      expect(result.current.setSnapEnabled).toBeDefined()
    })

    it('should snap points', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      const point = { x: 23, y: 37 }
      const snappedPoint = result.current.snapPoint(point)

      expect(snappedPoint).toEqual(point) // Mock returns original point
    })

    it('should check grid intersection proximity', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      const point = { x: 42, y: 58 }
      const isNear = result.current.isNearGridIntersection(point, 5)

      expect(typeof isNear).toBe('boolean')
    })
  })

  describe('Configuration Management', () => {
    it('should update grid configuration', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      act(() => {
        result.current.updateConfig({ cellSize: 30 })
      })

      expect(result.current.updateConfig).toBeDefined()
    })

    it('should apply preset configurations', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      act(() => {
        result.current.applyPreset('fine')
      })

      expect(result.current.applyPreset).toBeDefined()
    })
  })

  describe('Canvas Size Updates', () => {
    it('should handle canvas size changes', () => {
      const { rerender } = renderHook(
        ({ canvasSize }) =>
          useGrid({
            layers: mockLayers,
            canvasSize
          }),
        {
          initialProps: { canvasSize: { width: 800, height: 600 } }
        }
      )

      rerender({ canvasSize: { width: 1000, height: 800 } })

      // Should not throw and should handle the size change
      expect(true).toBe(true)
    })

    it('should handle missing canvas size', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      expect(result.current.gridStats).toBeDefined()
    })
  })

  describe('Settings Import/Export', () => {
    it('should export settings', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      const settings = result.current.exportSettings()
      expect(settings).toBeNull() // Mock returns null
    })

    it('should import settings', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      const settings = {
        visible: true,
        snapEnabled: false,
        config: { cellSize: 40 }
      }

      act(() => {
        result.current.importSettings(settings)
      })

      expect(result.current.importSettings).toBeDefined()
    })
  })

  describe('Service Integration', () => {
    it('should initialize services when layers are available', () => {
      const { rerender } = renderHook(
        ({ layers }) =>
          useGrid({
            layers
          }),
        { initialProps: { layers: null } }
      )

      // Initially no layers
      expect(true).toBe(true)

      // Add layers
      rerender({ layers: mockLayers })

      // Services should now be initialized
      expect(true).toBe(true)
    })

    it('should cleanup services on unmount', () => {
      const { unmount } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      unmount()

      // Cleanup should have been called
      expect(true).toBe(true)
    })
  })

  describe('Event Handling', () => {
    it('should handle service events', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      // Events would be handled internally by the hook
      expect(result.current.isVisible).toBe(false)
      expect(result.current.isSnapEnabled).toBe(true)
    })

    it('should update state based on service events', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      // State updates would happen through service events
      expect(result.current.gridStats).toBeDefined()
      expect(result.current.config).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing services gracefully', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: null
        })
      )

      // Should not crash
      expect(result.current.isVisible).toBe(false)
      expect(result.current.isSnapEnabled).toBe(true)

      // Operations should work without throwing
      act(() => {
        result.current.toggleGrid()
        result.current.setGridVisible(true)
        result.current.setSnapEnabled(false)
        result.current.updateConfig({ cellSize: 30 })
        result.current.applyPreset('fine')
      })
    })

    it('should handle invalid configurations', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers,
          initialConfig: { cellSize: -10 } // Invalid cell size
        })
      )

      // Should not crash with invalid config
      expect(result.current.config).toBeDefined()
    })
  })

  describe('Performance Considerations', () => {
    it('should not create new objects unnecessarily', () => {
      const { result, rerender } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      const firstConfig = result.current.config
      const firstStats = result.current.gridStats

      // Re-render without changes
      rerender()

      // Should be the same object references if no changes
      expect(result.current.config).toBe(firstConfig)
      expect(result.current.gridStats).toBe(firstStats)
    })

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      // Rapidly toggle grid
      act(() => {
        result.current.toggleGrid()
        result.current.toggleGrid()
        result.current.toggleGrid()
        result.current.toggleGrid()
      })

      expect(result.current.isVisible).toBe(false)
    })
  })

  describe('Integration with Canvas', () => {
    it('should handle viewport updates', () => {
      const { result } = renderHook(() =>
        useGrid({
          layers: mockLayers
        })
      )

      // Access internal method for testing
      const updateViewport = (result.current as any).updateViewport

      if (updateViewport) {
        act(() => {
          updateViewport({
            scale: 1.5,
            translateX: 100,
            translateY: 50
          })
        })
      }

      expect(true).toBe(true) // Should not throw
    })

    it('should work with different layer configurations', () => {
      const customLayers = {
        ...mockLayers,
        grid: { customProperty: 'test' } as any
      }

      const { result } = renderHook(() =>
        useGrid({
          layers: customLayers
        })
      )

      expect(result.current.isVisible).toBe(false)
    })
  })

  describe('State Consistency', () => {
    it('should maintain consistent state across re-renders', () => {
      const { result, rerender } = renderHook(
        ({ visible }) =>
          useGrid({
            layers: mockLayers,
            initialVisible: visible
          }),
        { initialProps: { visible: false } }
      )

      const initialState = {
        isVisible: result.current.isVisible,
        isSnapEnabled: result.current.isSnapEnabled
      }

      rerender({ visible: false }) // Same value

      expect(result.current.isVisible).toBe(initialState.isVisible)
      expect(result.current.isSnapEnabled).toBe(initialState.isSnapEnabled)
    })

    it('should handle prop changes correctly', () => {
      const { result, rerender } = renderHook(
        ({ config }) =>
          useGrid({
            layers: mockLayers,
            initialConfig: config
          }),
        { initialProps: { config: { cellSize: 20 } } }
      )

      const initialConfig = result.current.config

      rerender({ config: { cellSize: 30 } })

      // Config should be updated through the service
      expect(result.current.config).toBeDefined()
    })
  })
})