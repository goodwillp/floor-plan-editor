/**
 * Unit tests for RobustOffsetEngine
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { RobustOffsetEngine } from '../../engines/RobustOffsetEngine';
import { CurveImpl } from '../../geometry/Curve';
import { BIMPointImpl } from '../../geometry/BIMPoint';
import { OffsetJoinType, CurveType } from '../../types/BIMTypes';

describe('RobustOffsetEngine', () => {
  let offsetEngine: RobustOffsetEngine;

  beforeEach(() => {
    offsetEngine = new RobustOffsetEngine();
  });

  test('should create with default options', () => {
    const engine = new RobustOffsetEngine();
    expect(engine).toBeDefined();
  });

  test('should offset a simple line', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      baseline,
      5, // 5mm offset
      OffsetJoinType.MITER,
      1e-3
    );

    expect(result.success).toBe(true);
    expect(result.leftOffset).toBeDefined();
    expect(result.rightOffset).toBeDefined();
    expect(result.leftOffset!.points.length).toBeGreaterThan(0);
    expect(result.rightOffset!.points.length).toBeGreaterThan(0);
  });

  test('should offset a rectangular path', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0),
      new BIMPointImpl(10, 10),
      new BIMPointImpl(0, 10),
      new BIMPointImpl(0, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE, { isClosed: true });

    const result = offsetEngine.offsetCurve(
      baseline,
      2,
      OffsetJoinType.MITER,
      1e-3
    );

    expect(result.success).toBe(true);
    expect(result.leftOffset).toBeDefined();
    expect(result.rightOffset).toBeDefined();
  });

  test('should handle L-shaped path', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0),
      new BIMPointImpl(10, 10)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      baseline,
      3,
      OffsetJoinType.MITER,
      1e-3
    );

    expect(result.success).toBe(true);
    expect(result.leftOffset).toBeDefined();
    expect(result.rightOffset).toBeDefined();
  });

  test('should select optimal join type for different angles', () => {
    // Very sharp angle - should use round
    const sharpJoin = offsetEngine.selectOptimalJoinType(
      Math.PI / 12, // 15 degrees
      200,
      0.001
    );
    expect(sharpJoin).toBe(OffsetJoinType.ROUND);

    // Moderate angle - should use miter
    const moderateJoin = offsetEngine.selectOptimalJoinType(
      Math.PI / 3, // 60 degrees
      200,
      0.001
    );
    expect(moderateJoin).toBe(OffsetJoinType.MITER);

    // Obtuse angle - should use miter
    const obtuseJoin = offsetEngine.selectOptimalJoinType(
      2 * Math.PI / 3, // 120 degrees
      200,
      0.001
    );
    expect(moderateJoin).toBe(OffsetJoinType.MITER);
  });

  test('should handle thick walls with sharp angles', () => {
    const thickWallJoin = offsetEngine.selectOptimalJoinType(
      Math.PI / 6, // 30 degrees
      400, // Thick wall
      0.001
    );
    expect(thickWallJoin).toBe(OffsetJoinType.BEVEL);
  });

  test('should handle high curvature', () => {
    const highCurvatureJoin = offsetEngine.selectOptimalJoinType(
      Math.PI / 4, // 45 degrees
      200,
      0.02 // High curvature
    );
    expect(highCurvatureJoin).toBe(OffsetJoinType.BEVEL);
  });

  test('should handle offset failure with fallback', () => {
    // Create a degenerate curve that might cause issues
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(0, 0), // Duplicate point
      new BIMPointImpl(1, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      baseline,
      5,
      OffsetJoinType.MITER,
      1e-6 // Very tight tolerance
    );

    // Should either succeed or fail gracefully with fallback
    if (!result.success) {
      expect(result.fallbackUsed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  test('should validate input parameters', () => {
    // Empty curve
    const emptyPoints: BIMPointImpl[] = [];
    const emptyCurve = new CurveImpl(emptyPoints, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      emptyCurve,
      5,
      OffsetJoinType.MITER,
      1e-3
    );

    expect(result.success).toBe(false);
  });

  test('should handle single point curve', () => {
    const points = [new BIMPointImpl(5, 5)];
    const singlePointCurve = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      singlePointCurve,
      5,
      OffsetJoinType.MITER,
      1e-3
    );

    expect(result.success).toBe(false);
  });

  test('should handle zero offset distance', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      baseline,
      0,
      OffsetJoinType.MITER,
      1e-3
    );

    expect(result.success).toBe(false);
  });

  test('should handle negative tolerance', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      baseline,
      5,
      OffsetJoinType.MITER,
      -1e-3 // Negative tolerance
    );

    expect(result.success).toBe(false);
  });

  test('should use different join types', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0),
      new BIMPointImpl(10, 10)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    // Test miter join
    const miterResult = offsetEngine.offsetCurve(
      baseline,
      3,
      OffsetJoinType.MITER,
      1e-3
    );
    expect(miterResult.joinType).toBe(OffsetJoinType.MITER);

    // Test bevel join
    const bevelResult = offsetEngine.offsetCurve(
      baseline,
      3,
      OffsetJoinType.BEVEL,
      1e-3
    );
    expect(bevelResult.joinType).toBe(OffsetJoinType.BEVEL);

    // Test round join
    const roundResult = offsetEngine.offsetCurve(
      baseline,
      3,
      OffsetJoinType.ROUND,
      1e-3
    );
    expect(roundResult.joinType).toBe(OffsetJoinType.ROUND);
  });

  test('should handle complex zigzag pattern', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(5, 5),
      new BIMPointImpl(10, 0),
      new BIMPointImpl(15, 5),
      new BIMPointImpl(20, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      baseline,
      2,
      OffsetJoinType.ROUND, // Use round for smooth curves
      1e-3
    );

    expect(result.success).toBe(true);
    expect(result.leftOffset).toBeDefined();
    expect(result.rightOffset).toBeDefined();
  });

  test('should preserve curve properties', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0),
      new BIMPointImpl(10, 10)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE, { isClosed: false });

    const result = offsetEngine.offsetCurve(
      baseline,
      3,
      OffsetJoinType.MITER,
      1e-3
    );

    expect(result.success).toBe(true);
    expect(result.leftOffset!.type).toBe(baseline.type);
    expect(result.rightOffset!.type).toBe(baseline.type);
    expect(result.leftOffset!.isClosed).toBe(baseline.isClosed);
    expect(result.rightOffset!.isClosed).toBe(baseline.isClosed);
  });

  test('should handle very small offset distances', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(100, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      baseline,
      0.001, // Very small offset
      OffsetJoinType.MITER,
      1e-6
    );

    // Should either succeed or fail gracefully
    if (result.success) {
      expect(result.leftOffset).toBeDefined();
      expect(result.rightOffset).toBeDefined();
    } else {
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  test('should handle very large offset distances', () => {
    const points = [
      new BIMPointImpl(0, 0),
      new BIMPointImpl(10, 0)
    ];
    const baseline = new CurveImpl(points, CurveType.POLYLINE);

    const result = offsetEngine.offsetCurve(
      baseline,
      1000, // Very large offset
      OffsetJoinType.MITER,
      1e-3
    );

    expect(result.success).toBe(true);
    expect(result.leftOffset).toBeDefined();
    expect(result.rightOffset).toBeDefined();
  });
});