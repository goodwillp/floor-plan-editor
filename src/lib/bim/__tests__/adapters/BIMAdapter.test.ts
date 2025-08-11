/**
 * BIMAdapter Tests
 * 
 * Tests for BIM adapter integration layer with legacy format conversion
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BIMAdapter } from '../../adapters/BIMAdapter';
import { GeometryConverter } from '../../adapters/GeometryConverter';
import { UnifiedWallData } from '../../data/UnifiedWallData';
import { Wall, Segment, Node } from '../../../types';
import { Curve } from '../../geometry/Curve';
import { CurveType } from '../../types/BIMTypes';
import { BIMPoint } from '../../geometry/BIMPoint';

describe('BIMAdapter', () => {
  let bimAdapter: BIMAdapter;
  let mockGeometryConverter: GeometryConverter;
  let mockWall: Wall;
  let mockSegments: Segment[];
  let mockNodes: Node[];

  beforeEach(() => {
    // Create mock geometry converter
    mockGeometryConverter = {
      polygonToWallSolid: vi.fn(),
      wallSolidToPolygon: vi.fn(),
      wallSolidToMartinezPolygon: vi.fn(),
      martinezPolygonToWallSolid: vi.fn(),
      simplifyPolygon: vi.fn(),
      validateGeometry: vi.fn()
    } as any;

    bimAdapter = new BIMAdapter(mockGeometryConverter);

    // Create mock legacy data
    mockWall = {
      id: 'wall_1',
      type: 'layout',
      thickness: 100,
      segmentIds: ['seg_1', 'seg_2'],
      visible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockSegments = [
      {
        id: 'seg_1',
        startNodeId: 'node_1',
        endNodeId: 'node_2',
        wallId: 'wall_1',
        length: 100,
        angle: 0
      },
      {
        id: 'seg_2',
        startNodeId: 'node_2',
        endNodeId: 'node_3',
        wallId: 'wall_1',
        length: 100,
        angle: Math.PI / 2
      }
    ];

    mockNodes = [
      {
        id: 'node_1',
        x: 0,
        y: 0,
        connectedSegments: ['seg_1'],
        type: 'endpoint'
      },
      {
        id: 'node_2',
        x: 100,
        y: 0,
        connectedSegments: ['seg_1', 'seg_2'],
        type: 'intersection'
      },
      {
        id: 'node_3',
        x: 100,
        y: 100,
        connectedSegments: ['seg_2'],
        type: 'endpoint'
      }
    ];
  });

  describe('Legacy Wall Conversion', () => {
    it('should successfully convert legacy wall to unified format', async () => {
      const result = await bimAdapter.convertLegacyWall(mockWall, mockSegments, mockNodes);

      expect(result.success).toBe(true);
      expect(result.wallId).toBe('wall_1');
      expect(result.unifiedWallData).toBeDefined();
      expect(result.unifiedWallData!.id).toBe('wall_1');
      expect(result.unifiedWallData!.type).toBe('layout');
      expect(result.unifiedWallData!.thickness).toBe(100);
      expect(result.unifiedWallData!.visible).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('should create proper baseline from segments', async () => {
      const result = await bimAdapter.convertLegacyWall(mockWall, mockSegments, mockNodes);

      expect(result.success).toBe(true);
      expect(result.unifiedWallData!.baseline).toBeDefined();
      expect(result.unifiedWallData!.baseline.points.length).toBeGreaterThanOrEqual(2);
      expect(result.unifiedWallData!.baseline.type).toBe(CurveType.POLYLINE);
    });

    it('should create basic geometry representation', async () => {
      const result = await bimAdapter.convertLegacyWall(mockWall, mockSegments, mockNodes);

      expect(result.success).toBe(true);
      const basicGeometry = result.unifiedWallData!.basicGeometry;
      expect(basicGeometry.segments).toHaveLength(2);
      expect(basicGeometry.nodes).toHaveLength(3);
      expect(basicGeometry.segments.every(s => s.wallId === 'wall_1')).toBe(true);
    });

    it('should handle invalid wall input', async () => {
      const invalidWall = { ...mockWall, id: '', thickness: -10 };
      const result = await bimAdapter.convertLegacyWall(invalidWall, mockSegments, mockNodes);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.qualityScore).toBe(0);
    });

    it('should handle missing segments', async () => {
      const result = await bimAdapter.convertLegacyWall(mockWall, [], mockNodes);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('at least one segment'))).toBe(true);
    });

    it('should handle missing nodes', async () => {
      const result = await bimAdapter.convertLegacyWall(mockWall, mockSegments, []);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Missing node'))).toBe(true);
    });

    it('should filter segments by wall ID', async () => {
      const extraSegments = [
        ...mockSegments,
        {
          id: 'seg_other',
          startNodeId: 'node_4',
          endNodeId: 'node_5',
          wallId: 'other_wall',
          length: 50,
          angle: 0
        }
      ];

      const result = await bimAdapter.convertLegacyWall(mockWall, extraSegments, mockNodes);

      expect(result.success).toBe(true);
      expect(result.unifiedWallData!.basicGeometry.segments).toHaveLength(2);
      expect(result.unifiedWallData!.basicGeometry.segments.every(s => s.wallId === 'wall_1')).toBe(true);
    });

    it('should generate BIM geometry when possible', async () => {
      const result = await bimAdapter.convertLegacyWall(mockWall, mockSegments, mockNodes);

      expect(result.success).toBe(true);
      expect(result.unifiedWallData!.bimGeometry).toBeDefined();
      expect(result.unifiedWallData!.bimGeometry!.wallSolid).toBeDefined();
      expect(result.unifiedWallData!.bimGeometry!.qualityMetrics).toBeDefined();
    });

    it('should handle BIM geometry generation errors gracefully', async () => {
      // Create wall with problematic geometry that might cause BIM generation to fail
      const problematicSegments = [
        {
          id: 'seg_1',
          startNodeId: 'node_1',
          endNodeId: 'node_1', // Same start and end node
          wallId: 'wall_1',
          length: 0,
          angle: 0
        }
      ];

      const result = await bimAdapter.convertLegacyWall(mockWall, problematicSegments, mockNodes);

      // Should still succeed but with warnings
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Legacy Format Conversion', () => {
    let testUnifiedWallData: UnifiedWallData;

    beforeEach(() => {
      // Create test unified wall data
      const mockBaseline: Curve = {
        id: 'baseline_1',
        points: [
          {
            id: 'p1',
            x: 0,
            y: 0,
            tolerance: 1e-6,
            creationMethod: 'manual',
            accuracy: 1.0,
            validated: true,
            distanceTo: function(other) { return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2); },
            equals: function(other, tolerance = 1e-6) { return this.distanceTo(other) <= tolerance; }
          },
          {
            id: 'p2',
            x: 100,
            y: 0,
            tolerance: 1e-6,
            creationMethod: 'manual',
            accuracy: 1.0,
            validated: true,
            distanceTo: function(other) { return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2); },
            equals: function(other, tolerance = 1e-6) { return this.distanceTo(other) <= tolerance; }
          }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 100,
        boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 0 },
        curvature: [0, 0],
        tangents: [] as any
      };

      testUnifiedWallData = new UnifiedWallData({
        id: 'unified_wall_1',
        type: 'Layout',
        thickness: 150,
        baseline: mockBaseline,
        basicGeometry: {
          segments: mockSegments,
          nodes: mockNodes,
          polygons: []
        }
      });
    });

    it('should convert unified wall data to legacy format', async () => {
      const result = await bimAdapter.convertToLegacyFormat(testUnifiedWallData);

      expect(result.success).toBe(true);
      expect(result.wall.id).toBe('unified_wall_1');
      expect(result.wall.type).toBe('Layout');
      expect(result.wall.thickness).toBe(150);
      expect(result.segments).toHaveLength(2);
      expect(result.nodes).toHaveLength(3);
    });

    it('should preserve wall properties in legacy conversion', async () => {
      const result = await bimAdapter.convertToLegacyFormat(testUnifiedWallData);

      expect(result.success).toBe(true);
      expect(result.wall.visible).toBe(testUnifiedWallData.visible);
      expect(result.wall.segmentIds).toEqual(testUnifiedWallData.basicGeometry.segments.map(s => s.id));
      expect(result.wall.createdAt).toEqual(testUnifiedWallData.createdAt);
      expect(result.wall.updatedAt).toEqual(testUnifiedWallData.updatedAt);
    });

    it('should detect data loss during conversion', async () => {
      // Add BIM geometry with data that would be lost
      testUnifiedWallData.bimGeometry = {
        wallSolid: {} as any,
        offsetCurves: [],
        intersectionData: [
          {
            id: 'int1',
            type: 't_junction',
            participatingWalls: ['w1', 'w2'],
            intersectionPoint: { x: 50, y: 0 },
            miterApex: null,
            offsetIntersections: [],
            resolvedGeometry: {} as any,
            resolutionMethod: 'boolean_union',
            geometricAccuracy: 0.95,
            validated: true
          }
        ],
        qualityMetrics: {
          sliverFaceCount: 3
        } as any
      };

      const result = await bimAdapter.convertToLegacyFormat(testUnifiedWallData);

      expect(result.success).toBe(true);
      expect(result.dataLoss).toBe(true);
      expect(result.approximationsUsed.length).toBeGreaterThan(0);
      expect(result.approximationsUsed.some(a => a.includes('intersection data'))).toBe(true);
      expect(result.approximationsUsed.some(a => a.includes('Sliver face'))).toBe(true);
    });

    it('should handle conversion errors', async () => {
      // Create invalid unified wall data
      const invalidWallData = { ...testUnifiedWallData } as any;
      invalidWallData.basicGeometry = null;

      const result = await bimAdapter.convertToLegacyFormat(invalidWallData);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.dataLoss).toBe(true);
    });
  });

  describe('Batch Conversion', () => {
    let wallsMap: Map<string, Wall>;
    let segmentsMap: Map<string, Segment>;
    let nodesMap: Map<string, Node>;

    beforeEach(() => {
      // Create additional test data for batch conversion
      const wall2: Wall = {
        id: 'wall_2',
        type: 'zone',
        thickness: 200,
        segmentIds: ['seg_3'],
        visible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const segment3: Segment = {
        id: 'seg_3',
        startNodeId: 'node_4',
        endNodeId: 'node_5',
        wallId: 'wall_2',
        length: 150,
        angle: Math.PI
      };

      const node4: Node = {
        id: 'node_4',
        x: 200,
        y: 0,
        connectedSegments: ['seg_3'],
        type: 'endpoint'
      };

      const node5: Node = {
        id: 'node_5',
        x: 50,
        y: 0,
        connectedSegments: ['seg_3'],
        type: 'endpoint'
      };

      wallsMap = new Map([
        ['wall_1', mockWall],
        ['wall_2', wall2]
      ]);

      segmentsMap = new Map([
        ['seg_1', mockSegments[0]],
        ['seg_2', mockSegments[1]],
        ['seg_3', segment3]
      ]);

      nodesMap = new Map([
        ['node_1', mockNodes[0]],
        ['node_2', mockNodes[1]],
        ['node_3', mockNodes[2]],
        ['node_4', node4],
        ['node_5', node5]
      ]);
    });

    it('should convert all walls successfully', async () => {
      const result = await bimAdapter.convertAllWalls(wallsMap, segmentsMap, nodesMap);

      expect(result.success).toBe(true);
      expect(result.convertedWalls.size).toBe(2);
      expect(result.convertedWalls.has('wall_1')).toBe(true);
      expect(result.convertedWalls.has('wall_2')).toBe(true);
      expect(result.failedWalls).toHaveLength(0);
      expect(result.statistics.totalWalls).toBe(2);
      expect(result.statistics.successfulConversions).toBe(2);
      expect(result.statistics.failedConversions).toBe(0);
    });

    it('should handle partial failures in batch conversion', async () => {
      // Add an invalid wall
      const invalidWall: Wall = {
        id: 'invalid_wall',
        type: 'layout',
        thickness: -50, // Invalid thickness
        segmentIds: [],
        visible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      wallsMap.set('invalid_wall', invalidWall);

      const result = await bimAdapter.convertAllWalls(wallsMap, segmentsMap, nodesMap);

      expect(result.success).toBe(false);
      expect(result.convertedWalls.size).toBe(2); // Two valid walls converted
      expect(result.failedWalls).toContain('invalid_wall');
      expect(result.statistics.totalWalls).toBe(3);
      expect(result.statistics.successfulConversions).toBe(2);
      expect(result.statistics.failedConversions).toBe(1);
    });

    it('should calculate performance statistics', async () => {
      const result = await bimAdapter.convertAllWalls(wallsMap, segmentsMap, nodesMap);

      expect(result.totalProcessingTime).toBeGreaterThan(0);
      expect(result.averageQualityScore).toBeGreaterThan(0);
      expect(result.statistics.averageProcessingTimePerWall).toBeGreaterThan(0);
    });

    it('should process walls in batches for performance', async () => {
      // Create a larger dataset to test batching
      const largeWallsMap = new Map();
      const largeSegmentsMap = new Map();
      const largeNodesMap = new Map();

      for (let i = 0; i < 25; i++) {
        const wall: Wall = {
          id: `wall_${i}`,
          type: 'layout',
          thickness: 100,
          segmentIds: [`seg_${i}`],
          visible: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const segment: Segment = {
          id: `seg_${i}`,
          startNodeId: `node_${i}_start`,
          endNodeId: `node_${i}_end`,
          wallId: `wall_${i}`,
          length: 100,
          angle: 0
        };

        const startNode: Node = {
          id: `node_${i}_start`,
          x: i * 100,
          y: 0,
          connectedSegments: [`seg_${i}`],
          type: 'endpoint'
        };

        const endNode: Node = {
          id: `node_${i}_end`,
          x: (i + 1) * 100,
          y: 0,
          connectedSegments: [`seg_${i}`],
          type: 'endpoint'
        };

        largeWallsMap.set(`wall_${i}`, wall);
        largeSegmentsMap.set(`seg_${i}`, segment);
        largeNodesMap.set(`node_${i}_start`, startNode);
        largeNodesMap.set(`node_${i}_end`, endNode);
      }

      const result = await bimAdapter.convertAllWalls(largeWallsMap, largeSegmentsMap, largeNodesMap);

      expect(result.success).toBe(true);
      expect(result.convertedWalls.size).toBe(25);
      expect(result.statistics.totalWalls).toBe(25);
    });
  });

  describe('Conversion Validation', () => {
    it('should validate successful conversion', async () => {
      const original = {
        wall: mockWall,
        segments: mockSegments,
        nodes: mockNodes
      };

      const conversionResult = await bimAdapter.convertLegacyWall(mockWall, mockSegments, mockNodes);
      expect(conversionResult.success).toBe(true);

      const validationResult = await bimAdapter.validateConversion(original, conversionResult.unifiedWallData!);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.propertiesMatch).toBe(true);
      expect(validationResult.geometryMatches).toBe(true);
      expect(validationResult.toleranceWithinBounds).toBe(true);
      expect(validationResult.qualityScore).toBeGreaterThan(0.5);
    });

    it('should detect property mismatches', async () => {
      const original = {
        wall: mockWall,
        segments: mockSegments,
        nodes: mockNodes
      };

      const conversionResult = await bimAdapter.convertLegacyWall(mockWall, mockSegments, mockNodes);
      expect(conversionResult.success).toBe(true);

      // Modify converted data to create mismatch
      conversionResult.unifiedWallData!.thickness = 999;

      const validationResult = await bimAdapter.validateConversion(original, conversionResult.unifiedWallData!);

      expect(validationResult.propertiesMatch).toBe(false);
      expect(validationResult.issues.some(i => i.type === 'property')).toBe(true);
    });

    it('should detect geometry issues', async () => {
      const original = {
        wall: mockWall,
        segments: mockSegments,
        nodes: mockNodes
      };

      const conversionResult = await bimAdapter.convertLegacyWall(mockWall, mockSegments, mockNodes);
      expect(conversionResult.success).toBe(true);

      // Modify geometry to create issues
      conversionResult.unifiedWallData!.basicGeometry.segments = [];

      const validationResult = await bimAdapter.validateConversion(original, conversionResult.unifiedWallData!);

      expect(validationResult.geometryMatches).toBe(false);
      expect(validationResult.issues.some(i => i.type === 'geometry')).toBe(true);
    });

    it('should provide quality scores and recommendations', async () => {
      const original = {
        wall: mockWall,
        segments: mockSegments,
        nodes: mockNodes
      };

      const conversionResult = await bimAdapter.convertLegacyWall(mockWall, mockSegments, mockNodes);
      expect(conversionResult.success).toBe(true);

      const validationResult = await bimAdapter.validateConversion(original, conversionResult.unifiedWallData!);

      expect(validationResult.qualityScore).toBeGreaterThan(0);
      expect(validationResult.qualityScore).toBeLessThanOrEqual(1);
      
      if (validationResult.issues.length > 0) {
        expect(validationResult.issues.every(i => i.suggestedFix)).toBe(true);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle walls with no segments', async () => {
      const wallWithNoSegments = { ...mockWall, segmentIds: [] };
      const result = await bimAdapter.convertLegacyWall(wallWithNoSegments, [], mockNodes);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('at least one segment'))).toBe(true);
    });

    it('should handle disconnected segments', async () => {
      const disconnectedSegments = [
        {
          id: 'seg_1',
          startNodeId: 'node_1',
          endNodeId: 'node_2',
          wallId: 'wall_1',
          length: 100,
          angle: 0
        },
        {
          id: 'seg_2',
          startNodeId: 'node_3', // Not connected to seg_1
          endNodeId: 'node_4',
          wallId: 'wall_1',
          length: 100,
          angle: 0
        }
      ];

      const disconnectedNodes = [
        { id: 'node_1', x: 0, y: 0, connectedSegments: ['seg_1'], type: 'endpoint' as const },
        { id: 'node_2', x: 100, y: 0, connectedSegments: ['seg_1'], type: 'endpoint' as const },
        { id: 'node_3', x: 200, y: 0, connectedSegments: ['seg_2'], type: 'endpoint' as const },
        { id: 'node_4', x: 300, y: 0, connectedSegments: ['seg_2'], type: 'endpoint' as const }
      ];

      const result = await bimAdapter.convertLegacyWall(mockWall, disconnectedSegments, disconnectedNodes);

      // Should still succeed but may have warnings about disconnected geometry
      expect(result.success).toBe(true);
      expect(result.unifiedWallData!.baseline.points.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle very short segments', async () => {
      const shortSegments = [
        {
          id: 'seg_1',
          startNodeId: 'node_1',
          endNodeId: 'node_2',
          wallId: 'wall_1',
          length: 0.1, // Very short
          angle: 0
        }
      ];

      const result = await bimAdapter.convertLegacyWall(mockWall, shortSegments, mockNodes.slice(0, 2));

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('short segments'))).toBe(true);
    });

    it('should handle walls with many segments', async () => {
      const manySegments: Segment[] = [];
      const manyNodes: Node[] = [];

      // Create 25 segments (more than the warning threshold)
      for (let i = 0; i < 25; i++) {
        manySegments.push({
          id: `seg_${i}`,
          startNodeId: `node_${i}`,
          endNodeId: `node_${i + 1}`,
          wallId: 'wall_1',
          length: 10,
          angle: i * 0.1
        });

        manyNodes.push({
          id: `node_${i}`,
          x: i * 10,
          y: 0,
          connectedSegments: [`seg_${i}`],
          type: 'endpoint'
        });
      }

      // Add final node
      manyNodes.push({
        id: 'node_25',
        x: 250,
        y: 0,
        connectedSegments: ['seg_24'],
        type: 'endpoint'
      });

      const result = await bimAdapter.convertLegacyWall(mockWall, manySegments, manyNodes);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('Large number of segments'))).toBe(true);
    });
  });
});