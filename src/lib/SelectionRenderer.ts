import * as PIXI from 'pixi.js'
import type { Point, Node } from './types'
import { FloorPlanModel } from './FloorPlanModel'

/**
 * Renderer for wall selection highlighting in PixiJS
 * Requirements: 2.2, 2.4, 11.2
 */
export class SelectionRenderer {
  private container: PIXI.Container
  private model: FloorPlanModel
  private selectionGraphics: PIXI.Graphics
  private hoverGraphics: PIXI.Graphics
  private selectedWallIds: Set<string> = new Set()
  private hoveredWallId: string | null = null

  // Selection styling
  private readonly SELECTION_COLOR = 0x0066ff // Blue
  private readonly HOVER_COLOR = 0x00aaff // Light blue
  private readonly SELECTION_WIDTH = 3
  private readonly HOVER_WIDTH = 2
  private readonly SELECTION_ALPHA = 0.7
  private readonly HOVER_ALPHA = 0.5

  constructor(container: PIXI.Container, model: FloorPlanModel) {
    this.container = container
    this.model = model

    // Create graphics objects for selection and hover effects
    this.selectionGraphics = new PIXI.Graphics()
    this.hoverGraphics = new PIXI.Graphics()

    // Add to container with proper z-order
    this.container.addChild(this.hoverGraphics)
    this.container.addChild(this.selectionGraphics)

    // Set interactive properties
    this.selectionGraphics.zIndex = 100 // Above walls
    this.hoverGraphics.zIndex = 99 // Above walls but below selection
  }

  /**
   * Select a wall and highlight it
   * Requirements: 2.2, 11.2
   */
  selectWall(wallId: string): void {
    this.selectedWallIds.add(wallId)
    this.updateSelectionHighlight()
  }

  /**
   * Deselect a wall
   * Requirements: 2.2, 11.2
   */
  deselectWall(wallId: string): void {
    this.selectedWallIds.delete(wallId)
    this.updateSelectionHighlight()
  }

  /**
   * Clear all selections
   * Requirements: 2.2, 11.2
   */
  clearSelection(): void {
    this.selectedWallIds.clear()
    this.updateSelectionHighlight()
  }

  /**
   * Toggle wall selection
   * Requirements: 2.2, 11.2
   */
  toggleWallSelection(wallId: string): boolean {
    if (this.selectedWallIds.has(wallId)) {
      this.deselectWall(wallId)
      return false
    } else {
      this.selectWall(wallId)
      return true
    }
  }

  /**
   * Set hover state for a wall
   * Requirements: 11.2
   */
  setHoveredWall(wallId: string | null): void {
    if (this.hoveredWallId !== wallId) {
      this.hoveredWallId = wallId
      this.updateHoverHighlight()
    }
  }

  /**
   * Get currently selected wall IDs
   * Requirements: 2.2
   */
  getSelectedWalls(): string[] {
    return Array.from(this.selectedWallIds)
  }

  /**
   * Check if a wall is selected
   * Requirements: 2.2
   */
  isWallSelected(wallId: string): boolean {
    return this.selectedWallIds.has(wallId)
  }

  /**
   * Update the selection highlight graphics
   * Requirements: 2.4, 11.2
   */
  private updateSelectionHighlight(): void {
    this.selectionGraphics.clear()

    if (this.selectedWallIds.size === 0) return

    this.selectionGraphics.setStrokeStyle({
      width: this.SELECTION_WIDTH,
      color: this.SELECTION_COLOR,
      alpha: this.SELECTION_ALPHA
    })

    for (const wallId of this.selectedWallIds) {
      this.renderWallHighlight(wallId, this.selectionGraphics)
    }
  }

  /**
   * Update the hover highlight graphics
   * Requirements: 11.2
   */
  private updateHoverHighlight(): void {
    this.hoverGraphics.clear()

    if (!this.hoveredWallId || this.selectedWallIds.has(this.hoveredWallId)) {
      return // Don't show hover for selected walls
    }

    this.hoverGraphics.setStrokeStyle({
      width: this.HOVER_WIDTH,
      color: this.HOVER_COLOR,
      alpha: this.HOVER_ALPHA
    })

    this.renderWallHighlight(this.hoveredWallId, this.hoverGraphics)
  }

