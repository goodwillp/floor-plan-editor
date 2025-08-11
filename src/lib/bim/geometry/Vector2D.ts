/**
 * Enhanced 2D Vector with geometric operations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type { Point } from '../../types';

/**
 * 2D Vector interface with geometric operations
 */
export interface Vector2D {
  x: number;
  y: number;
  
  // Vector operations
  normalize(): Vector2D;
  dot(other: Vector2D): number;
  cross(other: Vector2D): number;
  angle(): number;
  rotate(angle: number): Vector2D;
}

/**
 * Vector2D implementation with comprehensive geometric operations
 */
export class Vector2DImpl implements Vector2D {
  public readonly x: number;
  public readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /**
   * Calculate the magnitude (length) of the vector
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Calculate the squared magnitude (for performance when comparing lengths)
   */
  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Normalize the vector to unit length
   */
  normalize(): Vector2DImpl {
    const mag = this.magnitude();
    if (mag < 1e-10) {
      return new Vector2DImpl(0, 0);
    }
    return new Vector2DImpl(this.x / mag, this.y / mag);
  }

  /**
   * Calculate dot product with another vector
   */
  dot(other: Vector2D): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Calculate cross product with another vector (returns scalar in 2D)
   */
  cross(other: Vector2D): number {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * Calculate the angle of the vector in radians
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Rotate the vector by the given angle in radians
   */
  rotate(angle: number): Vector2DImpl {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2DImpl(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /**
   * Add another vector to this vector
   */
  add(other: Vector2D): Vector2DImpl {
    return new Vector2DImpl(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another vector from this vector
   */
  subtract(other: Vector2D): Vector2DImpl {
    return new Vector2DImpl(this.x - other.x, this.y - other.y);
  }

  /**
   * Multiply the vector by a scalar
   */
  multiply(scalar: number): Vector2DImpl {
    return new Vector2DImpl(this.x * scalar, this.y * scalar);
  }

  /**
   * Divide the vector by a scalar
   */
  divide(scalar: number): Vector2DImpl {
    if (Math.abs(scalar) < 1e-10) {
      throw new Error('Division by zero or near-zero scalar');
    }
    return new Vector2DImpl(this.x / scalar, this.y / scalar);
  }

  /**
   * Calculate the angle between this vector and another vector
   */
  angleTo(other: Vector2D): number {
    const dot = this.dot(other);
    const mag1 = this.magnitude();
    const mag2 = Math.sqrt(other.x * other.x + other.y * other.y);
    
    if (mag1 < 1e-10 || mag2 < 1e-10) {
      return 0;
    }
    
    const cosAngle = dot / (mag1 * mag2);
    // Clamp to avoid floating point errors
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    return Math.acos(clampedCos);
  }

  /**
   * Get the perpendicular vector (rotated 90 degrees counter-clockwise)
   */
  perpendicular(): Vector2DImpl {
    return new Vector2DImpl(-this.y, this.x);
  }

  /**
   * Get the perpendicular vector (rotated 90 degrees clockwise)
   */
  perpendicularClockwise(): Vector2DImpl {
    return new Vector2DImpl(this.y, -this.x);
  }

  /**
   * Project this vector onto another vector
   */
  projectOnto(other: Vector2D): Vector2DImpl {
    const otherMagSq = other.x * other.x + other.y * other.y;
    if (otherMagSq < 1e-10) {
      return new Vector2DImpl(0, 0);
    }
    
    const scalar = this.dot(other) / otherMagSq;
    return new Vector2DImpl(other.x * scalar, other.y * scalar);
  }

  /**
   * Linear interpolation between this vector and another
   */
  lerp(other: Vector2D, t: number): Vector2DImpl {
    return new Vector2DImpl(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  /**
   * Check if this vector is equal to another within tolerance
   */
  equals(other: Vector2D, tolerance: number = 1e-6): boolean {
    return Math.abs(this.x - other.x) <= tolerance && 
           Math.abs(this.y - other.y) <= tolerance;
  }

  /**
   * Check if this vector is zero within tolerance
   */
  isZero(tolerance: number = 1e-6): boolean {
    return this.magnitude() <= tolerance;
  }

  /**
   * Convert to Point
   */
  toPoint(): Point {
    return { x: this.x, y: this.y };
  }

  /**
   * Create Vector2D from two points
   */
  static fromPoints(from: Point, to: Point): Vector2DImpl {
    return new Vector2DImpl(to.x - from.x, to.y - from.y);
  }

  /**
   * Create Vector2D from angle and magnitude
   */
  static fromAngle(angle: number, magnitude: number = 1): Vector2DImpl {
    return new Vector2DImpl(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude
    );
  }

  /**
   * Create zero vector
   */
  static zero(): Vector2DImpl {
    return new Vector2DImpl(0, 0);
  }

  /**
   * Create unit vector in X direction
   */
  static unitX(): Vector2DImpl {
    return new Vector2DImpl(1, 0);
  }

  /**
   * Create unit vector in Y direction
   */
  static unitY(): Vector2DImpl {
    return new Vector2DImpl(0, 1);
  }
}