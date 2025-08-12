/**
 * Adaptive Tolerance Manager for dynamic tolerance calculations
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { ToleranceContext } from '../types/BIMTypes';
import type { ToleranceFailure } from '../types/BIMTypes';

/**
 * Tolerance calculation parameters
 */
interface ToleranceParameters {
  wallThickness: number;
  documentPrecision: number;
  localAngle: number;
  operationType: ToleranceContext;
  geometryComplexity?: number;
  curvature?: number;
}

/**
 * Tolerance bounds for safety
 */
interface ToleranceBounds {
  minimum: number;
  maximum: number;
  recommended: number;
}

/**
 * Tolerance calculation result
 */
interface ToleranceResult {
  value: number;
  confidence: number;
  reasoning: string;
  bounds: ToleranceBounds;
  adjustmentHistory: ToleranceAdjustment[];
}

/**
 * Tolerance adjustment record
 */
interface ToleranceAdjustment {
  timestamp: Date;
  originalValue: number;
  adjustedValue: number;
  reason: string;
  success: boolean;
}

/**
 * Adaptive Tolerance Manager implementation
 */
export class AdaptiveToleranceManager {
  private baseTolerance: number = 1e-6;
  private documentPrecision: number = 1e-3; // 1mm default
  private adjustmentHistory: Map<string, ToleranceAdjustment[]> = new Map();
  private toleranceCache: Map<string, ToleranceResult> = new Map();
  private maxCacheSize: number = 1000;

  // Tolerance scaling factors for different contexts
  private readonly contextScalingFactors: Record<ToleranceContext, number> = {
    [ToleranceContext.VERTEX_MERGE]: 2.0,
    [ToleranceContext.OFFSET_OPERATION]: 1.0,
    [ToleranceContext.BOOLEAN_OPERATION]: 1.5,
    [ToleranceContext.SHAPE_HEALING]: 3.0
  };

  // Angle-based scaling factors
  private readonly angleScalingFactors = {
    verySharp: 5.0,    // < 15 degrees
    sharp: 3.0,        // 15-30 degrees
    moderate: 1.5,     // 30-60 degrees
    gentle: 1.0,       // 60-120 degrees
    obtuse: 0.8        // > 120 degrees
  };

  constructor(options: {
    baseTolerance?: number;
    documentPrecision?: number;
    maxCacheSize?: number;
  } = {}) {
    this.baseTolerance = options.baseTolerance || 1e-6;
    this.documentPrecision = options.documentPrecision || 1e-3;
    this.maxCacheSize = options.maxCacheSize || 1000;
  }

  /**
   * Calculate tolerance based on context and parameters
   */
  calculateTolerance(
    wallThickness: number,
    documentPrecision: number,
    localAngle: number,
    operationType: ToleranceContext
  ): number {
    const params: ToleranceParameters = {
      wallThickness,
      documentPrecision,
      localAngle,
      operationType
    };

    // Check cache first
    const cacheKey = this.generateCacheKey(params);
    const cached = this.toleranceCache.get(cacheKey);
    if (cached) {
      return cached.value;
    }

    // Calculate new tolerance
    const result = this.calculateToleranceInternal(params);
    
    // Cache the result
    this.cacheToleranceResult(cacheKey, result);
    
    return result.value;
  }

  /**
   * Get specialized tolerance for vertex merging
   */
  getVertexMergeTolerance(thickness: number, angle: number): number {
    return this.calculateTolerance(
      thickness,
      this.documentPrecision,
      angle,
      ToleranceContext.VERTEX_MERGE
    );
  }

  /**
   * Get specialized tolerance for offset operations
   */
  getOffsetTolerance(thickness: number, curvature: number): number {
    const params: ToleranceParameters = {
      wallThickness: thickness,
      documentPrecision: this.documentPrecision,
      localAngle: 0, // Not directly applicable for curvature
      operationType: ToleranceContext.OFFSET_OPERATION,
      curvature
    };

    const cacheKey = this.generateCacheKey(params);
    const cached = this.toleranceCache.get(cacheKey);
    if (cached) {
      return cached.value;
    }

    const result = this.calculateToleranceWithCurvature(params);
    this.cacheToleranceResult(cacheKey, result);
    
    return result.value;
  }

