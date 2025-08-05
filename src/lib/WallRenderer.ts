import * as PIXI from 'pixi.js'
import type { Wall, Segment, Node, WallTypeString } from './types'
import { WALL_THICKNESS } from './types'

/**
 * WallRenderer handles the visual representation of walls with outer shell rendering
 * Requirements: 1.4, 1.5 - Display outer shell and hide core line segments
 */
export class WallRenderer {
  private wallGraphics: Map<string, PIXI.Graphics> = new Map()
  private segmentGraphics: Map<string, PIXI.Graphics> = new Map()

  /**
   * Render a wall with outer shell representation
   * Requirements: 1.4, 1.5
   */
  renderWall(
    wall: Wall,
    segments: Segment[],
    nodes: Map<string, Node>,
    container: PIXI.Container
  ): void {
    // Remove existing graphics if any
    this.removeWallGraphics(wall.id, container)

    if (!wall.visible || segments.length === 0) {
      return
    }

    const graphics = new PIXI.Graphics()
    
    // Set wall style based on type
    const style = this.getWallStyle(wall.type)
    
    // Render outer shell for each segment
    segments.forEach(segment => {
      const startNode = nodes.get(segment.startNodeId)
      const endNode = nodes.get(segment.endNodeId)
      
      if (startNode && endNode) {
        this.renderSegmentOuterShell(
          graphics,
          startNode,
          endNode,
          wall.thickness,
          style
        )
      }
    })

    // Store graphics reference
    this.wallGraphics.set(wall.id, graphics)
    container.addChild(graphics)
  }

  /**
   * Render the outer shell of a segment
   * Requirements: 1.4, 1.5
   */
  private renderSegmentOuterShell(
    graphics: PIXI.Graphics,
    startNode: Node,
    endNode: Node,
    thickness: number,
    style: WallStyle
  ): void {
    // Calculate perpendicular vector for thickness
    const dx = endNode.x - startNode.x
    const dy = endNode.y - startNode.y
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return
    
    // Normalize and get perpendicular vector
    const normalX = -dy / length
    const normalY = dx / length
    
    // Half thickness offset
    const halfThickness = thickness / 2
    const offsetX = normalX * halfThickness
    const offsetY = normalY * halfThickness
    
    // Calculate outer shell points
    const topStart = { x: startNode.x + offsetX, y: startNode.y + offsetY }
    const topEnd = { x: endNode.x + offsetX, y: endNode.y + offsetY }
    const bottomStart = { x: startNode.x - offsetX, y: startNode.y - offsetY }
    const bottomEnd = { x: endNode.x - offsetX, y: endNode.y - offsetY }
    
    // Draw outer shell as filled rectangle
    graphics
      .beginFill(style.fillColor, style.fillAlpha)
      .lineStyle(style.lineWidth, style.lineColor, style.lineAlpha)
      .moveTo(topStart.x, topStart.y)
      .lineTo(topEnd.x, topEnd.y)
      .lineTo(bottomEnd.x, bottomEnd.y)
      .lineTo(bottomStart.x, bottomStart.y)
      .closePath()
      .endFill()
  }

  /**
   * Get visual style for wall type
   * Requirements: 1.1, 1.2, 1.3
   */
  private getWallStyle(wallType: WallTypeString): WallStyle {
    switch (wallType) {
      case 'layout':
        return {
          fillColor: 0x2D3748,      // Dark gray for layout walls (350mm)
          fillAlpha: 0.8,
          lineColor: 0x1A202C,      // Darker border
          lineAlpha: 1.0,
          lineWidth: 2
        }
      case 'zone':
        return {
          fillColor: 0x4A5568,      // Medium gray for zone walls (250mm)
          fillAlpha: 0.7,
          lineColor: 0x2D3748,      // Darker border
          lineAlpha: 1.0,
          lineWidth: 1.5
        }
      case 'area':
        return {
          fillColor: 0x718096,      // Light gray for area walls (150mm)
          fillAlpha: 0.6,
          lineColor: 0x4A5568,      // Darker border
          lineAlpha: 1.0,
          lineWidth: 1
        }
    }
  }

  /**
   * Update wall visual representation
   * Requirements: 1.4, 1.5
   */
  updateWall(
    wall: Wall,
    segments: Segment[],
    nodes: Map<string, Node>,
    container: PIXI.Container
  ): void {
    this.renderWall(wall, segments, nodes, container)
  }

  /**
   * Remove wall graphics from container
   */
  removeWallGraphics(wallId: string, container: PIXI.Container): void {
    const graphics = this.wallGraphics.get(wallId)
    if (graphics) {
      container.removeChild(graphics)
      graphics.destroy()
      this.wallGraphics.delete(wallId)
    }
  }

  /**
   * Hide core line segments (they should not be visible)
   * Requirements: 1.5
   */
  hideSegmentCore(segmentId: string, _container: PIXI.Container): void {
    const graphics = this.segmentGraphics.get(segmentId)
    if (graphics) {
      graphics.visible = false
    }
  }

  /**
   * Show segment core for debugging purposes only
   */
  showSegmentCoreForDebug(
    segment: Segment,
    nodes: Map<string, Node>,
    container: PIXI.Container
  ): void {
    const startNode = nodes.get(segment.startNodeId)
    const endNode = nodes.get(segment.endNodeId)
    
    if (!startNode || !endNode) return

    let graphics = this.segmentGraphics.get(segment.id)
    if (!graphics) {
      graphics = new PIXI.Graphics()
      this.segmentGraphics.set(segment.id, graphics)
      container.addChild(graphics)
    }

    graphics.clear()
    graphics
      .lineStyle(1, 0xFF0000, 0.3) // Red debug line
      .moveTo(startNode.x, startNode.y)
      .lineTo(endNode.x, endNode.y)
  }

  /**
   * Clear all wall graphics
   */
  clearAll(container: PIXI.Container): void {
    // Clear wall graphics
    this.wallGraphics.forEach(graphics => {
      container.removeChild(graphics)
      graphics.destroy()
    })
    this.wallGraphics.clear()

    // Clear segment graphics
    this.segmentGraphics.forEach(graphics => {
      container.removeChild(graphics)
      graphics.destroy()
    })
    this.segmentGraphics.clear()
  }

  /**
   * Get wall thickness for display purposes
   * Requirements: 1.1, 1.2, 1.3
   */
  static getWallThickness(wallType: WallTypeString): number {
    return WALL_THICKNESS[wallType]
  }

  /**
   * Get wall type display name
   */
  static getWallTypeDisplayName(wallType: WallTypeString): string {
    switch (wallType) {
      case 'layout':
        return 'Layout Wall (350mm)'
      case 'zone':
        return 'Zone Wall (250mm)'
      case 'area':
        return 'Area Wall (150mm)'
    }
  }
}

/**
 * Wall visual style interface
 */
interface WallStyle {
  fillColor: number
  fillAlpha: number
  lineColor: number
  lineAlpha: number
  lineWidth: number
}