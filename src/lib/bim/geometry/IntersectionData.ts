/**
 * IntersectionData class for storing intersection metadata and resolved geometry
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { BIMPoint } from './BIMPoint';
import type { BIMPolygon } from './BIMPolygon';
import { IntersectionType } from '../types/BIMTypes';
import type { MiterCalculation } from '../types/GeometricTypes';

/**
 * Interface for intersection data storage and management
 */
export interface IntersectionData {
  id: string;
  type: IntersectionType;
  participatingWalls: string[];
  intersectionPoint: BIMPoint;
  
  // Geometric resolution data
  miterApex: BIMPoint | null;
  offsetIntersections: BIMPoint[];
  resolvedGeometry: BIMPolygon;
  
  // Quality and validation
  resolutionMethod: string;
  geometricAccuracy: number;
  validated: boolean;
  
  // Metadata
  createdAt: Date;
  lastModified: Date;
  processingTime: number;
  
  // Caching
  cached: boolean;
  cacheKey: string;
}

/**
 * Implementation of IntersectionData with validation and caching capabilities
 */
export class IntersectionDataImpl implements IntersectionData {
  public readonly id: string;
  public readonly type: IntersectionType;
  public readonly participatingWalls: string[];
  public readonly intersectionPoint: BIMPoint;
  public readonly miterApex: BIMPoint | null;
  public readonly offsetIntersections: BIMPoint[];
  public readonly resolvedGeometry: BIMPolygon;
  public readonly resolutionMethod: string;
  public readonly geometricAccuracy: number;
  public readonly validated: boolean;
  public readonly createdAt: Date;
  public readonly processingTime: number;
  
  private _lastModified: Date;
  private _cached: boolean;
  private _cacheKey: string;

  constructor(data: {
    id: string;
    type: IntersectionType;
    participatingWalls: string[];
    intersectionPoint: BIMPoint;
    miterApex: BIMPoint | null;
    offsetIntersections: BIMPoint[];
    resolvedGeometry: BIMPolygon;
    resolutionMethod: string;
    geometricAccuracy: number;
    validated: boolean;
    processingTime: number;
  }) {
    this.id = data.id;
    this.type = data.type;
    this.participatingWalls = [...data.participatingWalls];
    this.intersectionPoint = data.intersectionPoint;
    this.miterApex = data.miterApex;
    this.offsetIntersections = [...data.offsetIntersections];
    this.resolvedGeometry = data.resolvedGeometry;
    this.resolutionMethod = data.resolutionMethod;
    this.geometricAccuracy = data.geometricAccuracy;
    this.validated = data.validated;
    this.processingTime = data.processingTime;
    
    this.createdAt = new Date();
    this._lastModified = new Date();
    this._cached = false;
    this._cacheKey = this.generateCacheKey();
  }

  get lastModified(): Date {
    return this._lastModified;
  }

  get cached(): boolean {
    return this._cached;
  }

  get cacheKey(): string {
    return this._cacheKey;
  }

  /**
   * Generate a unique cache key for this intersection
   */
  private generateCacheKey(): string {
    const wallsKey = this.participatingWalls.sort().join('_');
    const typeKey = this.type;
    const pointKey = `${this.intersectionPoint.x.toFixed(6)}_${this.intersectionPoint.y.toFixed(6)}`;
    return `intersection_${wallsKey}_${typeKey}_${pointKey}`;
  }

  /**
   * Mark this intersection as cached
   */
  markAsCached(): void {
    this._cached = true;
    this._lastModified = new Date();
  }

  /**
   * Clear cache status
   */
  clearCache(): void {
    this._cached = false;
    this._lastModified = new Date();
  }

