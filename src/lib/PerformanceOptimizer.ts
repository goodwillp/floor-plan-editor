import * as PIXI from 'pixi.js'
import type { Wall, Segment, Node } from './types'

/**
 * Performance optimization utilities for PixiJS rendering
 * Requirements: 6.7, 9.5 - Optimize rendering performance for large floor plans
 */

export interface ViewportBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface RenderStats {
  totalWalls: number
  visibleWalls: number
  culledWalls: number
  renderTime: number
  lastUpdate: number
}

/**
 * Object pool for reusing PIXI Graphics objects
 */
class GraphicsPool {
  private pool: PIXI.Graphics[] = []
  private inUse: Set<PIXI.Graphics> = new Set()

  /**
   * Get a graphics object from the pool or create a new one
   */
  acquire(): PIXI.Graphics {
    let graphics = this.pool.pop()
    if (!graphics) {
      graphics = new PIXI.Graphics()
    }
    this.inUse.add(graphics)
    graphics.clear()
    return graphics
  }

  /**
   * Return a graphics object to the pool
   */
  release(graphics: PIXI.Graphics): void {
    if (this.inUse.has(graphics)) {
      this.inUse.delete(graphics)
      graphics.clear()
      graphics.visible = true
      graphics.alpha = 1
      this.pool.push(graphics)
    }
  }

  /**
   * Clear the entire pool
   */
  clear(): void {
    this.pool.forEach(graphics => graphics.destroy())
    this.inUse.forEach(graphics => graphics.destroy())
    this.pool.length = 0
    this.inUse.clear()
  }

  /**
   * Get pool statistics
   */
  getStats(): { poolSize: number; inUse: number } {
    return {
      poolSize: this.pool.length,
      inUse: this.inUse.size
    }
  }
}

/**
 * Viewport culling system for efficient rendering
 */
export class ViewportCuller {
  private viewportBounds: ViewportBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  private cullMargin: number = 100 // Extra margin around viewport for smooth scrolling

  /**
   * Update viewport bounds for culling calculations
   */
  updateViewport(
    zoom: number,
    panX: number,
    panY: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // Calculate world coordinates of viewport bounds
    const worldLeft = (-panX) / zoom - this.cullMargin
    const worldTop = (-panY) / zoom - this.cullMargin
    const worldRight = (canvasWidth - panX) / zoom + this.cullMargin
    const worldBottom = (canvasHeight - panY) / zoom + this.cullMargin

    this.viewportBounds = {
      minX: worldLeft,
      maxX: worldRight,
      minY: worldTop,
      maxY: worldBottom
    }
  }

  /**
   * Check if a wall segment is visible in the current viewport
   */
  isSegmentVisible(segment: Segment, nodes: Map<string, Node>): boolean {
    const startNode = nodes.get(segment.startNodeId)
    const endNode = nodes.get(segment.endNodeId)
    
    if (!startNode || !endNode) return false

    // Get segment bounds
    const minX = Math.min(startNode.x, endNode.x)
    const maxX = Math.max(startNode.x, endNode.x)
    const minY = Math.min(startNode.y, endNode.y)
    const maxY = Math.max(startNode.y, endNode.y)

    // Check if segment intersects with viewport
    return !(
      maxX < this.viewportBounds.minX ||
      minX > this.viewportBounds.maxX ||
      maxY < this.viewportBounds.minY ||
      minY > this.viewportBounds.maxY
    )
  }

  /**
   * Check if a wall is visible (any of its segments are visible)
   */
  isWallVisible(wall: Wall, segments: Segment[], nodes: Map<string, Node>): boolean {
    if (!wall.visible) return false
    
    return segments.some(segment => this.isSegmentVisible(segment, nodes))
  }

  /**
   * Get current viewport bounds
   */
  getViewportBounds(): ViewportBounds {
    return { ...this.viewportBounds }
  }
}

/**
 * Performance monitoring and optimization system
 */
export class PerformanceOptimizer {
  private graphicsPool = new GraphicsPool()
  private viewportCuller = new ViewportCuller()
  private renderStats: RenderStats = {
    totalWalls: 0,
    visibleWalls: 0,
    culledWalls: 0,
    renderTime: 0,
    lastUpdate: 0
  }
  private frameTimeHistory: number[] = []
  private maxFrameHistory = 60 // Track last 60 frames
  private performanceThresholds = {
    targetFPS: 60,
    maxFrameTime: 16.67, // ~60 FPS
    warningFrameTime: 33.33, // ~30 FPS
    criticalFrameTime: 50 // ~20 FPS
  }

  /**
   * Update viewport for culling calculations
   */
  updateViewport(
    zoom: number,
    panX: number,
    panY: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.viewportCuller.updateViewport(zoom, panX, panY, canvasWidth, canvasHeight)
  }

  /**
   * Optimize wall rendering with viewport culling and object pooling
   */
  optimizeWallRendering(
    walls: Map<string, Wall>,
    segments: Map<string, Segment>,
    nodes: Map<string, Node>,
    container: PIXI.Container,
    renderCallback: (wall: Wall, wallSegments: Segment[], graphics: PIXI.Graphics) => void
  ): RenderStats {
    const startTime = performance.now()
    
    // Clear existing graphics
    container.removeChildren()
    
    let visibleCount = 0
    let culledCount = 0
    
    walls.forEach(wall => {
      const wallSegments = wall.segmentIds
        .map(id => segments.get(id))
        .filter((segment): segment is Segment => segment !== undefined)
      
      if (wallSegments.length === 0) {
        culledCount++
        return
      }
      
      // Check if wall is visible in viewport
      if (!this.viewportCuller.isWallVisible(wall, wallSegments, nodes)) {
        culledCount++
        return
      }
      
      // Get graphics object from pool
      const graphics = this.graphicsPool.acquire()
      
      // Render the wall
      renderCallback(wall, wallSegments, graphics)
      
      // Add to container
      container.addChild(graphics)
      visibleCount++
    })
    
    const renderTime = performance.now() - startTime
    
    // Update render stats
    this.renderStats = {
      totalWalls: walls.size,
      visibleWalls: visibleCount,
      culledWalls: culledCount,
      renderTime,
      lastUpdate: Date.now()
    }
    
    // Track frame time for performance monitoring
    this.trackFrameTime(renderTime)
    
    return { ...this.renderStats }
  }

