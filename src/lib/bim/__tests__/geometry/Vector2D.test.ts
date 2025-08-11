/**
 * Unit tests for Vector2D implementation
 */

import { describe, test, expect } from 'vitest';
import { Vector2DImpl } from '../../geometry/Vector2D';

describe('Vector2D', () => {
  test('should create vector with coordinates', () => {
    const vector = new Vector2DImpl(3, 4);
    
    expect(vector.x).toBe(3);
    expect(vector.y).toBe(4);
  });

  test('should calculate magnitude', () => {
    const vector = new Vector2DImpl(3, 4);
    
    expect(vector.magnitude()).toBe(5);
    expect(vector.magnitudeSquared()).toBe(25);
  });

  test('should normalize vector', () => {
    const vector = new Vector2DImpl(3, 4);
    const normalized = vector.normalize();
    
    expect(normalized.magnitude()).toBeCloseTo(1, 10);
    expect(normalized.x).toBeCloseTo(0.6, 10);
    expect(normalized.y).toBeCloseTo(0.8, 10);
  });

  test('should handle zero vector normalization', () => {
    const vector = new Vector2DImpl(0, 0);
    const normalized = vector.normalize();
    
    expect(normalized.x).toBe(0);
    expect(normalized.y).toBe(0);
  });

  test('should calculate dot product', () => {
    const v1 = new Vector2DImpl(2, 3);
    const v2 = new Vector2DImpl(4, 5);
    
    expect(v1.dot(v2)).toBe(23); // 2*4 + 3*5 = 23
  });

  test('should calculate cross product', () => {
    const v1 = new Vector2DImpl(2, 3);
    const v2 = new Vector2DImpl(4, 5);
    
    expect(v1.cross(v2)).toBe(-2); // 2*5 - 3*4 = -2
  });

  test('should calculate angle', () => {
    const v1 = new Vector2DImpl(1, 0);
    const v2 = new Vector2DImpl(0, 1);
    
    expect(v1.angle()).toBe(0);
    expect(v2.angle()).toBeCloseTo(Math.PI / 2, 10);
  });

  test('should rotate vector', () => {
    const vector = new Vector2DImpl(1, 0);
    const rotated = vector.rotate(Math.PI / 2);
    
    expect(rotated.x).toBeCloseTo(0, 10);
    expect(rotated.y).toBeCloseTo(1, 10);
  });

  test('should add vectors', () => {
    const v1 = new Vector2DImpl(2, 3);
    const v2 = new Vector2DImpl(4, 5);
    const sum = v1.add(v2);
    
    expect(sum.x).toBe(6);
    expect(sum.y).toBe(8);
  });

  test('should subtract vectors', () => {
    const v1 = new Vector2DImpl(5, 7);
    const v2 = new Vector2DImpl(2, 3);
    const diff = v1.subtract(v2);
    
    expect(diff.x).toBe(3);
    expect(diff.y).toBe(4);
  });

  test('should multiply by scalar', () => {
    const vector = new Vector2DImpl(2, 3);
    const scaled = vector.multiply(2.5);
    
    expect(scaled.x).toBe(5);
    expect(scaled.y).toBe(7.5);
  });

  test('should divide by scalar', () => {
    const vector = new Vector2DImpl(6, 8);
    const divided = vector.divide(2);
    
    expect(divided.x).toBe(3);
    expect(divided.y).toBe(4);
  });

  test('should throw error when dividing by zero', () => {
    const vector = new Vector2DImpl(1, 1);
    
    expect(() => vector.divide(0)).toThrow('Division by zero');
  });

  test('should calculate angle between vectors', () => {
    const v1 = new Vector2DImpl(1, 0);
    const v2 = new Vector2DImpl(0, 1);
    
    expect(v1.angleTo(v2)).toBeCloseTo(Math.PI / 2, 10);
  });

  test('should get perpendicular vectors', () => {
    const vector = new Vector2DImpl(3, 4);
    const perp = vector.perpendicular();
    const perpCW = vector.perpendicularClockwise();
    
    expect(perp.x).toBe(-4);
    expect(perp.y).toBe(3);
    expect(perpCW.x).toBe(4);
    expect(perpCW.y).toBe(-3);
  });

  test('should project onto another vector', () => {
    const v1 = new Vector2DImpl(3, 4);
    const v2 = new Vector2DImpl(1, 0);
    const projection = v1.projectOnto(v2);
    
    expect(projection.x).toBe(3);
    expect(projection.y).toBe(0);
  });

  test('should interpolate between vectors', () => {
    const v1 = new Vector2DImpl(0, 0);
    const v2 = new Vector2DImpl(10, 20);
    const lerp = v1.lerp(v2, 0.5);
    
    expect(lerp.x).toBe(5);
    expect(lerp.y).toBe(10);
  });

  test('should check equality within tolerance', () => {
    const v1 = new Vector2DImpl(1, 2);
    const v2 = new Vector2DImpl(1.0000001, 2.0000001);
    const v3 = new Vector2DImpl(1.1, 2.1);
    
    expect(v1.equals(v2)).toBe(true);
    expect(v1.equals(v3)).toBe(false);
    expect(v1.equals(v3, 0.2)).toBe(true);
  });

  test('should check if vector is zero', () => {
    const zero = new Vector2DImpl(0, 0);
    const nonZero = new Vector2DImpl(1e-5, 0);
    const almostZero = new Vector2DImpl(1e-8, 0);
    
    expect(zero.isZero()).toBe(true);
    expect(nonZero.isZero()).toBe(false);
    expect(almostZero.isZero()).toBe(true);
  });

  test('should create vector from points', () => {
    const from = { x: 1, y: 2 };
    const to = { x: 4, y: 6 };
    const vector = Vector2DImpl.fromPoints(from, to);
    
    expect(vector.x).toBe(3);
    expect(vector.y).toBe(4);
  });

  test('should create vector from angle', () => {
    const vector = Vector2DImpl.fromAngle(Math.PI / 2, 5);
    
    expect(vector.x).toBeCloseTo(0, 10);
    expect(vector.y).toBeCloseTo(5, 10);
  });

  test('should create unit vectors', () => {
    const unitX = Vector2DImpl.unitX();
    const unitY = Vector2DImpl.unitY();
    const zero = Vector2DImpl.zero();
    
    expect(unitX.x).toBe(1);
    expect(unitX.y).toBe(0);
    expect(unitY.x).toBe(0);
    expect(unitY.y).toBe(1);
    expect(zero.x).toBe(0);
    expect(zero.y).toBe(0);
  });
});