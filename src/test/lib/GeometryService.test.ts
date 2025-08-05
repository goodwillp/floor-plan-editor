import { describe, it, expect, beforeEach } from 'vitest';
import { GeometryService } from '../../lib/GeometryService';
import type { Point, Node, Segment, Wall } from '../../lib/types';
import { WallType } from '../../lib/types';

describe('GeometryService', () => {
    let nodes: Map<string, Node>;
    let segments: Map<string, Segment>;

    beforeEach(() => {
        nodes = new Map();
        segments = new Map();
    });

    // Helper function to create a node
    const createNode = (id: string, x: number, y: number): Node => {
        const node: Node = {
            id,
            x,
            y,
            connectedSegments: [],
            type: 'endpoint'
        };
        nodes.set(id, node);
        return node;
    };

    // Helper function to create a segment
    const createSegment = (id: string, startNodeId: string, endNodeId: string): Segment => {
        const startNode = nodes.get(startNodeId);
        const endNode = nodes.get(endNodeId);
        
        if (!startNode || !endNode) {
            throw new Error('Nodes must exist before creating segment');
        }

        const length = GeometryService.distanceBetweenPoints(startNode, endNode);
        const angle = GeometryService.calculateAngle(startNode, endNode);

        const segment: Segment = {
            id,
            startNodeId,
            endNodeId,
            length,
            angle
        };
        
        segments.set(id, segment);
        startNode.connectedSegments.push(id);
        endNode.connectedSegments.push(id);
        
        return segment;
    };

    describe('Line Intersection Detection', () => {
        it('should find intersection between two crossing lines', () => {
            // Create a cross pattern: horizontal line (0,5)-(10,5) and vertical line (5,0)-(5,10)
            createNode('n1', 0, 5);
            createNode('n2', 10, 5);
            createNode('n3', 5, 0);
            createNode('n4', 5, 10);

            const seg1 = createSegment('s1', 'n1', 'n2'); // horizontal
            const seg2 = createSegment('s2', 'n3', 'n4'); // vertical

            const intersection = GeometryService.findIntersection(seg1, seg2, nodes);

            expect(intersection).not.toBeNull();
            expect(intersection!.x).toBeCloseTo(5, 5);
            expect(intersection!.y).toBeCloseTo(5, 5);
        });

        it('should return null for parallel lines', () => {
            // Create two parallel horizontal lines
            createNode('n1', 0, 0);
            createNode('n2', 10, 0);
            createNode('n3', 0, 5);
            createNode('n4', 10, 5);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n3', 'n4');

            const intersection = GeometryService.findIntersection(seg1, seg2, nodes);

            expect(intersection).toBeNull();
        });

        it('should return null for non-intersecting segments', () => {
            // Create two segments that would intersect if extended, but don't actually intersect
            createNode('n1', 0, 0);
            createNode('n2', 2, 0);
            createNode('n3', 5, -1);
            createNode('n4', 5, 1);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n3', 'n4');

            const intersection = GeometryService.findIntersection(seg1, seg2, nodes);

            expect(intersection).toBeNull();
        });

        it('should find intersection at segment endpoints', () => {
            // Create segments that meet at an endpoint
            createNode('n1', 0, 0);
            createNode('n2', 5, 5);
            createNode('n3', 10, 0);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n2', 'n3');

            const intersection = GeometryService.findIntersection(seg1, seg2, nodes);

            expect(intersection).not.toBeNull();
            expect(intersection!.x).toBeCloseTo(5, 5);
            expect(intersection!.y).toBeCloseTo(5, 5);
        });
    });

    describe('Distance Calculations', () => {
        it('should calculate distance between two points correctly', () => {
            const p1: Point = { x: 0, y: 0 };
            const p2: Point = { x: 3, y: 4 };

            const distance = GeometryService.distanceBetweenPoints(p1, p2);

            expect(distance).toBeCloseTo(5, 5); // 3-4-5 triangle
        });

        it('should calculate distance from point to line segment', () => {
            createNode('n1', 0, 0);
            createNode('n2', 10, 0);
            const segment = createSegment('s1', 'n1', 'n2');

            // Point directly above the middle of the segment
            const point: Point = { x: 5, y: 3 };

            const distance = GeometryService.distanceToSegment(point, segment, nodes);

            expect(distance).toBeCloseTo(3, 5);
        });

        it('should calculate distance to segment endpoint when point is beyond segment', () => {
            createNode('n1', 0, 0);
            createNode('n2', 10, 0);
            const segment = createSegment('s1', 'n1', 'n2');

            // Point beyond the end of the segment
            const point: Point = { x: 15, y: 4 };

            const distance = GeometryService.distanceToSegment(point, segment, nodes);

            // Distance should be to the endpoint (10, 0)
            const expectedDistance = GeometryService.distanceBetweenPoints(point, { x: 10, y: 0 });
            expect(distance).toBeCloseTo(expectedDistance, 5);
        });

        it('should handle degenerate segment (zero length)', () => {
            createNode('n1', 5, 5);
            createNode('n2', 5, 5); // Same position
            const segment = createSegment('s1', 'n1', 'n2');

            const point: Point = { x: 8, y: 9 };

            const distance = GeometryService.distanceToSegment(point, segment, nodes);

            expect(distance).toBeCloseTo(5, 5); // Distance from (8,9) to (5,5)
        });
    });

    describe('Collinearity Detection', () => {
        it('should detect collinear points', () => {
            const p1: Point = { x: 0, y: 0 };
            const p2: Point = { x: 5, y: 5 };
            const p3: Point = { x: 10, y: 10 };

            const isCollinear = GeometryService.arePointsCollinear(p1, p2, p3);

            expect(isCollinear).toBe(true);
        });

        it('should detect non-collinear points', () => {
            const p1: Point = { x: 0, y: 0 };
            const p2: Point = { x: 5, y: 5 };
            const p3: Point = { x: 10, y: 0 };

            const isCollinear = GeometryService.arePointsCollinear(p1, p2, p3);

            expect(isCollinear).toBe(false);
        });

        it('should detect collinear segments', () => {
            // Create two collinear segments on the same line
            createNode('n1', 0, 0);
            createNode('n2', 5, 5);
            createNode('n3', 10, 10);
            createNode('n4', 15, 15);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n3', 'n4');

            const isCollinear = GeometryService.areSegmentsCollinear(seg1, seg2, nodes);

            expect(isCollinear).toBe(true);
        });

        it('should detect non-collinear segments', () => {
            // Create two segments that are not collinear
            createNode('n1', 0, 0);
            createNode('n2', 5, 5);
            createNode('n3', 0, 5);
            createNode('n4', 5, 0);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n3', 'n4');

            const isCollinear = GeometryService.areSegmentsCollinear(seg1, seg2, nodes);

            expect(isCollinear).toBe(false);
        });
    });

    describe('Node Cleanup Detection', () => {
        it('should identify node eligible for cleanup', () => {
            // Create three collinear nodes with two segments
            createNode('n1', 0, 0);
            createNode('n2', 5, 5);  // Middle node - should be eligible for cleanup
            createNode('n3', 10, 10);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n2', 'n3');

            const node2 = nodes.get('n2')!;
            const shouldCleanup = GeometryService.shouldCleanupNode(node2, segments, nodes);

            expect(shouldCleanup).toBe(true);
        });

        it('should not cleanup node with more than 2 connections', () => {
            // Create a T-junction
            createNode('n1', 0, 0);
            createNode('n2', 5, 5);  // Junction node
            createNode('n3', 10, 10);
            createNode('n4', 5, 10);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n2', 'n3');
            const seg3 = createSegment('s3', 'n2', 'n4');

            const node2 = nodes.get('n2')!;
            const shouldCleanup = GeometryService.shouldCleanupNode(node2, segments, nodes);

            expect(shouldCleanup).toBe(false);
        });

        it('should not cleanup node with non-collinear segments', () => {
            // Create perpendicular segments
            createNode('n1', 0, 0);
            createNode('n2', 5, 5);  // Corner node
            createNode('n3', 10, 5);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n2', 'n3');

            const node2 = nodes.get('n2')!;
            const shouldCleanup = GeometryService.shouldCleanupNode(node2, segments, nodes);

            expect(shouldCleanup).toBe(false);
        });

        it('should not cleanup node with only one connection', () => {
            createNode('n1', 0, 0);
            createNode('n2', 5, 5);

            const seg1 = createSegment('s1', 'n1', 'n2');

            const node2 = nodes.get('n2')!;
            const shouldCleanup = GeometryService.shouldCleanupNode(node2, segments, nodes);

            expect(shouldCleanup).toBe(false);
        });
    });

    describe('Utility Functions', () => {
        it('should get the other node of a segment', () => {
            createNode('n1', 0, 0);
            createNode('n2', 5, 5);
            const segment = createSegment('s1', 'n1', 'n2');

            const otherNode1 = GeometryService.getOtherNode(segment, 'n1');
            const otherNode2 = GeometryService.getOtherNode(segment, 'n2');
            const otherNode3 = GeometryService.getOtherNode(segment, 'n3');

            expect(otherNode1).toBe('n2');
            expect(otherNode2).toBe('n1');
            expect(otherNode3).toBeNull();
        });

        it('should calculate angle between points', () => {
            const from: Point = { x: 0, y: 0 };
            const to: Point = { x: 1, y: 1 };

            const angle = GeometryService.calculateAngle(from, to);

            expect(angle).toBeCloseTo(Math.PI / 4, 5); // 45 degrees in radians
        });

        it('should calculate angle between vectors', () => {
            const v1: Point = { x: 1, y: 0 };
            const v2: Point = { x: 0, y: 1 };

            const angle = GeometryService.angleBetweenVectors(v1, v2);

            expect(angle).toBeCloseTo(Math.PI / 2, 5); // 90 degrees in radians
        });

        it('should normalize angles correctly', () => {
            expect(GeometryService.normalizeAngle(-Math.PI / 2)).toBeCloseTo(3 * Math.PI / 2, 5);
            expect(GeometryService.normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 5);
            expect(GeometryService.normalizeAngle(Math.PI / 4)).toBeCloseTo(Math.PI / 4, 5);
        });

        it('should compare angles with tolerance', () => {
            const angle1 = Math.PI / 4;
            const angle2 = Math.PI / 4 + 1e-7; // Very small difference

            expect(GeometryService.anglesEqual(angle1, angle2)).toBe(true);
            expect(GeometryService.anglesEqual(0, 2 * Math.PI)).toBe(true);
            expect(GeometryService.anglesEqual(Math.PI / 4, Math.PI / 2)).toBe(false);
        });
    });

    describe('Point on Segment Detection', () => {
        it('should detect point on segment', () => {
            createNode('n1', 0, 0);
            createNode('n2', 10, 0);
            const segment = createSegment('s1', 'n1', 'n2');

            const pointOnSegment: Point = { x: 5, y: 0 };
            const pointOffSegment: Point = { x: 5, y: 1 };

            expect(GeometryService.isPointOnSegment(pointOnSegment, segment, nodes)).toBe(true);
            expect(GeometryService.isPointOnSegment(pointOffSegment, segment, nodes, 0.5)).toBe(false);
            expect(GeometryService.isPointOnSegment(pointOffSegment, segment, nodes, 2)).toBe(true);
        });
    });

    describe('Wall Proximity and Merging', () => {
        it('should find nearby walls within threshold', () => {
            // Create two walls with segments close to each other
            createNode('n1', 0, 0);
            createNode('n2', 10, 0);
            createNode('n3', 0, 2); // 2 units away from first wall
            createNode('n4', 10, 2);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n3', 'n4');

            const wall1: Wall = {
                id: 'w1',
                type: 'layout',
                thickness: 350,
                segmentIds: ['s1'],
                visible: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const wall2: Wall = {
                id: 'w2',
                type: 'zone',
                thickness: 250,
                segmentIds: ['s2'],
                visible: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const nearbyWalls = GeometryService.findNearbyWalls(
                wall1, 
                [wall2], 
                segments, 
                nodes, 
                5 // threshold of 5 units
            );

            expect(nearbyWalls).toHaveLength(1);
            expect(nearbyWalls[0].id).toBe('w2');
        });

        it('should not find walls beyond threshold', () => {
            // Create two walls with segments far apart
            createNode('n1', 0, 0);
            createNode('n2', 10, 0);
            createNode('n3', 0, 20); // 20 units away
            createNode('n4', 10, 20);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n3', 'n4');

            const wall1: Wall = {
                id: 'w1',
                type: 'layout',
                thickness: 350,
                segmentIds: ['s1'],
                visible: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const wall2: Wall = {
                id: 'w2',
                type: 'zone',
                thickness: 250,
                segmentIds: ['s2'],
                visible: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const nearbyWalls = GeometryService.findNearbyWalls(
                wall1, 
                [wall2], 
                segments, 
                nodes, 
                5 // threshold of 5 units
            );

            expect(nearbyWalls).toHaveLength(0);
        });

        it('should determine if walls can be merged', () => {
            const wall1: Wall = {
                id: 'w1',
                type: 'layout',
                thickness: 350,
                segmentIds: ['s1'],
                visible: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const wall2: Wall = {
                id: 'w2',
                type: 'zone',
                thickness: 250,
                segmentIds: ['s2'],
                visible: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const invisibleWall: Wall = {
                id: 'w3',
                type: 'area',
                thickness: 150,
                segmentIds: ['s3'],
                visible: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const emptyWall: Wall = {
                id: 'w4',
                type: 'layout',
                thickness: 350,
                segmentIds: [],
                visible: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(GeometryService.canMergeWalls(wall1, wall2)).toBe(true);
            expect(GeometryService.canMergeWalls(wall1, invisibleWall)).toBe(false);
            expect(GeometryService.canMergeWalls(wall1, emptyWall)).toBe(false);
        });

        it('should calculate distance between segments correctly', () => {
            // Create two parallel segments
            createNode('n1', 0, 0);
            createNode('n2', 10, 0);
            createNode('n3', 0, 5);
            createNode('n4', 10, 5);

            const seg1 = createSegment('s1', 'n1', 'n2');
            const seg2 = createSegment('s2', 'n3', 'n4');

            const distance = GeometryService.distanceBetweenSegments(seg1, seg2, nodes);

            expect(distance).toBeCloseTo(5, 5);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle missing nodes gracefully', () => {
            const segment: Segment = {
                id: 's1',
                startNodeId: 'missing1',
                endNodeId: 'missing2',
                length: 0,
                angle: 0
            };

            const intersection = GeometryService.findIntersection(segment, segment, nodes);
            const distance = GeometryService.distanceToSegment({ x: 0, y: 0 }, segment, nodes);
            const isOnSegment = GeometryService.isPointOnSegment({ x: 0, y: 0 }, segment, nodes);

            expect(intersection).toBeNull();
            expect(distance).toBe(Infinity);
            expect(isOnSegment).toBe(false);
        });

        it('should handle zero-length vectors in angle calculation', () => {
            const zeroVector: Point = { x: 0, y: 0 };
            const normalVector: Point = { x: 1, y: 1 };

            const angle = GeometryService.angleBetweenVectors(zeroVector, normalVector);

            expect(angle).toBe(0);
        });
    });

    describe('Constants and Getters', () => {
        it('should provide access to tolerance and proximity threshold', () => {
            expect(GeometryService.tolerance).toBe(1e-6);
            expect(GeometryService.proximityThreshold).toBe(5);
        });
    });
});