  /**
   * Track frame rendering time for performance analysis
   */
  private trackFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime)
    if (this.frameTimeHistory.length > this.maxFrameHistory) {
      this.frameTimeHistory.shift()
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    renderStats: RenderStats
    frameStats: {
      averageFrameTime: number
      maxFrameTime: number
      minFrameTime: number
      fps: number
      performanceLevel: 'good' | 'warning' | 'critical'
    }
    poolStats: {
      poolSize: number
      inUse: number
    }
  } {
    const frameStats = this.calculateFrameStats()
    const poolStats = this.graphicsPool.getStats()
    
    return {
      renderStats: { ...this.renderStats },
      frameStats,
      poolStats
    }
  }

  /**
   * Calculate frame statistics
   */
  private calculateFrameStats(): {
    averageFrameTime: number
    maxFrameTime: number
    minFrameTime: number
    fps: number
    performanceLevel: 'good' | 'warning' | 'critical'
  } {
    if (this.frameTimeHistory.length === 0) {
      return {
        averageFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: 0,
        fps: 0,
        performanceLevel: 'good'
      }
    }
    
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0)
    const averageFrameTime = sum / this.frameTimeHistory.length
    const maxFrameTime = Math.max(...this.frameTimeHistory)
    const minFrameTime = Math.min(...this.frameTimeHistory)
    const fps = 1000 / averageFrameTime
    
    let performanceLevel: 'good' | 'warning' | 'critical' = 'good'
    if (averageFrameTime > this.performanceThresholds.criticalFrameTime) {
      performanceLevel = 'critical'
    } else if (averageFrameTime > this.performanceThresholds.warningFrameTime) {
      performanceLevel = 'warning'
    }
    
    return {
      averageFrameTime,
      maxFrameTime,
      minFrameTime,
      fps,
      performanceLevel
    }
  }

  /**
   * Get optimization recommendations based on current performance
   */
  getOptimizationRecommendations(): string[] {
    const metrics = this.getPerformanceMetrics()
    const recommendations: string[] = []
    
    if (metrics.frameStats.performanceLevel === 'critical') {
      recommendations.push('Consider reducing wall detail level')
      recommendations.push('Increase viewport culling margin')
      recommendations.push('Enable performance mode rendering')
    } else if (metrics.frameStats.performanceLevel === 'warning') {
      recommendations.push('Monitor performance with large floor plans')
      recommendations.push('Consider optimizing wall complexity')
    }
    
    if (metrics.renderStats.visibleWalls > 1000) {
      recommendations.push('Large number of visible walls detected - consider level-of-detail rendering')
    }
    
    if (metrics.poolStats.inUse > metrics.poolStats.poolSize * 0.8) {
      recommendations.push('Graphics object pool is near capacity')
    }
    
    return recommendations
  }

  /**
   * Enable performance mode (reduced quality for better performance)
   */
  enablePerformanceMode(container: PIXI.Container): void {
    // Reduce rendering quality for better performance
    // Adjust resolution for performance; antialias control is not exposed in PIXI v8 at runtime
    const app = (container as any).app as PIXI.Application | undefined
    if (app && app.renderer) {
      app.renderer.resolution = Math.max(1, (window as any).devicePixelRatio ? (window as any).devicePixelRatio * 0.5 : 1)
    }
    
    // Disable some visual effects
    container.filters = null
    container.cacheAsBitmap = true
  }

  /**
   * Disable performance mode (restore full quality)
   */
  disablePerformanceMode(container: PIXI.Container): void {
    const app = (container as any).app as PIXI.Application | undefined
    if (app && app.renderer) {
      app.renderer.resolution = (window as any).devicePixelRatio || 1
    }
    
    container.cacheAsBitmap = false
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.graphicsPool.clear()
    this.frameTimeHistory.length = 0
  }
}

/**
 * Batch rendering system for efficient updates
 */
export class BatchRenderer {
  private pendingUpdates: Set<string> = new Set()
  private batchTimeout: number | null = null
  private batchDelay = 16 // ~60 FPS

  /**
   * Schedule a wall for batch update
   */
  scheduleWallUpdate(wallId: string): void {
    this.pendingUpdates.add(wallId)
    
    if (this.batchTimeout === null) {
      this.batchTimeout = window.setTimeout(() => {
        this.processBatch()
      }, this.batchDelay)
    }
  }

  /**
   * Process all pending updates in a batch
   */
  private processBatch(): void {
    if (this.pendingUpdates.size > 0) {
      // Process updates here
      // This would be called by the rendering system
      this.pendingUpdates.clear()
    }
    
    this.batchTimeout = null
  }

  /**
   * Force immediate processing of pending updates
   */
  flush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.processBatch()
    }
  }

  /**
   * Get pending update count
   */
  getPendingCount(): number {
    return this.pendingUpdates.size
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }
    this.pendingUpdates.clear()
  }
}