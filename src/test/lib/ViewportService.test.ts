import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ViewportService, DEFAULT_VIEWPORT_CONFIG, type ViewportConfig } from '@/lib/ViewportService'

// Mock PIXI
const mockPixiApp = {
  screen: { width: 800, height: 600 },
  stage: {
    scale: { set: vi.fn() },
    position: { set: vi.fn() }
  }
}

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16) // 60fps
  return 1
})

global.cancelAnimationFrame = vi.fn()

describe('ViewportService', () => {
  let service: ViewportService
  let mockEventListener: any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ViewportService()
    mockEventListener = vi.fn()
  })

  afterEach(() => {
    service.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = service.getConfig()
      expect(config).toEqual(DEFAULT_VIEWPORT_CONFIG)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<ViewportConfig> = {
        minZoom: 0.5,
        maxZoom: 3.0,
        defaultZoom: 1.5
      }

      const customService = new ViewportService({ ...DEFAULT_VIEWPORT_CONFIG, ...customConfig })
      const config = customService.getConfig()

      expect(config.minZoom).toBe(0.5)
      expect(config.maxZoom).toBe(3.0)
      expect(config.defaultZoom).toBe(1.5)

      customService.destroy()
    })

    it('should start with default state', () => {
      const state = service.getState()
      
      expect(state.zoom).toBe(DEFAULT_VIEWPORT_CONFIG.defaultZoom)
      expect(state.panX).toBe(0)
      expect(state.panY).toBe(0)
      expect(state.canvasWidth).toBe(800)
      expect(state.canvasHeight).toBe(600)
    })

    it('should set PixiJS app correctly', () => {
      service.setPixiApp(mockPixiApp as any)
      
      // Should update canvas size from app screen
      const state = service.getState()
      expect(state.canvasWidth).toBe(800)
      expect(state.canvasHeight).toBe(600)
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<ViewportConfig> = {
        minZoom: 0.2,
        maxZoom: 8.0,
        zoomStep: 0.2
      }

      service.updateConfig(newConfig)
      const config = service.getConfig()

      expect(config.minZoom).toBe(0.2)
      expect(config.maxZoom).toBe(8.0)
      expect(config.zoomStep).toBe(0.2)
    })

    it('should clamp zoom to new limits when config changes', () => {
      // Set zoom above new max limit
      service.zoomTo(3.0, undefined, undefined, false)
      
      // Update config with lower max zoom
      service.updateConfig({ maxZoom: 2.0 })
      
      const state = service.getState()
      expect(state.zoom).toBe(2.0)
    })
  })

  describe('Canvas Size Management', () => {
    it('should update canvas size', () => {
      service.updateCanvasSize(1200, 900)
      
      const state = service.getState()
      expect(state.canvasWidth).toBe(1200)
      expect(state.canvasHeight).toBe(900)
    })

    it('should emit bounds-changed event when canvas size changes', () => {
      service.addEventListener('bounds-changed', mockEventListener)
      
      service.updateCanvasSize(1000, 800)
      
      expect(mockEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          canvasWidth: 1000,
          canvasHeight: 800
        })
      )
    })

    it('should not emit event if size unchanged', () => {
      service.addEventListener('bounds-changed', mockEventListener)
      
      const state = service.getState()
      service.updateCanvasSize(state.canvasWidth, state.canvasHeight)
      
      expect(mockEventListener).not.toHaveBeenCalled()
    })
  })

  describe('Zoom Functionality', () => {
    beforeEach(() => {
      service.setPixiApp(mockPixiApp as any)
    })

    it('should zoom to specific level', () => {
      service.zoomTo(2.0, undefined, undefined, false)
      
      const state = service.getState()
      expect(state.zoom).toBe(2.0)
    })

    it('should clamp zoom to configured limits', () => {
      service.zoomTo(10.0, undefined, undefined, false) // Above max
      expect(service.getState().zoom).toBe(DEFAULT_VIEWPORT_CONFIG.maxZoom)
      
      service.zoomTo(0.01, undefined, undefined, false) // Below min
      expect(service.getState().zoom).toBe(DEFAULT_VIEWPORT_CONFIG.minZoom)
    })

    it('should zoom with cursor center', () => {
      const initialState = service.getState()
      service.zoomTo(2.0, 400, 300, false)
      
      const newState = service.getState()
      expect(newState.zoom).toBe(2.0)
      // Pan should adjust to keep cursor position centered
      expect(newState.panX).not.toBe(initialState.panX)
      expect(newState.panY).not.toBe(initialState.panY)
    })

    it('should zoom by delta amount', () => {
      service.zoomBy(0.5, undefined, undefined, false)
      
      const state = service.getState()
      expect(state.zoom).toBe(1.5) // 1.0 + 0.5
    })

    it('should zoom in by configured step', () => {
      service.zoomIn()
      
      const state = service.getState()
      expect(state.zoom).toBe(1.0 + DEFAULT_VIEWPORT_CONFIG.zoomControlStep)
    })

    it('should zoom out by configured step', () => {
      service.zoomOut()
      
      const state = service.getState()
      expect(state.zoom).toBe(1.0 - DEFAULT_VIEWPORT_CONFIG.zoomControlStep)
    })

    it('should reset zoom to default', () => {
      service.zoomTo(3.0, undefined, undefined, false)
      service.resetZoom()
      
      const state = service.getState()
      expect(state.zoom).toBe(DEFAULT_VIEWPORT_CONFIG.defaultZoom)
    })

    it('should emit zoom-changed events', () => {
      service.addEventListener('zoom-changed', mockEventListener)
      
      service.zoomTo(2.0, undefined, undefined, false)
      
      expect(mockEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          zoom: 2.0,
          deltaZoom: 1.0
        })
      )
    })

    it('should check zoom capabilities correctly', () => {
      // At default zoom, should be able to zoom both ways
      expect(service.canZoomIn()).toBe(true)
      expect(service.canZoomOut()).toBe(true)
      
      // At max zoom, should only be able to zoom out
      service.zoomTo(DEFAULT_VIEWPORT_CONFIG.maxZoom, undefined, undefined, false)
      expect(service.canZoomIn()).toBe(false)
      expect(service.canZoomOut()).toBe(true)
      
      // At min zoom, should only be able to zoom in
      service.zoomTo(DEFAULT_VIEWPORT_CONFIG.minZoom, undefined, undefined, false)
      expect(service.canZoomIn()).toBe(true)
      expect(service.canZoomOut()).toBe(false)
    })

    it('should calculate zoom percentage correctly', () => {
      service.zoomTo(1.5, undefined, undefined, false)
      expect(service.getZoomPercentage()).toBe(150)
      
      service.zoomTo(0.75, undefined, undefined, false)
      expect(service.getZoomPercentage()).toBe(75)
    })
  })

  describe('Pan Functionality', () => {
    beforeEach(() => {
      service.setPixiApp(mockPixiApp as any)
    })

    it('should pan to specific position', () => {
      service.panTo(100, 200, false)
      
      const state = service.getState()
      expect(state.panX).toBe(100)
      expect(state.panY).toBe(200)
    })

    it('should pan by delta amount', () => {
      service.panBy(50, 75, false)
      
      const state = service.getState()
      expect(state.panX).toBe(50)
      expect(state.panY).toBe(75)
    })

    it('should reset pan to center', () => {
      service.panTo(100, 200, false)
      service.resetPan()
      
      const state = service.getState()
      expect(state.panX).toBe(0)
      expect(state.panY).toBe(0)
    })

    it('should emit pan-changed events', () => {
      service.addEventListener('pan-changed', mockEventListener)
      
      service.panTo(100, 150, false)
      
      expect(mockEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          panX: 100,
          panY: 150,
          deltaPanX: 100,
          deltaPanY: 150
        })
      )
    })

    it('should respect pan bounds when enabled', () => {
      service.updateConfig({
        enablePanBounds: true,
        panBounds: { minX: -100, maxX: 100, minY: -50, maxY: 50 }
      })
      
      service.panTo(200, 100, false) // Beyond bounds
      
      const state = service.getState()
      expect(state.panX).toBe(100) // Clamped to max
      expect(state.panY).toBe(50)  // Clamped to max
    })
  })

  describe('Combined Operations', () => {
    beforeEach(() => {
      service.setPixiApp(mockPixiApp as any)
    })

    it('should reset both zoom and pan', () => {
      service.zoomTo(2.0, undefined, undefined, false)
      service.panTo(100, 200, false)
      
      service.resetViewport()
      
      const state = service.getState()
      expect(state.zoom).toBe(DEFAULT_VIEWPORT_CONFIG.defaultZoom)
      expect(state.panX).toBe(0)
      expect(state.panY).toBe(0)
    })

    it('should fit content to viewport', () => {
      const bounds = { minX: 0, maxX: 400, minY: 0, maxY: 300 }
      
      service.fitToContent(bounds, 50)
      
      const state = service.getState()
      expect(state.zoom).toBeGreaterThan(0)
      // Should center the content
      expect(state.panX).not.toBe(0)
      expect(state.panY).not.toBe(0)
    })

    it('should handle empty content bounds gracefully', () => {
      const bounds = { minX: 100, maxX: 100, minY: 100, maxY: 100 }
      const initialState = service.getState()
      
      service.fitToContent(bounds)
      
      const newState = service.getState()
      expect(newState).toEqual(initialState) // Should not change
    })
  })

  describe('Coordinate Conversion', () => {
    beforeEach(() => {
      service.setPixiApp(mockPixiApp as any)
      service.zoomTo(2.0, undefined, undefined, false)
      service.panTo(100, 50, false)
    })

    it('should convert screen to world coordinates', () => {
      const world = service.screenToWorld(300, 200)
      
      // (300 - 100) / 2 = 100, (200 - 50) / 2 = 75
      expect(world.x).toBe(100)
      expect(world.y).toBe(75)
    })

    it('should convert world to screen coordinates', () => {
      const screen = service.worldToScreen(100, 75)
      
      // 100 * 2 + 100 = 300, 75 * 2 + 50 = 200
      expect(screen.x).toBe(300)
      expect(screen.y).toBe(200)
    })

    it('should have consistent round-trip conversion', () => {
      const originalScreen = { x: 400, y: 300 }
      const world = service.screenToWorld(originalScreen.x, originalScreen.y)
      const backToScreen = service.worldToScreen(world.x, world.y)
      
      expect(backToScreen.x).toBe(originalScreen.x)
      expect(backToScreen.y).toBe(originalScreen.y)
    })
  })

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      service.addEventListener('zoom-changed', listener1)
      service.addEventListener('zoom-changed', listener2)
      
      service.zoomTo(2.0, undefined, undefined, false)
      
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      
      service.removeEventListener('zoom-changed', listener1)
      
      listener1.mockClear()
      listener2.mockClear()
      
      service.zoomTo(1.5, undefined, undefined, false)
      
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should emit viewport-changed for any state change', () => {
      service.addEventListener('viewport-changed', mockEventListener)
      
      service.zoomTo(1.5, undefined, undefined, false)
      expect(mockEventListener).toHaveBeenCalled()
      
      mockEventListener.mockClear()
      
      service.panTo(50, 100, false)
      expect(mockEventListener).toHaveBeenCalled()
    })

    it('should handle errors in event listeners gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error')
      })
      const normalListener = vi.fn()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      service.addEventListener('zoom-changed', errorListener)
      service.addEventListener('zoom-changed', normalListener)
      
      service.zoomTo(2.0, undefined, undefined, false)
      
      expect(consoleSpy).toHaveBeenCalled()
      expect(normalListener).toHaveBeenCalled() // Should still call other listeners
      
      consoleSpy.mockRestore()
    })
  })

  describe('PixiJS Integration', () => {
    it('should apply viewport transform to PixiJS stage', () => {
      service.setPixiApp(mockPixiApp as any)
      
      service.zoomTo(2.0, undefined, undefined, false)
      service.panTo(100, 50, false)
      
      expect(mockPixiApp.stage.scale.set).toHaveBeenCalledWith(2.0)
      expect(mockPixiApp.stage.position.set).toHaveBeenCalledWith(100, 50)
    })

    it('should handle missing PixiJS app gracefully', () => {
      // Don't set PixiJS app
      expect(() => {
        service.zoomTo(2.0, undefined, undefined, false)
        service.panTo(100, 50, false)
      }).not.toThrow()
    })
  })

  describe('Animation', () => {
    beforeEach(() => {
      service.setPixiApp(mockPixiApp as any)
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should animate zoom changes when enabled', () => {
      service.updateConfig({ smoothZoom: true, animationDuration: 100 })
      
      service.zoomTo(2.0, undefined, undefined, true)
      
      // Should start animation
      expect(requestAnimationFrame).toHaveBeenCalled()
      
      // Fast-forward time
      vi.advanceTimersByTime(100)
      
      const state = service.getState()
      expect(state.zoom).toBe(2.0)
    })

    it('should skip animation when disabled', () => {
      service.updateConfig({ smoothZoom: false })
      
      service.zoomTo(2.0, undefined, undefined, true)
      
      const state = service.getState()
      expect(state.zoom).toBe(2.0) // Should be immediate
    })

    it('should cancel previous animation when starting new one', () => {
      service.updateConfig({ smoothZoom: true })
      
      service.zoomTo(2.0, undefined, undefined, true)
      service.zoomTo(3.0, undefined, undefined, true)
      
      expect(cancelAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero canvas size', () => {
      service.updateCanvasSize(0, 0)
      
      const state = service.getState()
      expect(state.canvasWidth).toBe(0)
      expect(state.canvasHeight).toBe(0)
    })

    it('should handle negative zoom values', () => {
      service.zoomTo(-1.0, undefined, undefined, false)
      
      const state = service.getState()
      expect(state.zoom).toBe(DEFAULT_VIEWPORT_CONFIG.minZoom) // Should clamp to min
    })

    it('should handle very large zoom values', () => {
      service.zoomTo(1000.0, undefined, undefined, false)
      
      const state = service.getState()
      expect(state.zoom).toBe(DEFAULT_VIEWPORT_CONFIG.maxZoom) // Should clamp to max
    })

    it('should handle extreme pan values', () => {
      service.panTo(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, false)
      
      const state = service.getState()
      expect(state.panX).toBe(Number.MAX_SAFE_INTEGER)
      expect(state.panY).toBe(Number.MIN_SAFE_INTEGER)
    })
  })

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      const listener = vi.fn()
      service.addEventListener('zoom-changed', listener)
      
      service.destroy()
      
      // Should clear event listeners
      service.zoomTo(2.0, undefined, undefined, false)
      expect(listener).not.toHaveBeenCalled()
      
      // Should cancel ongoing animation
      expect(cancelAnimationFrame).toHaveBeenCalled()
    })

    it('should handle destroy without PixiJS app', () => {
      expect(() => service.destroy()).not.toThrow()
    })

    it('should handle multiple destroy calls', () => {
      service.destroy()
      expect(() => service.destroy()).not.toThrow()
    })
  })
})