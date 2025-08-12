/**
 * Core BIM type definitions and enumerations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type { Point } from '../../types';

/**
 * Offset join types for curve offsetting operations
 */
export enum OffsetJoinType {
  MITER = 'miter',
  BEVEL = 'bevel',
  ROUND = 'round'
}

/**
 * Curve types supported by the BIM system
 */
export enum CurveType {
  POLYLINE = 'polyline',
  BEZIER = 'bezier',
  SPLINE = 'spline',
  ARC = 'arc'
}

/**
 * Intersection types for wall junction handling
 */
export enum IntersectionType {
  T_JUNCTION = 't_junction',
  L_JUNCTION = 'l_junction',
  CROSS_JUNCTION = 'cross_junction',
  PARALLEL_OVERLAP = 'parallel_overlap'
}

/**
 * Tolerance context for adaptive tolerance calculations
 */
export enum ToleranceContext {
  VERTEX_MERGE = 'vertex_merge',
  OFFSET_OPERATION = 'offset_operation',
  BOOLEAN_OPERATION = 'boolean_operation',
  SHAPE_HEALING = 'shape_healing'
}

/**
 * Geometric error types
 */
export enum GeometricErrorType {
  OFFSET_FAILURE = 'offset_failure',
  BOOLEAN_FAILURE = 'boolean_failure',
  SELF_INTERSECTION = 'self_intersection',
  DEGENERATE_GEOMETRY = 'degenerate_geometry',
  TOLERANCE_EXCEEDED = 'tolerance_exceeded',
  NUMERICAL_INSTABILITY = 'numerical_instability',
  DUPLICATE_VERTICES = 'duplicate_vertices',
  VALIDATION_FAILURE = 'validation_failure',
  COMPLEXITY_EXCEEDED = 'complexity_exceeded',
  INVALID_PARAMETER = 'invalid_parameter',
  TOPOLOGICAL_CONSISTENCY = 'topological_consistency',
  DIMENSIONAL_ACCURACY = 'dimensional_accuracy',
  STRUCTURAL_INTEGRITY = 'structural_integrity',
  MANUFACTURING_FEASIBILITY = 'manufacturing_feasibility',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  TOPOLOGY_ERROR = 'topology_error'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Quality metrics for geometric operations
 */
export interface QualityMetrics {
  geometricAccuracy: number;
  topologicalConsistency: number;
  manufacturability: number;
  architecturalCompliance: number;
  
  // Specific metrics
  sliverFaceCount: number;
  microGapCount: number;
  selfIntersectionCount: number;
  degenerateElementCount: number;
  
  // Performance metrics
  complexity: number;
  processingEfficiency: number;
  memoryUsage: number;
}

/**
 * Tolerance failure information
 */
export interface ToleranceFailure {
  type: string;
  severity: number;
  suggestedAdjustment: number;
}

/**
 * Healing operation record
 */
export interface HealingOperation {
  id: string;
  type: string;
  timestamp: Date;
  success: boolean;
  details: string;
}