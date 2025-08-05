import * as PIXI from 'pixi.js'

/**
 * Viewport configuration interface
 */
export interface ViewportConfig {
  /** Minimum zoom level */
  minZoom: number
  /** Maximum zoom level */
  maxZoom: number
  /** Default zoom level */
  defaultZoom: number
  /** Zoom step for wheel scrolling */
  zoomStep: number
  /** Zoom step for UI controls */
  zoomControlStep: number
  /** Enable smooth zoom animation */
  smoothZoom: boolean
  /** Animation duration in ms */
  animationDuration: number
  /** Enable pan bounds */
  enablePanBounds: boolean
  /** Pan bounds (optional) */
  panBounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

/**
 * Default viewport configuration
 */
export const DEFAULT_VIEWPORT_CONFIG: ViewportConfig = {
  minZoom: 0.1,           // 10% zoom out
  maxZoom: 5.0,           // 500% zoom in
  defaultZoom: 1.0,       // 100% default
  zoomStep: 0.1,          // 10% per wheel step
  zoomControlStep: 0.25,  // 25% per UI button
  smoothZoom: true,       // Enable smooth zoom
  animationDuration: 200, // 200ms animation
  enablePanBounds: false, // No pan restrictions by default
}

/**
 * Viewport state interface
 */
export interface ViewportState {
  zoom: number
  panX: number
  panY: number
  canvasWidth: number
  canvasHeight: number
}

/**
 * Viewport event types
 */
export type ViewportEvent = 'zoom-changed' | 'pan-changed' | 'viewport-changed' | 'bounds-changed'

/**
 * Viewport event data
 */
export interface ViewportEventData {
  zoom: number
  panX: number
  panY: number
  canvasWidth: number
  canvasHeight: number
  deltaZoom?: number
  deltaPanX?: number
  deltaPanY?: number
}

/**
 * ViewportService manages zoom and pan functionality for the canvas
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export class ViewportService {
  private config: ViewportConfig
  private state: ViewportState
  private pixiApp: PIXI.Application | null = null
  private eventListeners: Map<ViewportEvent, Set<(data: ViewportEventData) => void>> = new Map()
  private animationId: number | null = null
  private targetState: Partial<ViewportState> | null = null

  constructor(config: ViewportConfig = DEFAULT_VIEWPORT_CONFIG) {
    this.config = { ...config }
    this.state = {
      zoom: config.defaultZoom,
      panX: 0,
      panY: 0,
      canvasWidth: 800,
      canvasHeight: 600
    }
    this.initializeEventListeners()
  }

  /**
   * Initialize event listener maps
   */
  private initializeEventListeners(): void {
    this.eventListeners.set('zoom-changed', new Set())
    this.eventListeners.set('pan-changed', new Set())
    this.eventListeners.set('viewport-changed', new Set())
    this.eventListeners.set('bounds-changed', new Set())
  }

  /**
   * Set the PixiJS application instance
   * Requirements: 12.4
   * 
   * @param app PixiJS Application instance
   */
  setPixiApp(app: PIXI.Application): void {
    this.pixiApp = app
    this.updateCanvasSize(app.screen.width, app.screen.height)
  }

  /**
   * Update canvas size
   * Requirements: 12.4
   * 
   * @param width Canvas width
   * @param height Canvas height
   */
  updateCanvasSize(width: number, height: number): void {
    const oldWidth = this.state.canvasWidth
    const oldHeight = this.state.canvasHeight
    
    this.state.canvasWidth = width
    this.state.canvasHeight = height
    
    if (oldWidth !== width || oldHeight !== height) {
      this.emitEvent('bounds-changed', this.getEventData())
      this.applyViewportTransform()
    }
  }

  /**
   * Get current viewport state
   * Requirements: 12.4
   */
  getState(): ViewportState {
    return { ...this.state }
  }

  /**
   * Get current viewport configuration
   * Requirements: 12.5
   */
  getConfig(): ViewportConfig {
    return { ...this.config }
  }

