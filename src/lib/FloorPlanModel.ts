import type { Node, Segment, Wall, WallTypeString, NodeType, Point } from './types';
import { WALL_THICKNESS } from './types';

/**
 * FloorPlanModel manages the in-memory data structures for nodes, segments, and walls
 * Requirements: 9.1, 9.2, 14.1, 14.2, 14.4
 */
export class FloorPlanModel {
    private nodes: Map<string, Node> = new Map();
    private segments: Map<string, Segment> = new Map();
    private walls: Map<string, Wall> = new Map();
    private nextId = 1;

    /**
     * Generate a unique ID for entities
     */
    private generateId(): string {
        return `id_${this.nextId++}`;
    }

    /**
     * Calculate distance between two points
     */
    private calculateDistance(p1: Point, p2: Point): number {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    /**
     * Calculate angle between two points in radians
     */
    private calculateAngle(p1: Point, p2: Point): number {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    // ===== NODE OPERATIONS =====

    /**
     * Create a new node at the specified coordinates
     * Requirements: 14.1, 14.2
     */
    createNode(x: number, y: number, type: NodeType = 'endpoint'): Node {
        const node: Node = {
            id: this.generateId(),
            x,
            y,
            connectedSegments: [],
            type
        };

        this.nodes.set(node.id, node);
        return node;
    }

    /**
     * Get a node by ID
     */
    getNode(nodeId: string): Node | undefined {
        return this.nodes.get(nodeId);
    }

    /**
     * Get all nodes
     */
    getAllNodes(): Node[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Update a node's position
     */
    updateNode(nodeId: string, x: number, y: number): boolean {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        node.x = x;
        node.y = y;

        // Recalculate connected segments
        node.connectedSegments.forEach(segmentId => {
            this.recalculateSegment(segmentId);
        });

        return true;
    }

    /**
     * Delete a node and clean up connected segments
     * Requirements: 14.4
     */
    deleteNode(nodeId: string): boolean {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        // Delete all connected segments first
        const segmentsToDelete = [...node.connectedSegments];
        segmentsToDelete.forEach(segmentId => {
            this.deleteSegment(segmentId);
        });

        this.nodes.delete(nodeId);
        return true;
    }

    /**
     * Get segments connected to a node
     */
    getConnectedSegments(nodeId: string): Segment[] {
        const node = this.nodes.get(nodeId);
        if (!node) return [];

        return node.connectedSegments
            .map(segmentId => this.segments.get(segmentId))
            .filter((segment): segment is Segment => segment !== undefined);
    }

    // ===== SEGMENT OPERATIONS =====

    /**
     * Create a new segment between two nodes
     * Requirements: 14.1, 14.2
     */
    createSegment(startNodeId: string, endNodeId: string): Segment | null {
        const startNode = this.nodes.get(startNodeId);
        const endNode = this.nodes.get(endNodeId);

        if (!startNode || !endNode) return null;
        if (startNodeId === endNodeId) return null; // Prevent self-loops

        const length = this.calculateDistance(startNode, endNode);
        const angle = this.calculateAngle(startNode, endNode);

        const segment: Segment = {
            id: this.generateId(),
            startNodeId,
            endNodeId,
            length,
            angle
        };

        this.segments.set(segment.id, segment);

        // Update node connections
        startNode.connectedSegments.push(segment.id);
        endNode.connectedSegments.push(segment.id);

        return segment;
    }

    /**
     * Get a segment by ID
     */
    getSegment(segmentId: string): Segment | undefined {
        return this.segments.get(segmentId);
    }

    /**
     * Get all segments
     */
    getAllSegments(): Segment[] {
        return Array.from(this.segments.values());
    }

    /**
     * Recalculate segment length and angle after node movement
     */
    private recalculateSegment(segmentId: string): void {
        const segment = this.segments.get(segmentId);
        if (!segment) return;

        const startNode = this.nodes.get(segment.startNodeId);
        const endNode = this.nodes.get(segment.endNodeId);

        if (!startNode || !endNode) return;

        segment.length = this.calculateDistance(startNode, endNode);
        segment.angle = this.calculateAngle(startNode, endNode);
    }

    /**
     * Delete a segment and update node connections
     * Requirements: 14.4, 4.1, 4.2, 4.3, 4.4, 4.5
     */
    deleteSegment(segmentId: string): boolean {
        const segment = this.segments.get(segmentId);
        if (!segment) return false;

        // Store node IDs for cleanup analysis
        const startNodeId = segment.startNodeId;
        const endNodeId = segment.endNodeId;

        // Remove segment from connected nodes
        const startNode = this.nodes.get(startNodeId);
        const endNode = this.nodes.get(endNodeId);

        if (startNode) {
            startNode.connectedSegments = startNode.connectedSegments.filter(id => id !== segmentId);
        }
        if (endNode) {
            endNode.connectedSegments = endNode.connectedSegments.filter(id => id !== segmentId);
        }

        // Remove segment from any associated wall
        if (segment.wallId) {
            const wall = this.walls.get(segment.wallId);
            if (wall) {
                wall.segmentIds = wall.segmentIds.filter(id => id !== segmentId);
                wall.updatedAt = new Date();
            }
        }

        this.segments.delete(segmentId);

        // Perform automatic node cleanup after segment deletion
        this.performNodeCleanup(startNodeId);
        this.performNodeCleanup(endNodeId);

        return true;
    }

    /**
     * Perform automatic node cleanup for a specific node
     * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
     * 
     * @param nodeId The node to potentially clean up
     * @returns Information about cleanup performed
     */
    performNodeCleanup(nodeId: string): {cleaned: boolean, mergedSegmentId?: string} {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return {cleaned: false};
        }

        // Check if node should be cleaned up using GeometryService logic
        if (!this.shouldCleanupNode(node)) {
            return {cleaned: false};
        }

        // Perform the cleanup by merging the two connected segments
        const mergedSegmentId = this.mergeSegmentsAtNode(nodeId);
        if (mergedSegmentId) {
            return {cleaned: true, mergedSegmentId};
        }

        return {cleaned: false};
    }

    /**
     * Determine if a node should be cleaned up based on its connections
     * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
     */
    private shouldCleanupNode(node: Node): boolean {
        // Node must connect exactly 2 segments for cleanup consideration
        if (node.connectedSegments.length !== 2) {
            return false;
        }

        const seg1 = this.segments.get(node.connectedSegments[0]);
        const seg2 = this.segments.get(node.connectedSegments[1]);

        if (!seg1 || !seg2) {
            return false;
        }

        // Check if node is an endpoint of both segments (not in the middle)
        const isEndpointOfSeg1 = seg1.startNodeId === node.id || seg1.endNodeId === node.id;
        const isEndpointOfSeg2 = seg2.startNodeId === node.id || seg2.endNodeId === node.id;

        if (!isEndpointOfSeg1 || !isEndpointOfSeg2) {
            return false;
        }

        // Check if segments are collinear
        return this.areSegmentsCollinear(seg1, seg2);
    }

    /**
     * Check if two segments are collinear
     * Requirements: 4.3, 4.4, 4.5
     */
    private areSegmentsCollinear(seg1: Segment, seg2: Segment, tolerance: number = 1e-6): boolean {
        const start1 = this.nodes.get(seg1.startNodeId);
        const end1 = this.nodes.get(seg1.endNodeId);
        const start2 = this.nodes.get(seg2.startNodeId);
        const end2 = this.nodes.get(seg2.endNodeId);

        if (!start1 || !end1 || !start2 || !end2) {
            return false;
        }

        // Check if all four points are collinear
        return this.arePointsCollinear(start1, end1, start2, tolerance) &&
               this.arePointsCollinear(start1, end1, end2, tolerance);
    }

    /**
     * Check if three points are collinear (lie on the same line)
     * Requirements: 4.3, 4.4, 4.5
     */
    private arePointsCollinear(p1: Point, p2: Point, p3: Point, tolerance: number = 1e-6): boolean {
        // Calculate the area of triangle formed by three points
        // If area is zero (within tolerance), points are collinear
        const area = Math.abs(
            (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
        );
        return area <= tolerance;
    }

    /**
     * Merge two collinear segments at a shared node
     * Requirements: 4.3, 4.4, 4.5
     * 
     * @param nodeId The node where the two segments meet
     * @returns The ID of the new merged segment, or null if merge failed
     */
    mergeSegmentsAtNode(nodeId: string): string | null {
        const node = this.nodes.get(nodeId);
        if (!node || node.connectedSegments.length !== 2) {
            return null;
        }

        const seg1 = this.segments.get(node.connectedSegments[0]);
        const seg2 = this.segments.get(node.connectedSegments[1]);

        if (!seg1 || !seg2) {
            return null;
        }

        // Verify segments are collinear before merging
        if (!this.areSegmentsCollinear(seg1, seg2)) {
            return null;
        }

        // Determine the endpoints of the merged segment
        const otherNode1Id = seg1.startNodeId === nodeId ? seg1.endNodeId : seg1.startNodeId;
        const otherNode2Id = seg2.startNodeId === nodeId ? seg2.endNodeId : seg2.startNodeId;
        
        const otherNode1 = this.nodes.get(otherNode1Id);
        const otherNode2 = this.nodes.get(otherNode2Id);

        if (!otherNode1 || !otherNode2) {
            return null;
        }

        // Store wall associations before deletion
        const wallId1 = seg1.wallId;
        const wallId2 = seg2.wallId;

        // Delete the original segments
        this.deleteSegmentWithoutCleanup(seg1.id);
        this.deleteSegmentWithoutCleanup(seg2.id);

        // Delete the intermediate node
        this.nodes.delete(nodeId);

        // Create the new merged segment
        const mergedSegment = this.createSegment(otherNode1Id, otherNode2Id);
        if (!mergedSegment) {
            return null;
        }

        // Handle wall associations
        if (wallId1 && wallId2 && wallId1 === wallId2) {
            // Both segments belonged to the same wall
            mergedSegment.wallId = wallId1;
            const wall = this.walls.get(wallId1);
            if (wall) {
                // Remove old segment IDs and add new one
                wall.segmentIds = wall.segmentIds.filter(id => id !== seg1.id && id !== seg2.id);
                wall.segmentIds.push(mergedSegment.id);
                wall.updatedAt = new Date();
            }
        } else if (wallId1 && !wallId2) {
            // Only seg1 had a wall association
            mergedSegment.wallId = wallId1;
            const wall = this.walls.get(wallId1);
            if (wall) {
                wall.segmentIds = wall.segmentIds.filter(id => id !== seg1.id && id !== seg2.id);
                wall.segmentIds.push(mergedSegment.id);
                wall.updatedAt = new Date();
            }
        } else if (!wallId1 && wallId2) {
            // Only seg2 had a wall association
            mergedSegment.wallId = wallId2;
            const wall = this.walls.get(wallId2);
            if (wall) {
                wall.segmentIds = wall.segmentIds.filter(id => id !== seg1.id && id !== seg2.id);
                wall.segmentIds.push(mergedSegment.id);
                wall.updatedAt = new Date();
            }
        } else if (wallId1 && wallId2 && wallId1 !== wallId2) {
            // Segments belonged to different walls - remove from both walls, don't associate merged segment
            const wall1 = this.walls.get(wallId1);
            const wall2 = this.walls.get(wallId2);
            
            if (wall1) {
                wall1.segmentIds = wall1.segmentIds.filter(id => id !== seg1.id);
                wall1.updatedAt = new Date();
            }
            if (wall2) {
                wall2.segmentIds = wall2.segmentIds.filter(id => id !== seg2.id);
                wall2.updatedAt = new Date();
            }
            // mergedSegment.wallId remains undefined
        }
        // If neither segment had wall associations, merged segment also has no association

        return mergedSegment.id;
    }

    /**
     * Delete a segment without performing node cleanup (used internally during merging)
     * Requirements: 4.3, 4.4
     */
    private deleteSegmentWithoutCleanup(segmentId: string): boolean {
        const segment = this.segments.get(segmentId);
        if (!segment) return false;

        // Remove segment from connected nodes
        const startNode = this.nodes.get(segment.startNodeId);
        const endNode = this.nodes.get(segment.endNodeId);

        if (startNode) {
            startNode.connectedSegments = startNode.connectedSegments.filter(id => id !== segmentId);
        }
        if (endNode) {
            endNode.connectedSegments = endNode.connectedSegments.filter(id => id !== segmentId);
        }

        this.segments.delete(segmentId);
        return true;
    }

    /**
     * Perform cleanup analysis on all nodes to identify cleanup opportunities
     * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
     * 
     * @returns Array of cleanup results
     */
    analyzeAndCleanupNodes(): Array<{nodeId: string, cleaned: boolean, mergedSegmentId?: string}> {
        const results: Array<{nodeId: string, cleaned: boolean, mergedSegmentId?: string}> = [];
        const nodeIds = Array.from(this.nodes.keys());

        for (const nodeId of nodeIds) {
            const result = this.performNodeCleanup(nodeId);
            results.push({
                nodeId,
                ...result
            });
        }

        return results.filter(r => r.cleaned); // Return only nodes that were actually cleaned
    }

    /**
     * Get cleanup analysis for a specific node without performing cleanup
     * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
     */
    getNodeCleanupAnalysis(nodeId: string): {
        canCleanup: boolean,
        reason: string,
        connectedSegments: number,
        segmentsCollinear?: boolean
    } {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return {
                canCleanup: false,
                reason: 'Node not found',
                connectedSegments: 0
            };
        }

        const connectedCount = node.connectedSegments.length;
        
        if (connectedCount !== 2) {
            return {
                canCleanup: false,
                reason: connectedCount > 2 ? 'Node connects to more than 2 segments' : 
                        connectedCount === 1 ? 'Node is at the end of a segment' : 
                        'Node has no connected segments',
                connectedSegments: connectedCount
            };
        }

        const seg1 = this.segments.get(node.connectedSegments[0]);
        const seg2 = this.segments.get(node.connectedSegments[1]);

        if (!seg1 || !seg2) {
            return {
                canCleanup: false,
                reason: 'Connected segments not found',
                connectedSegments: connectedCount
            };
        }

        const areCollinear = this.areSegmentsCollinear(seg1, seg2);
        
        return {
            canCleanup: areCollinear,
            reason: areCollinear ? 'Node can be cleaned up - segments are collinear' : 
                    'Segments are not collinear',
            connectedSegments: connectedCount,
            segmentsCollinear: areCollinear
        };
    }

    /**
     * Subdivide a segment at an intersection point
     * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
     * 
     * @param segmentId The segment to subdivide
     * @param intersectionPoint The point where subdivision occurs
     * @returns Array of new segment IDs created from subdivision, or null if failed
     */
    subdivideSegment(segmentId: string, intersectionPoint: Point): string[] | null {
        const segment = this.segments.get(segmentId);
        if (!segment) return null;

        const startNode = this.nodes.get(segment.startNodeId);
        const endNode = this.nodes.get(segment.endNodeId);
        if (!startNode || !endNode) return null;

        // Create new node at intersection point
        const intersectionNode = this.createNode(intersectionPoint.x, intersectionPoint.y);
        intersectionNode.type = 'intersection';

        // Delete the original segment
        const originalWallId = segment.wallId;
        this.deleteSegment(segmentId);

        // Create two new segments: start->intersection and intersection->end
        const segment1 = this.createSegment(startNode.id, intersectionNode.id);
        const segment2 = this.createSegment(intersectionNode.id, endNode.id);

        if (!segment1 || !segment2) {
            // Cleanup on failure
            this.deleteNode(intersectionNode.id);
            return null;
        }

        // Associate new segments with the original wall if it existed
        if (originalWallId) {
            segment1.wallId = originalWallId;
            segment2.wallId = originalWallId;

            const wall = this.walls.get(originalWallId);
            if (wall) {
                // Remove old segment ID and add new ones
                wall.segmentIds = wall.segmentIds.filter(id => id !== segmentId);
                wall.segmentIds.push(segment1.id, segment2.id);
                wall.updatedAt = new Date();
            }
        }

        return [segment1.id, segment2.id];
    }

    /**
     * Find all segments that intersect with a given segment
     * Requirements: 3.1, 3.2
     * 
     * @param targetSegment The segment to check for intersections
     * @returns Array of intersection results with segment IDs and intersection points
     */
    findIntersectingSegments(targetSegment: Segment): Array<{segmentId: string, intersectionPoint: Point}> {
        const intersections: Array<{segmentId: string, intersectionPoint: Point}> = [];

        for (const [segmentId, segment] of this.segments) {
            // Skip the target segment itself
            if (segmentId === targetSegment.id) continue;

            // Skip segments that share nodes with the target (they're connected, not intersecting)
            if (segment.startNodeId === targetSegment.startNodeId || 
                segment.startNodeId === targetSegment.endNodeId ||
                segment.endNodeId === targetSegment.startNodeId || 
                segment.endNodeId === targetSegment.endNodeId) {
                continue;
            }

            // Check for intersection using GeometryService
            const intersectionPoint = this.findSegmentIntersection(targetSegment, segment);
            if (intersectionPoint) {
                intersections.push({
                    segmentId: segmentId,
                    intersectionPoint: intersectionPoint
                });
            }
        }

        return intersections;
    }

    /**
     * Find intersection point between two segments
     * Requirements: 3.1, 3.2
     * 
     * @param seg1 First segment
     * @param seg2 Second segment
     * @returns Intersection point or null if no intersection
     */
    private findSegmentIntersection(seg1: Segment, seg2: Segment): Point | null {
        const start1 = this.nodes.get(seg1.startNodeId);
        const end1 = this.nodes.get(seg1.endNodeId);
        const start2 = this.nodes.get(seg2.startNodeId);
        const end2 = this.nodes.get(seg2.endNodeId);

        if (!start1 || !end1 || !start2 || !end2) {
            return null;
        }

        // Use parametric line equation to find intersection
        const x1 = start1.x, y1 = start1.y;
        const x2 = end1.x, y2 = end1.y;
        const x3 = start2.x, y3 = start2.y;
        const x4 = end2.x, y4 = end2.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        // Lines are parallel if denominator is zero
        if (Math.abs(denom) < 1e-6) {
            return null;
        }

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
     * Process intersections for a new segment and subdivide existing segments as needed
     * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
     * 
     * @param newSegmentId The ID of the newly created segment
     * @returns Array of all segment modifications (subdivisions)
     */
    processIntersections(newSegmentId: string): Array<{originalSegmentId: string, newSegmentIds: string[]}> {
        const newSegment = this.segments.get(newSegmentId);
        if (!newSegment) return [];

        const modifications: Array<{originalSegmentId: string, newSegmentIds: string[]}> = [];
        const intersections = this.findIntersectingSegments(newSegment);

        // Process each intersection by subdividing the existing segment
        for (const intersection of intersections) {
            const subdivisionResult = this.subdivideSegment(intersection.segmentId, intersection.intersectionPoint);
            if (subdivisionResult) {
                modifications.push({
                    originalSegmentId: intersection.segmentId,
                    newSegmentIds: subdivisionResult
                });

                // Find the intersection node and connect it to the new segment
                const intersectionNode = this.findNodeAtPoint(intersection.intersectionPoint);
                if (intersectionNode) {
                    // Add the new segment to the intersection node's connections if not already present
                    if (!intersectionNode.connectedSegments.includes(newSegmentId)) {
                        intersectionNode.connectedSegments.push(newSegmentId);
                    }
                    
                    // Also need to subdivide the new segment at this intersection point
                    // This creates a three-way intersection as required
                    const newSegmentSubdivision = this.subdivideSegmentAtNode(newSegmentId, intersectionNode.id);
                    if (newSegmentSubdivision) {
                        modifications.push({
                            originalSegmentId: newSegmentId,
                            newSegmentIds: newSegmentSubdivision
                        });
                    }
                }
            }
        }

        return modifications;
    }

    /**
     * Subdivide a segment at a specific node (intersection point)
     * Requirements: 3.3, 3.4, 3.5
     * 
     * @param segmentId The segment to subdivide
     * @param nodeId The node where subdivision occurs
     * @returns Array of new segment IDs or null if failed
     */
    private subdivideSegmentAtNode(segmentId: string, nodeId: string): string[] | null {
        const segment = this.segments.get(segmentId);
        const node = this.nodes.get(nodeId);
        if (!segment || !node) return null;

        const startNode = this.nodes.get(segment.startNodeId);
        const endNode = this.nodes.get(segment.endNodeId);
        if (!startNode || !endNode) return null;

        // Check if the node is actually on the segment line
        const intersectionPoint = { x: node.x, y: node.y };
        const segmentStart = { x: startNode.x, y: startNode.y };
        const segmentEnd = { x: endNode.x, y: endNode.y };
        
        // Verify the node lies on the segment
        if (!this.isPointOnLineSegment(intersectionPoint, segmentStart, segmentEnd)) {
            return null;
        }

        // Delete the original segment
        const originalWallId = segment.wallId;
        this.deleteSegment(segmentId);

        // Create two new segments: start->intersection and intersection->end
        const segment1 = this.createSegment(startNode.id, nodeId);
        const segment2 = this.createSegment(nodeId, endNode.id);

        if (!segment1 || !segment2) {
            return null;
        }

        // Associate new segments with the original wall if it existed
        if (originalWallId) {
            segment1.wallId = originalWallId;
            segment2.wallId = originalWallId;

            const wall = this.walls.get(originalWallId);
            if (wall) {
                // Remove old segment ID and add new ones
                wall.segmentIds = wall.segmentIds.filter(id => id !== segmentId);
                wall.segmentIds.push(segment1.id, segment2.id);
                wall.updatedAt = new Date();
            }
        }

        return [segment1.id, segment2.id];
    }

    /**
     * Check if a point lies on a line segment
     * Requirements: 3.1, 3.2
     */
    private isPointOnLineSegment(point: Point, lineStart: Point, lineEnd: Point, tolerance: number = 1e-6): boolean {
        // Calculate distance from point to line segment
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq < tolerance) {
            // Line segment has zero length
            return this.calculateDistance(point, lineStart) <= tolerance;
        }

        const param = dot / lenSq;

        // Check if point projects onto the segment (not beyond endpoints)
        if (param < 0 || param > 1) {
            return false;
        }

        // Calculate the projected point
        const projX = lineStart.x + param * C;
        const projY = lineStart.y + param * D;

        // Check if the distance from point to projection is within tolerance
        const distance = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
        return distance <= tolerance;
    }

    /**
     * Find a node at a specific point (within tolerance)
     * Requirements: 3.3, 3.4
     */
    private findNodeAtPoint(point: Point, tolerance: number = 1e-6): Node | null {
        for (const [, node] of this.nodes) {
            const distance = this.calculateDistance(node, point);
            if (distance <= tolerance) {
                return node;
            }
        }
        return null;
    }

    // ===== WALL OPERATIONS =====

    /**
     * Create a new wall with specified type and segments
     * Requirements: 14.1, 14.2
     */
    createWall(type: WallTypeString, segmentIds: string[] = []): Wall {
        // Validate that all segments exist
        const validSegmentIds = segmentIds.filter(id => this.segments.has(id));

        const wall: Wall = {
            id: this.generateId(),
            type,
            thickness: WALL_THICKNESS[type],
            segmentIds: validSegmentIds,
            visible: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.walls.set(wall.id, wall);

        // Associate segments with this wall
        validSegmentIds.forEach(segmentId => {
            const segment = this.segments.get(segmentId);
            if (segment) {
                segment.wallId = wall.id;
            }
        });

        return wall;
    }

    /**
     * Get a wall by ID
     */
    getWall(wallId: string): Wall | undefined {
        return this.walls.get(wallId);
    }

    /**
     * Get all walls
     */
    getAllWalls(): Wall[] {
        return Array.from(this.walls.values());
    }

  /**
   * Get all segments for a wall
   */
  getSegmentsForWall(wallId: string): Segment[] {
    const wall = this.walls.get(wallId)
    if (!wall) return []
    return wall.segmentIds
      .map(id => this.segments.get(id))
      .filter((s): s is Segment => !!s)
  }

  /**
   * Find wall IDs (excluding the provided wall, unless included) that share
   * any node with the provided segment IDs
   */
  findWallsSharingNodesWithSegments(segmentIds: string[], excludeWallId?: string): Set<string> {
    const result = new Set<string>()
    const nodeIds = new Set<string>()
    segmentIds.forEach(id => {
      const s = this.segments.get(id)
      if (s) {
        nodeIds.add(s.startNodeId)
        nodeIds.add(s.endNodeId)
      }
    })
    nodeIds.forEach(nid => {
      const node = this.nodes.get(nid)
      if (!node) return
      node.connectedSegments.forEach(segId => {
        const seg = this.segments.get(segId)
        if (seg?.wallId && seg.wallId !== excludeWallId) result.add(seg.wallId)
      })
    })
    return result
  }

  /**
   * Merge multiple walls into a target wall. All segments are reassigned to the
   * target; merged walls are deleted. The wall type of the target is preserved.
   */
  mergeWalls(targetWallId: string, otherWallIds: string[]): boolean {
    const target = this.walls.get(targetWallId)
    if (!target) return false
    let changed = false
    for (const otherId of otherWallIds) {
      if (otherId === targetWallId) continue
      const other = this.walls.get(otherId)
      if (!other) continue
      // Only merge same-type walls to preserve semantics
      if (other.type !== target.type) continue
      other.segmentIds.forEach(segId => {
        const seg = this.segments.get(segId)
        if (seg) {
          seg.wallId = targetWallId
          if (!target.segmentIds.includes(segId)) target.segmentIds.push(segId)
        }
      })
      this.walls.delete(otherId)
      changed = true
    }
    if (changed) target.updatedAt = new Date()
    return changed
  }

  /**
   * Merge all walls of a given type that are connected through shared nodes.
   * This guarantees a single wall entity for each connected component.
   */
  unifyWallsByConnectivityOfType(wallType: WallTypeString): void {
    // Build union-find over wall ids of the given type
    const parents = new Map<string, string>()
    const find = (x: string): string => {
      let p = parents.get(x) || x
      if (p !== x) {
        p = find(p)
        parents.set(x, p)
      }
      return p
    }
    const union = (a: string, b: string) => {
      const ra = find(a)
      const rb = find(b)
      if (ra !== rb) parents.set(ra, rb)
    }

    const wallsOfType = Array.from(this.walls.values()).filter(w => w.type === wallType)
    wallsOfType.forEach(w => parents.set(w.id, w.id))

    // For each node, union all walls that touch it
    this.nodes.forEach(node => {
      const touchingWalls = new Set<string>()
      node.connectedSegments.forEach(segId => {
        const seg = this.segments.get(segId)
        if (seg?.wallId) {
          const w = this.walls.get(seg.wallId)
          if (w && w.type === wallType) touchingWalls.add(w.id)
        }
      })
      const ids = Array.from(touchingWalls)
      for (let i = 1; i < ids.length; i++) {
        union(ids[0], ids[i])
      }
    })

    // Group walls by root
    const groups = new Map<string, string[]>()
    wallsOfType.forEach(w => {
      const r = find(w.id)
      if (!groups.has(r)) groups.set(r, [])
      groups.get(r)!.push(w.id)
    })

    // For each group, merge into the first wall id
    groups.forEach(ids => {
      if (ids.length <= 1) return
      const [target, ...others] = ids
      this.mergeWalls(target, others)
    })
  }

    /**
     * Update wall properties
     */
    updateWall(wallId: string, updates: Partial<Pick<Wall, 'type' | 'visible'>>): boolean {
        const wall = this.walls.get(wallId);
        if (!wall) return false;

        if (updates.type !== undefined) {
            wall.type = updates.type;
            wall.thickness = WALL_THICKNESS[updates.type];
        }

        if (updates.visible !== undefined) {
            wall.visible = updates.visible;
        }

        wall.updatedAt = new Date();
        return true;
    }

    /**
     * Add segments to a wall
     */
    addSegmentsToWall(wallId: string, segmentIds: string[]): boolean {
        const wall = this.walls.get(wallId);
        if (!wall) return false;

        const validSegmentIds = segmentIds.filter(id => this.segments.has(id));

        validSegmentIds.forEach(segmentId => {
            if (!wall.segmentIds.includes(segmentId)) {
                wall.segmentIds.push(segmentId);
                const segment = this.segments.get(segmentId);
                if (segment) {
                    segment.wallId = wallId;
                }
            }
        });

        wall.updatedAt = new Date();
        return true;
    }

    /**
     * Remove segments from a wall
     */
    removeSegmentsFromWall(wallId: string, segmentIds: string[]): boolean {
        const wall = this.walls.get(wallId);
        if (!wall) return false;

        segmentIds.forEach(segmentId => {
            wall.segmentIds = wall.segmentIds.filter(id => id !== segmentId);
            const segment = this.segments.get(segmentId);
            if (segment && segment.wallId === wallId) {
                segment.wallId = undefined;
            }
        });

        wall.updatedAt = new Date();
        return true;
    }

    /**
     * Delete a wall and optionally its segments
     * Requirements: 14.4
     */
    deleteWall(wallId: string, deleteSegments: boolean = false): boolean {
        const wall = this.walls.get(wallId);
        if (!wall) return false;

        if (deleteSegments) {
            // Delete all segments associated with this wall
            const segmentsToDelete = [...wall.segmentIds];
            segmentsToDelete.forEach(segmentId => {
                this.deleteSegment(segmentId);
            });
        } else {
            // Just remove wall association from segments
            wall.segmentIds.forEach(segmentId => {
                const segment = this.segments.get(segmentId);
                if (segment) {
                    segment.wallId = undefined;
                }
            });
        }

        this.walls.delete(wallId);
        return true;
    }

    // ===== UTILITY METHODS =====

    /**
     * Clear all data (for testing or reset)
     * Requirements: 9.1, 9.2
     */
    clear(): void {
        this.nodes.clear();
        this.segments.clear();
        this.walls.clear();
        this.nextId = 1;
    }

    /**
     * Get data summary for debugging
     */
    getDataSummary(): { nodeCount: number; segmentCount: number; wallCount: number } {
        return {
            nodeCount: this.nodes.size,
            segmentCount: this.segments.size,
            wallCount: this.walls.size
        };
    }
}