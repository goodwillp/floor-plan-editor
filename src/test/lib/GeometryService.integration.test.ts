import { describe, it, expect, beforeEach } from 'vitest';
import { FloorPlanModel } from '../../lib/FloorPlanModel';
import { GeometryService } from '../../lib/GeometryService';

describe('GeometryService Integration with FloorPlanModel', () => {
    let model: FloorPlanModel;

    beforeEach(() => {
        model = new FloorPlanModel();
    });

    it('should work with FloorPlanModel to detect intersections', () => {
        // Create a cross pattern using the FloorPlanModel
        const node1 = model.createNode(0, 5);   // Left
        const node2 = model.createNode(10, 5);  // Right
        const node3 = model.createNode(5, 0);   // Bottom
        const node4 = model.createNode(5, 10);  // Top

        const horizontalSeg = model.createSegment(node1.id, node2.id);
        const verticalSeg = model.createSegment(node3.id, node4.id);

        expect(horizontalSeg).not.toBeNull();
        expect(verticalSeg).not.toBeNull();

        // Use GeometryService to find intersection
        const nodes = new Map();
        model.getAllNodes().forEach(node => nodes.set(node.id, node));

        const segments = new Map();
        model.getAllSegments().forEach(segment => segments.set(segment.id, segment));

        const intersection = GeometryService.findIntersection(
            horizontalSeg!, 
            verticalSeg!, 
            nodes
        );

        expect(intersection).not.toBeNull();
        expect(intersection!.x).toBeCloseTo(5, 5);
        expect(intersection!.y).toBeCloseTo(5, 5);
    });

    it('should identify nodes eligible for cleanup in FloorPlanModel', () => {
        // Create three collinear nodes
        const node1 = model.createNode(0, 0);
        const node2 = model.createNode(5, 5);   // Middle node - should be cleanable
        const node3 = model.createNode(10, 10);

        const seg1 = model.createSegment(node1.id, node2.id);
        const seg2 = model.createSegment(node2.id, node3.id);

        expect(seg1).not.toBeNull();
        expect(seg2).not.toBeNull();

        // Get data structures for GeometryService
        const nodes = new Map();
        model.getAllNodes().forEach(node => nodes.set(node.id, node));

        const segments = new Map();
        model.getAllSegments().forEach(segment => segments.set(segment.id, segment));

        // Check if middle node should be cleaned up
        const shouldCleanup = GeometryService.shouldCleanupNode(node2, segments, nodes);

        expect(shouldCleanup).toBe(true);
    });

    it('should calculate distances between walls created in FloorPlanModel', () => {
        // Create two parallel walls
        const wall1Node1 = model.createNode(0, 0);
        const wall1Node2 = model.createNode(10, 0);
        const wall2Node1 = model.createNode(0, 3);
        const wall2Node2 = model.createNode(10, 3);

        const wall1Seg = model.createSegment(wall1Node1.id, wall1Node2.id);
        const wall2Seg = model.createSegment(wall2Node1.id, wall2Node2.id);

        const wall1 = model.createWall('layout', [wall1Seg!.id]);
        const wall2 = model.createWall('zone', [wall2Seg!.id]);

        // Get data structures for GeometryService
        const nodes = new Map();
        model.getAllNodes().forEach(node => nodes.set(node.id, node));

        const segments = new Map();
        model.getAllSegments().forEach(segment => segments.set(segment.id, segment));

        // Find nearby walls
        const nearbyWalls = GeometryService.findNearbyWalls(
            wall1, 
            [wall2], 
            segments, 
            nodes, 
            5 // threshold
        );

        expect(nearbyWalls).toHaveLength(1);
        expect(nearbyWalls[0].id).toBe(wall2.id);

        // Calculate exact distance between segments
        const distance = GeometryService.distanceBetweenSegments(
            wall1Seg!, 
            wall2Seg!, 
            nodes
        );

        expect(distance).toBeCloseTo(3, 5);
    });

    it('should verify wall merging compatibility', () => {
        // Create walls of different types
        const node1 = model.createNode(0, 0);
        const node2 = model.createNode(10, 0);
        const seg1 = model.createSegment(node1.id, node2.id);

        const node3 = model.createNode(0, 2);
        const node4 = model.createNode(10, 2);
        const seg2 = model.createSegment(node3.id, node4.id);

        const layoutWall = model.createWall('layout', [seg1!.id]);
        const zoneWall = model.createWall('zone', [seg2!.id]);

        // Test that different wall types can be merged (Requirement 5.5)
        const canMerge = GeometryService.canMergeWalls(layoutWall, zoneWall);

        expect(canMerge).toBe(true);

        // Test that invisible walls cannot be merged
        model.updateWall(zoneWall.id, { visible: false });
        const updatedZoneWall = model.getWall(zoneWall.id)!;
        const canMergeInvisible = GeometryService.canMergeWalls(layoutWall, updatedZoneWall);

        expect(canMergeInvisible).toBe(false);
    });
});