  /**
   * Update viewport configuration
   * Requirements: 12.5
   * 
   * @param newConfig Partial configuration to update
   */
  updateConfig(newConfig: Partial<ViewportConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Ensure current zoom is within new limits
    this.state.zoom = this.clampZoom(this.state.zoom)
    this.applyViewportTransform()
  }

  /**
   * Zoom to a specific level
   * Requirements: 12.1, 12.3
   * 
   * @param zoom Target zoom level
   * @param centerX Optional zoom center X (defaults to canvas center)
   * @param centerY Optional zoom center Y (defaults to canvas center)
   * @param animate Whether to animate the zoom
   */
  zoomTo(zoom: number, centerX?: number, centerY?: number, animate: boolean = true): void {
    const newZoom = this.clampZoom(zoom)
    const oldZoom = this.state.zoom
    
    if (newZoom === oldZoom) return
    
    // Calculate zoom center
    const zoomCenterX = centerX ?? this.state.canvasWidth / 2
    const zoomCenterY = centerY ?? this.state.canvasHeight / 2
    
    // Calculate new pan position to maintain zoom center
    const zoomFactor = newZoom / oldZoom
    const newPanX = zoomCenterX - (zoomCenterX - this.state.panX) * zoomFactor
    const newPanY = zoomCenterY - (zoomCenterY - this.state.panY) * zoomFactor
    
    if (animate && this.config.smoothZoom) {
      this.animateToState({
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY
      })
    } else {
      this.setState({
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY
      })
    }
  }

  /**
   * Zoom by a delta amount
   * Requirements: 12.1, 12.3
   * 
   * @param deltaZoom Zoom delta (positive = zoom in, negative = zoom out)
   * @param centerX Zoom center X coordinate
   * @param centerY Zoom center Y coordinate
   * @param animate Whether to animate the zoom
   */
  zoomBy(deltaZoom: number, centerX?: number, centerY?: number, animate: boolean = true): void {
    const newZoom = this.state.zoom + deltaZoom
    this.zoomTo(newZoom, centerX, centerY, animate)
  }

  /**
   * Zoom in by configured step
   * Requirements: 12.1
   * 
   * @param centerX Optional zoom center X
   * @param centerY Optional zoom center Y
   */
  zoomIn(centerX?: number, centerY?: number): void {
    this.zoomBy(this.config.zoomControlStep, centerX, centerY)
  }

  /**
   * Zoom out by configured step
   * Requirements: 12.1
   * 
   * @param centerX Optional zoom center X
   * @param centerY Optional zoom center Y
   */
  zoomOut(centerX?: number, centerY?: number): void {
    this.zoomBy(-this.config.zoomControlStep, centerX, centerY)
  }

  /**
   * Reset zoom to default level
   * Requirements: 12.1
   */
  resetZoom(): void {
    this.zoomTo(this.config.defaultZoom, undefined, undefined, true)
  }

  /**
   * Pan to a specific position
   * Requirements: 12.2
   * 
   * @param panX Target pan X coordinate
   * @param panY Target pan Y coordinate
   * @param animate Whether to animate the pan
   */
  panTo(panX: number, panY: number, animate: boolean = true): void {
    const clampedPan = this.clampPan(panX, panY)
    
    if (animate && this.config.smoothZoom) {
      this.animateToState({
        panX: clampedPan.panX,
        panY: clampedPan.panY
      })
    } else {
      this.setState({
        panX: clampedPan.panX,
        panY: clampedPan.panY
      })
    }
  }

  /**
   * Pan by a delta amount
   * Requirements: 12.2
   * 
   * @param deltaPanX Pan delta X
   * @param deltaPanY Pan delta Y
   * @param animate Whether to animate the pan
   */
  panBy(deltaPanX: number, deltaPanY: number, animate: boolean = false): void {
    this.panTo(this.state.panX + deltaPanX, this.state.panY + deltaPanY, animate)
  }

