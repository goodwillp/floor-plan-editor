/**
 * Basic test to verify BIM module structure
 */

import { describe, test, expect } from 'vitest';
import { BIMPointImpl } from '../geometry/BIMPoint';

describe('BIM Basic Tests', () => {
  test('should create BIMPoint', () => {
    const point = new BIMPointImpl(10, 20);
    
    expect(point.x).toBe(10);
    expect(point.y).toBe(20);
    expect(point.id).toBeDefined();
  });

  test('should calculate distance between points', () => {
    const point1 = new BIMPointImpl(0, 0);
    const point2 = new BIMPointImpl(3, 4);
    
    expect(point1.distanceTo(point2)).toBe(5);
  });
});