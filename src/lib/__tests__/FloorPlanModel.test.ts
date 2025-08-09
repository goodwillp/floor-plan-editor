import { describe, it, expect, beforeEach } from 'vitest';
import { FloorPlanModel } from '../FloorPlanModel';
import type { WallType, NodeType } from '../types';

describe('FloorPlanModel', () => {
  let model: FloorPlanModel;

  beforeEach(() => {
    model = new FloorPlanModel();
  });

  describe('Node Operations', () => {
    it('should create a node with correct properties', () => {
      const node = model.createNode(100, 200, 'endpoint');
      
      expect(node).toBeDefined();
      expect(node.id).toBeTruthy();
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
      expect(node.type).toBe('endpoint');
      expect(node.connectedSegments).toEqual([]);
    });

    it('should create a node with default type', () => {
      const node = model.createNode(50, 75);
      
      expect(node.type).toBe('endpoint');
    });

    it('should retrieve a node by ID', () => {
      const node = model.createNode(10, 20);
      const retrieved = model.getNode(node.id);
      
      expect(retrieved).toEqual(node);
    });

    it('should return undefined for non-existent node', () => {
      const retrieved = model.getNode('non-existent');
      
      expect(retrieved).toBeUndefined();
    });

    it('should get all nodes', () => {
      const node1 = model.createNode(10, 20);
      const node2 = model.createNode(30, 40);
      
      const allNodes = model.getAllNodes();
      
      expect(allNodes).toHaveLength(2);
      expect(allNodes).toContain(node1);
      expect(allNodes).toContain(node2);
    });

    it('should update node position', () => {
      const node = model.createNode(10, 20);
      const success = model.updateNode(node.id, 50, 60);
      
      expect(success).toBe(true);
      
      const updated = model.getNode(node.id);
      expect(updated?.x).toBe(50);
      expect(updated?.y).toBe(60);
    });

    it('should return false when updating non-existent node', () => {
      const success = model.updateNode('non-existent', 50, 60);
      
      expect(success).toBe(false);
    });

    it('should delete a node', () => {
      const node = model.createNode(10, 20);
      const success = model.deleteNode(node.id);
      
      expect(success).toBe(true);
      expect(model.getNode(node.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent node', () => {
      const success = model.deleteNode('non-existent');
      
      expect(success).toBe(false);
    });

    it('should delete connected segments when deleting a node', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 10);
      const segment = model.createSegment(node1.id, node2.id);
      
      expect(segment).toBeDefined();
      expect(model.getSegment(segment!.id)).toBeDefined();
      
      model.deleteNode(node1.id);
      
      expect(model.getSegment(segment!.id)).toBeUndefined();
    });
  });

  describe('Segment Operations', () => {
    let node1: any, node2: any;

    beforeEach(() => {
      node1 = model.createNode(0, 0);
      node2 = model.createNode(10, 0);
    });

    it('should create a segment between two nodes', () => {
      const segment = model.createSegment(node1.id, node2.id);
      
      expect(segment).toBeDefined();
      expect(segment!.id).toBeTruthy();
      expect(segment!.startNodeId).toBe(node1.id);
      expect(segment!.endNodeId).toBe(node2.id);
      expect(segment!.length).toBe(10);
      expect(segment!.angle).toBe(0); // Horizontal line
    });

    it('should update node connections when creating segment', () => {
      const segment = model.createSegment(node1.id, node2.id);
      
      const updatedNode1 = model.getNode(node1.id);
      const updatedNode2 = model.getNode(node2.id);
      
      expect(updatedNode1!.connectedSegments).toContain(segment!.id);
      expect(updatedNode2!.connectedSegments).toContain(segment!.id);
    });

    it('should return null when creating segment with non-existent nodes', () => {
      const segment = model.createSegment('non-existent', node2.id);
      
      expect(segment).toBeNull();
    });

    it('should return null when creating segment with same start and end node', () => {
      const segment = model.createSegment(node1.id, node1.id);
      
      expect(segment).toBeNull();
    });

    it('should calculate correct length for diagonal segment', () => {
      const node3 = model.createNode(3, 4);
      const segment = model.createSegment(node1.id, node3.id);
      
      expect(segment!.length).toBe(5); // 3-4-5 triangle
    });

    it('should calculate correct angle for vertical segment', () => {
      const node3 = model.createNode(0, 10);
      const segment = model.createSegment(node1.id, node3.id);
      
      expect(segment!.angle).toBe(Math.PI / 2); // 90 degrees in radians
    });

    it('should retrieve a segment by ID', () => {
      const segment = model.createSegment(node1.id, node2.id);
      const retrieved = model.getSegment(segment!.id);
      
      expect(retrieved).toEqual(segment);
    });

    it('should get all segments', () => {
      const node3 = model.createNode(20, 0);
      const segment1 = model.createSegment(node1.id, node2.id);
      const segment2 = model.createSegment(node2.id, node3.id);
      
      const allSegments = model.getAllSegments();
      
      expect(allSegments).toHaveLength(2);
      expect(allSegments).toContain(segment1);
      expect(allSegments).toContain(segment2);
    });

    it('should delete a segment', () => {
      const segment = model.createSegment(node1.id, node2.id);
      const success = model.deleteSegment(segment!.id);
      
      expect(success).toBe(true);
      expect(model.getSegment(segment!.id)).toBeUndefined();
    });

    it('should update node connections when deleting segment', () => {
      const segment = model.createSegment(node1.id, node2.id);
      model.deleteSegment(segment!.id);
      
      const updatedNode1 = model.getNode(node1.id);
      const updatedNode2 = model.getNode(node2.id);
      
      expect(updatedNode1!.connectedSegments).not.toContain(segment!.id);
      expect(updatedNode2!.connectedSegments).not.toContain(segment!.id);
    });

    it('should recalculate segment when node is moved', () => {
      const segment = model.createSegment(node1.id, node2.id);
      expect(segment!.length).toBe(10);
      
      model.updateNode(node2.id, 20, 0);
      
      const updated = model.getSegment(segment!.id);
      expect(updated!.length).toBe(20);
    });

    it('should get connected segments for a node', () => {
      const node3 = model.createNode(20, 0);
      const segment1 = model.createSegment(node1.id, node2.id);
      const segment2 = model.createSegment(node2.id, node3.id);
      
      const connectedSegments = model.getConnectedSegments(node2.id);
      
      expect(connectedSegments).toHaveLength(2);
      expect(connectedSegments).toContain(segment1);
      expect(connectedSegments).toContain(segment2);
    });
  });

  describe('Wall Operations', () => {
    it('should create a wall with correct properties', () => {
      const wall = model.createWall('layout');
      
      expect(wall).toBeDefined();
      expect(wall.id).toBeTruthy();
      expect(wall.type).toBe('layout');
      expect(wall.thickness).toBe(350);
      expect(wall.segmentIds).toEqual([]);
      expect(wall.visible).toBe(true);
      expect(wall.createdAt).toBeInstanceOf(Date);
      expect(wall.updatedAt).toBeInstanceOf(Date);
    });

    it('should create walls with correct thickness for each type', () => {
      const layoutWall = model.createWall('layout');
      const zoneWall = model.createWall('zone');
      const areaWall = model.createWall('area');
      
      expect(layoutWall.thickness).toBe(350);
      expect(zoneWall.thickness).toBe(250);
      expect(areaWall.thickness).toBe(150);
    });

    it('should create wall with segments', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const segment = model.createSegment(node1.id, node2.id);
      
      const wall = model.createWall('zone', [segment!.id]);
      
      expect(wall.segmentIds).toContain(segment!.id);
      
      const updatedSegment = model.getSegment(segment!.id);
      expect(updatedSegment!.wallId).toBe(wall.id);
    });

    it('should filter out non-existent segments when creating wall', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const segment = model.createSegment(node1.id, node2.id);
      
      const wall = model.createWall('area', [segment!.id, 'non-existent']);
      
      expect(wall.segmentIds).toHaveLength(1);
      expect(wall.segmentIds).toContain(segment!.id);
    });

    it('should retrieve a wall by ID', () => {
      const wall = model.createWall('layout');
      const retrieved = model.getWall(wall.id);
      
      expect(retrieved).toEqual(wall);
    });

    it('should get all walls', () => {
      const wall1 = model.createWall('layout');
      const wall2 = model.createWall('zone');
      
      const allWalls = model.getAllWalls();
      
      expect(allWalls).toHaveLength(2);
      expect(allWalls).toContain(wall1);
      expect(allWalls).toContain(wall2);
    });

    it('should update wall type and thickness', () => {
      const wall = model.createWall('layout');
      const success = model.updateWall(wall.id, { type: 'area' });
      
      expect(success).toBe(true);
      
      const updated = model.getWall(wall.id);
      expect(updated!.type).toBe('area');
      expect(updated!.thickness).toBe(150);
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(wall.createdAt.getTime());
    });

    it('should update wall visibility', () => {
      const wall = model.createWall('zone');
      const success = model.updateWall(wall.id, { visible: false });
      
      expect(success).toBe(true);
      
      const updated = model.getWall(wall.id);
      expect(updated!.visible).toBe(false);
    });

    it('should add segments to wall', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const node3 = model.createNode(20, 0);
      const segment1 = model.createSegment(node1.id, node2.id);
      const segment2 = model.createSegment(node2.id, node3.id);
      
      const wall = model.createWall('layout');
      const success = model.addSegmentsToWall(wall.id, [segment1!.id, segment2!.id]);
      
      expect(success).toBe(true);
      
      const updated = model.getWall(wall.id);
      expect(updated!.segmentIds).toContain(segment1!.id);
      expect(updated!.segmentIds).toContain(segment2!.id);
      
      expect(model.getSegment(segment1!.id)!.wallId).toBe(wall.id);
      expect(model.getSegment(segment2!.id)!.wallId).toBe(wall.id);
    });

    it('should remove segments from wall', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const segment = model.createSegment(node1.id, node2.id);
      
      const wall = model.createWall('layout', [segment!.id]);
      const success = model.removeSegmentsFromWall(wall.id, [segment!.id]);
      
      expect(success).toBe(true);
      
      const updated = model.getWall(wall.id);
      expect(updated!.segmentIds).not.toContain(segment!.id);
      
      expect(model.getSegment(segment!.id)!.wallId).toBeUndefined();
    });

    it('should delete a wall without deleting segments', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const segment = model.createSegment(node1.id, node2.id);
      
      const wall = model.createWall('layout', [segment!.id]);
      const success = model.deleteWall(wall.id, false);
      
      expect(success).toBe(true);
      expect(model.getWall(wall.id)).toBeUndefined();
      expect(model.getSegment(segment!.id)).toBeDefined();
      expect(model.getSegment(segment!.id)!.wallId).toBeUndefined();
    });

    it('should delete a wall and its segments', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const segment = model.createSegment(node1.id, node2.id);
      
      const wall = model.createWall('layout', [segment!.id]);
      const success = model.deleteWall(wall.id, true);
      
      expect(success).toBe(true);
      expect(model.getWall(wall.id)).toBeUndefined();
      expect(model.getSegment(segment!.id)).toBeUndefined();
    });

    it('should remove wall association from segment when segment is deleted', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const segment = model.createSegment(node1.id, node2.id);
      
      const wall = model.createWall('layout', [segment!.id]);
      model.deleteSegment(segment!.id);
      
      const updated = model.getWall(wall.id);
      expect(updated!.segmentIds).not.toContain(segment!.id);
    });
  });

  describe('Utility Methods', () => {
    it('should clear all data', () => {
      model.createNode(0, 0);
      model.createWall('layout');
      
      expect(model.getAllNodes()).toHaveLength(1);
      expect(model.getAllWalls()).toHaveLength(1);
      
      model.clear();
      
      expect(model.getAllNodes()).toHaveLength(0);
      expect(model.getAllSegments()).toHaveLength(0);
      expect(model.getAllWalls()).toHaveLength(0);
    });

    it('should provide data summary', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const segment = model.createSegment(node1.id, node2.id);
      const wall = model.createWall('layout', [segment!.id]);
      
      const summary = model.getDataSummary();
      
      expect(summary.nodeCount).toBe(2);
      expect(summary.segmentCount).toBe(1);
      expect(summary.wallCount).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex floor plan creation', () => {
      // Create a simple rectangular room
      const corner1 = model.createNode(0, 0);
      const corner2 = model.createNode(100, 0);
      const corner3 = model.createNode(100, 100);
      const corner4 = model.createNode(0, 100);
      
      const wall1Segment = model.createSegment(corner1.id, corner2.id);
      const wall2Segment = model.createSegment(corner2.id, corner3.id);
      const wall3Segment = model.createSegment(corner3.id, corner4.id);
      const wall4Segment = model.createSegment(corner4.id, corner1.id);
      
      const wall1 = model.createWall('layout', [wall1Segment!.id]);
      const wall2 = model.createWall('layout', [wall2Segment!.id]);
      const wall3 = model.createWall('layout', [wall3Segment!.id]);
      const wall4 = model.createWall('layout', [wall4Segment!.id]);
      
      // Verify the structure
      expect(model.getDataSummary()).toEqual({
        nodeCount: 4,
        segmentCount: 4,
        wallCount: 4
      });
      
      // Each corner should connect to exactly 2 segments
      expect(model.getConnectedSegments(corner1.id)).toHaveLength(2);
      expect(model.getConnectedSegments(corner2.id)).toHaveLength(2);
      expect(model.getConnectedSegments(corner3.id)).toHaveLength(2);
      expect(model.getConnectedSegments(corner4.id)).toHaveLength(2);
      
      // All walls should be layout type with 350mm thickness
      [wall1, wall2, wall3, wall4].forEach(wall => {
        expect(wall.type).toBe('layout');
        expect(wall.thickness).toBe(350);
      });
    });

    it('should maintain data integrity when deleting elements', () => {
      const node1 = model.createNode(0, 0);
      const node2 = model.createNode(10, 0);
      const node3 = model.createNode(20, 0);
      
      const segment1 = model.createSegment(node1.id, node2.id);
      const segment2 = model.createSegment(node2.id, node3.id);
      
      const wall = model.createWall('zone', [segment1!.id, segment2!.id]);
      
      // Delete middle node - should delete both segments and update wall
      model.deleteNode(node2.id);
      
      expect(model.getNode(node2.id)).toBeUndefined();
      expect(model.getSegment(segment1!.id)).toBeUndefined();
      expect(model.getSegment(segment2!.id)).toBeUndefined();
      
      const updatedWall = model.getWall(wall.id);
      expect(updatedWall!.segmentIds).toHaveLength(0);
    });
  });

  describe('Topology normalization', () => {
    it('creates a single junction node with 3 connections when a new segment intersects an existing wall and nodes are near', () => {
      const model = new FloorPlanModel()
      // Initial polygon: 1 -> 2 -> 4 (two segments)
      const n1 = model.createNode(0, 0)
      const n2 = model.createNode(100, 0)
      const n4 = model.createNode(120, 80)
      const s12 = model.createSegment(n1.id, n2.id)!
      const s24 = model.createSegment(n2.id, n4.id)!
      model.createWall('layout', [s12.id, s24.id])

      expect(model.getAllNodes().length).toBe(3)
      expect(model.getConnectedSegments(n2.id).length).toBe(2)

      // Second polyline: 5 -> 3 that passes close to n2 and intersects s24
      const n5 = model.createNode(10, 10)
      const n3 = model.createNode(100, 10)
      const s53 = model.createSegment(n5.id, n3.id)!
      model.createWall('layout', [s53.id])

      // Process intersections and then merge nearby nodes within 12px
      model.processIntersections(s53.id)
      ;(model as any).mergeNearbyNodes(12)

      // Find junction near original n2
      const junction = model.getAllNodes().find(nd => Math.hypot(nd.x - 100, nd.y - 0) <= 12)!
      expect(junction).toBeTruthy()
      expect(model.getConnectedSegments(junction.id).length).toBe(3)
    })
  })
});