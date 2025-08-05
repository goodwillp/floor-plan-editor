import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as PIXI from 'pixi.js'
import { GridRenderer, DEFAULT_GRID_CONFIG, type GridConfig } from '@/lib/GridRenderer'

// Mock PIXI
vi.mock('pixi.js', () => ({
  Graphics: vi.fn(() => ({
    clear: vi.fn(),
    lineStyle: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    visible: true,
    alpha: 1,
    zIndex: 0,
    destroy: vi.fn()
  })),
  Container: vi.fn(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    children: []
  }))
}))

describe('GridRenderer', () => {
  let mockContainer: PIXI.Container
  let renderer: GridRenderer
  let mockGraphics: any

  beforeEach(() => {
    mockGraphics = {
      clear: vi.fn(),
      lineStyle: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      visible: true,
      alpha: 1,
      zIndex: 0,
      destroy: vi.fn()
    }

    mockContainer = {
      addChild: vi.fn(),
      removeChild: vi.fn(),
      children: []
    } as any

    // Mock PIXI.Graphics constructor
    vi.mocked(PIXI.Graphics).mockImplementation(() => mockGraphics)

    renderer = new GridRenderer(mockContainer)
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(renderer.getConfig()).toEqual(DEFAULT_GRID_CONFIG)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<GridConfig> = {
        cellSize: 50,
        majorInterval: 3,
        minorColor: 0xff0000
      }

      const customRenderer = new GridRenderer(mockContainer, { ...DEFAULT_GRID_CONFIG, ...customConfig })
      const config = customRenderer.getConfig()

      expect(config.cellSize).toBe(50)
      expect(config.majorInterval).toBe(3)
      expect(config.minorColor).toBe(0xff0000)
    })

    it('should start hidden by default', () => {
      expect(renderer.getVisibility()).toBe(false)
      expect(mockGraphics.visible).toBe(false)
    })

    it('should add graphics to container', () => {
      expect(mockContainer.addChild).toHaveBeenCalledWith(mockGraphics)
    })

    it('should set correct z-index', () => {
      expect(mockGraphics.zIndex).toBe(20)
    })
  })

  describe('Visibility Control', () => {
    it('should show grid', () => {
      renderer.show()
      
      expect(renderer.getVisibility()).toBe(true)
      expect(mockGraphics.visible).toBe(true)
      expect(mockGraphics.clear).toHaveBeenCalled()
    })

    it('should hide grid', () => {
      renderer.show()
      renderer.hide()
      
      expect(renderer.getVisibility()).toBe(false)
      expect(mockGraphics.visible).toBe(false)
    })

    it('should toggle grid visibility', () => {
      expect(renderer.getVisibility()).toBe(false)
      
      const result1 = renderer.toggle()
      expect(result1).toBe(true)
      expect(renderer.getVisibility()).toBe(true)
      
      const result2 = renderer.toggle()
      expect(result2).toBe(false)
      expect(renderer.getVisibility()).toBe(false)
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<GridConfig> = {
        cellSize: 30,
        minorAlpha: 0.5
      }

      renderer.updateConfig(newConfig)
      const config = renderer.getConfig()

      expect(config.cellSize).toBe(30)
      expect(config.minorAlpha).toBe(0.5)
      expect(config.majorInterval).toBe(DEFAULT_GRID_CONFIG.majorInterval) // Should remain unchanged
    })

    it('should re-render when configuration changes and grid is visible', () => {
      renderer.setCanvasSize(800, 600)
      renderer.show()
      
      mockGraphics.clear.mockClear()
      
      renderer.updateConfig({ cellSize: 40 })
      
      expect(mockGraphics.clear).toHaveBeenCalled()
    })

    it('should not render when configuration changes and grid is hidden', () => {
      renderer.setCanvasSize(800, 600)
      
      mockGraphics.clear.mockClear()
      
      renderer.updateConfig({ cellSize: 40 })
      
      expect(mockGraphics.clear).not.toHaveBeenCalled()
    })
  })

  describe('Canvas Size Management', () => {
    it('should set canvas size', () => {
      renderer.setCanvasSize(1000, 800)
      
      // Should trigger re-render if visible
      renderer.show()
      expect(mockGraphics.clear).toHaveBeenCalled()
    })

    it('should re-render when canvas size changes and grid is visible', () => {
      renderer.show()
      mockGraphics.clear.mockClear()
      
      renderer.setCanvasSize(1200, 900)
      
      expect(mockGraphics.clear).toHaveBeenCalled()
    })

    it('should not render with invalid canvas size', () => {
      renderer.setCanvasSize(0, 0)
      renderer.show()
      
      // Should not render lines with zero canvas size
      expect(mockGraphics.lineStyle).not.toHaveBeenCalled()
    })
  })

  describe('Grid Snapping', () => {
    beforeEach(() => {
      renderer.show() // Grid must be visible for snapping
    })

    it('should snap point to grid', () => {
      const point = { x: 23, y: 37 }
      const snapped = renderer.snapToGrid(point)
      
      // With default 20px grid, should snap to nearest 20px boundary
      expect(snapped).toEqual({ x: 20, y: 40 })
    })

    it('should snap to exact grid points', () => {
      const point = { x: 40, y: 60 }
      const snapped = renderer.snapToGrid(point)
      
      expect(snapped).toEqual({ x: 40, y: 60 }) // Already on grid
    })

    it('should not snap when grid is hidden', () => {
      renderer.hide()
      
      const point = { x: 23, y: 37 }
      const snapped = renderer.snapToGrid(point)
      
      expect(snapped).toEqual(point) // Should return original point
    })

    it('should detect points near grid intersections', () => {
      const nearPoint = { x: 42, y: 58 } // Close to (40, 60)
      const farPoint = { x: 30, y: 30 } // Far from grid intersection
      
      expect(renderer.isNearGridIntersection(nearPoint, 5)).toBe(true)
      expect(renderer.isNearGridIntersection(farPoint, 5)).toBe(false)
    })

    it('should not detect intersections when grid is hidden', () => {
      renderer.hide()
      
      const nearPoint = { x: 42, y: 58 }
      expect(renderer.isNearGridIntersection(nearPoint, 5)).toBe(false)
    })
  })

  describe('Grid Statistics', () => {
    it('should provide grid statistics', () => {
      renderer.setCanvasSize(800, 600)
      
      const stats = renderer.getGridStats()
      
      expect(stats.cellSize).toBe(DEFAULT_GRID_CONFIG.cellSize)
      expect(stats.majorInterval).toBe(DEFAULT_GRID_CONFIG.majorInterval)
      expect(stats.totalCells.x).toBe(Math.ceil(800 / DEFAULT_GRID_CONFIG.cellSize))
      expect(stats.totalCells.y).toBe(Math.ceil(600 / DEFAULT_GRID_CONFIG.cellSize))
    })

    it('should handle zero canvas size', () => {
      renderer.setCanvasSize(0, 0)
      
      const stats = renderer.getGridStats()
      
      expect(stats.totalCells.x).toBe(0)
      expect(stats.totalCells.y).toBe(0)
    })
  })

  describe('Viewport Updates', () => {
    beforeEach(() => {
      renderer.setCanvasSize(800, 600)
      renderer.show()
    })

    it('should update viewport and adjust rendering', () => {
      const viewport = {
        scale: 0.5,
        translateX: 100,
        translateY: 50
      }

      mockGraphics.clear.mockClear()
      
      renderer.updateViewport(viewport)
      
      expect(mockGraphics.clear).toHaveBeenCalled()
    })

    it('should adjust alpha based on zoom level', () => {
      const viewportZoomedOut = {
        scale: 0.3,
        translateX: 0,
        translateY: 0
      }

      renderer.updateViewport(viewportZoomedOut)
      
      // Should reduce alpha for very small zoom levels
      expect(mockGraphics.alpha).toBeLessThan(DEFAULT_GRID_CONFIG.minorAlpha)
    })

    it('should adjust alpha for high zoom levels', () => {
      const viewportZoomedIn = {
        scale: 5,
        translateX: 0,
        translateY: 0
      }

      renderer.updateViewport(viewportZoomedIn)
      
      // Should reduce alpha for very high zoom levels
      expect(mockGraphics.alpha).toBeLessThan(DEFAULT_GRID_CONFIG.minorAlpha)
    })

    it('should maintain normal alpha for moderate zoom levels', () => {
      const viewportNormal = {
        scale: 1,
        translateX: 0,
        translateY: 0
      }

      renderer.updateViewport(viewportNormal)
      
      expect(mockGraphics.alpha).toBe(DEFAULT_GRID_CONFIG.minorAlpha)
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      renderer.setCanvasSize(400, 300)
      renderer.show()
    })

    it('should clear graphics before rendering', () => {
      expect(mockGraphics.clear).toHaveBeenCalled()
    })

    it('should set line style for minor lines', () => {
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(
        DEFAULT_GRID_CONFIG.minorWidth,
        DEFAULT_GRID_CONFIG.minorColor,
        DEFAULT_GRID_CONFIG.minorAlpha
      )
    })

    it('should set line style for major lines', () => {
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(
        DEFAULT_GRID_CONFIG.majorWidth,
        DEFAULT_GRID_CONFIG.majorColor,
        DEFAULT_GRID_CONFIG.majorAlpha
      )
    })

    it('should draw origin axes when enabled', () => {
      const configWithOrigin: Partial<GridConfig> = {
        showOrigin: true
      }
      
      const rendererWithOrigin = new GridRenderer(mockContainer, { ...DEFAULT_GRID_CONFIG, ...configWithOrigin })
      rendererWithOrigin.setCanvasSize(400, 300)
      rendererWithOrigin.show()
      
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(
        DEFAULT_GRID_CONFIG.originWidth,
        DEFAULT_GRID_CONFIG.originColor,
        DEFAULT_GRID_CONFIG.originAlpha
      )
    })

    it('should not draw origin axes when disabled', () => {
      const configWithoutOrigin: Partial<GridConfig> = {
        showOrigin: false
      }
      
      // Clear previous calls
      mockGraphics.lineStyle.mockClear()
      
      const rendererWithoutOrigin = new GridRenderer(mockContainer, { ...DEFAULT_GRID_CONFIG, ...configWithoutOrigin })
      rendererWithoutOrigin.setCanvasSize(400, 300)
      rendererWithoutOrigin.show()
      
      // Check that origin parameters were not used in any call
      const originCalls = mockGraphics.lineStyle.mock.calls.filter(call => 
        call[0] === DEFAULT_GRID_CONFIG.originWidth &&
        call[1] === DEFAULT_GRID_CONFIG.originColor &&
        call[2] === DEFAULT_GRID_CONFIG.originAlpha
      )
      
      expect(originCalls).toHaveLength(0)
    })

    it('should draw grid lines', () => {
      // Should call moveTo and lineTo for drawing lines
      expect(mockGraphics.moveTo).toHaveBeenCalled()
      expect(mockGraphics.lineTo).toHaveBeenCalled()
    })
  })

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      renderer.destroy()
      
      expect(mockGraphics.clear).toHaveBeenCalled()
      expect(mockGraphics.destroy).toHaveBeenCalled()
    })

    it('should remove graphics from container on destroy', () => {
      // Mock container children to include our graphics
      mockContainer.children = [mockGraphics]
      
      renderer.destroy()
      
      expect(mockContainer.removeChild).toHaveBeenCalledWith(mockGraphics)
    })

    it('should handle destroy when graphics not in container', () => {
      // Empty container
      mockContainer.children = []
      
      expect(() => renderer.destroy()).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative coordinates', () => {
      const point = { x: -15, y: -25 }
      renderer.show()
      
      const snapped = renderer.snapToGrid(point)
      
      expect(snapped.x).toBe(-20) // Should snap to nearest grid point
      expect(snapped.y).toBe(-20)
    })

    it('should handle very large coordinates', () => {
      const point = { x: 10000, y: 10000 }
      renderer.show()
      
      const snapped = renderer.snapToGrid(point)
      
      expect(snapped.x % DEFAULT_GRID_CONFIG.cellSize).toBe(0)
      expect(snapped.y % DEFAULT_GRID_CONFIG.cellSize).toBe(0)
    })

    it('should handle zero tolerance for intersection detection', () => {
      renderer.show()
      const exactPoint = { x: 40, y: 60 } // Exactly on grid
      
      expect(renderer.isNearGridIntersection(exactPoint, 0)).toBe(true)
    })

    it('should handle very small canvas sizes', () => {
      renderer.setCanvasSize(1, 1)
      renderer.show()
      
      const stats = renderer.getGridStats()
      expect(stats.totalCells.x).toBeGreaterThan(0)
      expect(stats.totalCells.y).toBeGreaterThan(0)
    })
  })
})