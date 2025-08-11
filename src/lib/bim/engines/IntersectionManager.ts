/**
 * IntersectionManager class for comprehensive intersection data management
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { IntersectionData } from '../geometry/IntersectionData';
import { IntersectionDataImpl } from '../geometry/IntersectionData';
import type { MiterCalculation } from '../geometry/MiterCalculation';
import { MiterCalculationEngine } from '../geometry/MiterCalculation';
import { IntersectionCache } from './IntersectionCache';
import type { WallSolid } from '../geometry/WallSolid';
import type { BIMPoint } from '../geometry/BIMPoint';
import { IntersectionType, GeometricErrorType, ErrorSeverity } from '../types/BIMTypes';
import { GeometricError } from '../validation/GeometricError';

/**
 * Configuration for intersection management
 */
export interface IntersectionManagerConfig {
  enableCaching: boolean;
  cacheConfig: {
    maxEntries: number;
    maxMemoryMB: number;
    ttlMinutes: number;
  };
  tolerance: number;
  miterLimit: number;
  enableValidation: boolean;
  enableQualityAssessment: boolean;
}

/**
 * Result of intersection validation
 */
export interface IntersectionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
  recommendations: string[];
}

/**
 * Quality assessment result
 */
export interface QualityAssessmentResult {
  overallScore: number;
  geometricAccuracy: number;
  topologicalConsistency: number;
  manufacturability: number;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
}

/**
 * Comprehensive intersection data management system
 */
export class IntersectionManager {
  private readonly cache: IntersectionCache;
  private readonly miterEngine: MiterCalculationEngine;
  private readonly config: IntersectionManagerConfig;
  private readonly intersectionRegistry = new Map<string, IntersectionData>();

  constructor(config: Partial<IntersectionManagerConfig> = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      cacheConfig: {
        maxEntries: config.cacheConfig?.maxEntries || 500,
        maxMemoryMB: config.cacheConfig?.maxMemoryMB || 25,
        ttlMinutes: config.cacheConfig?.ttlMinutes || 30
      },
      tolerance: config.tolerance || 1e-6,
      miterLimit: config.miterLimit || 10.0,
      enableValidation: config.enableValidation ?? true,
      enableQualityAssessment: config.enableQualityAssessment ?? true
    };

