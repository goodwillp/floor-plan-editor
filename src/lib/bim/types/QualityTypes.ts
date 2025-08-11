/**
 * Quality Types for BIM Wall System
 * 
 * Defines types for quality metrics, assessments, and validation results
 */

export interface QualityMetrics {
  geometricAccuracy: number;
  topologicalConsistency: number;
  manufacturability: number;
  architecturalCompliance: number;
  sliverFaceCount: number;
  microGapCount: number;
  selfIntersectionCount: number;
  degenerateElementCount: number;
  complexity: number;
  processingEfficiency: number;
  memoryUsage: number;
}

export interface QualityAssessment {
  overallScore: number;
  categoryScores: Map<string, number>;
  issues: QualityIssue[];
  recommendations: string[];
  assessmentDate: Date;
  assessmentMethod: string;
}

export interface QualityIssue {
  id: string;
  type: QualityIssueType;
  severity: QualityIssueSeverity;
  description: string;
  location?: GeometricLocation;
  suggestedFix: string;
  autoFixable: boolean;
}

export enum QualityIssueType {
  GEOMETRIC_ACCURACY = 'geometric_accuracy',
  TOPOLOGICAL_CONSISTENCY = 'topological_consistency',
  MANUFACTURABILITY = 'manufacturability',
  ARCHITECTURAL_COMPLIANCE = 'architectural_compliance',
  PERFORMANCE = 'performance'
}

export enum QualityIssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface GeometricLocation {
  x: number;
  y: number;
  description?: string;
}

export interface QualityThresholds {
  geometricAccuracy: number;
  topologicalConsistency: number;
  manufacturability: number;
  architecturalCompliance: number;
  maxSliverFaces: number;
  maxMicroGaps: number;
  maxSelfIntersections: number;
  maxDegenerateElements: number;
  maxComplexity: number;
  minProcessingEfficiency: number;
  maxMemoryUsage: number;
}

export interface QualityReport {
  id: string;
  timestamp: Date;
  metrics: QualityMetrics;
  assessment: QualityAssessment;
  thresholds: QualityThresholds;
  passed: boolean;
  score: number;
}