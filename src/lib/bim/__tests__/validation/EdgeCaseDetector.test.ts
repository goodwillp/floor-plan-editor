import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeCaseDetector, EdgeCaseType } from '../../validation/EdgeCaseDetector';
import { Curve, CurveType } from '../../geometry/Curve';
import { WallSolid } from '../../geometry/WallSolid';
import { BIMPoint } from '../../geometry/BIMPoint';
import { ErrorSeverity } from '../../validation/GeometricError';

describe('EdgeCaseDetector', () => {
  let detector: EdgeCaseDetector;

  beforeEach(() => {
    detector = new EdgeCaseDetector();
  });

  describe('Zero-length segment detection', () => {
    it('should detect zero-length segments', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }, // Zero length
          { id: 'p3', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 10,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 0, width: 10, height: 0 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const zeroLengthResult = results.find(r => r.edgeCaseType === EdgeCaseType.ZERO_LENGTH_SEGMENT);

      expect(zeroLengthResult).toBeDefined();
      expect(zeroLengthResult!.hasEdgeCase).toBe(true);
      expect(zeroLengthResult!.severity).toBe(ErrorSeverity.WARNING);
      expect(zeroLengthResult!.canAutoFix).toBe(true);
      expect(zeroLengthResult!.affectedElements).toContain('segment_0');
    });

    it('should not detect zero-length segments in valid curve', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 10, y: 10, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 20,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 10, width: 10, height: 10 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const zeroLengthResult = results.find(r => r.edgeCaseType === EdgeCaseType.ZERO_LENGTH_SEGMENT);

      expect(zeroLengthResult?.hasEdgeCase).toBe(false);
    });
  });

  describe('Degenerate geometry detection', () => {
    it('should detect curve with less than 2 points', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 0,
        boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const degenerateResult = results.find(r => r.edgeCaseType === EdgeCaseType.DEGENERATE_GEOMETRY);

      expect(degenerateResult).toBeDefined();
      expect(degenerateResult!.hasEdgeCase).toBe(true);
      expect(degenerateResult!.severity).toBe(ErrorSeverity.ERROR);
      expect(degenerateResult!.canAutoFix).toBe(false);
    });

    it('should detect curve with all identical points', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 5, y: 5, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 5, y: 5, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 5, y: 5, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 0,
        boundingBox: { minX: 5, maxX: 5, minY: 5, maxY: 5, width: 0, height: 0 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const degenerateResult = results.find(r => r.edgeCaseType === EdgeCaseType.DEGENERATE_GEOMETRY);

      expect(degenerateResult).toBeDefined();
      expect(degenerateResult!.hasEdgeCase).toBe(true);
      expect(degenerateResult!.description).toContain('All points in curve are identical');
    });
  });

  describe('Self-intersection detection', () => {
    it('should detect self-intersecting curve', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 10, y: 10, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p4', x: 0, y: 10, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true } // Creates intersection
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 30,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 10, width: 10, height: 10 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const selfIntersectionResult = results.find(r => r.edgeCaseType === EdgeCaseType.SELF_INTERSECTION);

      expect(selfIntersectionResult).toBeDefined();
      expect(selfIntersectionResult!.hasEdgeCase).toBe(true);
      expect(selfIntersectionResult!.severity).toBe(ErrorSeverity.ERROR);
      expect(selfIntersectionResult!.canAutoFix).toBe(false);
    });

    it('should not detect self-intersection in simple rectangle', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 10, y: 10, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p4', x: 0, y: 10, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: true,
        length: 40,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 10, width: 10, height: 10 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const selfIntersectionResult = results.find(r => r.edgeCaseType === EdgeCaseType.SELF_INTERSECTION);

      expect(selfIntersectionResult?.hasEdgeCase).toBe(false);
    });
  });

  describe('Extreme angle detection', () => {
    it('should detect extremely small angles', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 10.001, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true } // Very small angle
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 10.001,
        boundingBox: { minX: 0, maxX: 10.001, minY: 0, maxY: 0, width: 10.001, height: 0 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const extremeAngleResult = results.find(r => r.edgeCaseType === EdgeCaseType.EXTREME_ANGLE);

      expect(extremeAngleResult).toBeDefined();
      expect(extremeAngleResult!.hasEdgeCase).toBe(true);
      expect(extremeAngleResult!.canAutoFix).toBe(true);
    });

    it('should detect extremely large angles (near 180°)', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: -0.001, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true } // Near 180°
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 20.001,
        boundingBox: { minX: -0.001, maxX: 10, minY: 0, maxY: 0, width: 10.001, height: 0 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const extremeAngleResult = results.find(r => r.edgeCaseType === EdgeCaseType.EXTREME_ANGLE);

      expect(extremeAngleResult).toBeDefined();
      expect(extremeAngleResult!.hasEdgeCase).toBe(true);
    });

    it('should not detect normal angles', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 10, y: 10, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true } // 90° angle
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 20,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 10, width: 10, height: 10 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const extremeAngleResult = results.find(r => r.edgeCaseType === EdgeCaseType.EXTREME_ANGLE);

      expect(extremeAngleResult?.hasEdgeCase).toBe(false);
    });
  });

  describe('Coincident points detection', () => {
    it('should detect coincident points', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 10, y: 10, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p4', x: 10.0000001, y: 10.0000001, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true } // Coincident with p3
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 20,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 10, width: 10, height: 10 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const coincidentResult = results.find(r => r.edgeCaseType === EdgeCaseType.COINCIDENT_POINTS);

      expect(coincidentResult).toBeDefined();
      expect(coincidentResult!.hasEdgeCase).toBe(true);
      expect(coincidentResult!.severity).toBe(ErrorSeverity.WARNING);
      expect(coincidentResult!.canAutoFix).toBe(true);
    });
  });

  describe('Micro segment detection', () => {
    it('should detect micro segments', () => {
      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 0.00001, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }, // Micro segment
          { id: 'p3', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 10.00001,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 0, width: 10, height: 0 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const microSegmentResult = results.find(r => r.edgeCaseType === EdgeCaseType.MICRO_SEGMENT);

      expect(microSegmentResult).toBeDefined();
      expect(microSegmentResult!.hasEdgeCase).toBe(true);
      expect(microSegmentResult!.severity).toBe(ErrorSeverity.WARNING);
      expect(microSegmentResult!.canAutoFix).toBe(true);
    });
  });

  describe('Wall solid edge case detection', () => {
    it('should detect edge cases in wall solid', () => {
      const wallSolid: WallSolid = {
        id: 'test-wall',
        baseline: {
          id: 'baseline',
          points: [
            { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
            { id: 'p2', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true } // Zero length
          ],
          type: CurveType.POLYLINE,
          isClosed: false,
          length: 0,
          boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
          curvature: [],
          tangents: []
        },
        thickness: 1e-15, // Below numerical precision
        wallType: 'Layout',
        leftOffset: null,
        rightOffset: null,
        solidGeometry: [],
        joinTypes: new Map(),
        intersectionData: [],
        healingHistory: [],
        geometricQuality: {
          geometricAccuracy: 0,
          topologicalConsistency: 0,
          manufacturability: 0,
          architecturalCompliance: 0,
          sliverFaceCount: 0,
          microGapCount: 0,
          selfIntersectionCount: 0,
          degenerateElementCount: 0,
          complexity: 0,
          processingEfficiency: 0,
          memoryUsage: 0
        },
        lastValidated: new Date(),
        processingTime: 0,
        complexity: 0
      };

      const results = detector.detectWallSolidEdgeCases(wallSolid);

      // Should detect both baseline zero-length segment and numerical instability in thickness
      expect(results.length).toBeGreaterThan(0);
      
      const zeroLengthResult = results.find(r => r.edgeCaseType === EdgeCaseType.ZERO_LENGTH_SEGMENT);
      expect(zeroLengthResult).toBeDefined();

      const numericalInstabilityResult = results.find(r => r.edgeCaseType === EdgeCaseType.NUMERICAL_INSTABILITY);
      expect(numericalInstabilityResult).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        minSegmentLength: 1e-3,
        minAngleTolerance: 1e-2
      };

      detector.updateConfig(newConfig);
      const config = detector.getConfig();

      expect(config.minSegmentLength).toBe(1e-3);
      expect(config.minAngleTolerance).toBe(1e-2);
    });

    it('should use custom configuration for detection', () => {
      // Create detector with custom config
      const customDetector = new EdgeCaseDetector({
        minSegmentLength: 0.1 // Much larger threshold
      });

      const curve: Curve = {
        id: 'test-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: 0.05, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }, // 0.05 length
          { id: 'p3', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 10.05,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 0, width: 10, height: 0 },
        curvature: [],
        tangents: []
      };

      const results = customDetector.detectCurveEdgeCases(curve);
      const zeroLengthResult = results.find(r => r.edgeCaseType === EdgeCaseType.ZERO_LENGTH_SEGMENT);

      // Should detect as zero-length with custom threshold
      expect(zeroLengthResult).toBeDefined();
      expect(zeroLengthResult!.hasEdgeCase).toBe(true);
    });
  });

  describe('Pathological cases', () => {
    it('should handle empty curve', () => {
      const curve: Curve = {
        id: 'empty-curve',
        points: [],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: 0,
        boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
        curvature: [],
        tangents: []
      };

      const results = detector.detectCurveEdgeCases(curve);
      const degenerateResult = results.find(r => r.edgeCaseType === EdgeCaseType.DEGENERATE_GEOMETRY);

      expect(degenerateResult).toBeDefined();
      expect(degenerateResult!.hasEdgeCase).toBe(true);
      expect(degenerateResult!.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should handle curve with NaN coordinates', () => {
      const curve: Curve = {
        id: 'nan-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: NaN, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: NaN,
        boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 0, width: 10, height: 0 },
        curvature: [],
        tangents: []
      };

      // Should not throw error, should handle gracefully
      expect(() => detector.detectCurveEdgeCases(curve)).not.toThrow();
    });

    it('should handle curve with infinite coordinates', () => {
      const curve: Curve = {
        id: 'infinite-curve',
        points: [
          { id: 'p1', x: 0, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p2', x: Infinity, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true },
          { id: 'p3', x: 10, y: 0, tolerance: 1e-6, creationMethod: 'test', accuracy: 1, validated: true }
        ],
        type: CurveType.POLYLINE,
        isClosed: false,
        length: Infinity,
        boundingBox: { minX: 0, maxX: Infinity, minY: 0, maxY: 0, width: Infinity, height: 0 },
        curvature: [],
        tangents: []
      };

      // Should not throw error, should handle gracefully
      expect(() => detector.detectCurveEdgeCases(curve)).not.toThrow();
    });
  });
});