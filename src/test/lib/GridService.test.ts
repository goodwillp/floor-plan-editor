import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GridService } from '@/lib/GridService'
import { GridRenderer, DEFAULT_GRID_CONFIG, type GridConfig } from '@/lib/GridRenderer'

// Mock GridRenderer
vi.mock('@/lib/GridRenderer', () => ({
  GridRenderer: vi.fn(),
  DEFAULT_GRID_CONFIG: {
    cellSize: 20,
    majorInterval: 5,
    minorColor: 0x888888,
    majorColor: 0x666666,
    minorAlpha: 0.3,
    majorAlpha: 0.5,
    minorWidth: 1,
    majorWidth: 1.5,
    showOrigin: true,
    originColor: 0x4444ff,
    originAlpha: 0.7,
    originWidth: 2
  }
}))

describe('GridService', () => {
  let service: GridService
  let mockRenderer: any

  beforeEach(() => {
    mockRenderer = {
      show: vi.fn(),
      hide: vi.fn(),
      updateConfig: vi.fn(),
      setCanvasSize: vi.fn(),
      snapToGrid: vi.fn((point) => point),
      isNearGridIntersection: vi.fn(() => false),
      getGridStats: vi.fn(() => ({
        cellSize: 20,
        majorInterval: 5,
        totalCells: { x: 40, y: 30 },
        visibleCells: { x: 40, y: 30 }
      })),
      updateViewport: vi.fn(),
      destroy: vi.fn()
    }

    vi.mocked(GridRenderer).mockImplementation(() => mockRenderer)
    
    service = new GridService()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = service.getConfig()
      expect(config).toEqual(DEFAULT_GRID_CONFIG)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<GridConfig> = {
        cellSize: 50,
        minorAlpha: 0.2
      }

      const customService = new GridService({ ...DEFAULT_GRID_CONFIG, ...customConfig })
      const config = customService.getConfig()

      expect(config.cellSize).toBe(50)
      expect(config.minorAlpha).toBe(0.2)
    })

    it('should start with grid invisible by default', () => {
      expect(service.isGridVisible()).toBe(false)
    })

    it('should start with snap enabled by default', () => {
      expect(service.isSnapEnabled()).toBe(false) // Snap requires grid to be visible
    })
  })

  describe('Renderer Management', () => {
    it('should set renderer and apply current state', () => {
      service.setRenderer(mockRenderer)
      
      expect(mockRenderer.hide).toHaveBeenCalled() // Should hide since grid starts invisible
    })

    it('should show renderer if grid is already visible', () => {
      service.setVisibility(true)
      service.setRenderer(mockRenderer)
      
      expect(mockRenderer.show).toHaveBeenCalled()
    })
  })

  describe('Visibility Control', () => {
    beforeEach(() => {
      service.setRenderer(mockRenderer)
    })

    it('should toggle visibility', () => {
      expect(service.isGridVisible()).toBe(false)
      
      const result1 = service.toggleVisibility()
      expect(result1).toBe(true)
      expect(service.isGridVisible()).toBe(true)
      expect(mockRenderer.show).toHaveBeenCalled()
      
      const result2 = service.toggleVisibility()
      expect(result2).toBe(false)
      expect(service.isGridVisible()).toBe(false)
      expect(mockRenderer.hide).toHaveBeenCalled()
    })

    it('should set visibility', () => {
      service.setVisibility(true)
      expect(service.isGridVisible()).toBe(true)
      expect(mockRenderer.show).toHaveBeenCalled()
      
      service.setVisibility(false)
      expect(service.isGridVisible()).toBe(false)
      expect(mockRenderer.hide).toHaveBeenCalled()
    })

    it('should not change state if setting same visibility', () => {
      mockRenderer.show.mockClear()
      mockRenderer.hide.mockClear()
      
      service.setVisibility(false) // Already false
      expect(mockRenderer.show).not.toHaveBeenCalled()
      expect(mockRenderer.hide).not.toHaveBeenCalled()
    })

    it('should emit visibility changed events', () => {
      const listener = vi.fn()
      service.addEventListener('visibility-changed', listener)
      
      service.toggleVisibility()
      
      expect(listener).toHaveBeenCalledWith({ visible: true })
    })
  })

  describe('Configuration Management', () => {
    beforeEach(() => {
      service.setRenderer(mockRenderer)
    })

    it('should update configuration', () => {
      const newConfig: Partial<GridConfig> = {
        cellSize: 30,
        minorAlpha: 0.4
      }

      service.updateConfig(newConfig)
      
      const config = service.getConfig()
      expect(config.cellSize).toBe(30)
      expect(config.minorAlpha).toBe(0.4)
      expect(mockRenderer.updateConfig).toHaveBeenCalledWith(newConfig)
    })

    it('should emit config changed events', () => {
      const listener = vi.fn()
      service.addEventListener('config-changed', listener)
      
      const newConfig = { cellSize: 25 }
      service.updateConfig(newConfig)
      
      expect(listener).toHaveBeenCalledWith({
        oldConfig: expect.objectContaining({ cellSize: 20 }),
        newConfig: expect.objectContaining({ cellSize: 25 }),
        changes: newConfig
      })
    })

    it('should reset configuration to defaults', () => {
      service.updateConfig({ cellSize: 50 })
      service.resetConfig()
      
      expect(service.getConfig()).toEqual(DEFAULT_GRID_CONFIG)
    })

    it('should apply preset configurations', () => {
      service.applyPreset('fine')
      
      const config = service.getConfig()
      expect(config.cellSize).toBe(10)
      expect(config.majorInterval).toBe(10)
    })

    it('should handle invalid preset names', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      service.applyPreset('invalid-preset')
      
      expect(consoleSpy).toHaveBeenCalledWith("Grid preset 'invalid-preset' not found")
      consoleSpy.mockRestore()
    })
  })

  describe('Canvas Size Management', () => {
    beforeEach(() => {
      service.setRenderer(mockRenderer)
    })

    it('should set canvas size', () => {
      service.setCanvasSize(800, 600)
      
      expect(mockRenderer.setCanvasSize).toHaveBeenCalledWith(800, 600)
    })

    it('should handle missing renderer', () => {
      const serviceWithoutRenderer = new GridService()
      
      expect(() => serviceWithoutRenderer.setCanvasSize(800, 600)).not.toThrow()
    })
  })

  describe('Snapping Functionality', () => {
    beforeEach(() => {
      service.setRenderer(mockRenderer)
      service.setVisibility(true) // Enable grid for snapping
    })

    it('should enable and disable snapping', () => {
      service.setSnapEnabled(true)
      expect(service.isSnapEnabled()).toBe(true)
      
      service.setSnapEnabled(false)
      expect(service.isSnapEnabled()).toBe(false)
    })

    it('should emit snap changed events', () => {
      const listener = vi.fn()
      service.addEventListener('snap-changed', listener)
      
      service.setSnapEnabled(false) // Change from default true to false
      expect(listener).toHaveBeenCalledWith({ enabled: false })
      
      service.setSnapEnabled(true) // Change back to true
      expect(listener).toHaveBeenCalledWith({ enabled: true })
    })

    it('should snap points when enabled and grid visible', () => {
      service.setSnapEnabled(true)
      
      const point = { x: 23, y: 37 }
      service.snapPoint(point)
      
      expect(mockRenderer.snapToGrid).toHaveBeenCalledWith(point)
    })

    it('should not snap when grid is invisible', () => {
      service.setVisibility(false)
      service.setSnapEnabled(true)
      
      const point = { x: 23, y: 37 }
      const result = service.snapPoint(point)
      
      expect(result).toBe(point)
      expect(mockRenderer.snapToGrid).not.toHaveBeenCalled()
    })

    it('should not snap when snapping is disabled', () => {
      service.setSnapEnabled(false)
      
      const point = { x: 23, y: 37 }
      const result = service.snapPoint(point)
      
      expect(result).toBe(point)
      expect(mockRenderer.snapToGrid).not.toHaveBeenCalled()
    })

    it('should check grid intersection proximity', () => {
      const point = { x: 42, y: 58 }
      service.isNearGridIntersection(point, 5)
      
      expect(mockRenderer.isNearGridIntersection).toHaveBeenCalledWith(point, 5)
    })

    it('should not check intersection when grid is invisible', () => {
      service.setVisibility(false)
      
      const point = { x: 42, y: 58 }
      const result = service.isNearGridIntersection(point, 5)
      
      expect(result).toBe(false)
      expect(mockRenderer.isNearGridIntersection).not.toHaveBeenCalled()
    })
  })

  describe('Statistics', () => {
    beforeEach(() => {
      service.setRenderer(mockRenderer)
    })

    it('should provide grid statistics', () => {
      service.setVisibility(true)
      service.setSnapEnabled(true)
      
      const stats = service.getGridStats()
      
      expect(stats.visible).toBe(true)
      expect(stats.snapEnabled).toBe(true)
      expect(stats.cellSize).toBe(20)
      expect(stats.majorInterval).toBe(5)
      expect(mockRenderer.getGridStats).toHaveBeenCalled()
    })

    it('should provide default statistics without renderer', () => {
      const serviceWithoutRenderer = new GridService()
      
      const stats = serviceWithoutRenderer.getGridStats()
      
      expect(stats.visible).toBe(false)
      expect(stats.snapEnabled).toBe(true)
      expect(stats.totalCells).toEqual({ x: 0, y: 0 })
    })
  })

  describe('Viewport Updates', () => {
    beforeEach(() => {
      service.setRenderer(mockRenderer)
    })

    it('should update viewport', () => {
      const viewport = {
        scale: 1.5,
        translateX: 100,
        translateY: 50
      }

      service.updateViewport(viewport)
      
      expect(mockRenderer.updateViewport).toHaveBeenCalledWith(viewport)
    })

    it('should handle missing renderer', () => {
      const serviceWithoutRenderer = new GridService()
      
      const viewport = { scale: 1, translateX: 0, translateY: 0 }
      expect(() => serviceWithoutRenderer.updateViewport(viewport)).not.toThrow()
    })
  })

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      service.addEventListener('visibility-changed', listener1)
      service.addEventListener('visibility-changed', listener2)
      
      service.toggleVisibility()
      
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      
      service.removeEventListener('visibility-changed', listener1)
      
      listener1.mockClear()
      listener2.mockClear()
      
      service.toggleVisibility()
      
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should handle errors in event listeners', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error')
      })
      const normalListener = vi.fn()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      service.addEventListener('visibility-changed', errorListener)
      service.addEventListener('visibility-changed', normalListener)
      
      service.toggleVisibility()
      
      expect(consoleSpy).toHaveBeenCalled()
      expect(normalListener).toHaveBeenCalled() // Should still call other listeners
      
      consoleSpy.mockRestore()
    })
  })

  describe('Preset Configurations', () => {
    it('should provide preset configurations', () => {
      const presets = GridService.getPresetConfigs()
      
      expect(presets).toHaveProperty('fine')
      expect(presets).toHaveProperty('normal')
      expect(presets).toHaveProperty('coarse')
      expect(presets).toHaveProperty('architectural')
      
      expect(presets.fine.cellSize).toBe(10)
      expect(presets.normal.cellSize).toBe(20)
      expect(presets.coarse.cellSize).toBe(50)
      expect(presets.architectural.cellSize).toBe(25)
    })

    it('should apply architectural preset correctly', () => {
      service.applyPreset('architectural')
      
      const config = service.getConfig()
      expect(config.cellSize).toBe(25)
      expect(config.majorInterval).toBe(4)
      expect(config.originColor).toBe(0x0066cc)
    })
  })

  describe('Settings Import/Export', () => {
    it('should export current settings', () => {
      service.setVisibility(true)
      service.setSnapEnabled(true)
      service.updateConfig({ cellSize: 30 })
      
      const settings = service.exportSettings()
      
      expect(settings.visible).toBe(true)
      expect(settings.snapEnabled).toBe(true)
      expect(settings.config.cellSize).toBe(30)
    })

    it('should import settings', () => {
      const settings = {
        visible: true,
        snapEnabled: false,
        config: { cellSize: 40, minorAlpha: 0.2 }
      }

      service.importSettings(settings)
      
      expect(service.isGridVisible()).toBe(true)
      expect(service.isSnapEnabled()).toBe(false)
      expect(service.getConfig().cellSize).toBe(40)
      expect(service.getConfig().minorAlpha).toBe(0.2)
    })

    it('should handle partial settings import', () => {
      const settings = {
        visible: true
        // Missing snapEnabled and config
      }

      service.importSettings(settings)
      
      expect(service.isGridVisible()).toBe(true)
      // Other settings should remain unchanged
    })
  })

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      const listener = vi.fn()
      service.addEventListener('visibility-changed', listener)
      service.setRenderer(mockRenderer)
      
      service.destroy()
      
      // Should clear event listeners
      service.toggleVisibility()
      expect(listener).not.toHaveBeenCalled()
      
      // Should destroy renderer
      expect(mockRenderer.destroy).toHaveBeenCalled()
    })

    it('should handle destroy without renderer', () => {
      expect(() => service.destroy()).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle same configuration updates', () => {
      const listener = vi.fn()
      service.addEventListener('config-changed', listener)
      
      service.updateConfig({ cellSize: 20 }) // Same as default
      
      expect(listener).toHaveBeenCalled() // Should still emit event
    })

    it('should handle same snap enabled state', () => {
      const listener = vi.fn()
      service.addEventListener('snap-changed', listener)
      
      service.setSnapEnabled(true) // Default is true
      expect(listener).not.toHaveBeenCalled() // Should not emit if no change
    })

    it('should handle operations without renderer gracefully', () => {
      const serviceWithoutRenderer = new GridService()
      
      expect(() => {
        serviceWithoutRenderer.snapPoint({ x: 10, y: 10 })
        serviceWithoutRenderer.isNearGridIntersection({ x: 10, y: 10 })
        serviceWithoutRenderer.updateViewport({ scale: 1, translateX: 0, translateY: 0 })
      }).not.toThrow()
    })
  })
})