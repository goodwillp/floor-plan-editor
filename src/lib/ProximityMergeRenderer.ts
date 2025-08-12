import * as PIXI from 'pixi.js'
import type { Point, Wall } from './types'
import type { ProximityMerge } from './ProximityMergingService'
import { FloorPlanModel } from './FloorPlanModel'

/**
 * Renderer for proximity-based wall merging visual effects
 * Requirements: 5.2, 5.3, 5.4
 */
export class ProximityMergeRenderer {
  private container: PIXI.Container
  private model: FloorPlanModel
  private mergeGraphics: Map<string, PIXI.Graphics> = new Map()
  private animationFrame: number | null = null

  // Visual styling
  private readonly MERGE_COLOR = 0x00ff00 // Green for merge connections
  private readonly MERGE_ALPHA = 0.6
  private readonly MERGE_WIDTH = 2
  private readonly PULSE_SPEED = 0.05
  private readonly PULSE_MIN_ALPHA = 0.3
  private readonly PULSE_MAX_ALPHA = 0.8

  constructor(container: PIXI.Container, model: FloorPlanModel) {
    this.container = container
    this.model = model

    // Set up z-index for merge graphics
    this.container.zIndex = 45 // Between wall (30) and selection (50)

    // Listen for merge events
    this.setupEventListeners()
  }

  /**
   * Set up event listeners for merge events
   * Requirements: 5.3, 5.4
   */
  private setupEventListeners(): void {
    window.addEventListener('merge-created' as any, this.handleMergeCreated as unknown as EventListener)
    window.addEventListener('merge-separated' as any, this.handleMergeSeparated as unknown as EventListener)
  }

  /**
   * Handle merge created event
   * Requirements: 5.3
   */
  private handleMergeCreated(event: Event): void {
    const merge = (event as CustomEvent).detail as ProximityMerge
    this.renderMerge(merge)
  }

  /**
   * Handle merge separated event
   * Requirements: 5.4
   */
  private handleMergeSeparated(event: Event): void {
    const merge = (event as CustomEvent).detail as ProximityMerge
    this.removeMerge(merge.id)
  }

  /**
   * Render a proximity merge visually
   * Requirements: 5.2, 5.3
   * 
   * @param merge The proximity merge to render
   */
  renderMerge(merge: ProximityMerge): void {
    // Remove existing merge graphics if any
    this.removeMerge(merge.id)

    const graphics = new PIXI.Graphics()
    graphics.alpha = this.MERGE_ALPHA

    // Get wall information
    const wall1 = this.model.getWall(merge.wall1Id)
    const wall2 = this.model.getWall(merge.wall2Id)

    if (!wall1 || !wall2) return

    // Render merge connections for each segment pair
    for (const segmentPair of merge.segments) {
      this.renderSegmentMerge(graphics, segmentPair, wall1, wall2)
    }

    // Add to container and store reference
    this.container.addChild(graphics)
    this.mergeGraphics.set(merge.id, graphics)

    // Start pulsing animation if not already running
    if (!this.animationFrame) {
      this.startPulseAnimation()
    }
  }

  /**
   * Render merge connection between two segments
   * Requirements: 5.2, 5.3
   */
  private renderSegmentMerge(
    graphics: PIXI.Graphics,
    segmentPair: { seg1Id: string; seg2Id: string; distance: number; mergePoints: Point[] },
    wall1: Wall,
    wall2: Wall
  ): void {
    const seg1 = this.model.getSegment(segmentPair.seg1Id)
    const seg2 = this.model.getSegment(segmentPair.seg2Id)

    if (!seg1 || !seg2) return

    const nodes = new Map()
    this.model.getAllNodes().forEach(node => nodes.set(node.id, node))

    const start1 = nodes.get(seg1.startNodeId)
    const end1 = nodes.get(seg1.endNodeId)
    const start2 = nodes.get(seg2.startNodeId)
    const end2 = nodes.get(seg2.endNodeId)

    if (!start1 || !end1 || !start2 || !end2) return

    // Determine merge visualization style based on wall types
    const mergeColor = this.getMergeColor(wall1, wall2)
    const mergeWidth = this.getMergeWidth(segmentPair.distance)

    graphics.setStrokeStyle({ width: mergeWidth, color: mergeColor, alpha: this.MERGE_ALPHA })

    // Method 1: Connect merge points if available
      if (segmentPair.mergePoints.length >= 2) {
      for (let i = 0; i < segmentPair.mergePoints.length - 1; i++) {
        const point1 = segmentPair.mergePoints[i]
        const point2 = segmentPair.mergePoints[i + 1]
        
        graphics.moveTo(point1.x, point1.y)
        graphics.lineTo(point2.x, point2.y)
      }
        graphics.stroke()
    } else {
      // Method 2: Connect closest points between segments
      const closestPoints = this.findClosestPointsBetweenSegments(
        { start: start1, end: end1 },
        { start: start2, end: end2 }
      )

        if (closestPoints) {
        graphics.moveTo(closestPoints.point1.x, closestPoints.point1.y)
        graphics.lineTo(closestPoints.point2.x, closestPoints.point2.y)
          graphics.stroke()
      }
    }

    // Add visual indicators at merge points
    this.renderMergeIndicators(graphics, segmentPair.mergePoints, mergeColor)
  }

