import { GridRenderer, type GridConfig, DEFAULT_GRID_CONFIG } from './GridRenderer'

/**
 * Grid service events
 */
export type GridEvent = 'visibility-changed' | 'config-changed' | 'snap-changed'

/**
 * Grid service for managing grid state and configuration
 * Requirements: 10.1, 10.4, 10.5
 */
export class GridService {
  private renderer: GridRenderer | null = null
  private isVisible: boolean = false // Default to inactive (Requirement 10.4)
  private snapEnabled: boolean = true
  private config: GridConfig
  private eventListeners: Map<GridEvent, Set<(data: any) => void>> = new Map()
  private eventDebounceTimers: Map<GridEvent, NodeJS.Timeout> = new Map()
  private lastEmittedVisibility: boolean | null = null

  constructor(config: GridConfig = DEFAULT_GRID_CONFIG) {
    this.config = { ...config }
    this.initializeEventListeners()
  }

  /**
   * Initialize event listener maps
   */
  private initializeEventListeners(): void {
    this.eventListeners.set('visibility-changed', new Set())
    this.eventListeners.set('config-changed', new Set())
    this.eventListeners.set('snap-changed', new Set())
  }

  /**
   * Set the grid renderer instance
   * Requirements: 10.1
   * 
   * @param renderer GridRenderer instance
   */
  setRenderer(renderer: GridRenderer): void {
    this.renderer = renderer
    
    // Apply current state to renderer
    if (this.isVisible) {
      this.renderer.show()
    } else {
      this.renderer.hide()
    }

    // Initialize the last emitted visibility state
    this.lastEmittedVisibility = this.isVisible
  }

  /**
   * Toggle grid visibility
   * Requirements: 10.1, 10.5
   * 
   * @returns New visibility state
   */
  toggleVisibility(): boolean {
    const newVisibility = !this.isVisible
    
    // Only update if visibility actually changed
    if (this.isVisible !== newVisibility) {
      this.isVisible = newVisibility
      
      if (this.renderer) {
        if (this.isVisible) {
          this.renderer.show()
        } else {
          this.renderer.hide()
        }
      }

      // Only emit event if the visibility state has actually changed from last emitted
      if (this.lastEmittedVisibility !== this.isVisible) {
        this.emitEvent('visibility-changed', { visible: this.isVisible })
        this.lastEmittedVisibility = this.isVisible
      }
    }
    
    return this.isVisible
  }

  /**
   * Set grid visibility
   * Requirements: 10.1, 10.3
   * 
   * @param visible Whether grid should be visible
   */
  setVisibility(visible: boolean): void {
    // Only update if visibility actually changed
    if (this.isVisible === visible) return

    this.isVisible = visible
    
    if (this.renderer) {
      if (visible) {
        this.renderer.show()
      } else {
        this.renderer.hide()
      }
    }

    // Only emit event if the visibility state has actually changed from last emitted
    if (this.lastEmittedVisibility !== this.isVisible) {
      this.emitEvent('visibility-changed', { visible: this.isVisible })
      this.lastEmittedVisibility = this.isVisible
    }
  }

  /**
   * Get current visibility state
   * Requirements: 10.5
   */
  isGridVisible(): boolean {
    return this.isVisible
  }

  /**
   * Update grid configuration
   * Requirements: 10.2
   * 
   * @param newConfig Partial configuration to update
   */
  updateConfig(newConfig: Partial<GridConfig>): void {
    const oldConfig = { ...this.config }
    this.config = { ...this.config, ...newConfig }
    
    if (this.renderer) {
      this.renderer.updateConfig(newConfig)
    }

    this.emitEvent('config-changed', { 
      oldConfig, 
      newConfig: this.config,
      changes: newConfig
    })
  }

  /**
   * Get current grid configuration
   * Requirements: 10.2
   */
  getConfig(): GridConfig {
    return { ...this.config }
  }

  /**
   * Reset grid configuration to defaults
   * Requirements: 10.2
   */
  resetConfig(): void {
    this.updateConfig(DEFAULT_GRID_CONFIG)
  }

  /**
   * Set canvas size for grid rendering
   * Requirements: 10.2
   * 
   * @param width Canvas width
   * @param height Canvas height
   */
  setCanvasSize(width: number, height: number): void {
    if (this.renderer) {
      this.renderer.setCanvasSize(width, height)
    }
  }

  /**
   * Enable or disable grid snapping
   * Requirements: 10.2
   * 
   * @param enabled Whether snapping should be enabled
   */
  setSnapEnabled(enabled: boolean): void {
    if (this.snapEnabled === enabled) return

    this.snapEnabled = enabled
    this.emitEvent('snap-changed', { enabled: this.snapEnabled })
  }

  /**
   * Check if grid snapping is enabled
   * Requirements: 10.2
   */
  isSnapEnabled(): boolean {
    return this.snapEnabled && this.isVisible
  }