  /**
   * Validate the intersection data for consistency
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic data
    if (!this.id || this.id.trim() === '') {
      errors.push('Intersection ID cannot be empty');
    }

    if (this.participatingWalls.length < 2) {
      errors.push('Intersection must involve at least 2 walls');
    }

    if (this.geometricAccuracy < 0 || this.geometricAccuracy > 1) {
      errors.push('Geometric accuracy must be between 0 and 1');
    }

    // Validate geometric data
    if (!this.intersectionPoint) {
      errors.push('Intersection point is required');
    }

    if (this.offsetIntersections.length === 0) {
      warnings.push('No offset intersections defined');
    }

    // Validate resolution method
    const validMethods = [
      'miter_apex_calculation',
      'corner_geometry_calculation',
      'cross_junction_resolution',
      'parallel_overlap_resolution',
      'fallback_approximation'
    ];

    if (!validMethods.includes(this.resolutionMethod)) {
      warnings.push(`Unknown resolution method: ${this.resolutionMethod}`);
    }

    // Validate miter apex for junction types
    if ((this.type === IntersectionType.T_JUNCTION || this.type === IntersectionType.L_JUNCTION) && !this.miterApex) {
      warnings.push('Miter apex should be defined for T-junction and L-junction intersections');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: this.calculateQualityScore()
    };
  }

  /**
   * Calculate quality score based on various factors
   */
  private calculateQualityScore(): number {
    let score = this.geometricAccuracy;

    // Adjust based on validation status
    if (this.validated) {
      score += 0.1;
    }

    // Adjust based on resolution method
    if (this.resolutionMethod === 'miter_apex_calculation' || 
        this.resolutionMethod === 'corner_geometry_calculation') {
      score += 0.05;
    } else if (this.resolutionMethod === 'fallback_approximation') {
      score -= 0.1;
    }

    // Adjust based on processing time (faster is better for similar accuracy)
    if (this.processingTime < 10) {
      score += 0.02;
    } else if (this.processingTime > 100) {
      score -= 0.02;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Create a copy of this intersection with updated data
   */
  clone(updates: Partial<{
    type: IntersectionType;
    participatingWalls: string[];
    intersectionPoint: BIMPoint;
    miterApex: BIMPoint | null;
    offsetIntersections: BIMPoint[];
    resolvedGeometry: BIMPolygon;
    resolutionMethod: string;
    geometricAccuracy: number;
    validated: boolean;
  }>): IntersectionDataImpl {
    return new IntersectionDataImpl({
      id: this.id,
      type: updates.type ?? this.type,
      participatingWalls: updates.participatingWalls ?? this.participatingWalls,
      intersectionPoint: updates.intersectionPoint ?? this.intersectionPoint,
      miterApex: updates.miterApex ?? this.miterApex,
      offsetIntersections: updates.offsetIntersections ?? this.offsetIntersections,
      resolvedGeometry: updates.resolvedGeometry ?? this.resolvedGeometry,
      resolutionMethod: updates.resolutionMethod ?? this.resolutionMethod,
      geometricAccuracy: updates.geometricAccuracy ?? this.geometricAccuracy,
      validated: updates.validated ?? this.validated,
      processingTime: this.processingTime
    });
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      participatingWalls: this.participatingWalls,
      intersectionPoint: this.intersectionPoint,
      miterApex: this.miterApex,
      offsetIntersections: this.offsetIntersections,
      resolvedGeometry: this.resolvedGeometry,
      resolutionMethod: this.resolutionMethod,
      geometricAccuracy: this.geometricAccuracy,
      validated: this.validated,
      createdAt: this.createdAt.toISOString(),
      lastModified: this.lastModified.toISOString(),
      processingTime: this.processingTime,
      cached: this.cached,
      cacheKey: this.cacheKey
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: any): IntersectionDataImpl {
    const intersection = new IntersectionDataImpl({
      id: data.id,
      type: data.type,
      participatingWalls: data.participatingWalls,
      intersectionPoint: data.intersectionPoint,
      miterApex: data.miterApex,
      offsetIntersections: data.offsetIntersections,
      resolvedGeometry: data.resolvedGeometry,
      resolutionMethod: data.resolutionMethod,
      geometricAccuracy: data.geometricAccuracy,
      validated: data.validated,
      processingTime: data.processingTime
    });

    if (data.cached) {
      intersection.markAsCached();
    }

    return intersection;
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
}