  /**
   * Reset pan to center
   * Requirements: 12.2
   */
  resetPan(): void {
    this.panTo(0, 0, true)
  }

  /**
   * Reset both zoom and pan to defaults
   * Requirements: 12.1, 12.2
   */
  resetViewport(): void {
    if (this.config.smoothZoom) {
      this.animateToState({
        zoom: this.config.defaultZoom,
        panX: 0,
        panY: 0
      })
    } else {
      this.setState({
        zoom: this.config.defaultZoom,
        panX: 0,
        panY: 0
      })
    }
  }

  /**
   * Fit content to viewport
   * Requirements: 12.1, 12.2
   * 
   * @param bounds Content bounds to fit
   * @param padding Optional padding around content
   */
  fitToContent(bounds: { 
    minX: number
    maxX: number
    minY: number
    maxY: number
  }, padding: number = 50): void {
    const contentWidth = bounds.maxX - bounds.minX
    const contentHeight = bounds.maxY - bounds.minY
    
    if (contentWidth <= 0 || contentHeight <= 0) return
    
    const availableWidth = this.state.canvasWidth - (padding * 2)
    const availableHeight = this.state.canvasHeight - (padding * 2)
    
    const scaleX = availableWidth / contentWidth
    const scaleY = availableHeight / contentHeight
    const targetZoom = Math.min(scaleX, scaleY, this.config.maxZoom)
    
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    
    const targetPanX = (this.state.canvasWidth / 2) - (centerX * targetZoom)
    const targetPanY = (this.state.canvasHeight / 2) - (centerY * targetZoom)
    
    this.animateToState({
      zoom: targetZoom,
      panX: targetPanX,
      panY: targetPanY
    })
  }

  /**
   * Convert screen coordinates to world coordinates
   * Requirements: 12.3, 12.4
   * 
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @returns World coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.state.panX) / this.state.zoom,
      y: (screenY - this.state.panY) / this.state.zoom
    }
  }

  /**
   * Convert world coordinates to screen coordinates
   * Requirements: 12.3, 12.4
   * 
   * @param worldX World X coordinate
   * @param worldY World Y coordinate
   * @returns Screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.state.zoom + this.state.panX,
      y: worldY * this.state.zoom + this.state.panY
    }
  }

  /**
   * Check if viewport can zoom in
   * Requirements: 12.5
   */
  canZoomIn(): boolean {
    return this.state.zoom < this.config.maxZoom
  }

  /**
   * Check if viewport can zoom out
   * Requirements: 12.5
   */
  canZoomOut(): boolean {
    return this.state.zoom > this.config.minZoom
  }

  /**
   * Get zoom percentage
   * Requirements: 12.5
   */
  getZoomPercentage(): number {
    return Math.round(this.state.zoom * 100)
  }

  /**
   * Set state and emit events
   * 
   * @param newState Partial state to update
   */
  private setState(newState: Partial<ViewportState>): void {
    const oldState = { ...this.state }
    
    if (newState.zoom !== undefined) {
      this.state.zoom = this.clampZoom(newState.zoom)
    }
    if (newState.panX !== undefined || newState.panY !== undefined) {
      const clampedPan = this.clampPan(
        newState.panX ?? this.state.panX,
        newState.panY ?? this.state.panY
      )
      this.state.panX = clampedPan.panX
      this.state.panY = clampedPan.panY
    }
    if (newState.canvasWidth !== undefined) {
      this.state.canvasWidth = newState.canvasWidth
    }
    if (newState.canvasHeight !== undefined) {
      this.state.canvasHeight = newState.canvasHeight
    }
    
    // Emit specific events
    if (oldState.zoom !== this.state.zoom) {
      this.emitEvent('zoom-changed', this.getEventData({
        deltaZoom: this.state.zoom - oldState.zoom
      }))
    }
    
    if (oldState.panX !== this.state.panX || oldState.panY !== this.state.panY) {
      this.emitEvent('pan-changed', this.getEventData({
        deltaPanX: this.state.panX - oldState.panX,
        deltaPanY: this.state.panY - oldState.panY
      }))
    }
    
    // Always emit viewport-changed for any state change
    this.emitEvent('viewport-changed', this.getEventData())
    
    // Apply transform to PixiJS
    this.applyViewportTransform()
  }

