import type { Point, Node, Segment, Wall } from './types'
import { FloorPlanModel } from './FloorPlanModel'
import { GeometryService } from './GeometryService'

/**
 * Service for handling wall selection and hit detection
 * Requirements: 2.2, 2.3, 11.2
 */
export class WallSelectionService {
  private model: FloorPlanModel
  private selectionTolerance: number = 10 // pixels

  constructor(model: FloorPlanModel) {
    this.model = model
  }

  /**
   * Set the selection tolerance (distance from wall to register a hit)
   */
  setSelectionTolerance(tolerance: number): void {
    this.selectionTolerance = tolerance
  }

  /**
   * Find the wall closest to a click point within tolerance
   * Requirements: 2.2
   * 
   * @param clickPoint The point where the user clicked
   * @returns The closest wall ID and distance, or null if no wall is within tolerance
   */
  findWallAtPoint(clickPoint: Point): {wallId: string, distance: number} | null {
    const walls = this.model.getAllWalls()
    const nodes = new Map<string, Node>()
    
    // Build nodes map for efficient lookup
    this.model.getAllNodes().forEach(node => {
      nodes.set(node.id, node)
    })

    let closestWall: {wallId: string, distance: number} | null = null

    for (const wall of walls) {
      if (!wall.visible) continue // Skip invisible walls

      const wallDistance = this.getDistanceToWall(clickPoint, wall, nodes)
      
      if (wallDistance <= this.selectionTolerance) {
        if (!closestWall || wallDistance < closestWall.distance) {
          closestWall = {
            wallId: wall.id,
            distance: wallDistance
          }
        }
      }
    }

    return closestWall
  }

  /**
   * Calculate the minimum distance from a point to a wall
   * Requirements: 2.2
   */
  private getDistanceToWall(point: Point, wall: Wall, nodes: Map<string, Node>): number {
    let minDistance = Infinity

    // Treat the wall as a stroked polyline with thickness. Any point inside the
    // outer shell should count as a hit (distance 0). Outside points measure
    // distance to the centerline minus half thickness.
    const halfThickness = (wall.thickness ?? 0) / 2

    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (!segment) continue

      const startNode = nodes.get(segment.startNodeId)
      const endNode = nodes.get(segment.endNodeId)
      
      if (startNode && endNode) {
        const centerlineDistance = GeometryService.distancePointToLineSegment(point, startNode, endNode)
        const shellDistance = Math.max(0, centerlineDistance - halfThickness)
        minDistance = Math.min(minDistance, shellDistance)
      }
    }

