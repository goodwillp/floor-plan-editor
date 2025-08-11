/**
 * DataPreservationSystem Tests
 * 
 * Tests for data preservation, rollback capabilities, and approximation handling
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DataPreservationSystem, 
  ApproximationType, 
  PreservationLevel,
  ModeSnapshot 
} from '../../data/DataPreservationSystem';
import { UnifiedWallData } from '../../data/UnifiedWallData';
import { Curve } from '../../geometry/Curve';
import { CurveType } from '../../types/BIMTypes';
import { BIMPoint } from '../../geometry/BIMPoint';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { QualityMetrics } from '../../types/QualityMetrics';

describe('DataPreservationSystem', () => {
  let preservationSystem: DataPreservationSystem;
  let mockBaseline: Curve;
  let testWallData: UnifiedWallData;
  let testWallsMap: Map<string, UnifiedWallData>;

  beforeEach(() => {
    preservationSystem = new DataPreservationSystem({
      maxSnapshots: 10,
      defaultExpirationHours: 1
    });

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
      id: 'test_wall_1',
      type: 'Layout',
      thickness: 100,
      baseline: mockBaseline,
      basicGeometry: {
        segments: [
          { id: 's1', startNodeId: 'n1', endNodeId: 'n2', wallId: 'test_wall_1', length: 100, angle: 0 }
        ],
        nodes: [
          { id: 'n1', x: 0, y: 0, connectedSegments: ['s1'], type: 'endpoint' },
          { id: 'n2', x: 100, y: 0, connectedSegments: ['s1'], type: 'endpoint' }
        ],
        polygons: []
      }
    });

    testWallsMap = new Map([['test_wall_1', testWallData]]);
  });

  afterEach(() => {
    preservationSystem.stopRealTimeMonitoring();
  });

  describe('Data Preservation', () => {
    it('should preserve wall data for basic mode conversion', async () => {
      // Add BIM geometry to test data loss scenarios
      const wallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
      const qualityMetrics: QualityMetrics = {
        geometricAccuracy: 0.95,
        topologicalConsistency: 1.0,
        manufacturability: 0.9,
        architecturalCompliance: 1.0,
        sliverFaceCount: 2, // Add sliver faces to test approximation
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
        qualityMetrics
      };

      const result = await preservationSystem.preserveWallData(testWallData, 'basic');

      expect(result.success).toBe(true);
      expect(result.snapshotId).toBeDefined();
      expect(result.dataPreserved).toBe(false); // Should be false due to approximations
      expect(result.approximationsUsed.length).toBeGreaterThan(0);
      expect(result.qualityImpact).toBeGreaterThan(0);
      expect(result.rollbackAvailable).toBe(true);
    });

    it('should preserve wall data for BIM mode conversion', async () => {
      const result = await preservationSystem.preserveWallData(testWallData, 'bim');

      expect(result.success).toBe(true);
      expect(result.snapshotId).toBeDefined();
      expect(result.dataPreserved).toBe(true); // Should be true for basic to BIM
      expect(result.approximationsUsed).toHaveLength(0);
      expect(result.qualityImpact).toBe(0);
      expect(result.rollbackAvailable).toBe(true);
    });

    it('should handle preservation errors gracefully', async () => {
      // Create invalid wall data
      const invalidWallData = { ...testWallData } as any;
      invalidWallData.getModeCompatibility = () => { throw new Error('Test error'); };

      const result = await preservationSystem.preserveWallData(invalidWallData, 'basic');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.rollbackAvailable).toBe(false);
    });
  });

  describe('Approximation Handling', () => {
    it('should handle geometric simplification approximations', async () => {
      const originalData = { complexGeometry: 'detailed' };
      const approximatedData = { simplifiedGeometry: 'basic' };

      const result = await preservationSystem.handleApproximations(
        originalData,
        approximatedData,
        ApproximationType.GEOMETRIC_SIMPLIFICATION,
        'Test geometric simplification'
      );

      expect(result.success).toBe(true);
      expect(result.approximationRecord.type).toBe(ApproximationType.GEOMETRIC_SIMPLIFICATION);
      expect(result.approximationRecord.reversible).toBe(false);
      expect(result.qualityImpact).toBe(0.05);
      expect(result.warnings.some(w => w.includes('Irreversible approximation'))).toBe(true);
    });

    it('should handle precision reduction approximations', async () => {
      const originalData = { precision: 1e-10 };
      const approximatedData = { precision: 1e-6 };

      const result = await preservationSystem.handleApproximations(
        originalData,
        approximatedData,
        ApproximationType.PRECISION_REDUCTION,
        'Test precision reduction'
      );

      expect(result.success).toBe(true);
      expect(result.approximationRecord.reversible).toBe(true);
      expect(result.qualityImpact).toBe(0.02);
      expect(result.warnings).toHaveLength(0); // Reversible, so no warnings
    });

    it('should handle metadata loss approximations', async () => {
      const originalData = { metadata: 'important_data' };
      const approximatedData = null;

      const result = await preservationSystem.handleApproximations(
        originalData,
        approximatedData,
        ApproximationType.METADATA_LOSS,
        'Test metadata loss'
      );

      expect(result.success).toBe(true);
      expect(result.approximationRecord.reversible).toBe(false);
      expect(result.qualityImpact).toBe(0.1);
    });

    it('should handle approximation errors', async () => {
      // Mock the serializeData method to throw an error
      const originalSerializeData = (preservationSystem as any).serializeData;
      (preservationSystem as any).serializeData = vi.fn().mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      const result = await preservationSystem.handleApproximations(
        { test: 'data' },
        'simple_data',
        ApproximationType.GEOMETRIC_SIMPLIFICATION,
        'Test error handling'
      );

      expect(result.success).toBe(false);
      expect(result.qualityImpact).toBe(0.5);
      expect(result.warnings.length).toBeGreaterThan(0);

      // Restore original method
      (preservationSystem as any).serializeData = originalSerializeData;
    });
  });

  describe('Snapshot Management', () => {
    it('should create mode snapshots', async () => {
      const snapshot = await preservationSystem.createModeSnapshot(testWallsMap, 'Test snapshot');

      expect(snapshot.id).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.wallSnapshots.size).toBe(1);
      expect(snapshot.wallSnapshots.has('test_wall_1')).toBe(true);
      expect(snapshot.metadata.reason).toBe('Test snapshot');
      expect(snapshot.metadata.expiresAt).toBeInstanceOf(Date);
    });

    it('should rollback to snapshots successfully', async () => {
      // Create snapshot
      const snapshot = await preservationSystem.createModeSnapshot(testWallsMap, 'Test rollback');

      // Modify wall data
      testWallData.thickness = 200;

      // Rollback
      const rollbackResult = await preservationSystem.rollbackToSnapshot(snapshot);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.restoredWalls).toContain('test_wall_1');
      expect(rollbackResult.failedWalls).toHaveLength(0);
      expect(rollbackResult.dataLoss).toBe(false);
      expect(rollbackResult.qualityRestored).toBeGreaterThan(0);
    });

    it('should handle expired snapshots', async () => {
      // Create snapshot with past expiration
      const snapshot = await preservationSystem.createModeSnapshot(testWallsMap, 'Expired snapshot');
      snapshot.metadata.expiresAt = new Date(Date.now() - 1000); // 1 second ago

      const rollbackResult = await preservationSystem.rollbackToSnapshot(snapshot);

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.errors.some(e => e.includes('expired'))).toBe(true);
      expect(rollbackResult.dataLoss).toBe(true);
    });

    it('should clean up old snapshots when limit is exceeded', async () => {
      // Create more snapshots than the limit
      for (let i = 0; i < 15; i++) {
        await preservationSystem.createModeSnapshot(testWallsMap, `Snapshot ${i}`);
      }

      const snapshots = preservationSystem.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(10); // Should respect maxSnapshots limit
    });

    it('should clean up expired snapshots', async () => {
      // Create snapshot and manually expire it
      const snapshot = await preservationSystem.createModeSnapshot(testWallsMap, 'To be expired');
      snapshot.metadata.expiresAt = new Date(Date.now() - 1000);

      const cleanedCount = await preservationSystem.cleanupExpiredSnapshots();

      expect(cleanedCount).toBeGreaterThan(0);
      expect(preservationSystem.getSnapshot(snapshot.id)).toBeUndefined();
    });
  });

  describe('Compatibility Monitoring', () => {
    it('should monitor compatibility for valid walls', async () => {
      const status = await preservationSystem.monitorCompatibility(testWallsMap);

      expect(status.isMonitoring).toBe(true);
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(status.compatibilityScore).toBeGreaterThan(0.5);
      expect(status.issues).toBeDefined();
      expect(status.recommendations).toBeDefined();
    });

    it('should detect basic mode validation issues', async () => {
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

      const invalidWallsMap = new Map([['invalid_wall', invalidWallData]]);
      const status = await preservationSystem.monitorCompatibility(invalidWallsMap);

      expect(status.compatibilityScore).toBeLessThan(1.0);
      expect(status.issues.some(issue => issue.type === 'basic_mode_invalid')).toBe(true);
      expect(status.autoFixAvailable).toBe(true);
    });

    it('should detect BIM mode validation issues', async () => {
      // Add invalid BIM geometry
      const wallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
      const qualityMetrics: QualityMetrics = {
        geometricAccuracy: 0.95,
        topologicalConsistency: 1.0,
        manufacturability: 0.9,
        architecturalCompliance: 1.0,
        sliverFaceCount: 0,
        microGapCount: 0,
        selfIntersectionCount: 5, // Add self-intersections to trigger validation error
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

      const status = await preservationSystem.monitorCompatibility(testWallsMap);

      expect(status.compatibilityScore).toBeLessThan(1.0);
      expect(status.issues.some(issue => issue.type === 'bim_mode_invalid')).toBe(true);
    });

    it('should detect synchronization conflicts', async () => {
      // Add BIM geometry with conflicting data
      const wallSolid = new WallSolidImpl(mockBaseline, 200, 'Zone'); // Different thickness and type
      testWallData.bimGeometry = {
        wallSolid,
        offsetCurves: [mockBaseline, mockBaseline],
        intersectionData: [],
        qualityMetrics: {} as any
      };

      const status = await preservationSystem.monitorCompatibility(testWallsMap);

      expect(status.issues.some(issue => issue.type === 'sync_conflict')).toBe(true);
      expect(status.autoFixAvailable).toBe(true);
    });

    it('should detect low quality metrics', async () => {
      // Add BIM geometry with low quality
      const wallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
      const qualityMetrics: QualityMetrics = {
        geometricAccuracy: 0.5, // Low accuracy
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

      const status = await preservationSystem.monitorCompatibility(testWallsMap);

      expect(status.issues.some(issue => issue.type === 'low_quality')).toBe(true);
    });

    it('should handle monitoring errors', async () => {
      // Create invalid walls map that will cause error
      const invalidWallsMap = new Map([['invalid', null as any]]);

      const status = await preservationSystem.monitorCompatibility(invalidWallsMap);

      expect(status.isMonitoring).toBe(false);
      expect(status.compatibilityScore).toBe(0);
      expect(status.issues.some(issue => issue.type === 'monitoring_error')).toBe(true);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start and stop real-time monitoring', () => {
      expect(() => {
        preservationSystem.startRealTimeMonitoring(testWallsMap, 1000);
      }).not.toThrow();

      expect(() => {
        preservationSystem.stopRealTimeMonitoring();
      }).not.toThrow();
    });

    it('should restart monitoring when called multiple times', () => {
      preservationSystem.startRealTimeMonitoring(testWallsMap, 1000);
      preservationSystem.startRealTimeMonitoring(testWallsMap, 2000);

      // Should not throw and should handle restart gracefully
      expect(() => {
        preservationSystem.stopRealTimeMonitoring();
      }).not.toThrow();
    });
  });

  describe('Snapshot Operations', () => {
    it('should get all snapshots', async () => {
      await preservationSystem.createModeSnapshot(testWallsMap, 'Test 1');
      await preservationSystem.createModeSnapshot(testWallsMap, 'Test 2');

      const snapshots = preservationSystem.getSnapshots();
      expect(snapshots.length).toBe(2);
      expect(snapshots.every(s => s.metadata.reason.startsWith('Test'))).toBe(true);
    });

    it('should get snapshot by ID', async () => {
      const snapshot = await preservationSystem.createModeSnapshot(testWallsMap, 'Test snapshot');
      const retrieved = preservationSystem.getSnapshot(snapshot.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(snapshot.id);
      expect(retrieved!.metadata.reason).toBe('Test snapshot');
    });

    it('should delete snapshots', async () => {
      const snapshot = await preservationSystem.createModeSnapshot(testWallsMap, 'To be deleted');
      
      const deleted = preservationSystem.deleteSnapshot(snapshot.id);
      expect(deleted).toBe(true);

      const retrieved = preservationSystem.getSnapshot(snapshot.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false when deleting non-existent snapshot', () => {
      const deleted = preservationSystem.deleteSnapshot('non_existent_id');
      expect(deleted).toBe(false);
    });
  });

  describe('Preservation Levels', () => {
    it('should determine full preservation level for lossless conversion', async () => {
      const snapshot = await preservationSystem.createModeSnapshot(testWallsMap, 'Full preservation test');
      const wallSnapshot = snapshot.wallSnapshots.get('test_wall_1');

      expect(wallSnapshot?.preservationLevel).toBe(PreservationLevel.FULL);
    });

    it('should determine appropriate preservation level based on data loss', async () => {
      // Add BIM geometry with significant data that would be lost
      const wallSolid = new WallSolidImpl(mockBaseline, 100, 'Layout');
      const qualityMetrics: QualityMetrics = {
        geometricAccuracy: 0.95,
        topologicalConsistency: 1.0,
        manufacturability: 0.9,
        architecturalCompliance: 1.0,
        sliverFaceCount: 10, // High sliver count
        microGapCount: 5,
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
        intersectionData: Array.from({ length: 5 }, (_, i) => ({
          id: `int${i}`,
          type: 't_junction',
          participatingWalls: ['w1', 'w2'],
          intersectionPoint: { x: i * 20, y: 0 },
          miterApex: null,
          offsetIntersections: [],
          resolvedGeometry: {} as any,
          resolutionMethod: 'boolean_union',
          geometricAccuracy: 0.95,
          validated: true
        })),
        qualityMetrics
      };

      const snapshot = await preservationSystem.createModeSnapshot(testWallsMap, 'High data loss test');
      const wallSnapshot = snapshot.wallSnapshots.get('test_wall_1');

      // Should be lower preservation level due to significant data loss potential
      expect([PreservationLevel.MEDIUM, PreservationLevel.LOW]).toContain(wallSnapshot?.preservationLevel);
    });
  });
});