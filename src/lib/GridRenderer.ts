import * as PIXI from 'pixi.js'

/**
 * Configuration interface for grid rendering
 */
export interface GridConfig {
  /** Grid cell size in pixels */
  cellSize: number
  /** Major grid line interval (every N cells) */
  majorInterval: number
  /** Minor grid line color */
  minorColor: number
  /** Major grid line color */
  majorColor: number
  /** Minor grid line alpha */
  minorAlpha: number
  /** Major grid line alpha */
  majorAlpha: number
  /** Minor grid line width */
  minorWidth: number
  /** Major grid line width */
  majorWidth: number
  /** Whether to show origin axes */
  showOrigin: boolean
  /** Origin axes color */
  originColor: number
  /** Origin axes alpha */
  originAlpha: number
  /** Origin axes width */
  originWidth: number
}

/**
 * Default grid configuration
 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  cellSize: 20,           // 20px grid cells
  majorInterval: 5,       // Major lines every 5 cells (100px)
  minorColor: 0xcccccc,   // Medium gray (more visible)
  majorColor: 0x999999,   // Dark gray (more visible)
  minorAlpha: 0.6,        // More visible minor lines
  majorAlpha: 0.8,        // More visible major lines
  minorWidth: 1,          // Thin minor lines
  majorWidth: 1.5,        // Slightly thicker major lines
  showOrigin: true,       // Show origin axes
  originColor: 0x4444ff,  // Blue origin
  originAlpha: 0.9,       // More visible origin
  originWidth: 2          // Thick origin lines
}

/**
 * GridRenderer handles the rendering of grid lines in PixiJS
 * Requirements: 10.1, 10.2, 10.3
 */
export class GridRenderer {
  private container: PIXI.Container
  private config: GridConfig
  private gridGraphics: PIXI.Graphics
  private isVisible: boolean = false
  private canvasWidth: number = 0
  private canvasHeight: number = 0

  constructor(container: PIXI.Container, config: GridConfig = DEFAULT_GRID_CONFIG) {
    this.container = container
    this.config = { ...config }
    this.gridGraphics = new PIXI.Graphics()
    
    // Set up z-index for grid layer (should be above background but below walls)
    this.gridGraphics.zIndex = 20
    
    // Add to container but start hidden
    this.container.addChild(this.gridGraphics)
    this.gridGraphics.visible = false
  }

  /**
   * Update grid configuration
   * Requirements: 10.2
   * 
   * @param newConfig Partial configuration to update
   */
  updateConfig(newConfig: Partial<GridConfig>): void {
    this.config = { ...this.config, ...newConfig }
    if (this.isVisible) {
      this.render()
    }
  }

  /**
   * Set canvas dimensions for grid rendering
   * Requirements: 10.2
   * 
   * @param width Canvas width in pixels
   * @param height Canvas height in pixels
   */
  setCanvasSize(width: number, height: number): void {
    console.log('🔍 GridRenderer.setCanvasSize() called', {
      width,
      height,
      timestamp: Date.now()
    })
    
    this.canvasWidth = width
    this.canvasHeight = height
    if (this.isVisible) {
      this.render()
    }
  }

  /**
   * Show the grid
   * Requirements: 10.1, 10.5
   */
  show(): void {
    console.log('🔍 GridRenderer.show() called')
    this.isVisible = true
    this.gridGraphics.visible = true
    
    // Debug: Check if graphics are in container
    console.log('🔍 Grid graphics in container:', this.container.children.includes(this.gridGraphics))
    console.log('🔍 Grid graphics visible:', this.gridGraphics.visible)
    console.log('🔍 Grid graphics alpha:', this.gridGraphics.alpha)
    console.log('🔍 Grid graphics zIndex:', this.gridGraphics.zIndex)
    
    this.render()
  }

  /**
   * Hide the grid
   * Requirements: 10.1, 10.3
   */
  hide(): void {
    this.isVisible = false
    this.gridGraphics.visible = false
  }

  /**
   * Toggle grid visibility
   * Requirements: 10.1
   * 
   * @returns New visibility state
   */
  toggle(): boolean {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
    return this.isVisible
  }

  /**
   * Get current visibility state
   * Requirements: 10.5
   */
  getVisibility(): boolean {
    return this.isVisible
  }