    return minDistance
  }

  /**
   * Find all walls within a rectangular selection area
   * Requirements: 2.2
   * 
   * @param topLeft Top-left corner of selection rectangle
   * @param bottomRight Bottom-right corner of selection rectangle
   * @returns Array of wall IDs that intersect with the selection area
   */
  findWallsInArea(topLeft: Point, bottomRight: Point): string[] {
    const walls = this.model.getAllWalls()
    const nodes = new Map<string, Node>()
    
    // Build nodes map for efficient lookup
    this.model.getAllNodes().forEach(node => {
      nodes.set(node.id, node)
    })

    const selectedWalls: string[] = []

    for (const wall of walls) {
      if (!wall.visible) continue

      if (this.isWallInArea(wall, topLeft, bottomRight, nodes)) {
        selectedWalls.push(wall.id)
      }
    }

    return selectedWalls
  }

  /**
   * Check if a wall intersects with a rectangular area
   * Requirements: 2.2
   */
  private isWallInArea(wall: Wall, topLeft: Point, bottomRight: Point, nodes: Map<string, Node>): boolean {
    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (!segment) continue

      const startNode = nodes.get(segment.startNodeId)
      const endNode = nodes.get(segment.endNodeId)
      
      if (startNode && endNode) {
        // Check if segment intersects with or is contained within the rectangle
        if (this.isSegmentInRectangle(startNode, endNode, topLeft, bottomRight)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if a line segment intersects with or is contained within a rectangle
   * Requirements: 2.2
   */
  private isSegmentInRectangle(start: Point, end: Point, topLeft: Point, bottomRight: Point): boolean {
    // Check if either endpoint is inside the rectangle
    if (this.isPointInRectangle(start, topLeft, bottomRight) ||
        this.isPointInRectangle(end, topLeft, bottomRight)) {
      return true
    }

    // Check if the segment intersects any of the rectangle edges
    const rectCorners = [
      topLeft,
      { x: bottomRight.x, y: topLeft.y },    // top-right
      bottomRight,
      { x: topLeft.x, y: bottomRight.y }     // bottom-left
    ]

    const rectEdges = [
      [rectCorners[0], rectCorners[1]], // top edge
      [rectCorners[1], rectCorners[2]], // right edge
      [rectCorners[2], rectCorners[3]], // bottom edge
      [rectCorners[3], rectCorners[0]]  // left edge
    ]

    for (const [edgeStart, edgeEnd] of rectEdges) {
      if (GeometryService.findLineIntersection(start, end, edgeStart, edgeEnd)) {
        return true
      }
    }

    return false
  }

  /**
   * Check if a point is inside a rectangle
   * Requirements: 2.2
   */
  private isPointInRectangle(point: Point, topLeft: Point, bottomRight: Point): boolean {
    return point.x >= topLeft.x && 
           point.x <= bottomRight.x && 
           point.y >= topLeft.y && 
           point.y <= bottomRight.y
  }

  /**
   * Get detailed information about a wall for editing
   * Requirements: 2.3
   * 
   * @param wallId The ID of the wall to get information for
   * @returns Wall information including segments, nodes, and properties
   */
  getWallInfo(wallId: string): {
    wall: Wall,
    segments: Segment[],
    nodes: Node[],
    totalLength: number,
    boundingBox: {topLeft: Point, bottomRight: Point}
  } | null {
    const wall = this.model.getWall(wallId)
    if (!wall) return null

    const segments: Segment[] = []
    const nodeIds = new Set<string>()
    let totalLength = 0

    // Collect segments and calculate total length
    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        segments.push(segment)
        totalLength += segment.length
        nodeIds.add(segment.startNodeId)
        nodeIds.add(segment.endNodeId)
      }
    }

    // Collect unique nodes
    const nodes: Node[] = []
    for (const nodeId of nodeIds) {
      const node = this.model.getNode(nodeId)
      if (node) {
        nodes.push(node)
      }
    }

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const node of nodes) {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x)
      maxY = Math.max(maxY, node.y)
    }

    return {
      wall,
      segments,
      nodes,
      totalLength,
      boundingBox: {
        topLeft: { x: minX, y: minY },
        bottomRight: { x: maxX, y: maxY }
      }
    }
  }

  /**
   * Find walls that share nodes with the given wall (connected walls)
   * Requirements: 2.3
   * 
   * @param wallId The ID of the wall to find connections for
   * @returns Array of connected wall IDs
   */
  findConnectedWalls(wallId: string): string[] {
    const wall = this.model.getWall(wallId)
    if (!wall) return []

    const connectedWallIds = new Set<string>()
    const wallNodeIds = new Set<string>()

    // Collect all node IDs from this wall's segments
    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        wallNodeIds.add(segment.startNodeId)
        wallNodeIds.add(segment.endNodeId)
      }
    }

    // Find other walls that share these nodes
    const allWalls = this.model.getAllWalls()
    for (const otherWall of allWalls) {
      if (otherWall.id === wallId) continue

      for (const segmentId of otherWall.segmentIds) {
        const segment = this.model.getSegment(segmentId)
        if (segment) {
          if (wallNodeIds.has(segment.startNodeId) || wallNodeIds.has(segment.endNodeId)) {
            connectedWallIds.add(otherWall.id)
            break
          }
        }
      }
    }

    return Array.from(connectedWallIds)
  }

  /**
   * Check if a wall can be safely deleted (considering connections)
   * Requirements: 2.5
   * 
   * @param wallId The ID of the wall to check
   * @returns Analysis of deletion impact
   */
  analyzeDeletionImpact(wallId: string): {
    canDelete: boolean,
    connectedWalls: string[],
    orphanedNodes: string[],
    warnings: string[]
  } {
    const wall = this.model.getWall(wallId)
    if (!wall) {
      return {
        canDelete: false,
        connectedWalls: [],
        orphanedNodes: [],
        warnings: ['Wall not found']
      }
    }

    const connectedWalls = this.findConnectedWalls(wallId)
    const warnings: string[] = []
    const orphanedNodes: string[] = []

    // Check for nodes that would become orphaned
    const wallNodeIds = new Set<string>()
    for (const segmentId of wall.segmentIds) {
      const segment = this.model.getSegment(segmentId)
      if (segment) {
        wallNodeIds.add(segment.startNodeId)
        wallNodeIds.add(segment.endNodeId)
      }
    }

    for (const nodeId of wallNodeIds) {
      const node = this.model.getNode(nodeId)
      if (node) {
        // Count how many segments from other walls connect to this node
        let otherSegmentCount = 0
        for (const segmentId of node.connectedSegments) {
          const segment = this.model.getSegment(segmentId)
          if (segment && segment.wallId && segment.wallId !== wallId) {
            otherSegmentCount++
          }
        }

        if (otherSegmentCount === 0) {
          orphanedNodes.push(nodeId)
        }
      }
    }

    if (connectedWalls.length > 0) {
      warnings.push(`Deletion will affect ${connectedWalls.length} connected wall(s)`)
    }

    if (orphanedNodes.length > 0) {
      warnings.push(`${orphanedNodes.length} node(s) will be cleaned up`)
    }

    return {
      canDelete: true, // Walls can generally be deleted with proper cleanup
      connectedWalls,
      orphanedNodes,
      warnings
    }
  }
}