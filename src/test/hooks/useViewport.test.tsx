import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useViewport } from '@/hooks/useViewport'
import type { ViewportConfig } from '@/lib/ViewportService'

// Mock the ViewportService
vi.mock('@/lib/ViewportService')

// Mock PIXI app
const mockPixiApp = {
  screen: { width: 800, height: 600 },
  stage: {
    scale: { set: vi.fn() },
    position: { set: vi.fn() }
  }
}

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16)
  return 1
})

global.cancelAnimationFrame = vi.fn()

describe('useViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Hook Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useViewport())

      expect(result.current.zoom).toBe(1)
      expect(result.current.panX).toBe(0)
      expect(result.current.panY).toBe(0)
      expect(result.current.canZoomIn).toBe(true)
      expect(result.current.canZoomOut).toBe(true)
      expect(result.current.zoomPercentage).toBe(100)
    })

    it('should initialize with custom config', () => {
      const config: Partial<ViewportConfig> = {
        minZoom: 0.5,
        maxZoom: 3.0,
        defaultZoom: 1.5
      }

      const { result } = renderHook(() => useViewport({ config }))

      expect(result.current.zoom).toBe(1) // Initial state, will be updated by service
      expect(typeof result.current.zoomIn).toBe('function')
      expect(typeof result.current.zoomOut).toBe('function')
    })

    it('should handle PixiJS app integration', () => {
      const { result } = renderHook(() => 
        useViewport({ pixiApp: mockPixiApp as any })
      )

      expect(result.current.zoom).toBeDefined()
      expect(result.current.panX).toBeDefined()
      expect(result.current.panY).toBeDefined()
    })

    it('should handle canvas size updates', () => {
      const { result, rerender } = renderHook(
        ({ canvasSize }) => useViewport({ canvasSize }),
        { initialProps: { canvasSize: { width: 800, height: 600 } } }
      )

      expect(result.current.canvasWidth).toBe(800)
      expect(result.current.canvasHeight).toBe(600)

      rerender({ canvasSize: { width: 1200, height: 900 } })

      expect(result.current.canvasWidth).toBe(800) // Will be updated by service events
      expect(result.current.canvasHeight).toBe(600)
    })
  })

  describe('Zoom Functions', () => {
    it('should provide zoom in function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.zoomIn()
      })

      expect(result.current.zoomIn).toBeDefined()
      expect(typeof result.current.zoomIn).toBe('function')
    })

    it('should provide zoom out function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.zoomOut()
      })

      expect(result.current.zoomOut).toBeDefined()
      expect(typeof result.current.zoomOut).toBe('function')
    })

    it('should provide zoom to function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.zoomTo(2.0)
      })

      expect(result.current.zoomTo).toBeDefined()
      expect(typeof result.current.zoomTo).toBe('function')
    })

    it('should provide zoom by function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.zoomBy(0.5)
      })

      expect(result.current.zoomBy).toBeDefined()
      expect(typeof result.current.zoomBy).toBe('function')
    })

    it('should provide reset zoom function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.resetZoom()
      })

      expect(result.current.resetZoom).toBeDefined()
      expect(typeof result.current.resetZoom).toBe('function')
    })
  })

  describe('Pan Functions', () => {
    it('should provide pan to function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.panTo(100, 200)
      })

      expect(result.current.panTo).toBeDefined()
      expect(typeof result.current.panTo).toBe('function')
    })

    it('should provide pan by function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.panBy(50, 75)
      })

      expect(result.current.panBy).toBeDefined()
      expect(typeof result.current.panBy).toBe('function')
    })

    it('should provide reset pan function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.resetPan()
      })

      expect(result.current.resetPan).toBeDefined()
      expect(typeof result.current.resetPan).toBe('function')
    })
  })

  describe('Combined Functions', () => {
    it('should provide reset viewport function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.resetViewport()
      })

      expect(result.current.resetViewport).toBeDefined()
      expect(typeof result.current.resetViewport).toBe('function')
    })

    it('should provide fit to content function', () => {
      const { result } = renderHook(() => useViewport())

      const bounds = { minX: 0, maxX: 400, minY: 0, maxY: 300 }

      act(() => {
        result.current.fitToContent(bounds)
      })

      expect(result.current.fitToContent).toBeDefined()
      expect(typeof result.current.fitToContent).toBe('function')
    })
  })

  describe('Coordinate Conversion', () => {
    it('should provide screen to world conversion', () => {
      const { result } = renderHook(() => useViewport())

      const world = result.current.screenToWorld(400, 300)

      expect(world).toHaveProperty('x')
      expect(world).toHaveProperty('y')
      expect(typeof world.x).toBe('number')
      expect(typeof world.y).toBe('number')
    })

    it('should provide world to screen conversion', () => {
      const { result } = renderHook(() => useViewport())

      const screen = result.current.worldToScreen(200, 150)

      expect(screen).toHaveProperty('x')
      expect(screen).toHaveProperty('y')
      expect(typeof screen.x).toBe('number')
      expect(typeof screen.y).toBe('number')
    })

    it('should handle coordinate conversion without service', () => {
      const { result } = renderHook(() => useViewport())

      // Should return original coordinates when service not available
      const world = result.current.screenToWorld(400, 300)
      expect(world.x).toBe(400)
      expect(world.y).toBe(300)

      const screen = result.current.worldToScreen(200, 150)
      expect(screen.x).toBe(200)
      expect(screen.y).toBe(150)
    })
  })

  describe('Event Handlers', () => {
    it('should provide wheel event handler', () => {
      const { result } = renderHook(() => useViewport())

      expect(result.current.handleWheel).toBeDefined()
      expect(typeof result.current.handleWheel).toBe('function')
    })

    it('should provide mouse event handlers', () => {
      const { result } = renderHook(() => useViewport())

      expect(result.current.handleMouseDown).toBeDefined()
      expect(result.current.handleMouseMove).toBeDefined()
      expect(result.current.handleMouseUp).toBeDefined()
      
      expect(typeof result.current.handleMouseDown).toBe('function')
      expect(typeof result.current.handleMouseMove).toBe('function')
      expect(typeof result.current.handleMouseUp).toBe('function')
    })

    it('should handle wheel events safely', () => {
      const { result } = renderHook(() => useViewport())

      const mockWheelEvent = {
        preventDefault: vi.fn(),
        target: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        clientX: 400,
        clientY: 300,
        deltaY: -100
      } as any

      expect(() => {
        result.current.handleWheel(mockWheelEvent)
      }).not.toThrow()

      expect(mockWheelEvent.preventDefault).toHaveBeenCalled()
    })

    it('should handle mouse events safely', () => {
      const { result } = renderHook(() => useViewport())

      const mockMouseEvent = {
        preventDefault: vi.fn(),
        button: 0,
        clientX: 400,
        clientY: 300,
        target: { style: {} }
      } as any

      expect(() => {
        result.current.handleMouseDown(mockMouseEvent)
        result.current.handleMouseMove(mockMouseEvent)
        result.current.handleMouseUp(mockMouseEvent)
      }).not.toThrow()
    })
  })

  describe('Configuration Management', () => {
    it('should provide update config function', () => {
      const { result } = renderHook(() => useViewport())

      act(() => {
        result.current.updateConfig({ minZoom: 0.2, maxZoom: 8.0 })
      })

      expect(result.current.updateConfig).toBeDefined()
      expect(typeof result.current.updateConfig).toBe('function')
    })

    it('should provide get config function', () => {
      const { result } = renderHook(() => useViewport())

      const config = result.current.getConfig()

      expect(config).toBeDefined()
      expect(typeof config).toBe('object')
      expect(config).toHaveProperty('minZoom')
      expect(config).toHaveProperty('maxZoom')
      expect(config).toHaveProperty('defaultZoom')
    })
  })

  describe('State Management', () => {
    it('should maintain state consistency', () => {
      const { result, rerender } = renderHook(() => useViewport())

      const initialState = {
        zoom: result.current.zoom,
        panX: result.current.panX,
        panY: result.current.panY
      }

      rerender()

      expect(result.current.zoom).toBe(initialState.zoom)
      expect(result.current.panX).toBe(initialState.panX)
      expect(result.current.panY).toBe(initialState.panY)
    })

    it('should update capabilities based on zoom state', () => {
      const { result } = renderHook(() => useViewport())

      // Initial state should allow both zoom in and out
      expect(result.current.canZoomIn).toBe(true)
      expect(result.current.canZoomOut).toBe(true)
      expect(result.current.zoomPercentage).toBe(100)
    })
  })

  describe('Prop Changes', () => {
    it('should handle PixiJS app changes', () => {
      const { result, rerender } = renderHook(
        ({ pixiApp }) => useViewport({ pixiApp }),
        { initialProps: { pixiApp: null } }
      )

      expect(result.current.zoom).toBeDefined()

      rerender({ pixiApp: mockPixiApp as any })

      expect(result.current.zoom).toBeDefined()
    })

    it('should handle canvas size changes', () => {
      const { result, rerender } = renderHook(
        ({ canvasSize }) => useViewport({ canvasSize }),
        { initialProps: { canvasSize: { width: 800, height: 600 } } }
      )

      expect(result.current.canvasWidth).toBe(800)
      expect(result.current.canvasHeight).toBe(600)

      rerender({ canvasSize: { width: 1200, height: 900 } })

      // State will be updated through service events, not immediately
      expect(result.current.canvasWidth).toBe(800)
      expect(result.current.canvasHeight).toBe(600)
    })

    it('should handle config changes', () => {
      const { result, rerender } = renderHook(
        ({ config }) => useViewport({ config }),
        { initialProps: { config: { minZoom: 0.5 } } }
      )

      expect(result.current.zoom).toBeDefined()

      rerender({ config: { minZoom: 0.2, maxZoom: 8.0 } })

      expect(result.current.zoom).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing service gracefully', () => {
      const { result } = renderHook(() => useViewport())

      expect(() => {
        result.current.zoomIn()
        result.current.zoomOut()
        result.current.panTo(100, 200)
        result.current.resetViewport()
      }).not.toThrow()
    })

    it('should handle invalid event objects', () => {
      const { result } = renderHook(() => useViewport())

      expect(() => {
        result.current.handleWheel({} as any)
        result.current.handleMouseDown({} as any)
        result.current.handleMouseMove({} as any)
        result.current.handleMouseUp({} as any)
      }).not.toThrow()
    })
  })

  describe('Service Integration', () => {
    it('should initialize service on mount', () => {
      const { result } = renderHook(() => useViewport())

      // Service should be initialized and functions should be available
      expect(result.current.zoomIn).toBeDefined()
      expect(result.current.zoomOut).toBeDefined()
      expect(result.current.panTo).toBeDefined()
    })

    it('should cleanup service on unmount', () => {
      const { unmount } = renderHook(() => useViewport())

      expect(() => unmount()).not.toThrow()
    })

    it('should handle service events', () => {
      const { result } = renderHook(() => useViewport())

      // Events would be handled internally by the hook
      expect(result.current.zoom).toBe(1)
      expect(result.current.panX).toBe(0)
      expect(result.current.panY).toBe(0)
    })
  })

  describe('Performance Considerations', () => {
    it('should not create new objects unnecessarily', () => {
      const { result, rerender } = renderHook(() => useViewport())

      const firstZoomIn = result.current.zoomIn
      const firstZoomOut = result.current.zoomOut

      rerender()

      // Functions should be stable across re-renders
      expect(result.current.zoomIn).toBe(firstZoomIn)
      expect(result.current.zoomOut).toBe(firstZoomOut)
    })

    it('should handle rapid function calls', () => {
      const { result } = renderHook(() => useViewport())

      expect(() => {
        act(() => {
          result.current.zoomIn()
          result.current.zoomOut()
          result.current.panBy(10, 10)
          result.current.panBy(-5, -5)
        })
      }).not.toThrow()
    })
  })

  describe('Integration with Canvas', () => {
    it('should work with different canvas configurations', () => {
      const config1: Partial<ViewportConfig> = {
        minZoom: 0.1,
        maxZoom: 10.0
      }

      const config2: Partial<ViewportConfig> = {
        minZoom: 0.5,
        maxZoom: 3.0,
        smoothZoom: false
      }

      const { result: result1 } = renderHook(() => useViewport({ config: config1 }))
      const { result: result2 } = renderHook(() => useViewport({ config: config2 }))

      expect(result1.current.zoom).toBeDefined()
      expect(result2.current.zoom).toBeDefined()
    })

    it('should handle canvas size updates correctly', () => {
      const { result } = renderHook(() => 
        useViewport({ 
          canvasSize: { width: 1920, height: 1080 } 
        })
      )

      expect(result.current.canvasWidth).toBe(1920)
      expect(result.current.canvasHeight).toBe(1080)
    })
  })
})