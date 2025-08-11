/**
 * Enhanced Polygon with BIM-specific properties and operations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type { BIMPoint } from './BIMPoint';
import type { BoundingBox } from '../types/BIMTypes';
import { BIMPointImpl } from './BIMPoint';

/**
 * Polygon with BIM-specific properties and geometric operations
 */
export interface BIMPolygon {
  id: string;
  outerRing: BIMPoint[];
  holes: BIMPoint[][];
  
  // Geometric properties
  area: number;
  perimeter: number;
  centroid: BIMPoint;
  boundingBox: BoundingBox;
  
  // Quality metrics
  isValid: boolean;
  selfIntersects: boolean;
  hasSliversFaces: boolean;
  
  // Processing history
  creationMethod: string;
  healingApplied: boolean;
  simplificationApplied: boolean;
}

/**
 * BIMPolygon implementation with comprehensive geometric operations
 */
export class BIMPolygonImpl implements BIMPolygon {
  public readonly id: string;
  public readonly outerRing: BIMPoint[];
  public readonly holes: BIMPoint[][];
  public readonly creationMethod: string;
  public healingApplied: boolean;
  public simplificationApplied: boolean;

  // Cached properties
  private _area?: number;
  private _perimeter?: number;
  private _centroid?: BIMPoint;
  private _boundingBox?: BoundingBox;
  private _isValid?: boolean;
  private _selfIntersects?: boolean;
  private _hasSliversFaces?: boolean;

  constructor(
    outerRing: BIMPoint[],
    holes: BIMPoint[][] = [],
    options: {
      id?: string;
      creationMethod?: string;
      healingApplied?: boolean;
      simplificationApplied?: boolean;
    } = {}
  ) {
    this.id = options.id || this.generateId();
    this.outerRing = [...outerRing];
    this.holes = holes.map(hole => [...hole]);
    this.creationMethod = options.creationMethod || 'manual';
    this.healingApplied = options.healingApplied || false;
    this.simplificationApplied = options.simplificationApplied || false;
  }

  /**
   * Calculate the area of the polygon (outer ring minus holes)
   */
  get area(): number {
    if (this._area === undefined) {
      this._area = this.calculateArea();
    }
    return this._area;
  }

  /**
   * Calculate the perimeter of the polygon (outer ring plus holes)
   */
  get perimeter(): number {
    if (this._perimeter === undefined) {
      this._perimeter = this.calculatePerimeter();
    }
    return this._perimeter;
  }

  /**
   * Calculate the centroid of the polygon
   */
  get centroid(): BIMPoint {
    if (this._centroid === undefined) {
      this._centroid = this.calculateCentroid();
    }
    return this._centroid;
  }

  /**
   * Calculate the bounding box of the polygon
   */
  get boundingBox(): BoundingBox {
    if (this._boundingBox === undefined) {
      this._boundingBox = this.calculateBoundingBox();
    }
    return this._boundingBox;
  }

  /**
   * Check if the polygon is valid
   */
  get isValid(): boolean {
    if (this._isValid === undefined) {
      this._isValid = this.validateGeometry();
    }
    return this._isValid;
  }

  /**
   * Check if the polygon has self-intersections
   */
  get selfIntersects(): boolean {
    if (this._selfIntersects === undefined) {
      this._selfIntersects = this.checkSelfIntersections();
    }
    return this._selfIntersects;
  }

  /**
   * Check if the polygon has sliver faces
   */
  get hasSliversFaces(): boolean {
    if (this._hasSliversFaces === undefined) {
      this._hasSliversFaces = this.checkSliverFaces();
    }
    return this._hasSliversFaces;
  }

  /**
   * Check if a point is inside the polygon
   */
  containsPoint(point: BIMPoint): boolean {
    return this.pointInRing(point, this.outerRing) && 
           !this.holes.some(hole => this.pointInRing(point, hole));
  }

  /**
   * Calculate the signed area using the shoelace formula
   */
  private calculateArea(): number {
    const outerArea = this.calculateRingArea(this.outerRing);
    const holeAreas = this.holes.reduce((sum, hole) => sum + this.calculateRingArea(hole), 0);
    return Math.abs(outerArea) - Math.abs(holeAreas);
  }