    this.cache = new IntersectionCache(this.config.cacheConfig);
    this.miterEngine = new MiterCalculationEngine({
      tolerance: this.config.tolerance,
      miterLimit: this.config.miterLimit
    });
  }

  /**
   * Create and store intersection data
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async createIntersection(
    id: string,
    type: IntersectionType,
    participatingWalls: WallSolid[],
    intersectionPoint: BIMPoint,
    options: {
      computeMiterApex?: boolean;
      resolutionMethod?: string;
      skipValidation?: boolean;
    } = {}
  ): Promise<IntersectionData> {
    const startTime = performance.now();

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = this.cache.generateIntersectionKey(
          participatingWalls.map(w => w.id),
          type,
          intersectionPoint,
          this.config.tolerance
        );

        const cached = this.cache.getIntersection(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Validate input
      if (participatingWalls.length < 2) {
        throw new GeometricError(
          GeometricErrorType.DEGENERATE_GEOMETRY,
          'Intersection requires at least 2 walls',
          {
            severity: ErrorSeverity.ERROR,
            operation: 'createIntersection',
            input: { id, type, participatingWalls, intersectionPoint },
            suggestedFix: 'Provide at least 2 walls for intersection creation',
            recoverable: false
          }
        );
      }

      // Calculate offset intersections
      const offsetIntersections = await this.calculateOffsetIntersections(
        participatingWalls,
        intersectionPoint,
        type
      );

      // Compute miter apex if requested
      let miterApex: BIMPoint | null = null;
      if (options.computeMiterApex && offsetIntersections.length >= 2) {
        const miterCalculation = await this.computeMiterApex(
          offsetIntersections[0],
          offsetIntersections[1],
          intersectionPoint,
          participatingWalls[0].thickness
        );
        miterApex = miterCalculation.apex;
      }

      // Create resolved geometry (simplified for now)
      const resolvedGeometry = participatingWalls[0].solidGeometry[0];

      // Create intersection data
      const intersection = new IntersectionDataImpl({
        id,
        type,
        participatingWalls: participatingWalls.map(w => w.id),
        intersectionPoint,
        miterApex,
        offsetIntersections,
        resolvedGeometry,
        resolutionMethod: options.resolutionMethod || 'standard_intersection',
        geometricAccuracy: this.calculateGeometricAccuracy(offsetIntersections, miterApex),
        validated: false,
        processingTime: performance.now() - startTime
      });

      // Validate if enabled
      if (this.config.enableValidation && !options.skipValidation) {
        const validationResult = intersection.validate();
        if (!validationResult.isValid) {
          throw new GeometricError(
            GeometricErrorType.DEGENERATE_GEOMETRY,
            `Intersection validation failed: ${validationResult.errors.join(', ')}`,
            {
              severity: ErrorSeverity.ERROR,
              operation: 'createIntersection',
              input: { intersection },
              suggestedFix: 'Fix geometric issues and retry intersection creation',
              recoverable: true
            }
          );
        }
      }

      // Store in registry
      this.intersectionRegistry.set(id, intersection);

      // Cache if enabled
      if (this.config.enableCaching) {
        const cacheKey = this.cache.generateIntersectionKey(
          participatingWalls.map(w => w.id),
          type,
          intersectionPoint,
          this.config.tolerance
        );
        this.cache.cacheIntersection(cacheKey, intersection);
      }

      return intersection;

    } catch (error) {
      if (error instanceof GeometricError) {
        throw error;
      }

      throw new GeometricError(
        GeometricErrorType.BOOLEAN_FAILURE,
        `Failed to create intersection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          severity: ErrorSeverity.ERROR,
          operation: 'createIntersection',
          input: { id, type, participatingWalls, intersectionPoint },
          suggestedFix: 'Check input parameters and geometry validity',
          recoverable: true
        }
      );
    }
  }

  /**
   * Retrieve intersection data by ID
   */
  getIntersection(id: string): IntersectionData | null {
    return this.intersectionRegistry.get(id) || null;
  }

  /**
   * Find intersections involving specific walls
   */
  findIntersectionsByWalls(wallIds: string[]): IntersectionData[] {
    const results: IntersectionData[] = [];
    
    for (const intersection of this.intersectionRegistry.values()) {
      const hasCommonWall = wallIds.some(wallId => 
        intersection.participatingWalls.includes(wallId)
      );
      
      if (hasCommonWall) {
        results.push(intersection);
      }
    }
    
    return results;
  }

  /**
   * Find intersections by type
   */
  findIntersectionsByType(type: IntersectionType): IntersectionData[] {
    const results: IntersectionData[] = [];
    
    for (const intersection of this.intersectionRegistry.values()) {
      if (intersection.type === type) {
        results.push(intersection);
      }
    }
    
    return results;
  }

  /**
   * Compute miter apex for intersection
   */
  async computeMiterApex(
    leftIntersection: BIMPoint,
    rightIntersection: BIMPoint,
    baselinePoint: BIMPoint,
    wallThickness: number
  ): Promise<MiterCalculation> {
    // Check cache first
    if (this.config.enableCaching) {
      const cacheKey = this.cache.generateMiterKey(
        leftIntersection,
        rightIntersection,
        baselinePoint,
        wallThickness,
        this.config.tolerance
      );

      const cached = this.cache.getMiterCalculation(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Compute miter apex
    const miterCalculation = this.miterEngine.computeMiterApex(
      leftIntersection,
      rightIntersection,
      baselinePoint,
      wallThickness
    );

    // Cache result
    if (this.config.enableCaching) {
      const cacheKey = this.cache.generateMiterKey(
        leftIntersection,
        rightIntersection,
        baselinePoint,
        wallThickness,
        this.config.tolerance
      );
      this.cache.cacheMiterCalculation(cacheKey, miterCalculation);
    }

    return miterCalculation;
  }

  /**
   * Validate intersection data
   */
  validateIntersection(intersection: IntersectionData): IntersectionValidationResult {
    if (!this.config.enableValidation) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        qualityScore: 1.0,
        recommendations: []
      };
    }

    const validationResult = intersection.validate();
    const recommendations: string[] = [];

    // Add specific recommendations based on validation results
    if (validationResult.errors.length > 0) {
      recommendations.push('Fix geometric errors before using this intersection');
    }

    if (validationResult.warnings.length > 0) {
      recommendations.push('Consider addressing warnings to improve intersection quality');
    }

    if (intersection.geometricAccuracy < 0.8) {
      recommendations.push('Low geometric accuracy detected - consider using higher precision methods');
    }

    if (!intersection.validated) {
      recommendations.push('Intersection has not been validated - run validation before use');
    }

    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      qualityScore: validationResult.qualityScore,
      recommendations
    };
  }

  /**
   * Assess quality of intersection
   */
  assessIntersectionQuality(intersection: IntersectionData): QualityAssessmentResult {
    if (!this.config.enableQualityAssessment) {
      return {
        overallScore: 1.0,
        geometricAccuracy: 1.0,
        topologicalConsistency: 1.0,
        manufacturability: 1.0,
        issues: []
      };
    }

    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      suggestion: string;
    }> = [];

    // Assess geometric accuracy
    let geometricAccuracy = intersection.geometricAccuracy;
    if (geometricAccuracy < 0.7) {
      issues.push({
        type: 'geometric_accuracy',
        severity: 'high',
        description: 'Low geometric accuracy detected',
        suggestion: 'Use higher precision calculation methods or adjust tolerance'
      });
    } else if (geometricAccuracy < 0.9) {
      issues.push({
        type: 'geometric_accuracy',
        severity: 'medium',
        description: 'Moderate geometric accuracy',
        suggestion: 'Consider using more precise calculation methods'
      });
    }

    // Assess topological consistency
    let topologicalConsistency = 1.0;
    if (intersection.offsetIntersections.length < 2) {
      topologicalConsistency -= 0.3;
      issues.push({
        type: 'topological_consistency',
        severity: 'medium',
        description: 'Insufficient offset intersections',
        suggestion: 'Ensure proper offset line calculations'
      });
    }

    // Assess manufacturability
    let manufacturability = 1.0;
    if (intersection.miterApex && intersection.type === IntersectionType.T_JUNCTION) {
      // Check if miter apex is reasonable
      const distance = Math.sqrt(
        Math.pow(intersection.miterApex.x - intersection.intersectionPoint.x, 2) +
        Math.pow(intersection.miterApex.y - intersection.intersectionPoint.y, 2)
      );
      
      if (distance > 100) { // Arbitrary threshold
        manufacturability -= 0.2;
        issues.push({
          type: 'manufacturability',
          severity: 'low',
          description: 'Miter apex is far from intersection point',
          suggestion: 'Consider using bevel or round join instead of miter'
        });
      }
    }

    const overallScore = (geometricAccuracy + topologicalConsistency + manufacturability) / 3;

    return {
      overallScore,
      geometricAccuracy,
      topologicalConsistency,
      manufacturability,
      issues
    };
  }

  /**
   * Update intersection data
   */
  updateIntersection(id: string, updates: Partial<IntersectionData>): IntersectionData | null {
    const existing = this.intersectionRegistry.get(id);
    if (!existing) {
      return null;
    }

    // Create updated intersection (assuming IntersectionDataImpl has a clone method)
    const updated = (existing as IntersectionDataImpl).clone(updates);
    
    // Update registry
    this.intersectionRegistry.set(id, updated);

    // Clear cache for this intersection
    if (this.config.enableCaching) {
      updated.clearCache();
    }

    return updated;
  }

  /**
   * Remove intersection data
   */
  removeIntersection(id: string): boolean {
    return this.intersectionRegistry.delete(id);
  }

  /**
   * Get all intersections
   */
  getAllIntersections(): IntersectionData[] {
    return Array.from(this.intersectionRegistry.values());
  }

  /**
   * Clear all intersection data
   */
  clear(): void {
    this.intersectionRegistry.clear();
    if (this.config.enableCaching) {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return this.cache.getStatistics();
  }

  /**
   * Optimize cache performance
   */
  optimizeCache(): number {
    return this.cache.optimize();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clear();
    this.cache.dispose();
  }

  /**
   * Calculate offset intersections for walls
   */
  private async calculateOffsetIntersections(
    walls: WallSolid[],
    intersectionPoint: BIMPoint,
    type: IntersectionType
  ): Promise<BIMPoint[]> {
    const offsetIntersections: BIMPoint[] = [];

    // This is a simplified implementation
    // In a full implementation, this would calculate actual offset line intersections
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      const halfThickness = wall.thickness / 2;

      // Create approximate offset intersections
      const leftOffset: BIMPoint = {
        x: intersectionPoint.x - halfThickness,
        y: intersectionPoint.y,
        id: `offset_left_${wall.id}_${Date.now()}`,
        tolerance: this.config.tolerance,
        creationMethod: 'approximate_offset',
        accuracy: 0.8,
        validated: false
      };

      const rightOffset: BIMPoint = {
        x: intersectionPoint.x + halfThickness,
        y: intersectionPoint.y,
        id: `offset_right_${wall.id}_${Date.now()}`,
        tolerance: this.config.tolerance,
        creationMethod: 'approximate_offset',
        accuracy: 0.8,
        validated: false
      };

      offsetIntersections.push(leftOffset, rightOffset);
    }

    return offsetIntersections;
  }

  /**
   * Calculate geometric accuracy based on offset intersections and miter apex
   */
  private calculateGeometricAccuracy(
    offsetIntersections: BIMPoint[],
    miterApex: BIMPoint | null
  ): number {
    let accuracy = 0.9; // Base accuracy

    // Reduce accuracy if we have few offset intersections
    if (offsetIntersections.length < 2) {
      accuracy -= 0.2;
    }

    // Reduce accuracy if no miter apex is computed
    if (!miterApex) {
      accuracy -= 0.1;
    }

    // Factor in individual point accuracies
    const avgPointAccuracy = offsetIntersections.reduce((sum, point) => sum + point.accuracy, 0) / offsetIntersections.length;
    accuracy = (accuracy + avgPointAccuracy) / 2;

    return Math.max(0, Math.min(1, accuracy));
  }
}