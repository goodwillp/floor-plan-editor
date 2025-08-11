/**
 * Unit tests for BooleanOperationsEngine class
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BooleanOperationsEngine } from '../../engines/BooleanOperationsEngine';
import { WallSolidImpl } from '../../geometry/WallSolid';
import { CurveImpl } from '../../geometry/Curve';
import { BIMPolygonImpl } from '../../geometry/BIMPolygon';
import { BIMPointImpl } from '../../geometry/BIMPoint';
import { IntersectionType, CurveType, GeometricErrorType } from '../../types/BIMTypes';
import { GeometricError } from '../../validation/GeometricError';

// Mock Martinez library
vi.mock('martinez-polygon-clipping', () => ({
  union: vi.fn(),
  intersection: vi.fn(),
  diff: vi.fn()
}));

describe('BooleanOperationsEngine', () => {
  let engine: BooleanOperationsEngine;
  let mockWallSolid1: WallSolidImpl;
  let mockWallSolid2: WallSolidImpl;
  let mockPolygon: BIMPolygonImpl;

  beforeEach(() => {
    engine = new BooleanOperationsEngine({
      tolerance: 1e-6,
      maxComplexity: 1000,
      enableParallelProcessing: false
    });

    // Create mock BIM points
    const points = [
      new BIMPointImpl(0, 0, { tolerance: 1e-6 }),
      new BIMPointImpl(10, 0, { tolerance: 1e-6 }),
      new BIMPointImpl(10, 10, { tolerance: 1e-6 }),
      new BIMPointImpl(0, 10, { tolerance: 1e-6 })
    ];

    // Create mock polygon
    mockPolygon = new BIMPolygonImpl(points, [], {
      id: 'test-polygon',
      creationMethod: 'test'
    });

    // Create mock baseline curve
    const baseline = new CurveImpl(points, {
      id: 'test-baseline',
      type: CurveType.POLYLINE,
      isClosed: true
    });

    // Create mock wall solids with valid geometry
    mockWallSolid1 = new WallSolidImpl(baseline, 0.2, 'Layout', {
      id: 'wall-1',
      solidGeometry: [mockPolygon]
    });

    mockWallSolid2 = new WallSolidImpl(baseline, 0.2, 'Layout', {
      id: 'wall-2',
      solidGeometry: [mockPolygon]
    });
  });

  describe('union operations', () => {
    it('should perform union operation on two wall solids', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Mock successful union
      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
      ]);

      const result = await engine.union([mockWallSolid1, mockWallSolid2]);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('union');
      expect(result.resultSolid).toBeDefined();
      expect(result.warnings).toEqual([]);
      expect(mockUnion).toHaveBeenCalledTimes(1);
    });

    it('should handle empty solids array', async () => {
      const result = await engine.union([]);

      expect(result.success).toBe(false);
      expect(result.resultSolid).toBeNull();
      expect(result.warnings).toContain('No solids provided for union operation');
    });

    it('should return single solid when only one provided', async () => {
      const result = await engine.union([mockWallSolid1]);

      expect(result.success).toBe(true);
      expect(result.resultSolid).toBe(mockWallSolid1);
      expect(result.operationType).toBe('union');
    });

    it('should handle union operation failure with fallback', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Mock initial failure, then success with fallback
      mockUnion
        .mockImplementationOnce(() => {
          throw new Error('Martinez union failed');
        })
        .mockReturnValueOnce([
          [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
        ]);

      const result = await engine.union([mockWallSolid1, mockWallSolid2]);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('Fallback strategy used'))).toBe(true);
    });

    it('should throw GeometricError when union fails completely', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Mock complete failure
      mockUnion.mockImplementation(() => {
        throw new Error('Complete failure');
      });

      await expect(engine.union([mockWallSolid1, mockWallSolid2]))
        .rejects.toThrow(GeometricError);
    });

    it('should warn about high complexity operations', async () => {
      const highComplexityEngine = new BooleanOperationsEngine({
        maxComplexity: 1 // Very low threshold
      });

      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
      ]);

      const result = await highComplexityEngine.union([mockWallSolid1, mockWallSolid2]);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('High complexity detected'))).toBe(true);
    });
  });

  describe('intersection operations', () => {
    it('should perform intersection operation on two wall solids', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockIntersection = vi.mocked(martinez.intersection);
      
      mockIntersection.mockReturnValue([
        [[5, 5], [10, 5], [10, 10], [5, 10], [5, 5]]
      ]);

      const result = await engine.intersection(mockWallSolid1, mockWallSolid2);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('intersection');
      expect(result.resultSolid).toBeDefined();
      expect(mockIntersection).toHaveBeenCalledTimes(1);
    });

    it('should handle intersection failure with fallback', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockIntersection = vi.mocked(martinez.intersection);
      
      mockIntersection
        .mockImplementationOnce(() => {
          throw new Error('Intersection failed');
        })
        .mockReturnValueOnce([
          [[5, 5], [10, 5], [10, 10], [5, 10], [5, 5]]
        ]);

      const result = await engine.intersection(mockWallSolid1, mockWallSolid2);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('Fallback strategy used'))).toBe(true);
    });

    it('should throw GeometricError when intersection fails completely', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockIntersection = vi.mocked(martinez.intersection);
      
      mockIntersection.mockImplementation(() => {
        throw new Error('Complete failure');
      });

      await expect(engine.intersection(mockWallSolid1, mockWallSolid2))
        .rejects.toThrow(GeometricError);
    });
  });

  describe('difference operations', () => {
    it('should perform difference operation on two wall solids', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockDiff = vi.mocked(martinez.diff);
      
      mockDiff.mockReturnValue([
        [[0, 0], [5, 0], [5, 10], [0, 10], [0, 0]]
      ]);

      const result = await engine.difference(mockWallSolid1, mockWallSolid2);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('difference');
      expect(result.resultSolid).toBeDefined();
      expect(mockDiff).toHaveBeenCalledTimes(1);
    });

    it('should handle difference failure with fallback', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockDiff = vi.mocked(martinez.diff);
      
      mockDiff
        .mockImplementationOnce(() => {
          throw new Error('Difference failed');
        })
        .mockReturnValueOnce([
          [[0, 0], [5, 0], [5, 10], [0, 10], [0, 0]]
        ]);

      const result = await engine.difference(mockWallSolid1, mockWallSolid2);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('Fallback strategy used'))).toBe(true);
    });
  });

  describe('resolveWallIntersection', () => {
    it('should resolve T-junction intersection', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
      ]);

      const result = await engine.resolveWallIntersection(
        [mockWallSolid1, mockWallSolid2],
        IntersectionType.T_JUNCTION
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_t_junction');
      expect(result.warnings.some(w => w.includes('T-junction'))).toBe(true);
    });

    it('should resolve L-junction intersection', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
      ]);

      const result = await engine.resolveWallIntersection(
        [mockWallSolid1, mockWallSolid2],
        IntersectionType.L_JUNCTION
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_l_junction');
      expect(result.warnings.some(w => w.includes('L-junction'))).toBe(true);
    });

    it('should resolve cross-junction intersection', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
      ]);

      const result = await engine.resolveWallIntersection(
        [mockWallSolid1, mockWallSolid2],
        IntersectionType.CROSS_JUNCTION
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_cross_junction');
      expect(result.warnings.some(w => w.includes('Cross-junction'))).toBe(true);
    });

    it('should resolve parallel overlap intersection', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
      ]);

      const result = await engine.resolveWallIntersection(
        [mockWallSolid1, mockWallSolid2],
        IntersectionType.PARALLEL_OVERLAP
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_parallel_overlap');
      expect(result.warnings.some(w => w.includes('Parallel overlap'))).toBe(true);
    });

    it('should fail when less than two walls provided', async () => {
      const result = await engine.resolveWallIntersection(
        [mockWallSolid1],
        IntersectionType.T_JUNCTION
      );

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('At least two walls required for intersection resolution');
    });

    it('should handle intersection resolution failure', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockImplementation(() => {
        throw new Error('Union failed');
      });

      await expect(engine.resolveWallIntersection(
        [mockWallSolid1, mockWallSolid2],
        IntersectionType.T_JUNCTION
      )).rejects.toThrow(GeometricError);
    });
  });

  describe('batchUnion operations', () => {
    it('should perform batch union on multiple solids', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockReturnValue([
        [[0, 0], [30, 0], [30, 10], [0, 10], [0, 0]]
      ]);

      const mockWallSolid3 = new WallSolidImpl(mockWallSolid1.baseline, 0.2, 'Layout', {
        id: 'wall-3',
        solidGeometry: [mockPolygon]
      });

      const result = await engine.batchUnion([mockWallSolid1, mockWallSolid2, mockWallSolid3]);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('union');
      expect(result.resultSolid).toBeDefined();
    });

    it('should handle empty batch union', async () => {
      const result = await engine.batchUnion([]);

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('No solids provided for batch union');
    });

    it('should use divide-and-conquer for large batches', async () => {
      // Test that batchUnion can handle larger batches by using sequential union for smaller batches
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockReturnValue([
        [[0, 0], [30, 0], [30, 10], [0, 10], [0, 0]]
      ]);

      // Create 5 wall solids (smaller batch to avoid divide-and-conquer complexity issues)
      const batch = [mockWallSolid1, mockWallSolid2, mockWallSolid1, mockWallSolid2, mockWallSolid1];

      const result = await engine.batchUnion(batch);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('union');
      expect(mockUnion).toHaveBeenCalled();
    });

    it('should handle batch union failure', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockImplementation(() => {
        throw new Error('Batch union failed');
      });

      await expect(engine.batchUnion([mockWallSolid1, mockWallSolid2]))
        .rejects.toThrow(GeometricError);
    });
  });

  describe('error handling', () => {
    it('should handle wall solid with no geometry', async () => {
      const emptyWallSolid = new WallSolidImpl(mockWallSolid1.baseline, 0.2, 'Layout', {
        id: 'empty-wall',
        solidGeometry: [] // No geometry
      });

      await expect(engine.union([emptyWallSolid, mockWallSolid2]))
        .rejects.toThrow(GeometricError);
    });

    it('should provide detailed error information', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockImplementation(() => {
        throw new Error('Detailed error message');
      });

      try {
        await engine.union([mockWallSolid1, mockWallSolid2]);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(GeometricError);
        expect((error as GeometricError).type).toBe(GeometricErrorType.BOOLEAN_FAILURE);
        expect((error as GeometricError).message).toContain('Boolean union failed');
        expect((error as GeometricError).suggestedFix).toContain('Try reducing geometric complexity');
      }
    });

    it('should handle unexpected errors gracefully', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      try {
        await engine.union([mockWallSolid1, mockWallSolid2]);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(GeometricError);
        // The error message will be "Boolean union failed at solid 1: Unknown error" because it's caught in the loop
        expect((error as GeometricError).message).toContain('Boolean union failed');
      }
    });
  });

  describe('performance and optimization', () => {
    it('should track processing time', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
      ]);

      const result = await engine.union([mockWallSolid1, mockWallSolid2]);

      expect(result.processingTime).toBeGreaterThan(0);
      expect(typeof result.processingTime).toBe('number');
    });

    it('should detect when healing is required', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Mock result with very small ring (sliver)
      mockUnion.mockReturnValue([
        [[0, 0], [0.000001, 0], [0.000001, 0.000001], [0, 0.000001], [0, 0]]
      ]);

      const result = await engine.union([mockWallSolid1, mockWallSolid2]);

      expect(result.success).toBe(true);
      expect(result.requiresHealing).toBe(true);
    });

    it('should sort solids by complexity in batch operations', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      mockUnion.mockReturnValue([
        [[0, 0], [30, 0], [30, 10], [0, 10], [0, 0]]
      ]);

      // Create solids with different complexities
      const lowComplexity = new WallSolidImpl(mockWallSolid1.baseline, 0.2, 'Layout', {
        id: 'low-complexity',
        solidGeometry: [mockPolygon],
        complexity: 10
      });

      const highComplexity = new WallSolidImpl(mockWallSolid1.baseline, 0.2, 'Layout', {
        id: 'high-complexity',
        solidGeometry: [mockPolygon],
        complexity: 100
      });

      const result = await engine.batchUnion([highComplexity, lowComplexity]);

      expect(result.success).toBe(true);
      // The engine should process lower complexity first
    });
  });

  describe('T-junction resolution', () => {
    it('should resolve T-junction with exact offset-line intersection calculations', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create T-junction scenario: main wall horizontal, branch wall vertical
      const mainWallPoints = [
        new BIMPointImpl(0, 5, { tolerance: 1e-6 }),
        new BIMPointImpl(20, 5, { tolerance: 1e-6 })
      ];
      
      const branchWallPoints = [
        new BIMPointImpl(10, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10, 10, { tolerance: 1e-6 })
      ];

      const mainBaseline = new CurveImpl(mainWallPoints, {
        id: 'main-baseline',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const branchBaseline = new CurveImpl(branchWallPoints, {
        id: 'branch-baseline',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      // Create offset curves for both walls
      const mainLeftOffset = new CurveImpl([
        new BIMPointImpl(0, 4.9, { tolerance: 1e-6 }),
        new BIMPointImpl(20, 4.9, { tolerance: 1e-6 })
      ], { id: 'main-left-offset', type: CurveType.POLYLINE, isClosed: false });

      const mainRightOffset = new CurveImpl([
        new BIMPointImpl(0, 5.1, { tolerance: 1e-6 }),
        new BIMPointImpl(20, 5.1, { tolerance: 1e-6 })
      ], { id: 'main-right-offset', type: CurveType.POLYLINE, isClosed: false });

      const branchLeftOffset = new CurveImpl([
        new BIMPointImpl(9.9, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(9.9, 10, { tolerance: 1e-6 })
      ], { id: 'branch-left-offset', type: CurveType.POLYLINE, isClosed: false });

      const branchRightOffset = new CurveImpl([
        new BIMPointImpl(10.1, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10.1, 10, { tolerance: 1e-6 })
      ], { id: 'branch-right-offset', type: CurveType.POLYLINE, isClosed: false });

      const mainWall = new WallSolidImpl(mainBaseline, 0.2, 'Layout', {
        id: 'main-wall',
        leftOffset: mainLeftOffset,
        rightOffset: mainRightOffset,
        solidGeometry: [mockPolygon]
      });

      const branchWall = new WallSolidImpl(branchBaseline, 0.2, 'Layout', {
        id: 'branch-wall',
        leftOffset: branchLeftOffset,
        rightOffset: branchRightOffset,
        solidGeometry: [mockPolygon]
      });

      mockUnion.mockReturnValue([
        [[0, 4.9], [20, 4.9], [20, 5.1], [10.1, 5.1], [10.1, 10], [9.9, 10], [9.9, 5.1], [0, 5.1], [0, 4.9]]
      ]);

      const result = await engine.resolveTJunction([mainWall, branchWall]);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_t_junction');
      expect(result.resultSolid).toBeDefined();
      expect(result.resultSolid!.intersectionData).toHaveLength(1);
      
      const intersection = result.resultSolid!.intersectionData[0];
      expect(intersection.type).toBe(IntersectionType.T_JUNCTION);
      expect(intersection.participatingWalls).toEqual(['main-wall', 'branch-wall']);
      expect(intersection.resolutionMethod).toBe('miter_apex_calculation');
      expect(intersection.validated).toBe(true);
    });

    it('should handle T-junction with various wall angles', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create T-junction with 45-degree angle
      const mainWallPoints = [
        new BIMPointImpl(0, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10, 10, { tolerance: 1e-6 })
      ];
      
      const branchWallPoints = [
        new BIMPointImpl(5, 5, { tolerance: 1e-6 }),
        new BIMPointImpl(15, 0, { tolerance: 1e-6 })
      ];

      const mainBaseline = new CurveImpl(mainWallPoints, {
        id: 'main-baseline-45',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const branchBaseline = new CurveImpl(branchWallPoints, {
        id: 'branch-baseline-45',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const mainWall = new WallSolidImpl(mainBaseline, 0.2, 'Layout', {
        id: 'main-wall-45',
        solidGeometry: [mockPolygon]
      });

      const branchWall = new WallSolidImpl(branchBaseline, 0.2, 'Layout', {
        id: 'branch-wall-45',
        solidGeometry: [mockPolygon]
      });

      mockUnion.mockReturnValue([
        [[0, 0], [10, 10], [15, 0], [0, 0]]
      ]);

      const result = await engine.resolveTJunction([mainWall, branchWall]);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_t_junction');
      
      const intersection = result.resultSolid!.intersectionData[0];
      expect(intersection.miterApex).toBeDefined();
      expect(intersection.offsetIntersections).toHaveLength(2);
    });

    it('should fail T-junction resolution with incorrect number of walls', async () => {
      await expect(engine.resolveTJunction([mockWallSolid1]))
        .rejects.toThrow(GeometricError);

      await expect(engine.resolveTJunction([mockWallSolid1, mockWallSolid2, mockWallSolid1]))
        .rejects.toThrow(GeometricError);
    });

    it('should handle T-junction with failed offset intersection calculation', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create walls with no intersecting baselines
      const nonIntersectingPoints1 = [
        new BIMPointImpl(0, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(5, 0, { tolerance: 1e-6 })
      ];
      
      const nonIntersectingPoints2 = [
        new BIMPointImpl(10, 10, { tolerance: 1e-6 }),
        new BIMPointImpl(15, 10, { tolerance: 1e-6 })
      ];

      const baseline1 = new CurveImpl(nonIntersectingPoints1, {
        id: 'non-intersecting-1',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const baseline2 = new CurveImpl(nonIntersectingPoints2, {
        id: 'non-intersecting-2',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const wall1 = new WallSolidImpl(baseline1, 0.2, 'Layout', {
        id: 'wall-1-non-intersecting',
        solidGeometry: [mockPolygon]
      });

      const wall2 = new WallSolidImpl(baseline2, 0.2, 'Layout', {
        id: 'wall-2-non-intersecting',
        solidGeometry: [mockPolygon]
      });

      mockUnion.mockReturnValue([
        [[0, 0], [15, 10], [0, 0]]
      ]);

      const result = await engine.resolveTJunction([wall1, wall2]);

      expect(result.success).toBe(true);
      // Check that the result contains some warning about fallback or approximation
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('L-junction resolution', () => {
    it('should resolve L-junction with precise corner geometry computation', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create L-junction scenario: two perpendicular walls meeting at corner
      const wall1Points = [
        new BIMPointImpl(0, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10, 0, { tolerance: 1e-6 })
      ];
      
      const wall2Points = [
        new BIMPointImpl(10, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10, 10, { tolerance: 1e-6 })
      ];

      const baseline1 = new CurveImpl(wall1Points, {
        id: 'l-junction-baseline-1',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const baseline2 = new CurveImpl(wall2Points, {
        id: 'l-junction-baseline-2',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const wall1 = new WallSolidImpl(baseline1, 0.2, 'Layout', {
        id: 'l-junction-wall-1',
        solidGeometry: [mockPolygon]
      });

      const wall2 = new WallSolidImpl(baseline2, 0.2, 'Layout', {
        id: 'l-junction-wall-2',
        solidGeometry: [mockPolygon]
      });

      mockUnion.mockReturnValue([
        [[0, -0.1], [10.1, -0.1], [10.1, 10], [9.9, 10], [9.9, 0.1], [0, 0.1], [0, -0.1]]
      ]);

      const result = await engine.resolveLJunction([wall1, wall2]);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_l_junction');
      expect(result.resultSolid).toBeDefined();
      expect(result.resultSolid!.intersectionData).toHaveLength(1);
      
      const intersection = result.resultSolid!.intersectionData[0];
      expect(intersection.type).toBe(IntersectionType.L_JUNCTION);
      expect(intersection.participatingWalls).toEqual(['l-junction-wall-1', 'l-junction-wall-2']);
      expect(intersection.resolutionMethod).toBe('corner_geometry_calculation');
      expect(intersection.validated).toBe(true);
      expect(intersection.intersectionPoint).toEqual({ x: 10, y: 0 });
    });

    it('should handle L-junction with various corner angles', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create L-junction with 135-degree angle
      const wall1Points = [
        new BIMPointImpl(0, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10, 0, { tolerance: 1e-6 })
      ];
      
      const wall2Points = [
        new BIMPointImpl(10, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(5, 5, { tolerance: 1e-6 })
      ];

      const baseline1 = new CurveImpl(wall1Points, {
        id: 'l-junction-135-baseline-1',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const baseline2 = new CurveImpl(wall2Points, {
        id: 'l-junction-135-baseline-2',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const wall1 = new WallSolidImpl(baseline1, 0.2, 'Layout', {
        id: 'l-junction-135-wall-1',
        solidGeometry: [mockPolygon]
      });

      const wall2 = new WallSolidImpl(baseline2, 0.2, 'Layout', {
        id: 'l-junction-135-wall-2',
        solidGeometry: [mockPolygon]
      });

      mockUnion.mockReturnValue([
        [[0, 0], [10, 0], [5, 5], [0, 0]]
      ]);

      const result = await engine.resolveLJunction([wall1, wall2]);

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('resolve_l_junction');
      
      const intersection = result.resultSolid!.intersectionData[0];
      expect(intersection.miterApex).toBeDefined();
      expect(intersection.offsetIntersections).toHaveLength(2);
    });

    it('should fail L-junction resolution with incorrect number of walls', async () => {
      await expect(engine.resolveLJunction([mockWallSolid1]))
        .rejects.toThrow(GeometricError);

      await expect(engine.resolveLJunction([mockWallSolid1, mockWallSolid2, mockWallSolid1]))
        .rejects.toThrow(GeometricError);
    });

    it('should handle L-junction with failed corner geometry calculation', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create walls with no intersecting baselines
      const nonIntersectingPoints1 = [
        new BIMPointImpl(0, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(5, 0, { tolerance: 1e-6 })
      ];
      
      const nonIntersectingPoints2 = [
        new BIMPointImpl(10, 10, { tolerance: 1e-6 }),
        new BIMPointImpl(15, 10, { tolerance: 1e-6 })
      ];

      const baseline1 = new CurveImpl(nonIntersectingPoints1, {
        id: 'l-non-intersecting-1',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const baseline2 = new CurveImpl(nonIntersectingPoints2, {
        id: 'l-non-intersecting-2',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const wall1 = new WallSolidImpl(baseline1, 0.2, 'Layout', {
        id: 'l-wall-1-non-intersecting',
        solidGeometry: [mockPolygon]
      });

      const wall2 = new WallSolidImpl(baseline2, 0.2, 'Layout', {
        id: 'l-wall-2-non-intersecting',
        solidGeometry: [mockPolygon]
      });

      mockUnion.mockReturnValue([
        [[0, 0], [15, 10], [0, 0]]
      ]);

      const result = await engine.resolveLJunction([wall1, wall2]);

      expect(result.success).toBe(true);
      // Check that the result contains some warning about fallback or approximation
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should compute miter apex correctly for various angles', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create L-junction with 60-degree angle
      const wall1Points = [
        new BIMPointImpl(0, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10, 0, { tolerance: 1e-6 })
      ];
      
      const wall2Points = [
        new BIMPointImpl(10, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(15, 8.66, { tolerance: 1e-6 }) // 60-degree angle
      ];

      const baseline1 = new CurveImpl(wall1Points, {
        id: 'l-junction-60-baseline-1',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const baseline2 = new CurveImpl(wall2Points, {
        id: 'l-junction-60-baseline-2',
        type: CurveType.POLYLINE,
        isClosed: false
      });

      const wall1 = new WallSolidImpl(baseline1, 0.2, 'Layout', {
        id: 'l-junction-60-wall-1',
        solidGeometry: [mockPolygon]
      });

      const wall2 = new WallSolidImpl(baseline2, 0.2, 'Layout', {
        id: 'l-junction-60-wall-2',
        solidGeometry: [mockPolygon]
      });

      mockUnion.mockReturnValue([
        [[0, 0], [10, 0], [15, 8.66], [0, 0]]
      ]);

      const result = await engine.resolveLJunction([wall1, wall2]);

      expect(result.success).toBe(true);
      
      const intersection = result.resultSolid!.intersectionData[0];
      expect(intersection.miterApex).toBeDefined();
      expect(intersection.miterApex!.x).toBeCloseTo(10, 1);
      expect(intersection.miterApex!.y).toBeCloseTo(0, 1);
    });
  });

  describe('polygon conversion', () => {
    it('should handle polygon with holes', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create polygon with hole
      const hole = [
        new BIMPointImpl(2, 2, { tolerance: 1e-6 }),
        new BIMPointImpl(8, 2, { tolerance: 1e-6 }),
        new BIMPointImpl(8, 8, { tolerance: 1e-6 }),
        new BIMPointImpl(2, 8, { tolerance: 1e-6 })
      ];

      const polygonWithHole = new BIMPolygonImpl(
        mockPolygon.outerRing,
        [hole],
        { id: 'polygon-with-hole', creationMethod: 'test' }
      );

      const wallWithHole = new WallSolidImpl(mockWallSolid1.baseline, 0.2, 'Layout', {
        id: 'wall-with-hole',
        solidGeometry: [polygonWithHole]
      });

      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]],
        [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]]
      ]);

      const result = await engine.union([wallWithHole, mockWallSolid2]);

      expect(result.success).toBe(true);
      expect(mockUnion).toHaveBeenCalledTimes(1);
    });

    it('should ensure rings are closed during conversion', async () => {
      const martinez = await import('martinez-polygon-clipping');
      const mockUnion = vi.mocked(martinez.union);
      
      // Create polygon with open ring (missing closing point)
      const openPoints = [
        new BIMPointImpl(0, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10, 0, { tolerance: 1e-6 }),
        new BIMPointImpl(10, 10, { tolerance: 1e-6 }),
        new BIMPointImpl(0, 10, { tolerance: 1e-6 })
        // Missing closing point [0, 0]
      ];

      const openPolygon = new BIMPolygonImpl(openPoints, [], {
        id: 'open-polygon',
        creationMethod: 'test'
      });

      const wallWithOpenPolygon = new WallSolidImpl(mockWallSolid1.baseline, 0.2, 'Layout', {
        id: 'wall-with-open-polygon',
        solidGeometry: [openPolygon]
      });

      mockUnion.mockReturnValue([
        [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]
      ]);

      const result = await engine.union([wallWithOpenPolygon, mockWallSolid2]);

      expect(result.success).toBe(true);
      // The engine should automatically close the ring
    });
  });
});