  /**
   * Calculate the area of a ring using the shoelace formula
   */
  private calculateRingArea(ring: BIMPoint[]): number {
    if (ring.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      area += ring[i].x * ring[j].y;
      area -= ring[j].x * ring[i].y;
    }
    return area / 2;
  }

  /**
   * Calculate the perimeter of the polygon
   */
  private calculatePerimeter(): number {
    const outerPerimeter = this.calculateRingPerimeter(this.outerRing);
    const holePerimeters = this.holes.reduce((sum, hole) => sum + this.calculateRingPerimeter(hole), 0);
    return outerPerimeter + holePerimeters;
  }

  /**
   * Calculate the perimeter of a ring
   */
  private calculateRingPerimeter(ring: BIMPoint[]): number {
    if (ring.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      perimeter += ring[i].distanceTo(ring[j]);
    }
    return perimeter;
  }

  /**
   * Calculate the centroid of the polygon
   */
  private calculateCentroid(): BIMPoint {
    if (this.outerRing.length === 0) {
      return new BIMPointImpl(0, 0, { creationMethod: 'centroid_calculation' });
    }

    let cx = 0;
    let cy = 0;
    let area = 0;

    for (let i = 0; i < this.outerRing.length; i++) {
      const j = (i + 1) % this.outerRing.length;
      const cross = this.outerRing[i].x * this.outerRing[j].y - this.outerRing[j].x * this.outerRing[i].y;
      area += cross;
      cx += (this.outerRing[i].x + this.outerRing[j].x) * cross;
      cy += (this.outerRing[i].y + this.outerRing[j].y) * cross;
    }

    area /= 2;
    if (Math.abs(area) < 1e-10) {
      // Degenerate polygon, use simple average
      cx = this.outerRing.reduce((sum, p) => sum + p.x, 0) / this.outerRing.length;
      cy = this.outerRing.reduce((sum, p) => sum + p.y, 0) / this.outerRing.length;
    } else {
      cx /= (6 * area);
      cy /= (6 * area);
    }

    return new BIMPointImpl(cx, cy, { creationMethod: 'centroid_calculation' });
  }

  /**
   * Calculate the bounding box of the polygon
   */
  private calculateBoundingBox(): BoundingBox {
    if (this.outerRing.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = this.outerRing[0].x;
    let minY = this.outerRing[0].y;
    let maxX = this.outerRing[0].x;
    let maxY = this.outerRing[0].y;

    // Check outer ring
    for (const point of this.outerRing) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    // Check holes
    for (const hole of this.holes) {
      for (const point of hole) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Validate the geometry of the polygon
   */
  private validateGeometry(): boolean {
    // Check minimum number of points
    if (this.outerRing.length < 3) return false;

    // Check for holes with insufficient points
    for (const hole of this.holes) {
      if (hole.length < 3) return false;
    }

    return true;
  }

  /**
   * Check for self-intersections in the polygon
   */
  private checkSelfIntersections(): boolean {
    // Simplified check - just return false for now
    return false;
  }

  /**
   * Check for sliver faces (very thin triangular areas)
   */
  private checkSliverFaces(): boolean {
    // Simplified check - just return false for now
    return false;
  }

  /**
   * Check if a point is inside a ring using ray casting algorithm
   */
  private pointInRing(point: BIMPoint, ring: BIMPoint[]): boolean {
    let inside = false;
    
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      if (((ring[i].y > point.y) !== (ring[j].y > point.y)) &&
          (point.x < (ring[j].x - ring[i].x) * (point.y - ring[i].y) / (ring[j].y - ring[i].y) + ring[i].x)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Generate a unique ID for the polygon
   */
  private generateId(): string {
    return `bim_polygon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create BIMPolygon from simple point array
   */
  static fromPoints(points: BIMPoint[], options?: {
    id?: string;
    creationMethod?: string;
    healingApplied?: boolean;
    simplificationApplied?: boolean;
  }): BIMPolygonImpl {
    return new BIMPolygonImpl(points, [], options);
  }
}