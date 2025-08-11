/**
 * Quality Metrics for BIM Wall Geometry
 * 
 * Tracks various quality indicators for geometric operations
 */

export interface QualityMetrics {
  // Overall quality scores (0-1)
  geometricAccuracy: number;
  topologicalConsistency: number;
  manufacturability: number;
  architecturalCompliance: number;
  
  // Specific issue counts
  sliverFaceCount: number;
  microGapCount: number;
  selfIntersectionCount: number;
  degenerateElementCount: number;
  
  // Performance metrics
  complexity: number;
  processingEfficiency: number;
  memoryUsage: number;
  
  // Calculation metadata
  calculatedAt: Date;
  calculationMethod: string;
  toleranceUsed: number;
  
  // Detailed breakdown
  issues: QualityIssue[];
  recommendations: string[];
}

export interface QualityIssue {
  type: QualityIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: {
    x: number;
    y: number;
  };
  suggestedFix?: string;
  autoFixable: boolean;
}

export enum QualityIssueType {
  SLIVER_FACE = 'sliver_face',
  MICRO_GAP = 'micro_gap',
  SELF_INTERSECTION = 'self_intersection',
  DEGENERATE_ELEMENT = 'degenerate_element',
  TOLERANCE_VIOLATION = 'tolerance_violation',
  TOPOLOGICAL_ERROR = 'topological_error',
  GEOMETRIC_INCONSISTENCY = 'geometric_inconsistency'
}