  /**
   * Render the grid based on current configuration
   * Requirements: 10.2
   */
  private render(): void {
    console.log('🎨 GridRenderer.render() called', {
      isVisible: this.isVisible,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      timestamp: Date.now()
    })
    
    this.gridGraphics.clear()

    if (!this.isVisible || this.canvasWidth <= 0 || this.canvasHeight <= 0) {
      console.log('🎨 GridRenderer.render() - skipping render', {
        isVisible: this.isVisible,
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight
      })
      return
    }

    // TEST: Add a simple red rectangle to verify rendering is working
    // Use new PixiJS v8 API - render in screen coordinates
    this.gridGraphics.fill({ color: 0xff0000, alpha: 0.8 })
    this.gridGraphics.rect(0, 0, 100, 100)
    console.log('🎨 Added test red rectangle at (0,0) 100x100')

    // Render grid in screen coordinates (not world coordinates)
    // This ensures the grid is always visible regardless of viewport transformation
    this.renderGridInScreenCoordinates()
  }

  /**
   * Render grid in screen coordinates
   */
  private renderGridInScreenCoordinates(): void {
    // Calculate grid bounds in screen coordinates
    const padding = this.config.cellSize * 2
    const startX = -padding
    const endX = this.canvasWidth + padding
    const startY = -padding
    const endY = this.canvasHeight + padding

    // Calculate grid line positions in screen coordinates
    const minorLinesX = this.calculateGridLines(startX, endX, this.config.cellSize)
    const minorLinesY = this.calculateGridLines(startY, endY, this.config.cellSize)
    
    const majorLinesX = minorLinesX.filter((_, index) => index % this.config.majorInterval === 0)
    const majorLinesY = minorLinesY.filter((_, index) => index % this.config.majorInterval === 0)

    // Render minor grid lines
    this.renderGridLines(
      minorLinesX, 
      minorLinesY, 
      startY, 
      endY, 
      startX, 
      endX,
      this.config.minorColor,
      this.config.minorAlpha,
      this.config.minorWidth
    )

    // Render major grid lines
    this.renderGridLines(
      majorLinesX, 
      majorLinesY, 
      startY, 
      endY, 
      startX, 
      endX,
      this.config.majorColor,
      this.config.majorAlpha,
      this.config.majorWidth
    )

    // Render origin axes if enabled
    if (this.config.showOrigin) {
      this.renderOriginAxes(startX, endX, startY, endY)
    }
  }

  /**
   * Calculate grid line positions
   * 
   * @param start Start coordinate
   * @param end End coordinate  
   * @param interval Grid interval
   * @returns Array of grid line positions
   */
  private calculateGridLines(start: number, end: number, interval: number): number[] {
    const lines: number[] = []
    
    // Find the first grid line position
    const firstLine = Math.floor(start / interval) * interval
    
    // Generate grid lines
    for (let pos = firstLine; pos <= end; pos += interval) {
      if (pos >= start) {
        lines.push(pos)
      }
    }
    
    return lines
  }

  /**
   * Render grid lines
   * 
   * @param xLines X positions for vertical lines
   * @param yLines Y positions for horizontal lines
   * @param minY Minimum Y coordinate
   * @param maxY Maximum Y coordinate
   * @param minX Minimum X coordinate
   * @param maxX Maximum X coordinate
   * @param color Line color
   * @param alpha Line alpha
   * @param width Line width
   */
  private renderGridLines(
    xLines: number[],
    yLines: number[],
    minY: number,
    maxY: number,
    minX: number,
    maxX: number,
    color: number,
    alpha: number,
    width: number
  ): void {
    console.log('🎨 Rendering grid lines:', {
      color: `0x${color.toString(16)}`,
      alpha,
      width,
      xLinesCount: xLines.length,
      yLinesCount: yLines.length,
      bounds: { minX, maxX, minY, maxY }
    })
    
    // Use the new PixiJS v8 stroke method
    this.gridGraphics.stroke({
      width,
      color,
      alpha
    })

    // Draw vertical lines
    for (const x of xLines) {
      this.gridGraphics.moveTo(x, minY)
      this.gridGraphics.lineTo(x, maxY)
    }

    // Draw horizontal lines
    for (const y of yLines) {
      this.gridGraphics.moveTo(minX, y)
      this.gridGraphics.lineTo(maxX, y)
    }
  }

