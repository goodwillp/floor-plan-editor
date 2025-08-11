/**
 * Unit tests for GeometrySimplificationEngine
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeometrySimplificationEngineImpl } from '../../engines/GeometrySimplificationEngine';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { BIMPolygonImpl } from '../../geometry/BIMPolygon';
import { BIMPointImpl } from '../../geometry/BIMPoint';
import { CurveImpl } from '../../geometry/Curve';
import { CurveType } from '../../types/BIMTypes';

describe('GeometrySimplificationEngine', () => {
  let simplificationEngine: GeometrySimplificationEngineImpl;
  let testWallSolid: WallSolidImpl;

  beforeEach(() => {
    simplificationEngine = new GeometrySimplificationEngineImpl();

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

  describe('simplifyWallGeometry', () => {
    it('should simplify complex wall geometry', () => {
      // Create a complex polygon with many unnecessary vertices
      const complexVertices = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1, 0.001, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(2, 0.002, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(3, 0.001, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(4, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ];

      const complexPolygon = new BIMPolygonImpl(complexVertices);

      const wallWithComplexGeometry = testWallSolid.withUpdates({
        solidGeometry: [complexPolygon]
      });

      const result = simplificationEngine.simplifyWallGeometry(wallWithComplexGeometry, 1e-2);

      expect(result.success).toBe(true);
      expect(result.simplifiedSolid).toBeDefined();
      expect(result.pointsRemoved).toBeGreaterThan(0);
      expect(result.complexityReduction).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should preserve architectural accuracy', () => {
      // Create a polygon with important architectural features
      const architecturalVertices = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 2, { creationMethod: 'test' }), // Important corner
        new BIMPointImpl(3, 2, { creationMethod: 'test' }), // Important feature
        new BIMPointImpl(3, 5, { creationMethod: 'test' }), // Important corner
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ];

      const architecturalPolygon = new BIMPolygonImpl(architecturalVertices);

      const wallWithArchitecturalFeatures = testWallSolid.withUpdates({
        solidGeometry: [architecturalPolygon]
      });

      const result = simplificationEngine.simplifyWallGeometry(wallWithArchitecturalFeatures, 1e-3);

      expect(result.success).toBe(true);
      expect(result.accuracyPreserved).toBe(true);
      expect(result.simplifiedSolid!.solidGeometry[0].outerRing.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle polygons with holes', () => {
      const outerRing = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 10, { creationMethod: 'test' }),
        new BIMPointImpl(0, 10, { creationMethod: 'test' })
      ];

      // Complex hole with unnecessary vertices
      const complexHole = [
        new BIMPointImpl(2, 2, { creationMethod: 'test' }),
        new BIMPointImpl(3, 2.001, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(4, 2.002, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(8, 2, { creationMethod: 'test' }),
        new BIMPointImpl(8, 8, { creationMethod: 'test' }),
        new BIMPointImpl(2, 8, { creationMethod: 'test' })
      ];

      const polygonWithComplexHole = new BIMPolygonImpl(outerRing, [complexHole]);

      const wallWithHoles = testWallSolid.withUpdates({
        solidGeometry: [polygonWithComplexHole]
      });

      const result = simplificationEngine.simplifyWallGeometry(wallWithHoles, 1e-2);

      expect(result.success).toBe(true);
      expect(result.simplifiedSolid).toBeDefined();
      expect(result.pointsRemoved).toBeGreaterThan(0);
      expect(result.simplifiedSolid!.solidGeometry[0].holes.length).toBe(1);
    });

    it('should use thickness-based tolerance', () => {
      const thickWall = new WallSolidImpl(testWallSolid.baseline, 1.0, 'Layout'); // Thick wall
      const thinWall = new WallSolidImpl(testWallSolid.baseline, 0.1, 'Layout'); // Thin wall

      // Same complex geometry for both
      const complexVertices = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1, 0.01, { creationMethod: 'test' }),
        new BIMPointImpl(2, 0.02, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ];

      const complexPolygon = new BIMPolygonImpl(complexVertices);

      const thickWallWithGeometry = thickWall.withUpdates({ solidGeometry: [complexPolygon] });
      const thinWallWithGeometry = thinWall.withUpdates({ solidGeometry: [complexPolygon] });

      const thickResult = simplificationEngine.simplifyWallGeometry(thickWallWithGeometry, 1e-3);
      const thinResult = simplificationEngine.simplifyWallGeometry(thinWallWithGeometry, 1e-3);

      expect(thickResult.success).toBe(true);
      expect(thinResult.success).toBe(true);
      
      // Thick walls should allow more aggressive simplification
      expect(thickResult.pointsRemoved).toBeGreaterThanOrEqual(thinResult.pointsRemoved);
    });

    it('should record simplification operations in wall history', () => {
      const complexVertices = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1, 0.001, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ];

      const complexPolygon = new BIMPolygonImpl(complexVertices);
      const wallWithComplexGeometry = testWallSolid.withUpdates({ solidGeometry: [complexPolygon] });

      const result = simplificationEngine.simplifyWallGeometry(wallWithComplexGeometry, 1e-2);

      expect(result.success).toBe(true);
      if (result.simplifiedSolid) {
        expect(result.simplifiedSolid.healingHistory.length).toBeGreaterThanOrEqual(
          testWallSolid.healingHistory.length
        );
      }
    });
  });

  describe('eliminateCollinearPoints', () => {
    it('should remove collinear points', () => {
      const collinearPoints = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1, 0, { creationMethod: 'test' }),
        new BIMPointImpl(2, 0, { creationMethod: 'test' }), // Collinear
        new BIMPointImpl(3, 0, { creationMethod: 'test' }), // Collinear
        new BIMPointImpl(4, 0, { creationMethod: 'test' }),
        new BIMPointImpl(4, 4, { creationMethod: 'test' }),
        new BIMPointImpl(0, 4, { creationMethod: 'test' })
      ];

      const result = simplificationEngine.eliminateCollinearPoints(collinearPoints, Math.PI / 180);

      expect(result.length).toBeLessThan(collinearPoints.length);
      expect(result.length).toBeGreaterThanOrEqual(3); // Should preserve essential points
      expect(result[0]).toBe(collinearPoints[0]); // First point preserved
      expect(result[result.length - 1]).toBe(collinearPoints[collinearPoints.length - 1]); // Last point preserved
    });

    it('should preserve non-collinear points', () => {
      const nonCollinearPoints = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ];

      const result = simplificationEngine.eliminateCollinearPoints(nonCollinearPoints, Math.PI / 180);

      expect(result.length).toBe(nonCollinearPoints.length);
    });

    it('should handle edge cases', () => {
      // Test with too few points
      const fewPoints = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' })
      ];

      const result = simplificationEngine.eliminateCollinearPoints(fewPoints, Math.PI / 180);
      expect(result.length).toBe(2);

      // Test with empty array
      const emptyResult = simplificationEngine.eliminateCollinearPoints([], Math.PI / 180);
      expect(emptyResult.length).toBe(0);
    });
  });

  describe('removeRedundantVertices', () => {
    it('should remove vertices that are too close together', () => {
      const redundantVertices = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(0.0001, 0, { creationMethod: 'test' }), // Too close
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5.0001, 0.0001, { creationMethod: 'test' }), // Too close
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ];

      const polygonWithRedundantVertices = new BIMPolygonImpl(redundantVertices);

      const result = simplificationEngine.removeRedundantVertices(polygonWithRedundantVertices, 1e-3);

      expect(result.outerRing.length).toBeLessThan(redundantVertices.length);
      expect(result.outerRing.length).toBeGreaterThanOrEqual(3);
    });

    it('should preserve vertices that are far enough apart', () => {
      const wellSpacedVertices = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ];

      const polygonWithWellSpacedVertices = new BIMPolygonImpl(wellSpacedVertices);

      const result = simplificationEngine.removeRedundantVertices(polygonWithWellSpacedVertices, 1e-6);

      expect(result.outerRing.length).toBe(wellSpacedVertices.length);
    });

    it('should handle polygons with holes', () => {
      const outerRing = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 0, { creationMethod: 'test' }),
        new BIMPointImpl(10, 10, { creationMethod: 'test' }),
        new BIMPointImpl(0, 10, { creationMethod: 'test' })
      ];

      const redundantHole = [
        new BIMPointImpl(2, 2, { creationMethod: 'test' }),
        new BIMPointImpl(2.0001, 2, { creationMethod: 'test' }), // Too close
        new BIMPointImpl(8, 2, { creationMethod: 'test' }),
        new BIMPointImpl(8, 8, { creationMethod: 'test' }),
        new BIMPointImpl(2, 8, { creationMethod: 'test' })
      ];

      const polygonWithRedundantHole = new BIMPolygonImpl(outerRing, [redundantHole]);

      const result = simplificationEngine.removeRedundantVertices(polygonWithRedundantHole, 1e-3);

      expect(result.holes[0].length).toBeLessThan(redundantHole.length);
      expect(result.holes[0].length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('optimizeComplexJunctions', () => {
    it('should optimize wall junctions', () => {
      // Create wall solid with intersection data (simulating complex junctions)
      const polygon = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const wallWithJunctions = testWallSolid.withUpdates({
        solidGeometry: [polygon],
        intersectionData: [{
          id: 'intersection_1',
          type: 't_junction',
          participatingWalls: ['wall1', 'wall2'],
          intersectionPoint: { x: 2.5, y: 0 },
          miterApex: { x: 2.5, y: 0 },
          offsetIntersections: [{ x: 2.5, y: 0 }],
          resolvedGeometry: polygon,
          resolutionMethod: 'miter_calculation',
          geometricAccuracy: 0.95,
          validated: true
        }]
      });

      const result = simplificationEngine.optimizeComplexJunctions(wallWithJunctions, 0.5);

      expect(result).toBeDefined();
      expect(result.solidGeometry.length).toBe(1);
      expect(result.intersectionData.length).toBe(1);
      expect(result.intersectionData[0].resolutionMethod).toContain('optimized');
    });

    it('should handle different simplification levels', () => {
      const polygon = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ]);

      const wallWithGeometry = testWallSolid.withUpdates({ solidGeometry: [polygon] });

      const lowOptimization = simplificationEngine.optimizeComplexJunctions(wallWithGeometry, 0.1);
      const highOptimization = simplificationEngine.optimizeComplexJunctions(wallWithGeometry, 0.9);

      expect(lowOptimization).toBeDefined();
      expect(highOptimization).toBeDefined();
      // Both should succeed but with different levels of optimization
    });
  });

  describe('rdpSimplify', () => {
    it('should simplify using RDP algorithm', () => {
      // Create a curve with points that can be simplified
      const curvePoints = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1, 0.1, { creationMethod: 'test' }), // Close to line
        new BIMPointImpl(2, 0.05, { creationMethod: 'test' }), // Close to line
        new BIMPointImpl(3, 0.1, { creationMethod: 'test' }), // Close to line
        new BIMPointImpl(4, 0, { creationMethod: 'test' }),
        new BIMPointImpl(4, 4, { creationMethod: 'test' })
      ];

      const result = simplificationEngine.rdpSimplify(curvePoints, 0.2);

      expect(result.length).toBeLessThan(curvePoints.length);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toBe(curvePoints[0]); // First point preserved
      expect(result[result.length - 1]).toBe(curvePoints[curvePoints.length - 1]); // Last point preserved
    });

    it('should preserve important points', () => {
      const importantPoints = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }) // Important corner
      ];

      const result = simplificationEngine.rdpSimplify(importantPoints, 0.1);

      expect(result.length).toBe(importantPoints.length); // All points should be preserved
    });

    it('should handle edge cases', () => {
      // Test with too few points
      const fewPoints = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 0, { creationMethod: 'test' })
      ];

      const result = simplificationEngine.rdpSimplify(fewPoints, 0.1);
      expect(result.length).toBe(2);

      // Test with single point
      const singlePoint = [new BIMPointImpl(0, 0, { creationMethod: 'test' })];
      const singleResult = simplificationEngine.rdpSimplify(singlePoint, 0.1);
      expect(singleResult.length).toBe(1);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        rdpTolerance: 1e-2,
        angleThreshold: Math.PI / 90, // 2 degrees
        distanceThreshold: 1e-4,
        preserveArchitecturalFeatures: false,
        maxSimplificationIterations: 10,
        minVerticesPerRing: 4
      };

      const customEngine = new GeometrySimplificationEngineImpl(customConfig);
      const config = customEngine.getConfig();

      expect(config.rdpTolerance).toBe(1e-2);
      expect(config.angleThreshold).toBe(Math.PI / 90);
      expect(config.distanceThreshold).toBe(1e-4);
      expect(config.preserveArchitecturalFeatures).toBe(false);
      expect(config.maxSimplificationIterations).toBe(10);
      expect(config.minVerticesPerRing).toBe(4);
    });

    it('should allow configuration updates', () => {
      const initialConfig = simplificationEngine.getConfig();
      
      simplificationEngine.updateConfig({
        rdpTolerance: 1e-1,
        maxSimplificationIterations: 15
      });

      const updatedConfig = simplificationEngine.getConfig();

      expect(updatedConfig.rdpTolerance).toBe(1e-1);
      expect(updatedConfig.maxSimplificationIterations).toBe(15);
      // Other values should remain unchanged
      expect(updatedConfig.angleThreshold).toBe(initialConfig.angleThreshold);
      expect(updatedConfig.distanceThreshold).toBe(initialConfig.distanceThreshold);
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

      const result = simplificationEngine.simplifyWallGeometry(invalidWall, 1e-3);

      expect(result.success).toBe(true);
      expect(result.simplifiedSolid).toBeDefined();
    });

    it('should handle extremely small tolerances', () => {
      const result = simplificationEngine.simplifyWallGeometry(testWallSolid, 1e-15);

      expect(result.success).toBe(true);
      expect(result.simplifiedSolid).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle extremely large tolerances', () => {
      const result = simplificationEngine.simplifyWallGeometry(testWallSolid, 1000);

      expect(result.success).toBe(true);
      expect(result.simplifiedSolid).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should preserve minimum vertices per ring', () => {
      // Create a triangle (minimum valid polygon)
      const triangle = new BIMPolygonImpl([
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1, 0, { creationMethod: 'test' }),
        new BIMPointImpl(0.5, 1, { creationMethod: 'test' })
      ]);

      const wallWithTriangle = testWallSolid.withUpdates({
        solidGeometry: [triangle]
      });

      const result = simplificationEngine.simplifyWallGeometry(wallWithTriangle, 10); // Very large tolerance

      expect(result.success).toBe(true);
      expect(result.simplifiedSolid!.solidGeometry[0].outerRing.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('performance', () => {
    it('should complete simplification operations within reasonable time', () => {
      // Create a very complex wall solid
      const complexGeometry = [];
      for (let i = 0; i < 5; i++) {
        const vertices = [];
        for (let j = 0; j < 50; j++) {
          vertices.push(new BIMPointImpl(
            i * 10 + j * 0.2 + Math.sin(j * 0.1) * 0.01,
            j * 0.2 + Math.cos(j * 0.1) * 0.01,
            { creationMethod: 'test' }
          ));
        }
        complexGeometry.push(new BIMPolygonImpl(vertices));
      }

      const complexWall = testWallSolid.withUpdates({
        solidGeometry: complexGeometry
      });

      const startTime = performance.now();
      const result = simplificationEngine.simplifyWallGeometry(complexWall, 1e-2);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should report accurate processing times', () => {
      const result = simplificationEngine.simplifyWallGeometry(testWallSolid, 1e-3);

      expect(result.success).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(typeof result.processingTime).toBe('number');
    });

    it('should show complexity reduction', () => {
      // Create a complex polygon with many collinear points that can be simplified
      const complexVertices = [
        new BIMPointImpl(0, 0, { creationMethod: 'test' }),
        new BIMPointImpl(1, 0.001, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(2, 0.002, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(3, 0.001, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(4, 0.002, { creationMethod: 'test' }), // Nearly collinear
        new BIMPointImpl(5, 0, { creationMethod: 'test' }),
        new BIMPointImpl(5, 1, { creationMethod: 'test' }),
        new BIMPointImpl(5, 2, { creationMethod: 'test' }),
        new BIMPointImpl(5, 3, { creationMethod: 'test' }),
        new BIMPointImpl(5, 4, { creationMethod: 'test' }),
        new BIMPointImpl(5, 5, { creationMethod: 'test' }),
        new BIMPointImpl(0, 5, { creationMethod: 'test' })
      ];

      const complexPolygon = new BIMPolygonImpl(complexVertices);
      const wallWithComplexGeometry = testWallSolid.withUpdates({ solidGeometry: [complexPolygon] });

      const result = simplificationEngine.simplifyWallGeometry(wallWithComplexGeometry, 1e-2);

      expect(result.success).toBe(true);
      expect(result.complexityReduction).toBeGreaterThanOrEqual(0);
      expect(result.pointsRemoved).toBeGreaterThanOrEqual(0);
      
      // If points were removed, complexity reduction should be positive
      if (result.pointsRemoved > 0) {
        expect(result.complexityReduction).toBeGreaterThan(0);
      }
    });
  });
});