  /**
   * Get specialized tolerance for boolean operations
   */
  getBooleanTolerance(thickness: number, complexity: number): number {
    const params: ToleranceParameters = {
      wallThickness: thickness,
      documentPrecision: this.documentPrecision,
      localAngle: 0, // Not directly applicable for complexity
      operationType: ToleranceContext.BOOLEAN_OPERATION,
      geometryComplexity: complexity
    };

    const cacheKey = this.generateCacheKey(params);
    const cached = this.toleranceCache.get(cacheKey);
    if (cached) {
      return cached.value;
    }

    const result = this.calculateToleranceWithComplexity(params);
    this.cacheToleranceResult(cacheKey, result);
    
    return result.value;
  }

  /**
   * Adjust tolerance dynamically based on failure
   */
  adjustToleranceForFailure(
    currentTolerance: number,
    failureType: ToleranceFailure
  ): number {
    const adjustmentFactor = this.calculateAdjustmentFactor(failureType);
    const adjustedTolerance = currentTolerance * adjustmentFactor;
    
    // Apply bounds checking
    const bounds = this.calculateToleranceBounds(currentTolerance);
    const finalTolerance = Math.max(bounds.minimum, Math.min(bounds.maximum, adjustedTolerance));
    
    // Record the adjustment
    this.recordAdjustment(currentTolerance, finalTolerance, failureType.type);
    
    return finalTolerance;
  }

  /**
   * Get tolerance bounds for a given base tolerance
   */
  getToleranceBounds(baseTolerance: number): ToleranceBounds {
    return this.calculateToleranceBounds(baseTolerance);
  }

  /**
   * Validate tolerance value for numerical stability
   */
  validateTolerance(tolerance: number, context: ToleranceContext): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check minimum bounds
    if (tolerance < this.baseTolerance) {
      issues.push(`Tolerance ${tolerance} is below minimum safe value ${this.baseTolerance}`);
      recommendations.push(`Use tolerance >= ${this.baseTolerance}`);
    }

    // Check maximum bounds
    const maxSafeTolerance = this.documentPrecision * 10;
    if (tolerance > maxSafeTolerance) {
      issues.push(`Tolerance ${tolerance} is above maximum recommended value ${maxSafeTolerance}`);
      recommendations.push(`Consider reducing tolerance or increasing document precision`);
    }

