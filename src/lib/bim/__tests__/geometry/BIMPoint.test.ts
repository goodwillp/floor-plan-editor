/**
 * Unit tests for BIMPoint implementation
 */

import { describe, test, expect } from 'vitest';
import { BIMPointImpl } from '../../geometry/BIMPoint';

describe('BIMPoint', () => {
  test('should create BIMPoint with default properties', () => {
    const point = new BIMPointImpl(10, 20);
    
    expect(point.x).toBe(10);
    expect(point.y).toBe(20);
    expect(point.tolerance).toBe(1e-6);
    expect(point.creationMethod).toBe('manual');
    expect(point.accuracy).toBe(1.0);
    expect(point.validated).toBe(false);
    expect(point.id).toBeDefined();
  });

  test('should create BIMPoint with custom properties', () => {
    const point = new BIMPointImpl(5, 15, {
      id: 'test-point',
      tolerance: 1e-3,
      creationMethod: 'calculation',
      accuracy: 0.95,
      validated: true
    });
    
    expect(point.id).toBe('test-point');
    expect(point.tolerance).toBe(1e-3);
    expect(point.creationMethod).toBe('calculation');
    expect(point.accuracy).toBe(0.95);
    expect(point.validated).toBe(true);
  });

  test('should calculate distance to another point', () => {
    const point1 = new BIMPointImpl(0, 0);
    const point2 = new BIMPointImpl(3, 4);
    
    expect(point1.distanceTo(point2)).toBe(5);
  });

  test('should check equality within tolerance', () => {
    const point1 = new BIMPointImpl(10, 20);
    const point2 = new BIMPointImpl(10.0000001, 20.0000001);
    const point3 = new BIMPointImpl(10.1, 20.1);
    
    expect(point1.equals(point2)).toBe(true);
    expect(point1.equals(point3)).toBe(false);
    expect(point1.equals(point3, 0.2)).toBe(true);
  });

  test('should create offset point', () => {
    const point = new BIMPointImpl(10, 20);
    const offset = point.offset(5, -3);
    
    expect(offset.x).toBe(15);
    expect(offset.y).toBe(17);
    expect(offset.creationMethod).toBe('offset');
  });

  test('should rotate point around origin', () => {
    const point = new BIMPointImpl(1, 0);
    const rotated = point.rotate(Math.PI / 2);
    
    expect(rotated.x).toBeCloseTo(0, 10);
    expect(rotated.y).toBeCloseTo(1, 10);
  });

  test('should rotate point around custom center', () => {
    const point = new BIMPointImpl(2, 1);
    const center = { x: 1, y: 1 };
    const rotated = point.rotate(Math.PI / 2, center);
    
    expect(rotated.x).toBeCloseTo(1, 10);
    expect(rotated.y).toBeCloseTo(2, 10);
  });

  test('should scale point from origin', () => {
    const point = new BIMPointImpl(2, 3);
    const scaled = point.scale(2);
    
    expect(scaled.x).toBe(4);
    expect(scaled.y).toBe(6);
    expect(scaled.tolerance).toBe(point.tolerance * 2);
  });

  test('should create from plain Point', () => {
    const plainPoint = { x: 5, y: 10 };
    const bimPoint = BIMPointImpl.fromPoint(plainPoint, {
      creationMethod: 'conversion'
    });
    
    expect(bimPoint.x).toBe(5);
    expect(bimPoint.y).toBe(10);
    expect(bimPoint.creationMethod).toBe('conversion');
  });

  test('should create array from plain Points', () => {
    const plainPoints = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    const bimPoints = BIMPointImpl.fromPoints(plainPoints);
    
    expect(bimPoints).toHaveLength(2);
    expect(bimPoints[0].x).toBe(1);
    expect(bimPoints[1].y).toBe(4);
  });
});