  /**
   * Render highlight for a specific wall
   * Requirements: 2.4
   */
  private renderWallHighlight(wallId: string, graphics: PIXI.Graphics): void {
    const wall = this.model.getWall(wallId)
    if (!wall || !wall.visible) return

    const nodes = new Map<string, Node>()
    this.model.getAllNodes().forEach(node => {
      nodes.set(node.id, node)
    })

    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (!segment) continue

      const startNode = nodes.get(segment.startNodeId)
      const endNode = nodes.get(segment.endNodeId)

      if (startNode && endNode) {
        graphics.moveTo(startNode.x, startNode.y)
        graphics.lineTo(endNode.x, endNode.y)
      }
    }
  }

  /**
   * Render selection handles for editing
   * Requirements: 2.3, 2.4
   */
  renderSelectionHandles(): void {
    if (this.selectedWallIds.size !== 1) return // Only show handles for single selection

    const wallId = Array.from(this.selectedWallIds)[0]
    const wall = this.model.getWall(wallId)
    if (!wall) return

    const handleGraphics = new PIXI.Graphics()
    handleGraphics.zIndex = 101 // Above selection highlight

    const nodes = new Map<string, Node>()
    this.model.getAllNodes().forEach(node => {
      nodes.set(node.id, node)
    })

    const wallNodes = new Set<string>()
    
    // Collect all nodes from wall segments
    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        wallNodes.add(segment.startNodeId)
        wallNodes.add(segment.endNodeId)
      }
    }

    // Render handles at each node (Pixi v8)
    handleGraphics.setStrokeStyle({ width: 2, color: this.SELECTION_COLOR, alpha: 1 })

    for (const nodeId of wallNodes) {
      const node = nodes.get(nodeId)
      if (node) {
        handleGraphics
          .setFillStyle({ color: 0xffffff, alpha: 0.9 })
          .circle(node.x, node.y, 4)
          .fill()
      }
    }

    // No endFill in v8; each circle was filled individually
    this.container.addChild(handleGraphics)

    // Store reference for cleanup
    ;(this.selectionGraphics as any)._handles = handleGraphics
  }

  /**
   * Clear selection handles
   * Requirements: 2.3, 2.4
   */
  clearSelectionHandles(): void {
    const handles = (this.selectionGraphics as any)._handles
    if (handles) {
      this.container.removeChild(handles)
      handles.destroy()
      ;(this.selectionGraphics as any)._handles = null
    }
  }

  /**
   * Render a selection rectangle for area selection
   * Requirements: 2.2
   */
  renderSelectionRectangle(startPoint: Point, endPoint: Point): void {
    const rectGraphics = new PIXI.Graphics()
    rectGraphics.zIndex = 102 // Above everything

    const minX = Math.min(startPoint.x, endPoint.x)
    const minY = Math.min(startPoint.y, endPoint.y)
    const width = Math.abs(endPoint.x - startPoint.x)
    const height = Math.abs(endPoint.y - startPoint.y)

    rectGraphics
      .setStrokeStyle({ width: 1, color: 0x0066ff, alpha: 0.8 })
      .setFillStyle({ color: 0x0066ff, alpha: 0.1 })
      .rect(minX, minY, width, height)
      .fill()
      .stroke()

    this.container.addChild(rectGraphics)

    // Store reference for cleanup
    ;(this.hoverGraphics as any)._selectionRect = rectGraphics
  }

  /**
   * Clear selection rectangle
   * Requirements: 2.2
   */
  clearSelectionRectangle(): void {
    const rect = (this.hoverGraphics as any)._selectionRect
    if (rect) {
      this.container.removeChild(rect)
      rect.destroy()
      ;(this.hoverGraphics as any)._selectionRect = null
    }
  }

  /**
   * Update highlights when walls change
   * Requirements: 2.4
   */
  refresh(): void {
    this.updateSelectionHighlight()
    this.updateHoverHighlight()
  }

  /**
   * Set selection styling
   * Requirements: 11.2
   */
  setSelectionStyle(options: {
    color?: number,
    width?: number,
    alpha?: number
  }): void {
    if (options.color !== undefined) {
      (this as any).SELECTION_COLOR = options.color
    }
    if (options.width !== undefined) {
      (this as any).SELECTION_WIDTH = options.width
    }
    if (options.alpha !== undefined) {
      (this as any).SELECTION_ALPHA = options.alpha
    }
    this.updateSelectionHighlight()
  }

  /**
   * Set hover styling
   * Requirements: 11.2
   */
  setHoverStyle(options: {
    color?: number,
    width?: number,
    alpha?: number
  }): void {
    if (options.color !== undefined) {
      (this as any).HOVER_COLOR = options.color
    }
    if (options.width !== undefined) {
      (this as any).HOVER_WIDTH = options.width
    }
    if (options.alpha !== undefined) {
      (this as any).HOVER_ALPHA = options.alpha
    }
    this.updateHoverHighlight()
  }

  /**
   * Cleanup resources
   * Requirements: 2.4
   */
  destroy(): void {
    this.clearSelectionHandles()
    this.clearSelectionRectangle()
    
    if (this.selectionGraphics) {
      this.container.removeChild(this.selectionGraphics)
      this.selectionGraphics.destroy()
    }
    
    if (this.hoverGraphics) {
      this.container.removeChild(this.hoverGraphics)
      this.hoverGraphics.destroy()
    }

    this.selectedWallIds.clear()
    this.hoveredWallId = null
  }
}