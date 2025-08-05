import type { Point, Node, Segment, Wall } from './types';

/**
 * GeometryService provides mathematical operations for geometric calculations
 * Requirements: 3.1, 3.2, 4.3, 4.4, 4.5
 */
export class GeometryService {
    // Tolerance for floating point comparisons (1mm in the coordinate system)
    private static readonly TOLERANCE = 1e-6;
    
    // Distance threshold for proximity-based operations (5mm)
    private static readonly PROXIMITY_THRESHOLD = 5;

    /**
     * Calculate the intersection point between two line segments
     * Requirements: 3.1, 3.2
     * 
     * @param seg1 First line segment
     * @param seg2 Second line segment
     * @param nodes Map of all nodes for coordinate lookup
     * @returns Intersection point or null if no intersection
     */
    static findIntersection(
        seg1: Segment, 
        seg2: Segment, 
        nodes: Map<string, Node>
    ): Point | null {
        const start1 = nodes.get(seg1.startNodeId);
        const end1 = nodes.get(seg1.endNodeId);
        const start2 = nodes.get(seg2.startNodeId);
        const end2 = nodes.get(seg2.endNodeId);

        if (!start1 || !end1 || !start2 || !end2) {
            return null;
        }

        return this.findLineIntersection(start1, end1, start2, end2);
    }

    /**
     * Calculate intersection between two lines defined by points
     * Uses parametric line equation: P = P1 + t(P2 - P1)
     * Requirements: 3.1, 3.2
     */
    static findLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;

        // Calculate the denominator
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        // Lines are parallel if denominator is zero
        if (Math.abs(denom) < this.TOLERANCE) {
            return null;
        }