  /**
   * Animate to target state
   * 
   * @param targetState Target state to animate to
   */
  private animateToState(targetState: Partial<ViewportState>): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    const startState = { ...this.state }
    const endState = { ...this.state, ...targetState }
    const startTime = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / this.config.animationDuration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const currentState: Partial<ViewportState> = {}
      
      if (targetState.zoom !== undefined) {
        currentState.zoom = startState.zoom + (endState.zoom - startState.zoom) * easeOut
      }
      if (targetState.panX !== undefined) {
        currentState.panX = startState.panX + (endState.panX - startState.panX) * easeOut
      }
      if (targetState.panY !== undefined) {
        currentState.panY = startState.panY + (endState.panY - startState.panY) * easeOut
      }
      
      this.setState(currentState)
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate)
      } else {
        this.animationId = null
      }
    }
    
    this.animationId = requestAnimationFrame(animate)
  }

  /**
   * Clamp zoom to configured limits
   * 
   * @param zoom Zoom value to clamp
   * @returns Clamped zoom value
   */
  private clampZoom(zoom: number): number {
    return Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom))
  }

  /**
   * Clamp pan to configured bounds
   * 
   * @param panX Pan X to clamp
   * @param panY Pan Y to clamp
   * @returns Clamped pan values
   */
  private clampPan(panX: number, panY: number): { panX: number; panY: number } {
    if (!this.config.enablePanBounds || !this.config.panBounds) {
      return { panX, panY }
    }
    
    const bounds = this.config.panBounds
    return {
      panX: Math.max(bounds.minX, Math.min(bounds.maxX, panX)),
      panY: Math.max(bounds.minY, Math.min(bounds.maxY, panY))
    }
  }

  /**
   * Apply viewport transform to PixiJS stage
   */
  private applyViewportTransform(): void {
    if (!this.pixiApp || !this.pixiApp.stage) return
    
    const stage = this.pixiApp.stage
    if (stage && stage.scale && stage.position) {
      stage.scale.set(this.state.zoom)
      stage.position.set(this.state.panX, this.state.panY)
    }
  }

  /**
   * Get event data for emitting
   * 
   * @param additional Additional event data
   * @returns Event data object
   */
  private getEventData(additional: Partial<ViewportEventData> = {}): ViewportEventData {
    return {
      zoom: this.state.zoom,
      panX: this.state.panX,
      panY: this.state.panY,
      canvasWidth: this.state.canvasWidth,
      canvasHeight: this.state.canvasHeight,
      ...additional
    }
  }

  /**
   * Add event listener
   * Requirements: 12.4
   * 
   * @param event Event type
   * @param callback Event callback
   */
  addEventListener(event: ViewportEvent, callback: (data: ViewportEventData) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.add(callback)
    }
  }

  /**
   * Remove event listener
   * Requirements: 12.4
   * 
   * @param event Event type
   * @param callback Event callback
   */
  removeEventListener(event: ViewportEvent, callback: (data: ViewportEventData) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * Emit event to all listeners
   * 
   * @param event Event type
   * @param data Event data
   */
  private emitEvent(event: ViewportEvent, data: ViewportEventData): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in viewport service event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Cleanup resources
   * Requirements: 12.4
   */
  destroy(): void {
    // Cancel ongoing animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    
    // Clear all event listeners
    this.eventListeners.forEach(listeners => listeners.clear())
    this.eventListeners.clear()
    
    // Clear PixiJS reference
    this.pixiApp = null
  }
}