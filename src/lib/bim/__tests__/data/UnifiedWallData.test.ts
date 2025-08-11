/**
 * UnifiedWallData Tests
 * 
 * Comprehensive tests for unified wall data structure with mode compatibility
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnifiedWallData, BasicGeometry, BIMGeometry } from '../../data/UnifiedWallData';
import { Curve } from '../../geometry/Curve';
import { CurveType } from '../../types/BIMTypes';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { BIMPoint } from '../../geometry/BIMPoint';
import { QualityMetrics } from '../../types/QualityMetrics';
import { Wall, Segment, Node } from '../../../types';

describe('UnifiedWallData', () => {
  let mockBaseline: Curve;
  let mockBasicGeometry: BasicGeometry;
  let mockBIMGeometry: BIMGeometry;
  let mockQualityMetrics: QualityMetrics;

  beforeEach(() => {
    // Create mock baseline curve
    const points: BIMPoint[] = [
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
    ];

    mockBaseline = {
      id: 'baseline_1',
      points,
      type: CurveType.POLYLINE,
      isClosed: false,
      length: 100,
      boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 0 },
      curvature: [0, 0],
      tangents: [
        { x: 1, y: 0, normalize: () => ({ x: 1, y: 0 }), dot: () => 0, cross: () => 0, angle: () => 0, rotate: () => ({ x: 1, y: 0 }) },
        { x: 1, y: 0, normalize: () => ({ x: 1, y: 0 }), dot: () => 0, cross: () => 0, angle: () => 0, rotate: () => ({ x: 1, y: 0 }) }
      ]
    };

    // Create mock basic geometry
    const mockNodes: Node[] = [
      { id: 'n1', x: 0, y: 0, connectedSegments: ['s1'], type: 'endpoint' },
      { id: 'n2', x: 100, y: 0, connectedSegments: ['s1'], type: 'endpoint' }
    ];

    const mockSegments: Segment[] = [
      { id: 's1', startNodeId: 'n1', endNodeId: 'n2', wallId: 'w1', length: 100, angle: 0 }
    ];

    mockBasicGeometry = {
      segments: mockSegments,
      nodes: mockNodes,
      polygons: [
        {
          id: 'poly1',
          points: [
            { x: 0, y: -50 },
            { x: 100, y: -50 },
            { x: 100, y: 50 },
            { x: 0, y: 50 }
          ],
          area: 10000,
          perimeter: 300
        }
      ]
    };

    // Create mock quality metrics
    mockQualityMetrics = {
      geometricAccuracy: 0.95,
      topologicalConsistency: 1.0,
      manufacturability: 0.9,
      architecturalCompliance: 1.0,
      sliverFaceCount: 0,
      microGapCount: 0,
      selfIntersectionCount: 0,
      degenerateElementCount: 0,
      complexity: 10,
      processingEfficiency: 0.8,
      memoryUsage: 1024,
      calculatedAt: new Date(),
      calculationMethod: 'automated',
      toleranceUsed: 1e-6,
      issues: [],
      recommendations: []
    };

    // Create mock BIM geometry
    const mockWallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
    
    mockBIMGeometry = {
      wallSolid: mockWallSolid,
      offsetCurves: [mockBaseline, mockBaseline], // Simplified for testing
      intersectionData: [],
      qualityMetrics: mockQualityMetrics
    };
  });

  describe('Constructor and Basic Properties', () => {
    it('should create unified wall data with required properties', () => {
      const wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry
      });

      expect(wallData.id).toBeDefined();
      expect(wallData.type).toBe('Layout');
      expect(wallData.thickness).toBe(100);
      expect(wallData.visible).toBe(true);
      expect(wallData.baseline).toBe(mockBaseline);
      expect(wallData.basicGeometry).toBe(mockBasicGeometry);
      expect(wallData.lastModifiedMode).toBe('basic');
      expect(wallData.version).toBe(1);
    });

    it('should create unified wall data with BIM geometry', () => {
      const wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry,
        bimGeometry: mockBIMGeometry,
        lastModifiedMode: 'bim'
      });

      expect(wallData.bimGeometry).toBe(mockBIMGeometry);
      expect(wallData.lastModifiedMode).toBe('bim');
    });

    it('should generate unique IDs for different instances', () => {
      const wallData1 = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry
      });

      const wallData2 = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry
      });

      expect(wallData1.id).not.toBe(wallData2.id);
    });
  });

  describe('Property Setters and Validation', () => {
    let wallData: UnifiedWallData;

    beforeEach(() => {
      wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry
      });
    });

    it('should update type and metadata when type changes', async () => {
      const initialVersion = wallData.version;
      const initialUpdatedAt = wallData.updatedAt;

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));
      wallData.type = 'Zone';

      expect(wallData.type).toBe('Zone');
      expect(wallData.version).toBe(initialVersion + 1);
      expect(wallData.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should update thickness and metadata when thickness changes', () => {
      const initialVersion = wallData.version;

      wallData.thickness = 150;

      expect(wallData.thickness).toBe(150);
      expect(wallData.version).toBe(initialVersion + 1);
    });

    it('should throw error for invalid thickness', () => {
      expect(() => {
        wallData.thickness = 0;
      }).toThrow('Wall thickness must be positive');

      expect(() => {
        wallData.thickness = -10;
      }).toThrow('Wall thickness must be positive');
    });

    it('should update last modified mode when setting BIM geometry', () => {
      wallData.bimGeometry = mockBIMGeometry;

      expect(wallData.lastModifiedMode).toBe('bim');
      expect(wallData.bimGeometry).toBe(mockBIMGeometry);
    });

    it('should update last modified mode when setting basic geometry', () => {
      wallData.bimGeometry = mockBIMGeometry; // Set BIM first
      wallData.basicGeometry = mockBasicGeometry; // Then set basic

      expect(wallData.lastModifiedMode).toBe('basic');
    });
  });

  describe('Mode Validation', () => {
    let wallData: UnifiedWallData;

    beforeEach(() => {
      wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry
      });
    });

    it('should validate basic mode correctly for valid data', () => {
      const validation = wallData.validateBasicMode();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.qualityScore).toBeGreaterThan(0.8);
    });

    it('should detect invalid basic mode with missing segments', () => {
      const invalidBasicGeometry: BasicGeometry = {
        segments: [],
        nodes: mockBasicGeometry.nodes,
        polygons: mockBasicGeometry.polygons
      };

      wallData.basicGeometry = invalidBasicGeometry;
      const validation = wallData.validateBasicMode();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Basic geometry has no segments');
      expect(validation.qualityScore).toBeLessThan(0.8);
    });

    it('should detect invalid basic mode with missing nodes', () => {
      const invalidBasicGeometry: BasicGeometry = {
        segments: mockBasicGeometry.segments,
        nodes: [],
        polygons: mockBasicGeometry.polygons
      };

      wallData.basicGeometry = invalidBasicGeometry;
      const validation = wallData.validateBasicMode();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Basic geometry has no nodes');
    });

    it('should detect segment-node inconsistencies', () => {
      const invalidBasicGeometry: BasicGeometry = {
        segments: [
          { id: 's1', startNodeId: 'missing_node', endNodeId: 'n2', wallId: 'w1', length: 100, angle: 0 }
        ],
        nodes: mockBasicGeometry.nodes,
        polygons: mockBasicGeometry.polygons
      };

      wallData.basicGeometry = invalidBasicGeometry;
      const validation = wallData.validateBasicMode();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('references missing start node'))).toBe(true);
    });

    it('should validate BIM mode correctly when BIM geometry is present', () => {
      wallData.bimGeometry = mockBIMGeometry;
      const validation = wallData.validateBIMMode();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid BIM mode when BIM geometry is missing', () => {
      const validation = wallData.validateBIMMode();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('BIM geometry is not available');
      expect(validation.qualityScore).toBe(0);
    });

    it('should detect thickness mismatch in BIM geometry', () => {
      const mismatchedBIMGeometry = {
        ...mockBIMGeometry,
        wallSolid: new WallSolidImpl(mockBaseline, 200, 'Layout') // Different thickness
      };

      wallData.bimGeometry = mismatchedBIMGeometry;
      const validation = wallData.validateBIMMode();

      expect(validation.warnings.some(w => w.includes('thickness does not match'))).toBe(true);
    });
  });

  describe('Mode Compatibility', () => {
    let wallData: UnifiedWallData;

    beforeEach(() => {
      wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry
      });
    });

    it('should determine BIM mode compatibility for valid basic data', () => {
      const compatibility = wallData.getModeCompatibility();

      expect(compatibility.canSwitchToBIM).toBe(true);
      expect(compatibility.canSwitchToBasic).toBe(true);
      expect(compatibility.estimatedProcessingTime).toBeGreaterThan(0);
    });

    it('should identify potential data loss when switching from BIM to basic', () => {
      const bimGeometryWithIntersections = {
        ...mockBIMGeometry,
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
        ]
      };

      wallData.bimGeometry = bimGeometryWithIntersections;
      const compatibility = wallData.getModeCompatibility();

      expect(compatibility.potentialDataLoss).toContain('Intersection metadata will be lost');
      expect(compatibility.qualityImpact).toBeGreaterThan(0);
    });

    it('should calculate processing time based on geometry complexity', () => {
      const complexBasicGeometry: BasicGeometry = {
        segments: Array.from({ length: 10 }, (_, i) => ({
          id: `s${i}`,
          startNodeId: `n${i}`,
          endNodeId: `n${i + 1}`,
          wallId: 'w1',
          length: 100,
          angle: i * 36
        })),
        nodes: Array.from({ length: 11 }, (_, i) => ({
          id: `n${i}`,
          x: i * 10,
          y: 0,
          connectedSegments: [`s${i}`],
          type: 'endpoint' as const
        })),
        polygons: []
      };

      wallData.basicGeometry = complexBasicGeometry;
      const compatibility = wallData.getModeCompatibility();

      expect(compatibility.estimatedProcessingTime).toBeGreaterThan(100);
    });
  });

  describe('Synchronization Status', () => {
    let wallData: UnifiedWallData;

    beforeEach(() => {
      wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry,
        bimGeometry: mockBIMGeometry
      });
    });

    it('should report synchronized status for consistent data', () => {
      const syncStatus = wallData.getSyncStatus();

      expect(syncStatus.isBasicSynced).toBe(true);
      expect(syncStatus.isBIMSynced).toBe(true);
      expect(syncStatus.syncConflicts).toHaveLength(0);
      expect(syncStatus.requiresFullSync).toBe(false);
    });

    it('should detect thickness conflicts between BIM and unified data', () => {
      const conflictedBIMGeometry = {
        ...mockBIMGeometry,
        wallSolid: new WallSolidImpl(mockBaseline, 200, 'Layout') // Different thickness
      };

      wallData.bimGeometry = conflictedBIMGeometry;
      const syncStatus = wallData.getSyncStatus();

      expect(syncStatus.isBIMSynced).toBe(false);
      expect(syncStatus.syncConflicts).toContain('Thickness mismatch between BIM and unified data');
    });

    it('should detect type conflicts between BIM and unified data', () => {
      const conflictedBIMGeometry = {
        ...mockBIMGeometry,
        wallSolid: new WallSolidImpl(mockBaseline, 100, 'Zone') // Different type
      };

      wallData.bimGeometry = conflictedBIMGeometry;
      const syncStatus = wallData.getSyncStatus();

      expect(syncStatus.isBIMSynced).toBe(false);
      expect(syncStatus.syncConflicts).toContain('Wall type mismatch between BIM and unified data');
    });

    it('should detect missing segments in basic geometry', () => {
      const emptyBasicGeometry: BasicGeometry = {
        segments: [],
        nodes: [],
        polygons: []
      };

      wallData.basicGeometry = emptyBasicGeometry;
      const syncStatus = wallData.getSyncStatus();

      expect(syncStatus.isBasicSynced).toBe(false);
      expect(syncStatus.syncConflicts).toContain('Basic geometry missing segments for multi-point baseline');
    });
  });

  describe('Processing History', () => {
    let wallData: UnifiedWallData;

    beforeEach(() => {
      wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry
      });
    });

    it('should add processing history entries', () => {
      wallData.addProcessingEntry({
        operation: 'offset_generation',
        mode: 'bim',
        success: true,
        processingTime: 150,
        warnings: [],
        errors: []
      });

      expect(wallData.processingHistory).toHaveLength(1);
      expect(wallData.processingHistory[0].operation).toBe('offset_generation');
      expect(wallData.processingHistory[0].timestamp).toBeInstanceOf(Date);
    });

    it('should limit processing history to 100 entries', () => {
      // Add 150 entries
      for (let i = 0; i < 150; i++) {
        wallData.addProcessingEntry({
          operation: `operation_${i}`,
          mode: 'basic',
          success: true,
          processingTime: 10,
          warnings: [],
          errors: []
        });
      }

      expect(wallData.processingHistory).toHaveLength(100);
      expect(wallData.processingHistory[0].operation).toBe('operation_50'); // First 50 should be removed
    });

    it('should update metadata when adding processing entries', () => {
      const initialVersion = wallData.version;

      wallData.addProcessingEntry({
        operation: 'test_operation',
        mode: 'basic',
        success: true,
        processingTime: 10,
        warnings: [],
        errors: []
      });

      expect(wallData.version).toBe(initialVersion + 1);
    });
  });

  describe('Cloning and Serialization', () => {
    let wallData: UnifiedWallData;

    beforeEach(() => {
      wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry,
        bimGeometry: mockBIMGeometry,
        projectId: 'project_123'
      });
    });

    it('should create a deep clone with new ID', () => {
      const clone = wallData.clone();

      expect(clone.id).not.toBe(wallData.id);
      expect(clone.id).toContain('_clone_');
      expect(clone.type).toBe(wallData.type);
      expect(clone.thickness).toBe(wallData.thickness);
      expect(clone.projectId).toBe(wallData.projectId);
      
      // Should be separate arrays
      expect(clone.basicGeometry.segments).not.toBe(wallData.basicGeometry.segments);
      expect(clone.basicGeometry.segments).toEqual(wallData.basicGeometry.segments);
    });

    it('should serialize to JSON-compatible format', () => {
      wallData.addProcessingEntry({
        operation: 'test_operation',
        mode: 'basic',
        success: true,
        processingTime: 10,
        warnings: [],
        errors: []
      });

      const serialized = wallData.toSerializable();

      expect(serialized.id).toBe(wallData.id);
      expect(serialized.type).toBe(wallData.type);
      expect(serialized.createdAt).toBeTypeOf('string');
      expect(serialized.updatedAt).toBeTypeOf('string');
      expect(serialized.processingHistory[0].timestamp).toBeTypeOf('string');
    });

    it('should deserialize from JSON format', () => {
      const serialized = wallData.toSerializable();
      const deserialized = UnifiedWallData.fromSerializable(serialized);

      expect(deserialized.id).toBe(wallData.id);
      expect(deserialized.type).toBe(wallData.type);
      expect(deserialized.thickness).toBe(wallData.thickness);
      expect(deserialized.projectId).toBe(wallData.projectId);
    });
  });

  describe('Legacy Wall Conversion', () => {
    it('should create unified wall data from legacy wall components', () => {
      const legacyWall: Wall = {
        id: 'legacy_wall_1',
        type: 'layout',
        thickness: 350,
        segmentIds: ['s1'],
        visible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const legacySegments: Segment[] = [
        { id: 's1', startNodeId: 'n1', endNodeId: 'n2', wallId: 'legacy_wall_1', length: 100, angle: 0 }
      ];

      const legacyNodes: Node[] = [
        { id: 'n1', x: 0, y: 0, connectedSegments: ['s1'], type: 'endpoint' },
        { id: 'n2', x: 100, y: 0, connectedSegments: ['s1'], type: 'endpoint' }
      ];

      const unifiedWall = UnifiedWallData.fromLegacyWall(
        legacyWall,
        legacySegments,
        legacyNodes,
        mockBaseline
      );

      expect(unifiedWall.id).toBe('legacy_wall_1');
      expect(unifiedWall.type).toBe('layout');
      expect(unifiedWall.thickness).toBe(350);
      expect(unifiedWall.lastModifiedMode).toBe('basic');
      expect(unifiedWall.basicGeometry.segments).toHaveLength(1);
      expect(unifiedWall.basicGeometry.nodes).toHaveLength(2);
    });

    it('should filter segments and nodes by wall ID', () => {
      const legacyWall: Wall = {
        id: 'wall_1',
        type: 'layout',
        thickness: 350,
        segmentIds: ['s1'],
        visible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const allSegments: Segment[] = [
        { id: 's1', startNodeId: 'n1', endNodeId: 'n2', wallId: 'wall_1', length: 100, angle: 0 },
        { id: 's2', startNodeId: 'n3', endNodeId: 'n4', wallId: 'wall_2', length: 50, angle: 90 }
      ];

      const allNodes: Node[] = [
        { id: 'n1', x: 0, y: 0, connectedSegments: ['s1'], type: 'endpoint' },
        { id: 'n2', x: 100, y: 0, connectedSegments: ['s1'], type: 'endpoint' },
        { id: 'n3', x: 0, y: 50, connectedSegments: ['s2'], type: 'endpoint' },
        { id: 'n4', x: 50, y: 50, connectedSegments: ['s2'], type: 'endpoint' }
      ];

      const unifiedWall = UnifiedWallData.fromLegacyWall(
        legacyWall,
        allSegments,
        allNodes,
        mockBaseline
      );

      expect(unifiedWall.basicGeometry.segments).toHaveLength(1);
      expect(unifiedWall.basicGeometry.segments[0].id).toBe('s1');
      expect(unifiedWall.basicGeometry.nodes).toHaveLength(2);
      expect(unifiedWall.basicGeometry.nodes.map(n => n.id)).toEqual(['n1', 'n2']);
    });
  });

  describe('Computed Properties', () => {
    let wallData: UnifiedWallData;

    beforeEach(() => {
      wallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: mockBasicGeometry,
        bimGeometry: mockBIMGeometry
      });
    });

    it('should compute isBasicModeValid correctly', () => {
      expect(wallData.isBasicModeValid).toBe(true);

      // Make basic geometry invalid
      wallData.basicGeometry = {
        segments: [],
        nodes: [],
        polygons: []
      };

      expect(wallData.isBasicModeValid).toBe(false);
    });

    it('should compute isBIMModeValid correctly', () => {
      expect(wallData.isBIMModeValid).toBe(true);

      // Remove BIM geometry
      wallData.bimGeometry = undefined;

      expect(wallData.isBIMModeValid).toBe(false);
    });

    it('should compute requiresSync correctly', () => {
      expect(wallData.requiresSync).toBe(false);

      // Create a conflict
      const conflictedBIMGeometry = {
        ...mockBIMGeometry,
        wallSolid: new WallSolidImpl(mockBaseline, 200, 'Layout')
      };
      wallData.bimGeometry = conflictedBIMGeometry;

      expect(wallData.requiresSync).toBe(true);
    });
  });
});