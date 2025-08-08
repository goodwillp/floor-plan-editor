import * as PIXI from 'pixi.js'
import type { Point, WallTypeString } from './types'
// import { WALL_THICKNESS } from './types' // For future use

/**
 * DrawingRenderer handles visual feedback during wall drawing operations
 * Requirements: 6.4, 11.4
 */
export class DrawingRenderer {
  private graphics: PIXI.Graphics
  private previewGraphics: PIXI.Graphics
  private guideGraphics: PIXI.Graphics
  private container: PIXI.Container

  constructor(container: PIXI.Container) {
    this.container = container
    this.graphics = new PIXI.Graphics()
    this.previewGraphics = new PIXI.Graphics()
    this.guideGraphics = new PIXI.Graphics()
    
    // Add graphics to container
    this.container.addChild(this.graphics)
    this.container.addChild(this.previewGraphics)
    this.container.addChild(this.guideGraphics)
    
    // Set z-index for proper layering
    this.graphics.zIndex = 1
    this.previewGraphics.zIndex = 2
    this.guideGraphics.zIndex = 3
  }

  /**
   * Render the current drawing points as connected line segments
   * Requirements: 11.4
   */
  renderCurrentDrawing(points: Point[], wallType: WallTypeString): void {
    this.graphics.clear()
    
    if (points.length < 2) return

    // const thickness = WALL_THICKNESS[wallType] // For future use
    const color = this.getWallTypeColor(wallType)
    
    // Draw line segments between points (Pixi v8)
    this.graphics
      .setStrokeStyle({ width: 3, color, alpha: 0.9 })
      .moveTo(points[0].x, points[0].y)
    for (let i = 0; i < points.length - 1; i++) {
      const end = points[i + 1]
      this.graphics.lineTo(end.x, end.y)
    }
    this.graphics.stroke()

    // Draw nodes at each point
    points.forEach(point => {
      this.graphics
        .setFillStyle({ color, alpha: 0.8 })
        .circle(point.x, point.y, 3)
        .fill()
    })
  }

  /**
   * Render preview line from last point to current mouse position
   * Requirements: 11.4
   */
  renderPreviewLine(start: Point, end: Point, wallType: WallTypeString): void {
    this.previewGraphics.clear()
    
    const color = this.getWallTypeColor(wallType)
    
    // Draw dashed preview line (Pixi v8)
    this.previewGraphics
      .setStrokeStyle({ width: 2, color, alpha: 0.6 })
    this.drawDashedLine(this.previewGraphics, start, end, 5, 5)
    this.previewGraphics.stroke()
    
    // Draw preview end point
    this.previewGraphics
      .setFillStyle({ color, alpha: 0.5 })
      .circle(end.x, end.y, 2)
      .fill()
  }

  /**
   * Clear all drawing visuals
   */
  clear(): void {
    this.graphics.clear()
    this.previewGraphics.clear()
    this.guideGraphics.clear()
  }

  /**
   * Render snapping guide for nearest wall segment and snapped point
   */
  renderSnapGuide(guideStart?: Point, guideEnd?: Point, snappedPoint?: Point): void {
    this.guideGraphics.clear()
    if (guideStart && guideEnd) {
      this.guideGraphics
        .setStrokeStyle({ width: 3, color: 0x3b82f6, alpha: 0.85 })
        .moveTo(guideStart.x, guideStart.y)
        .lineTo(guideEnd.x, guideEnd.y)
        .stroke()
    }
    if (snappedPoint) {
      this.guideGraphics
        .setFillStyle({ color: 0x3b82f6, alpha: 1 })
        .circle(snappedPoint.x, snappedPoint.y, 6)
        .fill()
    }
  }

  /**
   * Get color for wall type
   */
  private getWallTypeColor(wallType: WallTypeString): number {
    switch (wallType) {
      case 'layout':
        return 0x2563eb // Blue
      case 'zone':
        return 0x16a34a // Green
      case 'area':
        return 0xdc2626 // Red
      default:
        return 0x000000 // Black
    }
  }

  /**
   * Draw a dashed line between two points
   */
  private drawDashedLine(
    graphics: PIXI.Graphics,
    start: Point,
    end: Point,
    dashLength: number,
    gapLength: number
  ): void {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return
    
    const unitX = dx / distance
    const unitY = dy / distance
    const segmentLength = dashLength + gapLength
    const numSegments = Math.floor(distance / segmentLength)
    
    for (let i = 0; i < numSegments; i++) {
      const segmentStart = i * segmentLength
      const dashStart = {
        x: start.x + unitX * segmentStart,
        y: start.y + unitY * segmentStart
      }
      const dashEnd = {
        x: start.x + unitX * (segmentStart + dashLength),
        y: start.y + unitY * (segmentStart + dashLength)
      }
      
      graphics.moveTo(dashStart.x, dashStart.y)
      graphics.lineTo(dashEnd.x, dashEnd.y)
    }
    
    // Draw remaining dash if any
    const remainingDistance = distance - numSegments * segmentLength
    if (remainingDistance > 0) {
      const finalDashLength = Math.min(remainingDistance, dashLength)
      const finalStart = {
        x: start.x + unitX * (numSegments * segmentLength),
        y: start.y + unitY * (numSegments * segmentLength)
      }
      const finalEnd = {
        x: finalStart.x + unitX * finalDashLength,
        y: finalStart.y + unitY * finalDashLength
      }
      
      graphics.moveTo(finalStart.x, finalStart.y)
      graphics.lineTo(finalEnd.x, finalEnd.y)
    }
  }

  /**
   * Destroy the renderer and clean up resources
   */
  destroy(): void {
    this.graphics.destroy()
    this.previewGraphics.destroy()
  }
}