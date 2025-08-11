/**
 * Tolerance context types for different geometric operations
 */
export enum ToleranceContext {
  VERTEX_MERGE = 'vertex_merge',
  OFFSET_OPERATION = 'offset_operation',
  BOOLEAN_OPERATION = 'boolean_operation',
  SHAPE_HEALING = 'shape_healing'
}

/**
 * Tolerance failure information
 */
export interface ToleranceFailure {
  type: string;
  severity: number;
  suggestedAdjustment: number;
  context: ToleranceContext;
  message: string;
}

/**
 * Tolerance bounds for validation
 */
export interface ToleranceBounds {
  min: number;
  max: number;
  recommended: number;
}

/**
 * Tolerance calculation parameters
 */
export interface ToleranceCalculationParams {
  wallThickness: number;
  documentPrecision: number;
  localAngle: number;
  operationType: ToleranceContext;
  complexity?: number;
  curvature?: number;
}

/**
 * Tolerance validation result
 */
export interface ToleranceValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  bounds: ToleranceBounds;
  recommendations: ToleranceRecommendation[];
}

/**
 * Tolerance recommendation
 */
export interface ToleranceRecommendation {
  value: number;
  reason: string;
  confidence: number;
  context: ToleranceContext;
  impact: {
    quality: number;
    performance: number;
  };
}

/**
 * Tolerance adjustment result
 */
export interface ToleranceAdjustmentResult {
  success: boolean;
  oldTolerance: number;
  newTolerance: number;
  affectedOperations: string[];
  qualityImpact: number;
  performanceImpact: number;
  warnings: string[];
}

export default ToleranceContext;