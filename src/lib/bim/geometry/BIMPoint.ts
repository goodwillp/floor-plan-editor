/**
 * Enhanced Point with BIM metadata and geometric operations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type { Point } from '../../types';

/**
 * Enhanced Point interface with BIM-specific properties
 */
export interface BIMPoint extends Point {
  id: string;
  tolerance: number;
  creationMethod: string;
  accuracy: number;
  validated: boolean;

  // Geometric operations
  distanceTo(other: Point): number;
  equals(other: Point, tolerance?: number): boolean;
  offset(dx: number, dy: number): BIMPoint;
  rotate(angle: number, center?: Point): BIMPoint;
  scale(factor: number, center?: Point): BIMPoint;
  toPoint(): Point;
}

/**
 * BIMPoint implementation with geometric operations
 */
export class BIMPointImpl implements BIMPoint {
  public readonly id: string;
  public readonly x: number;
  public readonly y: number;
  public readonly tolerance: number;
  public readonly creationMethod: string;
  public readonly accuracy: number;
  public validated: boolean;

  constructor(
    x: number,
    y: number,
    options: {
      id?: string;
      tolerance?: number;
      creationMethod?: string;
      accuracy?: number;
      validated?: boolean;
    } = {}
  ) {
    this.id = options.id || this.generateId();
    this.x = x;
    this.y = y;
    this.tolerance = options.tolerance || 1e-6;
    this.creationMethod = options.creationMethod || 'manual';
    this.accuracy = options.accuracy || 1.0;
    this.validated = options.validated || false;
  }

  /**
   * Calculate distance to another point
   */
  distanceTo(other: Point): number {
    return Math.sqrt(Math.pow(other.x - this.x, 2) + Math.pow(other.y - this.y, 2));
  }

  /**
   * Check if this point is equal to another within tolerance
   */
  equals(other: Point, tolerance?: number): boolean {
    const tol = tolerance || this.tolerance;
    return this.distanceTo(other) <= tol;
  }

  /**
   * Create a new point offset by the given vector
   */
  offset(dx: number, dy: number): BIMPointImpl {
    return new BIMPointImpl(this.x + dx, this.y + dy, {
      tolerance: this.tolerance,
      creationMethod: 'offset',
      accuracy: this.accuracy,
      validated: false
    });
  }

  /**
   * Create a new point rotated around the origin
   */
  rotate(angle: number, center?: Point): BIMPointImpl {
    const cx = center?.x || 0;
    const cy = center?.y || 0;
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const dx = this.x - cx;
    const dy = this.y - cy;
    
    const newX = cx + dx * cos - dy * sin;
    const newY = cy + dx * sin + dy * cos;
    
    return new BIMPointImpl(newX, newY, {
      tolerance: this.tolerance,
      creationMethod: 'rotation',
      accuracy: this.accuracy,
      validated: false
    });
  }

  /**
   * Create a new point scaled from the origin
   */
  scale(factor: number, center?: Point): BIMPointImpl {
    const cx = center?.x || 0;
    const cy = center?.y || 0;
    
    const newX = cx + (this.x - cx) * factor;
    const newY = cy + (this.y - cy) * factor;
    
    return new BIMPointImpl(newX, newY, {
      tolerance: this.tolerance * factor,
      creationMethod: 'scaling',
      accuracy: this.accuracy,
      validated: false
    });
  }

  /**
   * Convert to plain Point object
   */
  toPoint(): Point {
    return { x: this.x, y: this.y };
  }

  /**
   * Create a copy with updated properties
   */
  withProperties(updates: Partial<{
    tolerance: number;
    creationMethod: string;
    accuracy: number;
    validated: boolean;
  }>): BIMPointImpl {
    return new BIMPointImpl(this.x, this.y, {
      id: this.id,
      tolerance: updates.tolerance ?? this.tolerance,
      creationMethod: updates.creationMethod ?? this.creationMethod,
      accuracy: updates.accuracy ?? this.accuracy,
      validated: updates.validated ?? this.validated
    });
  }

  /**
   * Generate a unique ID for the point
   */
  private generateId(): string {
    return `bim_point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create BIMPoint from plain Point
   */
  static fromPoint(point: Point, options?: {
    id?: string;
    tolerance?: number;
    creationMethod?: string;
    accuracy?: number;
    validated?: boolean;
  }): BIMPointImpl {
    return new BIMPointImpl(point.x, point.y, options);
  }

  /**
   * Create BIMPoint array from Point array
   */
  static fromPoints(points: Point[], options?: {
    tolerance?: number;
    creationMethod?: string;
    accuracy?: number;
    validated?: boolean;
  }): BIMPointImpl[] {
    return points.map(point => BIMPointImpl.fromPoint(point, options));
  }
}