    // Context-specific validation
    switch (context) {
      case ToleranceContext.VERTEX_MERGE:
        if (tolerance > this.documentPrecision) {
          issues.push('Vertex merge tolerance is larger than document precision');
          recommendations.push('Reduce tolerance to maintain geometric accuracy');
        }
        break;
      
      case ToleranceContext.BOOLEAN_OPERATION:
        if (tolerance < this.documentPrecision * 0.1) {
          issues.push('Boolean operation tolerance may be too small for reliable results');
          recommendations.push('Increase tolerance for better boolean operation stability');
        }
        break;
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get adjustment history for analysis
   */
  getAdjustmentHistory(operationId?: string): ToleranceAdjustment[] {
    if (operationId) {
      return this.adjustmentHistory.get(operationId) || [];
    }
    
    // Return all adjustments
    const allAdjustments: ToleranceAdjustment[] = [];
    for (const adjustments of this.adjustmentHistory.values()) {
      allAdjustments.push(...adjustments);
    }
    
    return allAdjustments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear tolerance cache
   */
  clearCache(): void {
    this.toleranceCache.clear();
  }

  /**
   * Update document precision
   */
  updateDocumentPrecision(precision: number): void {
    this.documentPrecision = precision;
    this.clearCache(); // Clear cache as precision affects all calculations
  }

  /**
   * Internal tolerance calculation
   */
  private calculateToleranceInternal(params: ToleranceParameters): ToleranceResult {
    // Start with base tolerance
    let tolerance = this.baseTolerance;

    // Scale by document precision
    tolerance = Math.max(tolerance, params.documentPrecision * 0.01);

    // Scale by wall thickness (thicker walls can tolerate larger tolerances)
    const thicknessScale = Math.sqrt(params.wallThickness / 100); // Normalize to 100mm
    tolerance *= Math.max(0.5, Math.min(2.0, thicknessScale));

    // Scale by operation type
    const contextScale = this.contextScalingFactors[params.operationType];
    tolerance *= contextScale;

    // Scale by angle (sharper angles need larger tolerances)
    const angleScale = this.calculateAngleScale(params.localAngle);
    tolerance *= angleScale;

    // Apply bounds
    const bounds = this.calculateToleranceBounds(tolerance);
    tolerance = Math.max(bounds.minimum, Math.min(bounds.maximum, tolerance));

    return {
      value: tolerance,
      confidence: this.calculateConfidence(params),
      reasoning: this.generateReasoning(params, tolerance),
      bounds,
      adjustmentHistory: []
    };
  }

  /**
   * Calculate tolerance with curvature consideration
   */
  private calculateToleranceWithCurvature(params: ToleranceParameters): ToleranceResult {
    const baseResult = this.calculateToleranceInternal(params);
    
    if (params.curvature !== undefined && params.curvature > 0) {
      // Higher curvature requires larger tolerance
      const curvatureScale = 1 + Math.log10(1 + params.curvature * 1000);
      baseResult.value *= curvatureScale;
      baseResult.reasoning += ` Curvature scaling: ${curvatureScale.toFixed(2)}`;
    }

    return baseResult;
  }

  /**
   * Calculate tolerance with complexity consideration
   */
  private calculateToleranceWithComplexity(params: ToleranceParameters): ToleranceResult {
    const baseResult = this.calculateToleranceInternal(params);
    
    if (params.geometryComplexity !== undefined && params.geometryComplexity > 1) {
      // Higher complexity requires larger tolerance
      const complexityScale = 1 + Math.log10(params.geometryComplexity);
      baseResult.value *= complexityScale;
      baseResult.reasoning += ` Complexity scaling: ${complexityScale.toFixed(2)}`;
    }

    return baseResult;
  }

  /**
   * Calculate angle-based scaling factor
   */
  private calculateAngleScale(angle: number): number {
    const angleDegrees = Math.abs(angle) * 180 / Math.PI;
    
    if (angleDegrees < 15) {
      return this.angleScalingFactors.verySharp;
    } else if (angleDegrees < 30) {
      return this.angleScalingFactors.sharp;
    } else if (angleDegrees < 60) {
      return this.angleScalingFactors.moderate;
    } else if (angleDegrees < 120) {
      return this.angleScalingFactors.gentle;
    } else {
      return this.angleScalingFactors.obtuse;
    }
  }

  /**
   * Calculate adjustment factor based on failure type
   */
  private calculateAdjustmentFactor(failure: ToleranceFailure): number {
    const baseFactor = 1 + failure.suggestedAdjustment;
    const severityMultiplier = Math.max(1, failure.severity);
    
    return baseFactor * severityMultiplier;
  }

  /**
   * Calculate tolerance bounds
   */
  private calculateToleranceBounds(baseTolerance: number): ToleranceBounds {
    return {
      minimum: Math.max(this.baseTolerance, baseTolerance * 0.1),
      maximum: Math.min(this.documentPrecision * 10, baseTolerance * 100),
      recommended: baseTolerance
    };
  }

  /**
   * Calculate confidence in tolerance value
   */
  private calculateConfidence(params: ToleranceParameters): number {
    let confidence = 1.0;

    // Reduce confidence for extreme angles
    const angleDegrees = Math.abs(params.localAngle) * 180 / Math.PI;
    if (angleDegrees < 10 || angleDegrees > 170) {
      confidence *= 0.7;
    }

    // Reduce confidence for very thick or thin walls
    if (params.wallThickness < 50 || params.wallThickness > 500) {
      confidence *= 0.8;
    }

    // Reduce confidence for complex operations
    if (params.operationType === ToleranceContext.BOOLEAN_OPERATION) {
      confidence *= 0.9;
    }

    return Math.max(0.1, confidence);
  }

  /**
   * Generate reasoning for tolerance calculation
   */
  private generateReasoning(params: ToleranceParameters, tolerance: number): string {
    const parts: string[] = [];
    
    parts.push(`Base: ${this.baseTolerance.toExponential(2)}`);
    parts.push(`Document precision: ${params.documentPrecision.toExponential(2)}`);
    parts.push(`Wall thickness: ${params.wallThickness}mm`);
    parts.push(`Operation: ${params.operationType}`);
    
    const angleDegrees = Math.abs(params.localAngle) * 180 / Math.PI;
    parts.push(`Angle: ${angleDegrees.toFixed(1)}°`);
    
    parts.push(`Final: ${tolerance.toExponential(2)}`);
    
    return parts.join(', ');
  }

  /**
   * Generate cache key for tolerance parameters
   */
  private generateCacheKey(params: ToleranceParameters): string {
    const keyParts = [
      params.wallThickness.toFixed(2),
      params.documentPrecision.toExponential(2),
      params.localAngle.toFixed(4),
      params.operationType,
      params.geometryComplexity?.toFixed(2) || '0',
      params.curvature?.toFixed(4) || '0'
    ];
    
    return keyParts.join('|');
  }

  /**
   * Cache tolerance calculation result
   */
  private cacheToleranceResult(key: string, result: ToleranceResult): void {
    // Implement LRU cache behavior
    if (this.toleranceCache.size >= this.maxCacheSize) {
      const firstKey = this.toleranceCache.keys().next().value as string | undefined;
      if (firstKey !== undefined) {
        this.toleranceCache.delete(firstKey);
      }
    }
    
    this.toleranceCache.set(key, result);
  }

  /**
   * Record tolerance adjustment
   */
  private recordAdjustment(originalValue: number, adjustedValue: number, reason: string): void {
    const adjustment: ToleranceAdjustment = {
      timestamp: new Date(),
      originalValue,
      adjustedValue,
      reason,
      success: true // Will be updated based on subsequent operation success
    };

    const operationId = 'global'; // Could be made more specific
    const history = this.adjustmentHistory.get(operationId) || [];
    history.push(adjustment);
    
    // Keep only recent adjustments
    const maxHistorySize = 100;
    if (history.length > maxHistorySize) {
      history.splice(0, history.length - maxHistorySize);
    }
    
    this.adjustmentHistory.set(operationId, history);
  }

  /**
   * Get tolerance statistics for analysis
   */
  getToleranceStatistics(): {
    cacheSize: number;
    cacheHitRate: number;
    averageTolerance: number;
    toleranceRange: { min: number; max: number };
    adjustmentCount: number;
    successfulAdjustments: number;
  } {
    const cachedValues = Array.from(this.toleranceCache.values()).map(r => r.value);
    const allAdjustments = this.getAdjustmentHistory();
    
    return {
      cacheSize: this.toleranceCache.size,
      cacheHitRate: 0, // Would need to track cache hits/misses
      averageTolerance: cachedValues.length > 0 
        ? cachedValues.reduce((sum, val) => sum + val, 0) / cachedValues.length 
        : 0,
      toleranceRange: {
        min: cachedValues.length > 0 ? Math.min(...cachedValues) : 0,
        max: cachedValues.length > 0 ? Math.max(...cachedValues) : 0
      },
      adjustmentCount: allAdjustments.length,
      successfulAdjustments: allAdjustments.filter(adj => adj.success).length
    };
  }
}