  /**
   * Snap a point to the grid if snapping is enabled
   * Requirements: 10.2
   * 
   * @param point Input point
   * @returns Snapped point or original point if snapping disabled
   */
  snapPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.isSnapEnabled() || !this.renderer) {
      return point
    }

    return this.renderer.snapToGrid(point)
  }

  /**
   * Check if a point is near a grid intersection
   * Requirements: 10.2
   * 
   * @param point Input point
   * @param tolerance Tolerance in pixels
   * @returns True if point is near grid intersection
   */
  isNearGridIntersection(point: { x: number; y: number }, tolerance: number = 5): boolean {
    if (!this.isVisible || !this.renderer) {
      return false
    }

    return this.renderer.isNearGridIntersection(point, tolerance)
  }

  /**
   * Get grid statistics
   * Requirements: 10.2
   */
  getGridStats(): {
    visible: boolean
    snapEnabled: boolean
    cellSize: number
    majorInterval: number
    totalCells: { x: number; y: number }
    visibleCells: { x: number; y: number }
  } {
    const rendererStats = this.renderer?.getGridStats() || {
      cellSize: this.config.cellSize,
      majorInterval: this.config.majorInterval,
      totalCells: { x: 0, y: 0 },
      visibleCells: { x: 0, y: 0 }
    }

    return {
      visible: this.isVisible,
      snapEnabled: this.snapEnabled,
      ...rendererStats
    }
  }

  /**
   * Update grid for viewport changes
   * Requirements: 10.2
   * 
   * @param viewport Viewport transformation data
   */
  updateViewport(viewport: { 
    scale: number
    translateX: number
    translateY: number
  }): void {
    if (this.renderer) {
      this.renderer.updateViewport(viewport)
    }
  }

  /**
   * Add event listener
   * Requirements: 10.5
   * 
   * @param event Event type
   * @param callback Event callback
   */
  addEventListener(event: GridEvent, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.add(callback)
    }
  }

  /**
   * Remove event listener
   * Requirements: 10.5
   * 
   * @param event Event type
   * @param callback Event callback
   */
  removeEventListener(event: GridEvent, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * Emit event to all listeners with debouncing
   * 
   * @param event Event type
   * @param data Event data
   */
  private emitEvent(event: GridEvent, data: any): void {
    // Clear existing timer for this event
    const existingTimer = this.eventDebounceTimers.get(event)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer to debounce the event
    const timer = setTimeout(() => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(data)
          } catch (error) {
            console.error(`Error in grid service event listener for ${event}:`, error)
          }
        })
      }
      this.eventDebounceTimers.delete(event)
    }, 50) // 50ms debounce delay

    this.eventDebounceTimers.set(event, timer)
  }

  /**
   * Get preset grid configurations
   * Requirements: 10.2
   */
  static getPresetConfigs(): Record<string, GridConfig> {
    return {
      fine: {
        ...DEFAULT_GRID_CONFIG,
        cellSize: 10,
        majorInterval: 10,
        minorAlpha: 0.2,
        majorAlpha: 0.4
      },
      normal: {
        ...DEFAULT_GRID_CONFIG,
        cellSize: 20,
        majorInterval: 5,
        minorAlpha: 0.3,
        majorAlpha: 0.5
      },
      coarse: {
        ...DEFAULT_GRID_CONFIG,
        cellSize: 50,
        majorInterval: 2,
        minorAlpha: 0.4,
        majorAlpha: 0.6
      },
      architectural: {
        ...DEFAULT_GRID_CONFIG,
        cellSize: 25, // 25px = ~1 foot at typical scales
        majorInterval: 4, // Major lines every 100px = ~4 feet
        minorColor: 0x999999,
        majorColor: 0x555555,
        minorAlpha: 0.25,
        majorAlpha: 0.45,
        showOrigin: true,
        originColor: 0x0066cc
      }
    }
  }

  /**
   * Apply a preset configuration
   * Requirements: 10.2
   * 
   * @param presetName Name of preset to apply
   */
  applyPreset(presetName: string): void {
    const presets = GridService.getPresetConfigs()
    const preset = presets[presetName]
    
    if (preset) {
      this.updateConfig(preset)
    } else {
      console.warn(`Grid preset '${presetName}' not found`)
    }
  }

  /**
   * Export current grid settings
   * Requirements: 10.2
   */
  exportSettings(): {
    visible: boolean
    snapEnabled: boolean
    config: GridConfig
  } {
    return {
      visible: this.isVisible,
      snapEnabled: this.snapEnabled,
      config: { ...this.config }
    }
  }

  /**
   * Import grid settings
   * Requirements: 10.2
   * 
   * @param settings Grid settings to import
   */
  importSettings(settings: {
    visible?: boolean
    snapEnabled?: boolean
    config?: Partial<GridConfig>
  }): void {
    if (settings.visible !== undefined) {
      this.setVisibility(settings.visible)
    }
    
    if (settings.snapEnabled !== undefined) {
      this.setSnapEnabled(settings.snapEnabled)
    }
    
    if (settings.config) {
      this.updateConfig(settings.config)
    }
  }

  /**
   * Cleanup resources
   * Requirements: 10.3
   */
  destroy(): void {
    // Clear all event listeners
    this.eventListeners.forEach(listeners => listeners.clear())
    this.eventListeners.clear()

    // Clear all debounce timers
    this.eventDebounceTimers.forEach(timer => clearTimeout(timer))
    this.eventDebounceTimers.clear()

    // Cleanup renderer if we have one
    if (this.renderer) {
      this.renderer.destroy()
      this.renderer = null
    }
  }
}