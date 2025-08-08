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

  // Geometric helpers (kept local to avoid tight coupling)
  private static isPointOnSegment(point: Point, a: Point, b: Point, tolerance = 1e-4): boolean {
    const ax = a.x, ay = a.y
    const bx = b.x, by = b.y
    const px = point.x, py = point.y
    const vx = bx - ax
    const vy = by - ay
    const wx = px - ax
    const wy = py - ay
    const len2 = vx * vx + vy * vy
    if (len2 < tolerance) {
      // Degenerate segment: treat as point distance
      const dx = px - ax
      const dy = py - ay
      return Math.sqrt(dx * dx + dy * dy) <= tolerance
    }
    const t = (wx * vx + wy * vy) / len2
    if (t < -tolerance || t > 1 + tolerance) return false
    const projx = ax + t * vx
    const projy = ay + t * vy
    const dist = Math.hypot(px - projx, py - projy)
    return dist <= tolerance
  }

  private isSegmentContainedInExistingWall(segId: string): boolean {
    const seg = (this.model as any).getSegment?.(segId)
    if (!seg) return false
    const start = (this.model as any).getNode?.(seg.startNodeId)
    const end = (this.model as any).getNode?.(seg.endNodeId)
    if (!start || !end) return false
    const all = (this.model as any).getAllSegments?.() as any[] | undefined
    if (!all) return false
    for (const other of all) {
      if (other.id === seg.id) continue
      if (!other.wallId) continue // only consider existing walls
      const oa = (this.model as any).getNode?.(other.startNodeId)
      const ob = (this.model as any).getNode?.(other.endNodeId)
      if (!oa || !ob) continue
      // If both endpoints of seg lie on the other segment, seg is redundant
      if (
        DrawingService.isPointOnSegment(start, oa, ob) &&
        DrawingService.isPointOnSegment(end, oa, ob)
      ) {
        return true
      }
    }
    return false
  }

  private findExistingNodeNear(point: Point, tolerance = 1e-4): string | null {
    const nodes = (this.model as any).getAllNodes?.() as any[] | undefined
    if (!nodes) return null
    for (const n of nodes) {
      if (Math.hypot(n.x - point.x, n.y - point.y) <= tolerance) return n.id
    }
    return null
  }

  private findSegmentContainingPoint(point: Point, tolerance = 1e-4): string | null {
    const segs = (this.model as any).getAllSegments?.() as any[] | undefined
    if (!segs) return null
    for (const s of segs) {
      const a = (this.model as any).getNode?.(s.startNodeId)
      const b = (this.model as any).getNode?.(s.endNodeId)
      if (!a || !b) continue
      if (DrawingService.isPointOnSegment(point, a, b, tolerance)) return s.id
    }
    return null
  }

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
      // Keep a list of segment IDs that should belong to the new wall. This will
      // be updated if any of these segments are subdivided due to intersections
      // (including subdivisions of the new segment itself).
      const wallSegmentIds: string[] = []
      const intersectionModifications: Array<{originalSegmentId: string, newSegmentIds: string[]}> = []

      for (let i = 0; i < nodes.length - 1; i++) {
        // Snap endpoints to existing nodes/segments to ensure shared topology
        const startNode = nodes[i]
        const endNode = nodes[i + 1]

        // If start is near an existing node, reuse it
        const existingStartId = this.findExistingNodeNear(startNode) || null
        // If end is near an existing node, reuse it
        const existingEndId = this.findExistingNodeNear(endNode) || null

        // If start lands on a segment, subdivide that segment to create a node
        let startIdToUse = existingStartId
        if (!startIdToUse) {
          const segId = this.findSegmentContainingPoint(startNode)
          if (segId) {
            const newIds = this.model.subdivideSegment(segId, { x: startNode.x, y: startNode.y })
            if (newIds && newIds.length > 0) {
              const nodeId = this.findExistingNodeNear(startNode)
              if (nodeId) startIdToUse = nodeId
            }
          }
        }

        // If end lands on a segment, subdivide that segment to create a node
        let endIdToUse = existingEndId
        if (!endIdToUse) {
          const segId = this.findSegmentContainingPoint(endNode)
          if (segId) {
            const newIds = this.model.subdivideSegment(segId, { x: endNode.x, y: endNode.y })
            if (newIds && newIds.length > 0) {
              const nodeId = this.findExistingNodeNear(endNode)
              if (nodeId) endIdToUse = nodeId
            }
          }
        }

        const startId = startIdToUse ?? startNode.id
        const endId = endIdToUse ?? endNode.id

        const created = this.model.createSegment(startId, endId)
        if (created) {
          wallSegmentIds.push(created.id)
          
          // Process intersections for this new segment.
          // This subdivides existing segments and may also subdivide the new segment.
          const modifications = this.model.processIntersections(created.id)
          intersectionModifications.push(...modifications)

          // If the just-created segment was subdivided, replace it in wall list
          const selfMods = modifications.filter(m => m.originalSegmentId === created.id)
          if (selfMods.length > 0) {
            // Remove the original id and add all resulting ids
            const idx = wallSegmentIds.indexOf(created.id)
            if (idx !== -1) {
              wallSegmentIds.splice(idx, 1, ...selfMods[selfMods.length - 1].newSegmentIds)
            }
          }
        }
      }

      // Filter out any segments that are fully contained on an existing wall's centerline
      const filteredIds = wallSegmentIds.filter(id => !this.isSegmentContainedInExistingWall(id))

      // If our new path touched exactly one existing wall (through intersection
      // subdivisions), merge the new segments into that wall instead of
      // creating a separate wall (only when types match).
      const touchingWallIds = new Set<string>()
      for (const mod of intersectionModifications) {
        for (const newId of mod.newSegmentIds) {
          const seg = (this.model as any).getSegment?.(newId)
          if (seg?.wallId) touchingWallIds.add(seg.wallId)
        }
      }

      if (filteredIds.length > 0 && touchingWallIds.size === 1) {
        const targetWallId = Array.from(touchingWallIds)[0]
        const targetWall = (this.model as any).getWall?.(targetWallId)
        if (targetWall && targetWall.type === this.activeWallType) {
          (this.model as any).addSegmentsToWall?.(targetWallId, filteredIds)
          this.isDrawing = false
          this.currentPoints = []
          if (intersectionModifications.length > 0) {
            console.log(`Wall drawing merged into existing wall (${targetWallId}) with ${intersectionModifications.length} intersection modifications`)
          }
          return targetWallId
        }
      }

      // Create wall with all final segment IDs (only ones that still exist and are not redundant)
      if (filteredIds.length > 0) {
        const wall = this.model.createWall(
          this.activeWallType,
          filteredIds
        )

        this.isDrawing = false
        this.currentPoints = []
        
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