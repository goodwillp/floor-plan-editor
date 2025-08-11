/**
 * Geometric operation result types and interfaces
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type { WallSolid } from '../geometry/WallSolid';
import type { Curve } from '../geometry/Curve';
import type { OffsetJoinType, QualityMetrics } from './BIMTypes';

/**
 * Result of offset operations
 */
export interface OffsetResult {
  success: boolean;
  leftOffset: Curve | null;
  rightOffset: Curve | null;
  joinType: OffsetJoinType;
  warnings: string[];
  fallbackUsed: boolean;
}

/**
 * Result of boolean operations
 */
export interface BooleanResult {
  success: boolean;
  resultSolid: WallSolid | null;
  operationType: string;
  processingTime: number;
  warnings: string[];
  requiresHealing: boolean;
}

/**
 * Result of shape healing operations
 */
export interface HealingResult {
  success: boolean;
  healedSolid: WallSolid | null;
  operationsApplied: string[];
  facesRemoved: number;
  edgesMerged: number;
  gapsEliminated: number;
  processingTime: number;
}

/**
 * Result of geometry validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityMetrics: QualityMetrics;
  suggestions: string[];
}

/**
 * Result of geometry simplification
 */
export interface SimplificationResult {
  success: boolean;
  simplifiedSolid: WallSolid;
  pointsRemoved: number;
  complexityReduction: number;
  accuracyPreserved: boolean;
  processingTime: number;
}

/**
 * Miter calculation data
 */
export interface MiterCalculation {
  apex: { x: number; y: number };
  leftOffsetIntersection: { x: number; y: number };
  rightOffsetIntersection: { x: number; y: number };
  angle: number;
  joinType: OffsetJoinType;
  fallbackUsed: boolean;
}

/**
 * Error handling result
 */
export interface ErrorHandlingResult {
  handled: boolean;
  recoveryAttempted: boolean;
  fallbackUsed: boolean;
  message: string;
  suggestions: string[];
}

/**
 * Recovery operation result
 */
export interface RecoveryResult {
  success: boolean;
  recoveredGeometry: any;
  method: string;
  qualityImpact: number;
}

/**
 * Fallback operation result
 */
export interface FallbackResult {
  success: boolean;
  fallbackGeometry: any;
  method: string;
  limitations: string[];
}