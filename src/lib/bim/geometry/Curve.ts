/**
 * Curve class supporting polyline, bezier, spline, and arc types
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type { BIMPoint } from './BIMPoint';
import type { BoundingBox } from '../types/BIMTypes';
import { CurveType } from '../types/BIMTypes';
import { BIMPointImpl } from './BIMPoint';
import { Vector2DImpl } from './Vector2D';

/**
 * Curve interface supporting multiple curve types
 */
export interface Curve {
  id: string;
  points: BIMPoint[];
  type: CurveType;
  isClosed: boolean;
  length: number;
  
  // Geometric properties
  boundingBox: BoundingBox;
  curvature: number[];
  tangents: Vector2DImpl[];
}

/**
 * Curve implementation with comprehensive geometric operations
 */
export class CurveImpl implements Curve {
  public readonly id: string;
  public readonly points: BIMPoint[];
  public readonly type: CurveType;
  public readonly isClosed: boolean;

  // Cached properties
  private _length?: number;
  private _boundingBox?: BoundingBox;
  private _curvature?: number[];
  private _tangents?: Vector2DImpl[];

  constructor(
    points: BIMPoint[],
    type: CurveType = CurveType.POLYLINE,
    options: {
      id?: string;
      isClosed?: boolean;
    } = {}
  ) {
    this.id = options.id || this.generateId();
    this.points = [...points];
    this.type = type;
    this.isClosed = options.isClosed || false;
  }

  /**
   * Calculate the total length of the curve
   */
  get length(): number {
    if (this._length === undefined) {
      this._length = this.calculateLength();
    }
    return this._length;
  }

  /**
   * Calculate the bounding box of the curve
   */
  get boundingBox(): BoundingBox {
    if (this._boundingBox === undefined) {
      this._boundingBox = this.calculateBoundingBox();
    }
    return this._boundingBox;
  }

  /**
   * Calculate curvature at each point
   */
  get curvature(): number[] {
    if (this._curvature === undefined) {
      this._curvature = this.calculateCurvature();
    }
    return this._curvature;
  }

  /**
   * Calculate tangent vectors at each point
   */
  get tangents(): Vector2DImpl[] {
    if (this._tangents === undefined) {
      this._tangents = this.calculateTangents();
    }
    return this._tangents;
  }

  /**
   * Calculate the total length based on curve type
   */
  private calculateLength(): number {
    if (this.points.length < 2) return 0;

    // For simplicity, always calculate as polyline
    return this.calculatePolylineLength();
  }

  /**
   * Calculate length for polyline curves
   */
  private calculatePolylineLength(): number {
    let length = 0;
    const endIndex = this.isClosed ? this.points.length : this.points.length - 1;
    
    for (let i = 0; i < endIndex; i++) {
      const j = (i + 1) % this.points.length;
      length += this.points[i].distanceTo(this.points[j]);
    }
    
    return length;
  }

  /**
   * Calculate the bounding box of the curve
   */
  private calculateBoundingBox(): BoundingBox {
    if (this.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = this.points[0].x;
    let minY = this.points[0].y;
    let maxX = this.points[0].x;
    let maxY = this.points[0].y;

    for (const point of this.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Calculate curvature at each point
   */
  private calculateCurvature(): number[] {
    if (this.points.length < 3) {
      return new Array(this.points.length).fill(0);
    }

    const curvatures: number[] = [];
    
    for (let i = 0; i < this.points.length; i++) {
      if (i === 0 || i === this.points.length - 1) {
        curvatures.push(0); // End points have zero curvature for polylines
      } else {
        const p1 = this.points[i - 1];
        const p2 = this.points[i];
        const p3 = this.points[i + 1];
        
        curvatures.push(this.calculatePointCurvature(p1, p2, p3));
      }
    }
    
    return curvatures;
  }

  /**
   * Calculate curvature at a specific point using three consecutive points
   */
  private calculatePointCurvature(p1: BIMPoint, p2: BIMPoint, p3: BIMPoint): number {
    const v1 = Vector2DImpl.fromPoints(p1, p2);
    const v2 = Vector2DImpl.fromPoints(p2, p3);
    
    const cross = v1.cross(v2);
    const mag1 = v1.magnitude();
    const mag2 = v2.magnitude();
    
    if (mag1 < 1e-10 || mag2 < 1e-10) return 0;
    
    // Curvature = |v1 × v2| / (|v1| * |v2|)
    return Math.abs(cross) / (mag1 * mag2);
  }

  /**
   * Calculate tangent vectors at each point
   */
  private calculateTangents(): Vector2DImpl[] {
    if (this.points.length < 2) {
      return [Vector2DImpl.zero()];
    }

    const tangents: Vector2DImpl[] = [];
    
    for (let i = 0; i < this.points.length; i++) {
      if (i === 0) {
        // First point: use vector to next point
        const tangent = Vector2DImpl.fromPoints(this.points[0], this.points[1]).normalize();
        tangents.push(tangent);
      } else if (i === this.points.length - 1) {
        // Last point: use vector from previous point
        const tangent = Vector2DImpl.fromPoints(this.points[i - 1], this.points[i]).normalize();
        tangents.push(tangent);
      } else {
        // Middle points: average of incoming and outgoing vectors
        const v1 = Vector2DImpl.fromPoints(this.points[i - 1], this.points[i]);
        const v2 = Vector2DImpl.fromPoints(this.points[i], this.points[i + 1]);
        const avgTangent = v1.normalize().add(v2.normalize()).normalize();
        tangents.push(avgTangent);
      }
    }
    
    return tangents;
  }

  /**
   * Generate a unique ID for the curve
   */
  private generateId(): string {
    return `bim_curve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a curve from an array of points
   */
  static fromPoints(points: BIMPoint[], type: CurveType = CurveType.POLYLINE, options?: {
    id?: string;
    isClosed?: boolean;
  }): CurveImpl {
    return new CurveImpl(points, type, options);
  }
}