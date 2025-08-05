import type { Point, WallTypeString } from './types'
import { FloorPlanModel } from './FloorPlanModel'

/**
 * DrawingService handles wall drawing operations and state management
 * Requirements: 2.1, 6.4, 11.4, 14.1
 */
export class DrawingService {
  private model: FloorPlanModel
  private isDrawing = false
  private currentPoints: Point[] = []
  private activeWallType: WallTypeString = 'layout'

  constructor(model: FloorPlanModel) {
    this.model = model
  }

  /**
   * Set the active wall type for drawing
   * Requirements: 2.1
   */
  setActiveWallType(wallType: WallTypeString): void {
    this.activeWallType = wallType
  }

  /**
   * Get the current active wall type
   */
  getActiveWallType(): WallTypeString {
    return this.activeWallType
  }

  /**
   * Start drawing a new wall
   * Requirements: 2.1, 6.4
   */
  startDrawing(point: Point): void {
    this.isDrawing = true
    this.currentPoints = [point]
  }

  /**
   * Add a point to the current drawing
   * Requirements: 6.4, 11.4
   */
  addPoint(point: Point): void {
    if (!this.isDrawing) return

    this.currentPoints.push(point)
  }

  /**
   * Get the current drawing points for visual feedback
   * Requirements: 11.4
   */
  getCurrentPoints(): Point[] {
    return [...this.currentPoints]
  }

  /**
   * Get the current drawing state
   */
  isCurrentlyDrawing(): boolean {
    return this.isDrawing
  }

  /**
   * Complete the current wall drawing and create wall objects
   * Requirements: 2.1, 14.1, 3.1, 3.2, 3.3, 3.4, 3.5
   */
  completeDrawing(): string | null {
    if (!this.isDrawing || this.currentPoints.length < 2) {
      this.cancelDrawing()
      return null
    }

    try {
      // Create nodes for each point
      const nodes = this.currentPoints.map(point => 
        this.model.createNode(point.x, point.y)
      )

      // Create segments between consecutive nodes and process intersections
      const segments = []
      const intersectionModifications: Array<{originalSegmentId: string, newSegmentIds: string[]}> = []

      for (let i = 0; i < nodes.length - 1; i++) {
        const segment = this.model.createSegment(nodes[i].id, nodes[i + 1].id)
        if (segment) {
          segments.push(segment)
          
          // Process intersections for this new segment
          // This will subdivide existing segments that intersect with the new one
          const modifications = this.model.processIntersections(segment.id)
          intersectionModifications.push(...modifications)
        }
      }

      // Create wall with all segments
      if (segments.length > 0) {
        const wall = this.model.createWall(
          this.activeWallType,
          segments.map(s => s.id)
        )

        this.isDrawing = false
        this.currentPoints = []
        
        // Log intersection processing for debugging
        if (intersectionModifications.length > 0) {
          console.log(`Wall drawing completed with ${intersectionModifications.length} intersection modifications`)
        }
        
        return wall.id
      }

      this.cancelDrawing()
      return null
    } catch (error) {
      console.error('Error completing wall drawing:', error)
      this.cancelDrawing()
      return null
    }
  }

  /**
   * Cancel the current drawing operation
   * Requirements: 11.4
   */
  cancelDrawing(): void {
    this.isDrawing = false
    this.currentPoints = []
  }

  /**
   * Get the preview line from last point to current mouse position
   * Requirements: 11.4
   */
  getPreviewLine(currentMousePosition: Point): { start: Point; end: Point } | null {
    if (!this.isDrawing || this.currentPoints.length === 0) {
      return null
    }

    const lastPoint = this.currentPoints[this.currentPoints.length - 1]
    return {
      start: lastPoint,
      end: currentMousePosition
    }
  }

  /**
   * Calculate the total length of the current drawing
   */
  getCurrentDrawingLength(): number {
    if (this.currentPoints.length < 2) return 0

    let totalLength = 0
    for (let i = 0; i < this.currentPoints.length - 1; i++) {
      const p1 = this.currentPoints[i]
      const p2 = this.currentPoints[i + 1]
      totalLength += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    }

    return totalLength
  }

  /**
   * Clear all drawing state (for testing or reset)
   */
  reset(): void {
    this.isDrawing = false
    this.currentPoints = []
    this.activeWallType = 'layout'
  }
}