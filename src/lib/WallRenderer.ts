import * as PIXI from 'pixi.js'
import type { Wall, Segment, Node, WallTypeString } from './types'
import { WALL_THICKNESS } from './types'
import { PerformanceOptimizer, type RenderStats } from './PerformanceOptimizer'

/**
 * WallRenderer handles the visual representation of walls with outer shell rendering
 * Requirements: 1.4, 1.5 - Display outer shell and hide core line segments
 * Requirements: 6.7, 9.5 - Optimize rendering performance for large floor plans
 */
export class WallRenderer {
  private wallGraphics: Map<string, PIXI.Graphics> = new Map()
  private segmentGraphics: Map<string, PIXI.Graphics> = new Map()
  private performanceOptimizer: PerformanceOptimizer
  private isPerformanceModeEnabled = false

  constructor() {
    this.performanceOptimizer = new PerformanceOptimizer()
  }

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
    const style = this.getWallStyle(wall.type)

    // Build polylines through wall segments (handles branches and cycles)
    const polylines = this.buildOrderedPolylines(wall, segments, nodes)

    polylines.forEach(path => {
      if (path.length < 2) return
      graphics
        .setStrokeStyle({
          width: wall.thickness,
          color: style.fillColor,
          alpha: style.fillAlpha,
          join: 'miter',
          miterLimit: 8
        })
        .moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) {
        graphics.lineTo(path[i].x, path[i].y)
      }
      if (path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y) {
        graphics.closePath()
      }
      graphics.stroke()
    })

    // Store graphics reference
    this.wallGraphics.set(wall.id, graphics)
    container.addChild(graphics)
  }

  /**
   * Render the outer shell of a segment
   * Requirements: 1.4, 1.5
   */
  // Build polylines that cover all segments in a wall, handling branches and cycles
  private buildOrderedPolylines(
    wall: Wall,
    segments: Segment[],
    nodes: Map<string, Node>
  ): Array<Array<{ x: number; y: number }>> {
    const idToSegment = new Map<string, Segment>()
    segments.forEach(s => idToSegment.set(s.id, s))

    // Adjacency of nodes for the wall's segments
    const adjacency = new Map<string, Array<{ segId: string; other: string }>>()
    const wallSegIds = wall.segmentIds.filter(id => idToSegment.has(id))
    wallSegIds.forEach(id => {
      const s = idToSegment.get(id)!
      const a = s.startNodeId
      const b = s.endNodeId
      if (!adjacency.has(a)) adjacency.set(a, [])
      if (!adjacency.has(b)) adjacency.set(b, [])
      adjacency.get(a)!.push({ segId: id, other: b })
      adjacency.get(b)!.push({ segId: id, other: a })
    })

    const visited = new Set<string>() // visited segment ids
    const polylines: Array<Array<{ x: number; y: number }>> = []

    const makePath = (startNodeId: string) => {
      // Find first unvisited edge from the start node
      const edges = adjacency.get(startNodeId) || []
      for (const e of edges) {
        if (visited.has(e.segId)) continue
        const path: string[] = [startNodeId]
        let currentNode = startNodeId
        let prevSeg: string | null = null
        // Walk until dead-end or we return to start in a cycle
        while (true) {
          const nextEdge = (adjacency.get(currentNode) || []).find(ed => !visited.has(ed.segId) && ed.segId !== prevSeg)
          if (!nextEdge) break
          visited.add(nextEdge.segId)
          const nextNode = nextEdge.other
          path.push(nextNode)
          prevSeg = nextEdge.segId
          // If degree at nextNode != 2, we terminate here to avoid jumping branches
          const deg = (adjacency.get(nextNode) || []).length
          if (deg !== 2) {
            currentNode = nextNode
            break
          }
          currentNode = nextNode
          // If we looped back to start, stop
          if (currentNode === startNodeId) break
        }
        // Convert path to coordinates
        const coords: Array<{ x: number; y: number }> = []
        path.forEach(nid => {
          const n = nodes.get(nid)
          if (n) coords.push({ x: n.x, y: n.y })
        })
        if (coords.length >= 2) polylines.push(coords)
      }
    }

    // Start from endpoints (degree 1) first for deterministic paths
    for (const [nodeId, edges] of adjacency.entries()) {
      if (edges.length === 1) makePath(nodeId)
    }
    // Then cover remaining segments (cycles or branches)
    for (const [nodeId] of adjacency.entries()) {
      makePath(nodeId)
    }

    return polylines
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
      .setStrokeStyle({ width: 1, color: 0xFF0000, alpha: 0.3 }) // Red debug line
      .moveTo(startNode.x, startNode.y)
      .lineTo(endNode.x, endNode.y)
      .stroke()
  }

  /**
   * Render all walls with performance optimization
   * Requirements: 6.7, 9.5
   */
  renderAllWalls(
    walls: Map<string, Wall>,
    segments: Map<string, Segment>,
    nodes: Map<string, Node>,
    container: PIXI.Container,
    viewport: { zoom: number; panX: number; panY: number; canvasWidth: number; canvasHeight: number }
  ): RenderStats {
    // Update viewport for culling
    this.performanceOptimizer.updateViewport(
      viewport.zoom,
      viewport.panX,
      viewport.panY,
      viewport.canvasWidth,
      viewport.canvasHeight
    )

    // Use performance optimizer for efficient rendering
    return this.performanceOptimizer.optimizeWallRendering(
      walls,
      segments,
      nodes,
      container,
      (wall, wallSegments, graphics) => {
        this.renderWallToGraphics(wall, wallSegments, nodes, graphics)
      }
    )
  }

  /**
   * Render wall to provided graphics object (used by performance optimizer)
   */
  private renderWallToGraphics(
    wall: Wall,
    segments: Segment[],
    nodes: Map<string, Node>,
    graphics: PIXI.Graphics
  ): void {
    if (!wall.visible || segments.length === 0) {
      return
    }

    const style = this.getWallStyle(wall.type)
    const polylines = this.buildOrderedPolylines(wall, segments, nodes)
    polylines.forEach(path => {
      if (path.length < 2) return
      graphics
        .setStrokeStyle({
          width: wall.thickness,
          color: style.fillColor,
          alpha: style.fillAlpha,
          join: 'miter',
          miterLimit: 8
        })
        .moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) {
        graphics.lineTo(path[i].x, path[i].y)
      }
      if (path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y) {
        graphics.closePath()
      }
      graphics.stroke()
    })
  }

  /**
   * Enable performance mode for better rendering speed
   * Requirements: 6.7
   */
  enablePerformanceMode(container: PIXI.Container): void {
    this.isPerformanceModeEnabled = true
    this.performanceOptimizer.enablePerformanceMode(container)
  }

  /**
   * Disable performance mode for better visual quality
   * Requirements: 6.7
   */
  disablePerformanceMode(container: PIXI.Container): void {
    this.isPerformanceModeEnabled = false
    this.performanceOptimizer.disablePerformanceMode(container)
  }

  /**
   * Get performance metrics
   * Requirements: 9.5
   */
  getPerformanceMetrics() {
    return this.performanceOptimizer.getPerformanceMetrics()
  }

  /**
   * Get optimization recommendations
   * Requirements: 9.5
   */
  getOptimizationRecommendations(): string[] {
    return this.performanceOptimizer.getOptimizationRecommendations()
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
   * Cleanup resources
   */
  destroy(): void {
    this.performanceOptimizer.destroy()
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