        // Calculate parameters t and u
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        // Check if intersection is within both line segments
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }

        return null;
    }

    /**
     * Calculate distance between two points
     * Requirements: 4.3, 4.4
     */
    static distanceBetweenPoints(p1: Point, p2: Point): number {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    /**
     * Calculate the shortest distance from a point to a line segment
     * Requirements: 4.3, 4.4
     */
    static distanceToSegment(
        point: Point, 
        segment: Segment, 
        nodes: Map<string, Node>
    ): number {
        const start = nodes.get(segment.startNodeId);
        const end = nodes.get(segment.endNodeId);

        if (!start || !end) {
            return Infinity;
        }

        return this.distancePointToLineSegment(point, start, end);
    }

    /**
     * Calculate distance from point to line segment using projection
     * Requirements: 4.3, 4.4
     */
    static distancePointToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        // Handle degenerate case where line segment has zero length
        if (lenSq < this.TOLERANCE) {
            return this.distanceBetweenPoints(point, lineStart);
        }

        let param = dot / lenSq;

        let xx: number, yy: number;

        if (param < 0) {
            // Point is closest to start of segment
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            // Point is closest to end of segment
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            // Point projects onto the segment
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if a point lies on a line segment within tolerance
     * Requirements: 4.3, 4.4
     */
    static isPointOnSegment(
        point: Point, 
        segment: Segment, 
        nodes: Map<string, Node>, 
        tolerance: number = this.TOLERANCE
    ): boolean {
        const distance = this.distanceToSegment(point, segment, nodes);
        return distance <= tolerance;
    }

    /**
     * Check if three points are collinear (lie on the same line)
     * Requirements: 4.3, 4.4, 4.5
     */
    static arePointsCollinear(p1: Point, p2: Point, p3: Point, tolerance: number = this.TOLERANCE): boolean {
        // Calculate the area of triangle formed by three points
        // If area is zero (within tolerance), points are collinear
        const area = Math.abs(
            (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
        );
        return area <= tolerance;
    }

    /**
     * Check if two segments are collinear
     * Requirements: 4.3, 4.4, 4.5
     */
    static areSegmentsCollinear(
        seg1: Segment, 
        seg2: Segment, 
        nodes: Map<string, Node>, 
        tolerance: number = this.TOLERANCE
    ): boolean {
        const start1 = nodes.get(seg1.startNodeId);
        const end1 = nodes.get(seg1.endNodeId);
        const start2 = nodes.get(seg2.startNodeId);
        const end2 = nodes.get(seg2.endNodeId);

        if (!start1 || !end1 || !start2 || !end2) {
            return false;
        }

        // Check if all four points are collinear
        return this.arePointsCollinear(start1, end1, start2, tolerance) &&
               this.arePointsCollinear(start1, end1, end2, tolerance);
    }

    /**
     * Determine if a node should be cleaned up based on its connections
     * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
     * 
     * A node can be cleaned up if:
     * - It connects exactly 2 segments
     * - Both segments are collinear
     * - The node is not at the end of either segment (it's in the middle)
     */
    static shouldCleanupNode(
        node: Node, 
        segments: Map<string, Segment>, 
        nodes: Map<string, Node>
    ): boolean {
        // Node must connect exactly 2 segments for cleanup consideration
        if (node.connectedSegments.length !== 2) {
            return false;
        }

        const seg1 = segments.get(node.connectedSegments[0]);
        const seg2 = segments.get(node.connectedSegments[1]);

        if (!seg1 || !seg2) {
            return false;
        }

        // Check if node is in the middle of both segments (not an endpoint)
        const isEndpointOfSeg1 = seg1.startNodeId === node.id || seg1.endNodeId === node.id;
        const isEndpointOfSeg2 = seg2.startNodeId === node.id || seg2.endNodeId === node.id;

        if (!isEndpointOfSeg1 || !isEndpointOfSeg2) {
            return false;
        }

        // Check if segments are collinear
        return this.areSegmentsCollinear(seg1, seg2, nodes);
    }

    /**
     * Get the other node of a segment (given one node)
     * Requirements: 4.3, 4.4
     */
    static getOtherNode(segment: Segment, nodeId: string): string | null {
        if (segment.startNodeId === nodeId) {
            return segment.endNodeId;
        } else if (segment.endNodeId === nodeId) {
            return segment.startNodeId;
        }
        return null;
    }

    /**
     * Calculate angle between two points in radians
     * Requirements: 4.3, 4.4
     */
    static calculateAngle(from: Point, to: Point): number {
        return Math.atan2(to.y - from.y, to.x - from.x);
    }

    /**
     * Calculate angle between two vectors in radians
     * Requirements: 4.3, 4.4
     */
    static angleBetweenVectors(v1: Point, v2: Point): number {
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        if (mag1 < this.TOLERANCE || mag2 < this.TOLERANCE) {
            return 0;
        }
        
        const cosAngle = dot / (mag1 * mag2);
        // Clamp to avoid floating point errors
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        return Math.acos(clampedCos);
    }

    /**
     * Find walls that are within proximity threshold of a given wall
     * Requirements: 5.1, 5.2
     */
    static findNearbyWalls(
        targetWall: Wall, 
        allWalls: Wall[], 
        segments: Map<string, Segment>, 
        nodes: Map<string, Node>,
        threshold: number = this.PROXIMITY_THRESHOLD
    ): Wall[] {
        const nearbyWalls: Wall[] = [];

        for (const wall of allWalls) {
            if (wall.id === targetWall.id) continue;

            // Check if any segment of the target wall is close to any segment of this wall
            let isNearby = false;
            for (const targetSegId of targetWall.segmentIds) {
                for (const wallSegId of wall.segmentIds) {
                    const targetSeg = segments.get(targetSegId);
                    const wallSeg = segments.get(wallSegId);
                    
                    if (targetSeg && wallSeg) {
                        const distance = this.distanceBetweenSegments(targetSeg, wallSeg, nodes);
                        if (distance <= threshold) {
                            isNearby = true;
                            break;
                        }
                    }
                }
                if (isNearby) break;
            }

            if (isNearby) {
                nearbyWalls.push(wall);
            }
        }

        return nearbyWalls;
    }

    /**
     * Calculate minimum distance between two line segments
     * Requirements: 5.1, 5.2
     */
    static distanceBetweenSegments(
        seg1: Segment, 
        seg2: Segment, 
        nodes: Map<string, Node>
    ): number {
        const start1 = nodes.get(seg1.startNodeId);
        const end1 = nodes.get(seg1.endNodeId);
        const start2 = nodes.get(seg2.startNodeId);
        const end2 = nodes.get(seg2.endNodeId);

        if (!start1 || !end1 || !start2 || !end2) {
            return Infinity;
        }

        // Calculate distance from each endpoint to the other segment
        const distances = [
            this.distancePointToLineSegment(start1, start2, end2),
            this.distancePointToLineSegment(end1, start2, end2),
            this.distancePointToLineSegment(start2, start1, end1),
            this.distancePointToLineSegment(end2, start1, end1)
        ];

        return Math.min(...distances);
    }

    /**
     * Check if two walls can be merged based on proximity and compatibility
     * Requirements: 5.3, 5.4, 5.5
     */
    static canMergeWalls(wall1: Wall, wall2: Wall): boolean {
        // Walls can be merged regardless of type (Requirement 5.5)
        // They just need to be visible and have segments
        return wall1.visible && wall2.visible && 
               wall1.segmentIds.length > 0 && wall2.segmentIds.length > 0;
    }

    /**
     * Normalize angle to range [0, 2π]
     */
    static normalizeAngle(angle: number): number {
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
        return angle;
    }

    /**
     * Check if two angles are approximately equal within tolerance
     */
    static anglesEqual(angle1: number, angle2: number, tolerance: number = this.TOLERANCE): boolean {
        const diff = Math.abs(this.normalizeAngle(angle1) - this.normalizeAngle(angle2));
        return diff <= tolerance || diff >= (2 * Math.PI - tolerance);
    }

    /**
     * Get tolerance value for external use
     */
    static get tolerance(): number {
        return this.TOLERANCE;
    }

    /**
     * Get proximity threshold for external use
     */
    static get proximityThreshold(): number {
        return this.PROXIMITY_THRESHOLD;
    }
}