  /**
   * Render origin axes (X=0, Y=0 lines)
   * 
   * @param minX Minimum X coordinate
   * @param maxX Maximum X coordinate
   * @param minY Minimum Y coordinate
   * @param maxY Maximum Y coordinate
   */
  private renderOriginAxes(minX: number, maxX: number, minY: number, maxY: number): void {
    // Use the new PixiJS v8 stroke method
    this.gridGraphics.stroke({
      width: this.config.originWidth,
      color: this.config.originColor,
      alpha: this.config.originAlpha
    })

    // X-axis (horizontal line at Y=0)
    if (minY <= 0 && maxY >= 0) {
      this.gridGraphics.moveTo(minX, 0)
      this.gridGraphics.lineTo(maxX, 0)
    }

    // Y-axis (vertical line at X=0)
    if (minX <= 0 && maxX >= 0) {
      this.gridGraphics.moveTo(0, minY)
      this.gridGraphics.lineTo(0, maxY)
    }
  }

  /**
   * Snap a point to the grid
   * Requirements: 10.2
   * 
   * @param point Input point
   * @returns Point snapped to grid
   */
  snapToGrid(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.isVisible) {
      return point // Don't snap if grid is not visible
    }

    const cellSize = this.config.cellSize
    return {
      x: Math.round(point.x / cellSize) * cellSize,
      y: Math.round(point.y / cellSize) * cellSize
    }
  }

  /**
   * Check if a point is close to a grid intersection
   * Requirements: 10.2
   * 
   * @param point Input point
   * @param tolerance Tolerance in pixels
   * @returns True if point is near grid intersection
   */
  isNearGridIntersection(point: { x: number; y: number }, tolerance: number = 5): boolean {
    if (!this.isVisible) {
      return false
    }

    const snapped = this.snapToGrid(point)
    const distance = Math.sqrt(
      Math.pow(point.x - snapped.x, 2) + Math.pow(point.y - snapped.y, 2)
    )
    
    return distance <= tolerance
  }

  /**
   * Get grid statistics
   * Requirements: 10.2
   */
  getGridStats(): {
    cellSize: number
    majorInterval: number
    totalCells: { x: number; y: number }
    visibleCells: { x: number; y: number }
  } {
    const totalCellsX = Math.ceil(this.canvasWidth / this.config.cellSize)
    const totalCellsY = Math.ceil(this.canvasHeight / this.config.cellSize)
    
    return {
      cellSize: this.config.cellSize,
      majorInterval: this.config.majorInterval,
      totalCells: { x: totalCellsX, y: totalCellsY },
      visibleCells: { x: totalCellsX, y: totalCellsY }
    }
  }

  /**
   * Update grid for viewport changes (zoom, pan)
   * Requirements: 10.2
   * 
   * @param viewport Viewport transformation data
   */
  updateViewport(viewport: { 
    scale: number
    translateX: number
    translateY: number
  }): void {
    // Adjust grid rendering based on zoom level
    const baseAlpha = this.config.minorAlpha
    const scaleFactor = Math.max(0.1, Math.min(1, viewport.scale))
    
    // Fade out grid at extreme zoom levels
    if (viewport.scale < 0.5) {
      this.gridGraphics.alpha = baseAlpha * (viewport.scale / 0.5)
    } else if (viewport.scale > 3) {
      this.gridGraphics.alpha = baseAlpha * (3 / viewport.scale)
    } else {
      this.gridGraphics.alpha = baseAlpha
    }

    // Re-render if visible
    if (this.isVisible) {
      this.render()
    }
  }

  /**
   * Get current grid configuration
   * Requirements: 10.2
   */
  getConfig(): GridConfig {
    return { ...this.config }
  }

  /**
   * Cleanup resources
   * Requirements: 10.3
   */
  destroy(): void {
    this.gridGraphics.clear()
    if (this.container.children.includes(this.gridGraphics)) {
      this.container.removeChild(this.gridGraphics)
    }
    this.gridGraphics.destroy()
  }
}