  /**
   * Find closest points between two line segments
   * Requirements: 5.2
   */
  private findClosestPointsBetweenSegments(
    seg1: { start: Point; end: Point },
    seg2: { start: Point; end: Point }
  ): { point1: Point; point2: Point; distance: number } | null {
    const combinations = [
      { p1: seg1.start, p2: seg2.start },
      { p1: seg1.start, p2: seg2.end },
      { p1: seg1.end, p2: seg2.start },
      { p1: seg1.end, p2: seg2.end }
    ]

    let closest = null
    let minDistance = Infinity

    for (const combo of combinations) {
      const distance = Math.sqrt(
        Math.pow(combo.p1.x - combo.p2.x, 2) + Math.pow(combo.p1.y - combo.p2.y, 2)
      )

      if (distance < minDistance) {
        minDistance = distance
        closest = {
          point1: combo.p1,
          point2: combo.p2,
          distance
        }
      }
    }

    return closest
  }

  /**
   * Render small indicators at merge points
   * Requirements: 5.3
   */
  private renderMergeIndicators(graphics: PIXI.Graphics, mergePoints: Point[], color: number): void {
    for (const point of mergePoints) {
      graphics
        .setFillStyle({ color, alpha: this.MERGE_ALPHA * 0.8 })
        .circle(point.x, point.y, 3)
        .fill()
    }
  }

  /**
   * Get merge color based on wall types
   * Requirements: 5.5
   */
  private getMergeColor(wall1: Wall, wall2: Wall): number {
    // Different colors for different wall type combinations
    if (wall1.type === wall2.type) {
      // Same type - green
      return 0x00ff00
    } else {
      // Different types - yellow
      return 0xffff00
    }
  }

  /**
   * Get merge line width based on distance
   * Requirements: 5.2
   */
  private getMergeWidth(distance: number): number {
    // Thicker lines for closer walls
    const maxWidth = 4
    const minWidth = 1
    const maxDistance = 20

    const normalizedDistance = Math.min(distance / maxDistance, 1)
    return maxWidth - (normalizedDistance * (maxWidth - minWidth))
  }

  /**
   * Remove merge visualization
   * Requirements: 5.4
   */
  removeMerge(mergeId: string): void {
    const graphics = this.mergeGraphics.get(mergeId)
    if (graphics) {
      this.container.removeChild(graphics)
      graphics.destroy()
      this.mergeGraphics.delete(mergeId)
    }

    // Stop animation if no more merges
    if (this.mergeGraphics.size === 0 && this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  /**
   * Start pulsing animation for merge indicators
   * Requirements: 5.3
   */
  private startPulseAnimation(): void {
    let pulsePhase = 0

    const animate = () => {
      pulsePhase += this.PULSE_SPEED

      // Calculate pulsing alpha
      const pulseAlpha = this.PULSE_MIN_ALPHA + 
        (this.PULSE_MAX_ALPHA - this.PULSE_MIN_ALPHA) * 
        (Math.sin(pulsePhase) + 1) / 2

      // Apply to all merge graphics
      for (const graphics of this.mergeGraphics.values()) {
        graphics.alpha = pulseAlpha
      }

      if (this.mergeGraphics.size > 0) {
        this.animationFrame = requestAnimationFrame(animate)
      } else {
        this.animationFrame = null
      }
    }

    this.animationFrame = requestAnimationFrame(animate)
  }

  /**
   * Update all merge visualizations
   * Requirements: 5.3, 5.4
   */
  refresh(activeMerges: ProximityMerge[]): void {
    // Remove merges that are no longer active
    const activeMergeIds = new Set(activeMerges.map(m => m.id))
    
    for (const [mergeId] of this.mergeGraphics) {
      if (!activeMergeIds.has(mergeId)) {
        this.removeMerge(mergeId)
      }
    }

    // Add or update active merges
    for (const merge of activeMerges) {
      if (!this.mergeGraphics.has(merge.id)) {
        this.renderMerge(merge)
      }
    }
  }

  /**
   * Set merge visualization style
   * Requirements: 5.3
   */
  setMergeStyle(options: {
    color?: number
    alpha?: number
    width?: number
    pulseSpeed?: number
  }): void {
    if (options.color !== undefined) {
      (this as any).MERGE_COLOR = options.color
    }
    if (options.alpha !== undefined) {
      (this as any).MERGE_ALPHA = options.alpha
    }
    if (options.width !== undefined) {
      (this as any).MERGE_WIDTH = options.width
    }
    if (options.pulseSpeed !== undefined) {
      (this as any).PULSE_SPEED = options.pulseSpeed
    }

    // Refresh all graphics with new style
    const merges = Array.from(this.mergeGraphics.keys())
    for (const mergeId of merges) {
      // Note: In a real implementation, we'd need to store merge data to re-render
      // For now, we'll just update the existing graphics properties
      const graphics = this.mergeGraphics.get(mergeId)
      if (graphics) {
        graphics.alpha = this.MERGE_ALPHA
      }
    }
  }

  /**
   * Get merge rendering statistics
   * Requirements: 5.3
   */
  getRenderingStats(): {
    totalMergeGraphics: number
    isAnimating: boolean
    memoryUsage: number
  } {
    let memoryUsage = 0
    for (const graphics of this.mergeGraphics.values()) {
      // Rough estimate of memory usage
      memoryUsage += graphics.children.length * 100 // bytes per child
    }

    return {
      totalMergeGraphics: this.mergeGraphics.size,
      isAnimating: this.animationFrame !== null,
      memoryUsage
    }
  }

  /**
   * Clear all merge visualizations
   * Requirements: 5.4
   */
  clear(): void {
    const mergeIds = Array.from(this.mergeGraphics.keys())
    for (const mergeId of mergeIds) {
      this.removeMerge(mergeId)
    }
  }

  /**
   * Cleanup resources
   * Requirements: 5.4
   */
  destroy(): void {
    // Stop animation
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    // Remove event listeners
    window.removeEventListener('merge-created' as any, this.handleMergeCreated as unknown as EventListener)
    window.removeEventListener('merge-separated' as any, this.handleMergeSeparated as unknown as EventListener)

    // Clear all graphics
    this.clear()
  }
}