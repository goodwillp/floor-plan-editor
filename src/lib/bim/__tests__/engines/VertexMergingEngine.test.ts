/**
 * Unit tests for VertexMergingEngine
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VertexMergingEngineImpl } from '../../engines/VertexMergingEngine';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { BIMPolygonImpl } from '../../geometry/BIMPolygon';
import { BIMPointImpl } from '../../geometry/BIMPoint';
import { CurveImpl } from '../../geometry/Curve';
import { CurveType } from '../../types/BIMTypes';

describe('VertexMergingEngine', () => {
  let mergingEngine: VertexMergingEngineImpl;
  let testWallSolid: WallSolidImpl;

  beforeEach(() => {
    mergingEngine = new VertexMergingEngineImpl();

    // Create test baseline curve
    const baselinePoints = [
      new BIMPointImpl(0, 0, { creationMethod: 'test' }),
      new BIMPointImpl(10, 0, { creationMethod: 'test' }),
      new BIMPointImpl(10, 10, { creationMethod: 'test' }),
      new BIMPointImpl(0, 10, { creationMethod: 'test' })
    ];

    const baseline = new CurveImpl(
      baselinePoints,
      CurveType.POLYLINE,
      true,
      { creationMethod: 'test' }
    );

    // Create test wall solid
    testWallSolid = new WallSolidImpl(baseline, 0.2, 'Layout');
  });

  describe('mergeVertices', () => {
    it('should merge vertices within tolerance', () => {
      // Create two polygons with vertices that are close to each other
      const polygon1 = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const polygon2 = new BIMPolygonImpl([
        new BIMPointImpl(5.0001, 0, { creationMethod: 'test' }), // Close to polygon1's vertex
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 5, { creationMethod: 'test' }),
        new BIMPointImpl(5.0001, 5, { creationMethod: 'test' }) // Close to polygon1's vertex
      ]);

      const wallWithCloseVertices = testWallSolid.withUpdates({
        solidGeometry: [polygon1, polygon2]
      });

      const result = mergingEngine.mergeVertices(wallWithCloseVertices, 1e-3);

      expect(result.success).toBe(true);
      expect(result.healedSolid).toBeDefined();
      expect(result.edgesMerged).toBeGreaterThan(0);
      expect(result.operationsApplied.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should not merge vertices that are too far apart', () => {
      // Create two polygons with vertices that are far apart
      const polygon1 = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const polygon2 = new BIMPolygonImpl([
        new BIMPointImpl(10, 0, { creationMethod: 'test' }), // Far from polygon1's vertices
        new BIMPointImpl(15, 0, { creationMethod: 'test' }),
        new BIMPointImpl(15, 5, { creationMethod: 'test' }),
        new BIMPointImpl(10, 5, { creationMethod: 'test' })
      ]);

      const wallWithDistantVertices = testWallSolid.withUpdates({
        solidGeometry: [polygon1, polygon2]
      });

      const result = mergingEngine.mergeVertices(wallWithDistantVertices, 1e-6);

      expect(result.success).toBe(true);
      expect(result.healedSolid).toBeDefined();
      expect(result.edgesMerged).toBe(0);
    });

    it('should handle empty geometry gracefully', () => {
      const emptyWall = testWallSolid.withUpdates({
        solidGeometry: []
      });

      const result = mergingEngine.mergeVertices(emptyWall, 1e-3);

      expect(result.success).toBe(true);
      expect(result.healedSolid).toBeDefined();
      expect(result.edgesMerged).toBe(0);
    });

    it('should record merging operations in wall history', () => {
      // Create polygons with mergeable vertices
      const polygon1 = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const polygon2 = new BIMPolygonImpl([
        new BIMPointImpl(5.00001, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 5, { creationMethod: 'test' }),
        new BIMPointImpl(5.00001, 5, { creationMethod: 'test' })
      ]);

      const wallWithMergeableVertices = testWallSolid.withUpdates({
        solidGeometry: [polygon1, polygon2]
      });

      const result = mergingEngine.mergeVertices(wallWithMergeableVertices, 1e-3);

      expect(result.success).toBe(true);
      if (result.healedSolid) {
        expect(result.healedSolid.healingHistory.length).toBeGreaterThanOrEqual(
          testWallSolid.healingHistory.length
        );
      }
    });
  });

  describe('findMergeablePairs', () => {
    it('should find vertex pairs within tolerance', () => {
      const polygon1 = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const polygon2 = new BIMPolygonImpl([
        new BIMPointImpl(5.0001, 0, { creationMethod: 'test' }), // Close to polygon1's vertex
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 5, { creationMethod: 'test' }),
        new BIMPointImpl(5.0001, 5, { creationMethod: 'test' }) // Close to polygon1's vertex
      ]);

      const wallWithCloseVertices = testWallSolid.withUpdates({
        solidGeometry: [polygon1, polygon2]
      });

      const pairs = mergingEngine.findMergeablePairs(wallWithCloseVertices, 1e-3);

      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs[0].distance).toBeLessThanOrEqual(1e-3);
      expect(pairs[0].vertex1).toBeDefined();
      expect(pairs[0].vertex2).toBeDefined();
      expect(pairs[0].polygonId1).toBeDefined();
      expect(pairs[0].polygonId2).toBeDefined();
    });

    it('should not find pairs when vertices are too far apart', () => {
      const polygon1 = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const polygon2 = new BIMPolygonImpl([
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(15, 0, { creationMethod: 'test' }),
        new BIMPointImpl(15, 5, { creationMethod: 'test' }),
        new BIMPointImpl(10, 5, { creationMethod: 'test' })
      ]);

      const wallWithDistantVertices = testWallSolid.withUpdates({
        solidGeometry: [polygon1, polygon2]
      });

      const pairs = mergingEngine.findMergeablePairs(wallWithDistantVertices, 1e-6);

      expect(pairs.length).toBe(0);
    });

    it('should sort pairs by distance', () => {
      const polygon1 = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const polygon2 = new BIMPolygonImpl([
        new BIMPointImpl(5.001, 0, { creationMethod: 'test' }), // Farther
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 5, { creationMethod: 'test' }),
        new BIMPointImpl(5.0001, 5, { creationMethod: 'test' }) // Closer
      ]);

      const wallWithVariableDistances = testWallSolid.withUpdates({
        solidGeometry: [polygon1, polygon2]
      });

      const pairs = mergingEngine.findMergeablePairs(wallWithVariableDistances, 1e-2);

      expect(pairs.length).toBeGreaterThanOrEqual(1);
      // If we have multiple pairs, they should be sorted by distance (ascending)
      if (pairs.length > 1) {
        for (let i = 1; i < pairs.length; i++) {
          expect(pairs[i].distance).toBeGreaterThanOrEqual(pairs[i - 1].distance);
        }
      }
    });

    it('should handle polygons with holes', () => {
      const outerRing = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 10, { creationMethod: 'test' }),
        new BIMPointImpl(0, 10, { creationMethod: 'test' })
      ];

      const hole = [
        new BIMPointImpl(2, 2, { creationMethod: 'test' }),
        new BIMPointImpl(8, 2, { creationMethod: 'test' }),
        new BIMPointImpl(8, 8, { creationMethod: 'test' }),
        new BIMPointImpl(2, 8, { creationMethod: 'test' })
      ];

      const polygonWithHole = new BIMPolygonImpl(outerRing, [hole]);

      const polygon2 = new BIMPolygonImpl([
        new BIMPointImpl(2.0001, 2, { creationMethod: 'test' }), // Close to hole vertex
        new BIMPointImpl(12, 2, { creationMethod: 'test' }),
        new BIMPointImpl(12, 8, { creationMethod: 'test' }),
        new BIMPointImpl(2.0001, 8, { creationMethod: 'test' })
      ]);

      const wallWithHoles = testWallSolid.withUpdates({
        solidGeometry: [polygonWithHole, polygon2]
      });

      const pairs = mergingEngine.findMergeablePairs(wallWithHoles, 1e-3);

      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs.some(pair => pair.isHole1 || pair.isHole2)).toBe(true);
    });
  });

  describe('mergeVertexPair', () => {
    it('should create merged point at apex', () => {
      const vertex1 = new BIMPointImpl(5, 0, { creationMethod: 'test' });
      const vertex2 = new BIMPointImpl(5.0002, 0, { creationMethod: 'test' });

      const pair = {
        vertex1,
        vertex2,
        distance: 0.0002,
        polygonId1: 'poly1',
        polygonId2: 'poly2',
        index1: 1,
        index2: 0,
        isHole1: false,
        isHole2: false
      };

      const result = mergingEngine.mergeVertexPair(testWallSolid, pair);

      expect(result.success).toBe(true);
      expect(result.mergedPoint).toBeDefined();
      expect(result.mergedPoint!.x).toBeCloseTo(5.0001, 6);
      expect(result.mergedPoint!.y).toBeCloseTo(0, 6);
      expect(result.affectedPolygons).toEqual(['poly1', 'poly2']);
      expect(result.rollbackData).toBeDefined();
    });

    it('should provide rollback data', () => {
      const vertex1 = new BIMPointImpl(5, 0, { creationMethod: 'test' });
      const vertex2 = new BIMPointImpl(5.0002, 0, { creationMethod: 'test' });

      const pair = {
        vertex1,
        vertex2,
        distance: 0.0002,
        polygonId1: 'poly1',
        polygonId2: 'poly2',
        index1: 1,
        index2: 0,
        isHole1: false,
        isHole2: false
      };

      const result = mergingEngine.mergeVertexPair(testWallSolid, pair);

      expect(result.success).toBe(true);
      expect(result.rollbackData).toBeDefined();
      expect(result.rollbackData.originalVertex1).toBe(vertex1);
      expect(result.rollbackData.originalVertex2).toBe(vertex2);
      expect(result.rollbackData.polygonId1).toBe('poly1');
      expect(result.rollbackData.polygonId2).toBe('poly2');
    });
  });

  describe('validateTopology', () => {
    it('should validate valid topology', () => {
      const validPolygon = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const wallWithValidGeometry = testWallSolid.withUpdates({
        solidGeometry: [validPolygon]
      });

      const result = mergingEngine.validateTopology(wallWithValidGeometry);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect invalid topology with insufficient vertices', () => {
      const invalidPolygon = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' })
        // Only 2 vertices - invalid for a polygon
      ]);

      const wallWithInvalidGeometry = testWallSolid.withUpdates({
        solidGeometry: [invalidPolygon]
      });

      const result = mergingEngine.validateTopology(wallWithInvalidGeometry);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('insufficient vertices');
    });

    it('should detect invalid holes', () => {
      const outerRing = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 10, { creationMethod: 'test' }),
        new BIMPointImpl(0, 10, { creationMethod: 'test' })
      ];

      const invalidHole = [
        new BIMPointImpl(2, 2, { creationMethod: 'test' }),
        new BIMPointImpl(8, 2, { creationMethod: 'test' })
        // Only 2 vertices - invalid for a hole
      ];

      const polygonWithInvalidHole = new BIMPolygonImpl(outerRing, [invalidHole]);

      const wallWithInvalidHole = testWallSolid.withUpdates({
        solidGeometry: [polygonWithInvalidHole]
      });

      const result = mergingEngine.validateTopology(wallWithInvalidHole);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('hole');
      expect(result.errors[0]).toContain('insufficient vertices');
    });

    it('should provide warnings for very small areas', () => {
      // Create a very small polygon
      const tinyPolygon = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1e-6, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1e-6, 1e-6, { creationMethod: 'test' }),
        new BIMPointImpl(0, 1e-6, { creationMethod: 'test' })
      ]);

      const wallWithTinyGeometry = testWallSolid.withUpdates({
        solidGeometry: [tinyPolygon]
      });

      const result = mergingEngine.validateTopology(wallWithTinyGeometry);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('very small area');
    });
  });

  describe('rollbackMerge', () => {
    it('should restore original vertices', () => {
      const originalVertex1 = new BIMPointImpl(5, 0, { creationMethod: 'test' });
      const originalVertex2 = new BIMPointImpl(5.0002, 0, { creationMethod: 'test' });

      const polygon1 = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        originalVertex1,
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const polygon2 = new BIMPolygonImpl([
        originalVertex2,
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 5, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' })
      ]);

      const wallWithOriginalVertices = testWallSolid.withUpdates({
        solidGeometry: [polygon1, polygon2]
      });

      const rollbackData = {
        originalVertex1,
        originalVertex2,
        polygonId1: polygon1.id,
        polygonId2: polygon2.id,
        index1: 1,
        index2: 0,
        isHole1: false,
        isHole2: false
      };

      const restoredWall = mergingEngine.rollbackMerge(wallWithOriginalVertices, rollbackData);

      expect(restoredWall).toBeDefined();
      expect(restoredWall.solidGeometry.length).toBe(2);
    });

    it('should handle rollback failures gracefully', () => {
      const invalidRollbackData = {
        // Missing required fields
      };

      const result = mergingEngine.rollbackMerge(testWallSolid, invalidRollbackData);

      // Should return a solid (either original or a copy) if rollback fails
      expect(result).toBeDefined();
      expect(result.id).toBe(testWallSolid.id);
      expect(result.solidGeometry.length).toBe(testWallSolid.solidGeometry.length);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        mergeTolerance: 1e-5,
        maxSearchRadius: 1e-2,
        preserveTopology: false,
        enableRollback: false,
        maxMergeIterations: 5
      };

      const customEngine = new VertexMergingEngineImpl(customConfig);
      const config = customEngine.getConfig();

      expect(config.mergeTolerance).toBe(1e-5);
      expect(config.maxSearchRadius).toBe(1e-2);
      expect(config.preserveTopology).toBe(false);
      expect(config.enableRollback).toBe(false);
      expect(config.maxMergeIterations).toBe(5);
    });

    it('should allow configuration updates', () => {
      const initialConfig = mergingEngine.getConfig();
      
      mergingEngine.updateConfig({
        mergeTolerance: 1e-4,
        maxMergeIterations: 20
      });

      const updatedConfig = mergingEngine.getConfig();

      expect(updatedConfig.mergeTolerance).toBe(1e-4);
      expect(updatedConfig.maxMergeIterations).toBe(20);
      // Other values should remain unchanged
      expect(updatedConfig.maxSearchRadius).toBe(initialConfig.maxSearchRadius);
      expect(updatedConfig.preserveTopology).toBe(initialConfig.preserveTopology);
    });
  });

  describe('error handling', () => {
    it('should handle invalid wall solid gracefully', () => {
      const invalidGeometry = [
        new BIMPolygonImpl([]) // Empty polygon
      ];

      const invalidWall = testWallSolid.withUpdates({
        solidGeometry: invalidGeometry
      });

      const result = mergingEngine.mergeVertices(invalidWall, 1e-3);

      expect(result.success).toBe(true);
      expect(result.healedSolid).toBeDefined();
    });

    it('should handle extremely small tolerances', () => {
      const result = mergingEngine.mergeVertices(testWallSolid, 1e-15);

      expect(result.success).toBe(true);
      expect(result.healedSolid).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle extremely large tolerances', () => {
      const result = mergingEngine.mergeVertices(testWallSolid, 1000);

      expect(result.success).toBe(true);
      expect(result.healedSolid).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should complete merging operations within reasonable time', () => {
      // Create a more complex wall solid with many vertices
      const complexGeometry = [];
      for (let i = 0; i < 5; i++) {
        const vertices = [];
        for (let j = 0; j < 10; j++) {
          vertices.push(new BIMPointImpl(
            i * 10 + j + Math.random() * 0.001, // Add small random offset for merging
            j + Math.random() * 0.001,
            { creationMethod: 'test' }
          ));
        }
        complexGeometry.push(new BIMPolygonImpl(vertices));
      }

      const complexWall = testWallSolid.withUpdates({
        solidGeometry: complexGeometry
      });

      const startTime = performance.now();
      const result = mergingEngine.mergeVertices(complexWall, 1e-3);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should report accurate processing times', () => {
      const result = mergingEngine.mergeVertices(testWallSolid, 1e-3);

      expect(result.success).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(typeof result.processingTime).toBe('number');
    });
  });
});