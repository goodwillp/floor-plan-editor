/**
 * ModeSwitchingEngine Tests
 * 
 * Tests for seamless mode switching between basic and BIM functionality
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModeSwitchingEngine } from '../../engines/ModeSwitchingEngine';
import { UnifiedWallData } from '../../data/UnifiedWallData';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { ShapeHealingEngine } from '../../engines/ShapeHealingEngine';
import { AdaptiveToleranceManager } from '../../engines/AdaptiveToleranceManager';
import { GeometryValidator } from '../../validation/GeometryValidator';
import { BIMErrorHandler } from '../../validation/BIMErrorHandler';
import { Curve } from '../../geometry/Curve';
import { CurveType } from '../../types/BIMTypes';
import { BIMPoint } from '../../geometry/BIMPoint';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { QualityMetrics } from '../../types/QualityMetrics';
import { Wall, Segment, Node } from '../../../types';

describe('ModeSwitchingEngine', () => {
  let modeSwitchingEngine: ModeSwitchingEngine;
  let mockOffsetEngine: RobustOffsetEngine;
  let mockBooleanEngine: BooleanOperationsEngine;
  let mockHealingEngine: ShapeHealingEngine;
  let mockToleranceManager: AdaptiveToleranceManager;
  let mockValidator: GeometryValidator;
  let mockErrorHandler: BIMErrorHandler;
  let mockBaseline: Curve;
  let testWallData: UnifiedWallData;

  beforeEach(() => {
    // Create mock engines
    mockOffsetEngine = {
      offsetCurve: vi.fn(),
      selectOptimalJoinType: vi.fn(),
      handleOffsetFailure: vi.fn()
    } as any;

    mockBooleanEngine = {
      union: vi.fn(),
      intersection: vi.fn(),
      difference: vi.fn(),
      resolveWallIntersection: vi.fn(),
      batchUnion: vi.fn()
    } as any;

    mockHealingEngine = {
      healShape: vi.fn(),
      removeSliverFaces: vi.fn(),
      mergeDuplicateEdges: vi.fn(),
      eliminateMicroGaps: vi.fn(),
      validateTopology: vi.fn(),
      repairInvalidGeometry: vi.fn()
    } as any;

    mockToleranceManager = {
      calculateTolerance: vi.fn().mockReturnValue(1e-6),
      getVertexMergeTolerance: vi.fn(),
      getOffsetTolerance: vi.fn(),
      getBooleanTolerance: vi.fn(),
      adjustToleranceForFailure: vi.fn()
    } as any;

    mockValidator = {
      validateWallSolid: vi.fn(),
      validateIntersection: vi.fn(),
      validateCurve: vi.fn(),
      calculateQualityMetrics: vi.fn(),
      validateWallNetwork: vi.fn()
    } as any;

    mockErrorHandler = {
      handleGeometricError: vi.fn(),
      handleToleranceError: vi.fn(),
      handleBooleanError: vi.fn(),
      attemptGeometricRecovery: vi.fn(),
      provideFallbackGeometry: vi.fn()
    } as any;

    // Create mode switching engine
    modeSwitchingEngine = new ModeSwitchingEngine(
      mockOffsetEngine,
      mockBooleanEngine,
      mockHealingEngine,
      mockToleranceManager,
      mockValidator,
      mockErrorHandler
    );

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

    // Create test wall data
    testWallData = new UnifiedWallData({
      type: 'Layout',
      thickness: 100,
      baseline: mockBaseline,
      basicGeometry: {
        segments: [
          { id: 's1', startNodeId: 'n1', endNodeId: 'n2', wallId: 'w1', length: 100, angle: 0 }
        ],
        nodes: [
          { id: 'n1', x: 0, y: 0, connectedSegments: ['s1'], type: 'endpoint' },
          { id: 'n2', x: 100, y: 0, connectedSegments: ['s1'], type: 'endpoint' }
        ],
        polygons: []
      }
    });
  });

  describe('Switch to BIM Mode', () => {
    it('should successfully convert basic walls to BIM mode', async () => {
      // Mock successful offset operation
      mockOffsetEngine.offsetCurve.mockResolvedValue({
        success: true,
        leftOffset: mockBaseline,
        rightOffset: mockBaseline,
        joinType: 'miter',
        warnings: [],
        fallbackUsed: false
      });

      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.switchToBIMMode(walls);

      expect(result.success).toBe(true);
      expect(result.convertedWalls).toContain('wall1');
      expect(result.failedWalls).toHaveLength(0);
      expect(testWallData.bimGeometry).toBeDefined();
      expect(testWallData.lastModifiedMode).toBe('bim');
    });

    it('should handle offset operation failures gracefully', async () => {
      // Mock failed offset operation
      mockOffsetEngine.offsetCurve.mockResolvedValue({
        success: false,
        leftOffset: null,
        rightOffset: null,
        joinType: 'miter',
        warnings: ['Offset failed'],
        fallbackUsed: false
      });

      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.switchToBIMMode(walls);

      expect(result.success).toBe(false);
      expect(result.convertedWalls).toHaveLength(0);
      expect(result.failedWalls).toContain('wall1');
      expect(result.warnings.some(w => w.includes('Failed to generate offset curves'))).toBe(true);
    });

    it('should handle invalid basic geometry', async () => {
      // Create wall with invalid basic geometry
      const invalidWallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: {
          segments: [], // No segments
          nodes: [],
          polygons: []
        }
      });

      const walls = new Map([['wall1', invalidWallData]]);
      const result = await modeSwitchingEngine.switchToBIMMode(walls);

      expect(result.success).toBe(false);
      expect(result.failedWalls).toContain('wall1');
      expect(result.warnings.some(w => w.includes('Basic geometry has no segments'))).toBe(true);
    });

    it('should track approximations when fallback methods are used', async () => {
      // Mock offset operation with fallback
      mockOffsetEngine.offsetCurve.mockResolvedValue({
        success: true,
        leftOffset: mockBaseline,
        rightOffset: mockBaseline,
        joinType: 'miter',
        warnings: ['Fallback method used'],
        fallbackUsed: true
      });

      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.switchToBIMMode(walls);

      expect(result.success).toBe(true);
      expect(result.approximationsUsed).toContain('Fallback offset method used');
      expect(result.qualityImpact).toBeGreaterThan(0);
      expect(result.preservedData).toBe(false);
    });

    it('should process multiple walls correctly', async () => {
      // Mock successful offset operation
      mockOffsetEngine.offsetCurve.mockResolvedValue({
        success: true,
        leftOffset: mockBaseline,
        rightOffset: mockBaseline,
        joinType: 'miter',
        warnings: [],
        fallbackUsed: false
      });

      const wall2 = testWallData.clone();
      const walls = new Map([
        ['wall1', testWallData],
        ['wall2', wall2]
      ]);

      const result = await modeSwitchingEngine.switchToBIMMode(walls);

      expect(result.success).toBe(true);
      expect(result.convertedWalls).toHaveLength(2);
      expect(result.convertedWalls).toContain('wall1');
      expect(result.convertedWalls).toContain('wall2');
    });
  });

  describe('Switch to Basic Mode', () => {
    beforeEach(() => {
      // Add BIM geometry to test wall
      const wallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
      const qualityMetrics: QualityMetrics = {
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
        calculationMethod: 'test',
        toleranceUsed: 1e-6,
        issues: [],
        recommendations: []
      };

      testWallData.bimGeometry = {
        wallSolid,
        offsetCurves: [mockBaseline, mockBaseline],
        intersectionData: [],
        qualityMetrics
      };
    });

    it('should successfully convert BIM walls to basic mode', async () => {
      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.switchToBasicMode(walls);

      expect(result.success).toBe(true);
      expect(result.convertedWalls).toContain('wall1');
      expect(result.failedWalls).toHaveLength(0);
      expect(testWallData.basicGeometry.segments.length).toBeGreaterThan(0);
      expect(testWallData.basicGeometry.nodes.length).toBeGreaterThan(0);
    });

    it('should handle walls already in basic mode', async () => {
      // Remove BIM geometry
      testWallData.bimGeometry = undefined;

      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.switchToBasicMode(walls);

      expect(result.success).toBe(true);
      expect(result.convertedWalls).toContain('wall1');
      expect(result.warnings.some(w => w.includes('Already in basic mode'))).toBe(true);
    });

    it('should track data loss when converting from BIM to basic', async () => {
      // Add intersection data to BIM geometry
      testWallData.bimGeometry!.intersectionData = [
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
      ];

      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.switchToBasicMode(walls);

      expect(result.success).toBe(true);
      expect(result.approximationsUsed).toContain('Intersection metadata lost in conversion');
      expect(result.qualityImpact).toBeGreaterThan(0);
      expect(result.preservedData).toBe(false);
    });

    it('should create proper segments and nodes from baseline', async () => {
      const walls = new Map([['wall1', testWallData]]);
      await modeSwitchingEngine.switchToBasicMode(walls);

      const basicGeometry = testWallData.basicGeometry;
      
      // Should have nodes for each baseline point
      expect(basicGeometry.nodes).toHaveLength(2);
      expect(basicGeometry.nodes[0].x).toBe(0);
      expect(basicGeometry.nodes[0].y).toBe(0);
      expect(basicGeometry.nodes[1].x).toBe(100);
      expect(basicGeometry.nodes[1].y).toBe(0);

      // Should have segments connecting consecutive nodes
      expect(basicGeometry.segments).toHaveLength(1);
      expect(basicGeometry.segments[0].startNodeId).toBe(basicGeometry.nodes[0].id);
      expect(basicGeometry.segments[0].endNodeId).toBe(basicGeometry.nodes[1].id);
      expect(basicGeometry.segments[0].length).toBe(100);
    });
  });

  describe('Mode Synchronization', () => {
    beforeEach(() => {
      // Add BIM geometry with potential conflicts
      const wallSolid = new WallSolidImpl(mockBaseline, 150, 'Zone'); // Different thickness and type
      const qualityMetrics: QualityMetrics = {
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
        calculationMethod: 'test',
        toleranceUsed: 1e-6,
        issues: [],
        recommendations: []
      };

      testWallData.bimGeometry = {
        wallSolid,
        offsetCurves: [mockBaseline, mockBaseline],
        intersectionData: [],
        qualityMetrics
      };
    });

    it('should synchronize modes when no conflicts exist', async () => {
      // Create wall with consistent data
      const consistentWallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: testWallData.basicGeometry
      });

      const wallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
      consistentWallData.bimGeometry = {
        wallSolid,
        offsetCurves: [mockBaseline, mockBaseline],
        intersectionData: [],
        qualityMetrics: testWallData.bimGeometry!.qualityMetrics
      };

      const result = await modeSwitchingEngine.synchronizeModes(consistentWallData);

      expect(result.success).toBe(true);
      expect(result.dataLoss).toBe(false);
      expect(result.syncConflicts).toHaveLength(0);
      expect(result.qualityImpact).toBe(0);
    });

    it('should resolve thickness conflicts', async () => {
      const result = await modeSwitchingEngine.synchronizeModes(testWallData);

      expect(result.success).toBe(true);
      expect(result.resolvedConflicts.some(r => r.includes('thickness mismatch'))).toBe(true);
      expect(testWallData.bimGeometry!.wallSolid.thickness).toBe(testWallData.thickness);
    });

    it('should resolve type conflicts', async () => {
      const result = await modeSwitchingEngine.synchronizeModes(testWallData);

      expect(result.success).toBe(true);
      expect(result.resolvedConflicts.some(r => r.includes('type mismatch'))).toBe(true);
      expect(testWallData.bimGeometry!.wallSolid.wallType).toBe(testWallData.type);
    });

    it('should handle baseline conflicts by regenerating BIM geometry', async () => {
      // Mock different baseline in BIM geometry
      const differentBaseline = { ...mockBaseline, id: 'different_baseline' };
      testWallData.bimGeometry!.wallSolid = new WallSolidImpl(differentBaseline, 100, 'Layout');

      // Mock successful offset operation for regeneration
      mockOffsetEngine.offsetCurve.mockResolvedValue({
        success: true,
        leftOffset: mockBaseline,
        rightOffset: mockBaseline,
        joinType: 'miter',
        warnings: [],
        fallbackUsed: false
      });

      const result = await modeSwitchingEngine.synchronizeModes(testWallData);

      expect(result.success).toBe(true);
      expect(result.resolvedConflicts.some(r => r.includes('baseline mismatch'))).toBe(true);
    });

    it('should add processing history entry for synchronization', async () => {
      const initialHistoryLength = testWallData.processingHistory.length;

      await modeSwitchingEngine.synchronizeModes(testWallData);

      expect(testWallData.processingHistory.length).toBe(initialHistoryLength + 1);
      expect(testWallData.processingHistory[testWallData.processingHistory.length - 1].operation)
        .toBe('synchronize_modes');
    });
  });

  describe('Mode Switch Validation', () => {
    it('should validate successful switch to BIM mode', async () => {
      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.validateModeSwitch('basic', 'bim', walls);

      expect(result.isCompatible).toBe(true);
      expect(result.canSwitchToBIM).toBe(true);
      expect(result.blockers).toHaveLength(0);
      expect(result.estimatedProcessingTime).toBeGreaterThan(0);
    });

    it('should validate successful switch to basic mode', async () => {
      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.validateModeSwitch('bim', 'basic', walls);

      expect(result.isCompatible).toBe(true);
      expect(result.canSwitchToBasic).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('should detect incompatible walls for BIM mode switch', async () => {
      // Create wall with invalid basic geometry
      const invalidWallData = new UnifiedWallData({
        type: 'Layout',
        thickness: 100,
        baseline: mockBaseline,
        basicGeometry: {
          segments: [], // Invalid - no segments
          nodes: [],
          polygons: []
        }
      });

      const walls = new Map([['wall1', invalidWallData]]);
      const result = await modeSwitchingEngine.validateModeSwitch('basic', 'bim', walls);

      expect(result.isCompatible).toBe(false);
      expect(result.canSwitchToBIM).toBe(false);
      expect(result.blockers.some(b => b.includes('Cannot switch to BIM mode'))).toBe(true);
    });

    it('should identify potential data loss', async () => {
      // Add BIM geometry with intersection data
      const wallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
      testWallData.bimGeometry = {
        wallSolid,
        offsetCurves: [mockBaseline, mockBaseline],
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
        qualityMetrics: {} as any
      };

      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.validateModeSwitch('bim', 'basic', walls);

      expect(result.potentialDataLoss.length).toBeGreaterThan(0);
      expect(result.potentialDataLoss.some(d => d.includes('Intersection metadata will be lost'))).toBe(true);
    });

    it('should return no validation needed for same mode switch', async () => {
      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.validateModeSwitch('basic', 'basic', walls);

      expect(result.isCompatible).toBe(true);
      expect(result.estimatedProcessingTime).toBe(0);
      expect(result.blockers).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accumulate processing time estimates for multiple walls', async () => {
      const wall2 = testWallData.clone();
      const walls = new Map([
        ['wall1', testWallData],
        ['wall2', wall2]
      ]);

      const result = await modeSwitchingEngine.validateModeSwitch('basic', 'bim', walls);

      expect(result.estimatedProcessingTime).toBeGreaterThan(0);
      // Should be roughly double the time for two walls
      const singleWallResult = await modeSwitchingEngine.validateModeSwitch('basic', 'bim', 
        new Map([['wall1', testWallData]]));
      expect(result.estimatedProcessingTime).toBeGreaterThanOrEqual(singleWallResult.estimatedProcessingTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors during BIM conversion', async () => {
      // Mock offset engine to throw error
      mockOffsetEngine.offsetCurve.mockRejectedValue(new Error('Unexpected offset error'));

      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.switchToBIMMode(walls);

      expect(result.success).toBe(false);
      expect(result.failedWalls).toContain('wall1');
      expect(result.warnings.some(w => w.includes('Unexpected error during BIM conversion'))).toBe(true);
    });

    it('should handle unexpected errors during basic conversion', async () => {
      // Add BIM geometry
      const wallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
      testWallData.bimGeometry = {
        wallSolid,
        offsetCurves: [mockBaseline, mockBaseline],
        intersectionData: [],
        qualityMetrics: {} as any
      };

      // Mock error by making baseline points undefined
      testWallData.bimGeometry.wallSolid.baseline.points = undefined as any;

      const walls = new Map([['wall1', testWallData]]);
      const result = await modeSwitchingEngine.switchToBasicMode(walls);

      expect(result.success).toBe(false);
      expect(result.failedWalls).toContain('wall1');
      expect(result.warnings.some(w => w.includes('Unexpected error during basic conversion'))).toBe(true);
    });

    it('should handle synchronization errors gracefully', async () => {
      // Create wall with invalid BIM geometry that will cause sync error
      testWallData.bimGeometry = null as any;

      const result = await modeSwitchingEngine.synchronizeModes(testWallData);

      expect(result.success).toBe(false);
      expect(result.dataLoss).toBe(true);
      expect(result.syncConflicts.some(c => c.includes('Synchronization error'))).toBe(true);
    });
  });
});