import type { Point, Node, Segment, Wall } from './types'
import { FloorPlanModel } from './FloorPlanModel'
import { GeometryService } from './GeometryService'

/**
 * Interface for proximity merge data
 */
export interface ProximityMerge {
  id: string
  wall1Id: string
  wall2Id: string
  mergeType: 'visual' | 'physical'
  distance: number
  segments: Array<{
    seg1Id: string
    seg2Id: string
    distance: number
    mergePoints: Point[]
  }>
  createdAt: Date
}

/**
 * Service for handling proximity-based wall merging
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class ProximityMergingService {
  private model: FloorPlanModel
  private proximityThreshold: number = 15 // 15 pixels default threshold
  private activeMerges: Map<string, ProximityMerge> = new Map()
  private mergeCheckInterval: number | null = null

  constructor(model: FloorPlanModel) {
    this.model = model
  }

  /**
   * Set the proximity threshold for wall merging
   * Requirements: 5.1
   * 
   * @param threshold Distance threshold in pixels
   */
  setProximityThreshold(threshold: number): void {
    this.proximityThreshold = threshold
  }

  /**
   * Get the current proximity threshold
   * Requirements: 5.1
   */
  getProximityThreshold(): number {
    return this.proximityThreshold
  }

  /**
   * Start automatic proximity checking
   * Requirements: 5.1, 5.4
   * 
   * @param intervalMs Check interval in milliseconds (default: 100ms)
   */
  startProximityChecking(intervalMs: number = 100): void {
    if (this.mergeCheckInterval) {
      this.stopProximityChecking()
    }

    this.mergeCheckInterval = window.setInterval(() => {
      this.updateProximityMerges()
    }, intervalMs)
  }

  /**
   * Stop automatic proximity checking
   * Requirements: 5.4
   */
  stopProximityChecking(): void {
    if (this.mergeCheckInterval) {
      clearInterval(this.mergeCheckInterval)
      this.mergeCheckInterval = null
    }
  }

  /**
   * Manually update all proximity merges
   * Requirements: 5.1, 5.2, 5.4
   */
  updateProximityMerges(): void {
    const walls = this.model.getAllWalls()
    // First pass: merge nodes that are within threshold to avoid duplicate nodes at junctions
    try {
      ;(this.model as any).mergeNearbyNodes?.(this.proximityThreshold)
    } catch (_) {}
    const newMerges = new Map<string, ProximityMerge>()

    // Check all wall pairs for proximity
    for (let i = 0; i < walls.length; i++) {
      for (let j = i + 1; j < walls.length; j++) {
        const wall1 = walls[i]
        const wall2 = walls[j]

        if (!wall1.visible || !wall2.visible) continue

        const merge = this.checkWallProximity(wall1, wall2)
        if (merge) {
          const mergeId = this.getMergeId(wall1.id, wall2.id)
          newMerges.set(mergeId, merge)
        }
      }
    }

    // Remove merges that are no longer valid
    for (const [mergeId, merge] of this.activeMerges) {
      if (!newMerges.has(mergeId)) {
        this.onMergeSeparated(merge)
      }
    }

    // Add new merges
    for (const [mergeId, merge] of newMerges) {
      if (!this.activeMerges.has(mergeId)) {
        this.onMergeCreated(merge)
      }
    }

    this.activeMerges = newMerges
  }

  /**
   * Check if two walls are within proximity for merging
   * Requirements: 5.1, 5.2, 5.5
   * 
   * @param wall1 First wall
   * @param wall2 Second wall
   * @returns ProximityMerge data if walls should merge, null otherwise
   */
  private checkWallProximity(wall1: Wall, wall2: Wall): ProximityMerge | null {
    if (!GeometryService.canMergeWalls(wall1, wall2)) {
      return null
    }

    const nodes = new Map<string, Node>()
    this.model.getAllNodes().forEach(node => nodes.set(node.id, node))

    const segments = new Map<string, Segment>()
    this.model.getAllSegments().forEach(segment => segments.set(segment.id, segment))

    // Find nearby segments between the two walls
    const nearbySegmentPairs: Array<{
      seg1Id: string
      seg2Id: string
      distance: number
      mergePoints: Point[]
    }> = []

    let minDistance = Infinity

    for (const seg1Id of wall1.segmentIds) {
      for (const seg2Id of wall2.segmentIds) {
        const seg1 = segments.get(seg1Id)
        const seg2 = segments.get(seg2Id)

        if (seg1 && seg2) {
          const distance = GeometryService.distanceBetweenSegments(seg1, seg2, nodes)
          
          if (distance <= this.proximityThreshold) {
            const mergePoints = this.calculateMergePoints(seg1, seg2, nodes)
            
            nearbySegmentPairs.push({
              seg1Id,
              seg2Id,
              distance,
              mergePoints
            })

            minDistance = Math.min(minDistance, distance)
          }
        }
      }
    }

    if (nearbySegmentPairs.length === 0) {
      return null
    }

    return {
      id: this.getMergeId(wall1.id, wall2.id),
      wall1Id: wall1.id,
      wall2Id: wall2.id,
      mergeType: 'visual', // Always visual merge to preserve segments (Requirement 5.2)
      distance: minDistance,
      segments: nearbySegmentPairs,
      createdAt: new Date()
    }
  }

  /**
   * Calculate merge points between two segments
   * Requirements: 5.2, 5.3
   * 
   * @param seg1 First segment
   * @param seg2 Second segment
   * @param nodes Node map for coordinate lookup
   * @returns Array of merge points for visual merging
   */
  private calculateMergePoints(seg1: Segment, seg2: Segment, nodes: Map<string, Node>): Point[] {
    const start1 = nodes.get(seg1.startNodeId)
    const end1 = nodes.get(seg1.endNodeId)
    const start2 = nodes.get(seg2.startNodeId)
    const end2 = nodes.get(seg2.endNodeId)

    if (!start1 || !end1 || !start2 || !end2) {
      return []
    }

    const mergePoints: Point[] = []

    // Find closest points between the two segments
    const distances = [
      { point1: start1, point2: start2, distance: GeometryService.distanceBetweenPoints(start1, start2) },
      { point1: start1, point2: end2, distance: GeometryService.distanceBetweenPoints(start1, end2) },
      { point1: end1, point2: start2, distance: GeometryService.distanceBetweenPoints(end1, start2) },
      { point1: end1, point2: end2, distance: GeometryService.distanceBetweenPoints(end1, end2) }
    ]

    // Sort by distance and take the closest connections
    distances.sort((a, b) => a.distance - b.distance)

    // Create merge points as midpoints between closest segment points
    for (let i = 0; i < Math.min(2, distances.length); i++) {
      const { point1, point2 } = distances[i]
      const midpoint: Point = {
        x: (point1.x + point2.x) / 2,
        y: (point1.y + point2.y) / 2
      }
      mergePoints.push(midpoint)
    }

    return mergePoints
  }

  /**
   * Generate a consistent merge ID for two walls
   * Requirements: 5.3
   */
  private getMergeId(wall1Id: string, wall2Id: string): string {
    // Sort IDs to ensure consistent merge ID regardless of order
    const sortedIds = [wall1Id, wall2Id].sort()
    return `merge_${sortedIds[0]}_${sortedIds[1]}`
  }

  /**
   * Handle when a new merge is created
   * Requirements: 5.1, 5.3
   */
  private onMergeCreated(merge: ProximityMerge): void {
    console.log(`Proximity merge created: ${merge.id} (distance: ${merge.distance.toFixed(2)}px)`)
    
    // Emit event for visual updates
    this.emitMergeEvent('merge-created', merge)
  }

  /**
   * Handle when a merge is separated
   * Requirements: 5.4
   */
  private onMergeSeparated(merge: ProximityMerge): void {
    console.log(`Proximity merge separated: ${merge.id}`)
    
    // Emit event for visual updates
    this.emitMergeEvent('merge-separated', merge)
  }

  /**
   * Emit merge events for external listeners
   * Requirements: 5.3, 5.4
   */
  private emitMergeEvent(eventType: 'merge-created' | 'merge-separated', merge: ProximityMerge): void {
    const event = new CustomEvent(eventType, {
      detail: merge
    })
    window.dispatchEvent(event)
  }

  /**
   * Get all active proximity merges
   * Requirements: 5.3
   */
  getActiveMerges(): ProximityMerge[] {
    return Array.from(this.activeMerges.values())
  }

  /**
   * Get merge data for specific walls
   * Requirements: 5.3
   * 
   * @param wall1Id First wall ID
   * @param wall2Id Second wall ID
   * @returns Merge data if walls are merged, null otherwise
   */
  getMerge(wall1Id: string, wall2Id: string): ProximityMerge | null {
    const mergeId = this.getMergeId(wall1Id, wall2Id)
    return this.activeMerges.get(mergeId) || null
  }

  /**
   * Check if two walls are currently merged
   * Requirements: 5.3
   * 
   * @param wall1Id First wall ID
   * @param wall2Id Second wall ID
   * @returns True if walls are merged, false otherwise
   */
  areWallsMerged(wall1Id: string, wall2Id: string): boolean {
    return this.getMerge(wall1Id, wall2Id) !== null
  }

  /**
   * Get all walls that are merged with a specific wall
   * Requirements: 5.3
   * 
   * @param wallId Wall ID to check
   * @returns Array of wall IDs that are merged with the specified wall
   */
  getMergedWalls(wallId: string): string[] {
    const mergedWalls: string[] = []

    for (const merge of this.activeMerges.values()) {
      if (merge.wall1Id === wallId) {
        mergedWalls.push(merge.wall2Id)
      } else if (merge.wall2Id === wallId) {
        mergedWalls.push(merge.wall1Id)
      }
    }

    return mergedWalls
  }

  /**
   * Force refresh of proximity merges
   * Requirements: 5.1, 5.4
   */
  refresh(): void {
    this.updateProximityMerges()
  }

  /**
   * Clear all active merges
   * Requirements: 5.4
   */
  clearAllMerges(): void {
    const mergesToClear = Array.from(this.activeMerges.values())
    this.activeMerges.clear()

    // Emit separation events for all cleared merges
    for (const merge of mergesToClear) {
      this.onMergeSeparated(merge)
    }
  }

  /**
   * Get merge statistics
   * Requirements: 5.3
   */
  getMergeStatistics(): {
    totalMerges: number
    averageDistance: number
    mergesByType: Record<string, number>
    oldestMerge: Date | null
    newestMerge: Date | null
  } {
    const merges = Array.from(this.activeMerges.values())
    
    if (merges.length === 0) {
      return {
        totalMerges: 0,
        averageDistance: 0,
        mergesByType: {},
        oldestMerge: null,
        newestMerge: null
      }
    }

    const totalDistance = merges.reduce((sum, merge) => sum + merge.distance, 0)
    const mergesByType: Record<string, number> = {}
    
    let oldestDate = merges[0].createdAt
    let newestDate = merges[0].createdAt

    for (const merge of merges) {
      mergesByType[merge.mergeType] = (mergesByType[merge.mergeType] || 0) + 1
      
      if (merge.createdAt < oldestDate) oldestDate = merge.createdAt
      if (merge.createdAt > newestDate) newestDate = merge.createdAt
    }

    return {
      totalMerges: merges.length,
      averageDistance: totalDistance / merges.length,
      mergesByType,
      oldestMerge: oldestDate,
      newestMerge: newestDate
    }
  }

  /**
   * Cleanup resources
   * Requirements: 5.4
   */
  destroy(): void {
    this.stopProximityChecking()
    this.clearAllMerges()
  }
}