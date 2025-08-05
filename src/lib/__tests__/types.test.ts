import { describe, it, expect } from 'vitest';
import type { WallType, NodeType, Node, Segment, Wall, Point } from '../types';
import { WALL_THICKNESS } from '../types';

describe('Types', () => {
  describe('WALL_THICKNESS constants', () => {
    it('should have correct thickness values for each wall type', () => {
      expect(WALL_THICKNESS.layout).toBe(350);
      expect(WALL_THICKNESS.zone).toBe(250);
      expect(WALL_THICKNESS.area).toBe(150);
    });

    it('should have all wall types defined', () => {
      const wallTypes: WallType[] = ['layout', 'zone', 'area'];
      wallTypes.forEach(type => {
        expect(WALL_THICKNESS[type]).toBeDefined();
        expect(typeof WALL_THICKNESS[type]).toBe('number');
      });
    });
  });

  describe('Type definitions', () => {
    it('should define WallType correctly', () => {
      const validTypes: WallType[] = ['layout', 'zone', 'area'];
      validTypes.forEach(type => {
        expect(['layout', 'zone', 'area']).toContain(type);
      });
    });

    it('should define NodeType correctly', () => {
      const validTypes: NodeType[] = ['endpoint', 'intersection', 'junction'];
      validTypes.forEach(type => {
        expect(['endpoint', 'intersection', 'junction']).toContain(type);
      });
    });

    it('should define Point interface correctly', () => {
      const point: Point = { x: 10, y: 20 };
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
    });

    it('should define Node interface correctly', () => {
      const node: Node = {
        id: 'test-id',
        x: 100,
        y: 200,
        connectedSegments: ['seg1', 'seg2'],
        type: 'endpoint'
      };

      expect(node.id).toBe('test-id');
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
      expect(node.connectedSegments).toEqual(['seg1', 'seg2']);
      expect(node.type).toBe('endpoint');
    });

    it('should define Segment interface correctly', () => {
      const segment: Segment = {
        id: 'seg-id',
        startNodeId: 'node1',
        endNodeId: 'node2',
        wallId: 'wall1',
        length: 100,
        angle: Math.PI / 4
      };

      expect(segment.id).toBe('seg-id');
      expect(segment.startNodeId).toBe('node1');
      expect(segment.endNodeId).toBe('node2');
      expect(segment.wallId).toBe('wall1');
      expect(segment.length).toBe(100);
      expect(segment.angle).toBe(Math.PI / 4);
    });

    it('should define Segment interface with optional wallId', () => {
      const segment: Segment = {
        id: 'seg-id',
        startNodeId: 'node1',
        endNodeId: 'node2',
        length: 100,
        angle: 0
      };

      expect(segment.wallId).toBeUndefined();
    });

    it('should define Wall interface correctly', () => {
      const now = new Date();
      const wall: Wall = {
        id: 'wall-id',
        type: 'layout',
        thickness: 350,
        segmentIds: ['seg1', 'seg2'],
        visible: true,
        createdAt: now,
        updatedAt: now
      };

      expect(wall.id).toBe('wall-id');
      expect(wall.type).toBe('layout');
      expect(wall.thickness).toBe(350);
      expect(wall.segmentIds).toEqual(['seg1', 'seg2']);
      expect(wall.visible).toBe(true);
      expect(wall.createdAt).toBe(now);
      expect(wall.updatedAt).toBe(now);
    });
  });
});