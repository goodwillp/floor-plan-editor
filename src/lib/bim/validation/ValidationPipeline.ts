import { WallSolid } from '../geometry/WallSolid';
import { Curve } from '../geometry/Curve';
import { BIMPolygon } from '../geometry/BIMPolygon';
import { GeometricError, GeometricErrorType, ErrorSeverity } from './GeometricError';
import { QualityMetrics } from '../types/QualityTypes';

export interface ValidationStage {
  name: string;
  validate: (input: any) => ValidationStageResult;
  canRecover: boolean;
  recover?: (input: any, errors: GeometricError[]) => RecoveryResult;
}

export interface ValidationStageResult {
  passed: boolean;
  errors: GeometricError[];
  warnings: string[];
  metrics: Partial<QualityMetrics>;
  processingTime: number;
}

export interface RecoveryResult {
  success: boolean;
  recoveredData: any;
  recoveryMethod: string;
  qualityImpact: number;
  warnings: string[];
}

export interface ValidationPipelineConfig {
  enablePreValidation: boolean;
  enablePostValidation: boolean;
  enableAutoRecovery: boolean;
  maxRecoveryAttempts: number;
  failFast: boolean;
  reportingLevel: 'minimal' | 'detailed' | 'comprehensive';
}

export interface PipelineExecutionResult {
  success: boolean;
  stageResults: Map<string, ValidationStageResult>;
  recoveryResults: Map<string, RecoveryResult>;
  overallQuality: QualityMetrics;
  totalProcessingTime: number;
  recommendedActions: string[];
}

/**
 * Comprehensive validation pipeline that checks geometric operations
 * before and after execution with automatic recovery capabilities
 */
export class ValidationPipeline {
  private stages: Map<string, ValidationStage> = new Map();
  private config: ValidationPipelineConfig;

  constructor(config: Partial<ValidationPipelineConfig> = {}) {
    this.config = {
      enablePreValidation: true,
      enablePostValidation: true,
      enableAutoRecovery: true,
      maxRecoveryAttempts: 3,
      failFast: false,
      reportingLevel: 'detailed',
      ...config
    };

    this.initializeStages();
  }

  /**
   * Execute validation pipeline on geometric data
   */
  async executeValidation(
    data: any,
    operationType: string,
    stage: 'pre' | 'post'
  ): Promise<PipelineExecutionResult> {
    const startTime = performance.now();
    const stageResults = new Map<string, ValidationStageResult>();
    const recoveryResults = new Map<string, RecoveryResult>();
    let currentData = data;
    let overallSuccess = true;

    // Skip if validation is disabled for this stage
    if (stage === 'pre' && !this.config.enablePreValidation) {
      return this.createSuccessResult(startTime);
    }
    if (stage === 'post' && !this.config.enablePostValidation) {
      return this.createSuccessResult(startTime);
    }

    // Execute validation stages
    for (const [stageName, validationStage] of this.stages) {
      try {
        const stageResult = validationStage.validate(currentData);
        stageResults.set(stageName, stageResult);

        if (!stageResult.passed) {
          overallSuccess = false;

          // Attempt recovery if enabled and possible
          if (this.config.enableAutoRecovery && validationStage.canRecover && validationStage.recover) {
            const recoveryResult = await this.attemptRecovery(
              validationStage,
              currentData,
              stageResult.errors
            );
            
            recoveryResults.set(stageName, recoveryResult);

            if (recoveryResult.success) {
              currentData = recoveryResult.recoveredData;
              // Re-validate after recovery
              const revalidationResult = validationStage.validate(currentData);
              if (revalidationResult.passed) {
                overallSuccess = true;
                stageResults.set(`${stageName}_post_recovery`, revalidationResult);
              }
            }
          }

          // Fail fast if configured
          if (this.config.failFast && !overallSuccess) {
            break;
          }
        }
      } catch (error) {
        const stageError = new GeometricError(
          GeometricErrorType.VALIDATION_FAILURE,
          ErrorSeverity.CRITICAL,
          `Validation stage ${stageName}`,
          currentData,
          `Validation stage failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'Check validation stage implementation',
          false
        );

        stageResults.set(stageName, {
          passed: false,
          errors: [stageError],
          warnings: [],
          metrics: {},
          processingTime: 0
        });

        overallSuccess = false;
        if (this.config.failFast) break;
      }
    }

    const totalProcessingTime = performance.now() - startTime;
    const overallQuality = this.calculateOverallQuality(stageResults);
    const recommendedActions = this.generateRecommendations(stageResults, recoveryResults);

    return {
      success: overallSuccess,
      stageResults,
      recoveryResults,
      overallQuality,
      totalProcessingTime,
      recommendedActions
    };
  }

  /**
   * Add custom validation stage
   */
  addValidationStage(name: string, stage: ValidationStage): void {
    this.stages.set(name, stage);
  }

  /**
   * Remove validation stage
   */
  removeValidationStage(name: string): void {
    this.stages.delete(name);
  }

  /**
   * Get validation stage names
   */
  getStageNames(): string[] {
    return Array.from(this.stages.keys());
  }

  private initializeStages(): void {
    // Geometric consistency validation
    this.stages.set('geometric_consistency', {
      name: 'Geometric Consistency',
      validate: this.validateGeometricConsistency.bind(this),
      canRecover: true,
      recover: this.recoverGeometricConsistency.bind(this)
    });

    // Topological validation
    this.stages.set('topology', {
      name: 'Topological Validation',
      validate: this.validateTopology.bind(this),
      canRecover: true,
      recover: this.recoverTopology.bind(this)
    });

    // Numerical stability validation
    this.stages.set('numerical_stability', {
      name: 'Numerical Stability',
      validate: this.validateNumericalStability.bind(this),
      canRecover: true,
      recover: this.recoverNumericalStability.bind(this)
    });

    // Quality metrics validation
    this.stages.set('quality_metrics', {
      name: 'Quality Metrics',
      validate: this.validateQualityMetrics.bind(this),
      canRecover: false
    });

    // Performance validation
    this.stages.set('performance', {
      name: 'Performance Validation',
      validate: this.validatePerformance.bind(this),
      canRecover: false
    });
  }

  private validateGeometricConsistency(data: any): ValidationStageResult {
    const startTime = performance.now();
    const errors: GeometricError[] = [];
    const warnings: string[] = [];

    if (data instanceof WallSolid) {
      // Check baseline curve validity
      if (!data.baseline || data.baseline.points.length < 2) {
        errors.push(new GeometricError(
          GeometricErrorType.DEGENERATE_GEOMETRY,
          ErrorSeverity.ERROR,
          'Baseline validation',
          data,
          'Wall baseline has insufficient points',
          'Ensure baseline has at least 2 points',
          true
        ));
      }

      // Check thickness validity
      if (data.thickness <= 0) {
        errors.push(new GeometricError(
          GeometricErrorType.INVALID_PARAMETER,
          ErrorSeverity.ERROR,
          'Thickness validation',
          data,
          'Wall thickness must be positive',
          'Set thickness to a positive value',
          true
        ));
      }

      // Check for self-intersections
      if (this.hasSelfIntersections(data.baseline)) {
        errors.push(new GeometricError(
          GeometricErrorType.SELF_INTERSECTION,
          ErrorSeverity.WARNING,
          'Self-intersection check',
          data,
          'Baseline curve has self-intersections',
          'Simplify curve or resolve intersections',
          true
        ));
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metrics: {
        geometricAccuracy: errors.length === 0 ? 1.0 : 0.5,
        topologicalConsistency: errors.length === 0 ? 1.0 : 0.3
      },
      processingTime: performance.now() - startTime
    };
  }

  private validateTopology(data: any): ValidationStageResult {
    const startTime = performance.now();
    const errors: GeometricError[] = [];
    const warnings: string[] = [];

    if (data instanceof WallSolid && data.solidGeometry) {
      for (const polygon of data.solidGeometry) {
        // Check for valid polygon structure
        if (polygon.outerRing.length < 3) {
          errors.push(new GeometricError(
            GeometricErrorType.DEGENERATE_GEOMETRY,
            ErrorSeverity.ERROR,
            'Polygon validation',
            polygon,
            'Polygon has insufficient vertices',
            'Ensure polygon has at least 3 vertices',
            true
          ));
        }

        // Check for clockwise orientation
        if (!this.isClockwise(polygon.outerRing)) {
          warnings.push('Polygon vertices should be in clockwise order');
        }

        // Check for duplicate consecutive vertices
        if (this.hasDuplicateConsecutiveVertices(polygon.outerRing)) {
          errors.push(new GeometricError(
            GeometricErrorType.DUPLICATE_VERTICES,
            ErrorSeverity.WARNING,
            'Duplicate vertex check',
            polygon,
            'Polygon has duplicate consecutive vertices',
            'Remove duplicate vertices',
            true
          ));
        }
      }
    }

    return {
      passed: errors.filter(e => e.severity === ErrorSeverity.ERROR).length === 0,
      errors,
      warnings,
      metrics: {
        topologicalConsistency: errors.length === 0 ? 1.0 : 0.6
      },
      processingTime: performance.now() - startTime
    };
  }

  private validateNumericalStability(data: any): ValidationStageResult {
    const startTime = performance.now();
    const errors: GeometricError[] = [];
    const warnings: string[] = [];

    if (data instanceof WallSolid) {
      // Check for extremely small segments
      const minSegmentLength = 1e-6;
      for (let i = 0; i < data.baseline.points.length - 1; i++) {
        const p1 = data.baseline.points[i];
        const p2 = data.baseline.points[i + 1];
        const distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        
        if (distance < minSegmentLength) {
          errors.push(new GeometricError(
            GeometricErrorType.NUMERICAL_INSTABILITY,
            ErrorSeverity.WARNING,
            'Segment length check',
            data,
            `Segment length ${distance} is too small`,
            'Remove or merge small segments',
            true
          ));
        }
      }

      // Check for extreme coordinates
      const maxCoordinate = 1e6;
      for (const point of data.baseline.points) {
        if (Math.abs(point.x) > maxCoordinate || Math.abs(point.y) > maxCoordinate) {
          warnings.push(`Coordinate values are very large: (${point.x}, ${point.y})`);
        }
      }
    }

    return {
      passed: errors.filter(e => e.severity === ErrorSeverity.ERROR).length === 0,
      errors,
      warnings,
      metrics: {
        numericalStability: errors.length === 0 ? 1.0 : 0.7
      },
      processingTime: performance.now() - startTime
    };
  }

  private validateQualityMetrics(data: any): ValidationStageResult {
    const startTime = performance.now();
    const errors: GeometricError[] = [];
    const warnings: string[] = [];

    if (data instanceof WallSolid && data.geometricQuality) {
      const quality = data.geometricQuality;
      
      // Check quality thresholds
      if (quality.geometricAccuracy < 0.8) {
        warnings.push(`Geometric accuracy is low: ${quality.geometricAccuracy}`);
      }
      
      if (quality.topologicalConsistency < 0.9) {
        warnings.push(`Topological consistency is low: ${quality.topologicalConsistency}`);
      }

      if (quality.sliverFaceCount > 0) {
        warnings.push(`Found ${quality.sliverFaceCount} sliver faces`);
      }

      if (quality.selfIntersectionCount > 0) {
        errors.push(new GeometricError(
          GeometricErrorType.SELF_INTERSECTION,
          ErrorSeverity.WARNING,
          'Quality metrics check',
          data,
          `Found ${quality.selfIntersectionCount} self-intersections`,
          'Apply shape healing to resolve intersections',
          true
        ));
      }
    }

    return {
      passed: errors.filter(e => e.severity === ErrorSeverity.ERROR).length === 0,
      errors,
      warnings,
      metrics: data instanceof WallSolid ? data.geometricQuality : {},
      processingTime: performance.now() - startTime
    };
  }

  private validatePerformance(data: any): ValidationStageResult {
    const startTime = performance.now();
    const errors: GeometricError[] = [];
    const warnings: string[] = [];

    if (data instanceof WallSolid) {
      // Check complexity
      const vertexCount = data.baseline.points.length;
      if (vertexCount > 1000) {
        warnings.push(`High vertex count: ${vertexCount}`);
      }

      // Check processing time
      if (data.processingTime > 1000) { // 1 second
        warnings.push(`Long processing time: ${data.processingTime}ms`);
      }

      // Check memory usage estimate
      const estimatedMemory = vertexCount * 64; // rough estimate
      if (estimatedMemory > 1024 * 1024) { // 1MB
        warnings.push(`High memory usage estimate: ${estimatedMemory} bytes`);
      }
    }

    return {
      passed: true, // Performance issues are warnings, not errors
      errors,
      warnings,
      metrics: {
        processingEfficiency: data instanceof WallSolid ? 
          Math.max(0, 1 - (data.processingTime / 1000)) : 1.0
      },
      processingTime: performance.now() - startTime
    };
  }

  private async attemptRecovery(
    stage: ValidationStage,
    data: any,
    errors: GeometricError[]
  ): Promise<RecoveryResult> {
    if (!stage.recover) {
      return {
        success: false,
        recoveredData: data,
        recoveryMethod: 'none',
        qualityImpact: 0,
        warnings: ['No recovery method available']
      };
    }

    let attempts = 0;
    let currentData = data;
    
    while (attempts < this.config.maxRecoveryAttempts) {
      try {
        const recoveryResult = stage.recover(currentData, errors);
        if (recoveryResult.success) {
          return recoveryResult;
        }
        currentData = recoveryResult.recoveredData;
        attempts++;
      } catch (error) {
        return {
          success: false,
          recoveredData: data,
          recoveryMethod: 'failed',
          qualityImpact: 0,
          warnings: [`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
      }
    }

    return {
      success: false,
      recoveredData: currentData,
      recoveryMethod: 'max_attempts_exceeded',
      qualityImpact: 0,
      warnings: [`Recovery failed after ${attempts} attempts`]
    };
  }

  private recoverGeometricConsistency(data: any, errors: GeometricError[]): RecoveryResult {
    if (!(data instanceof WallSolid)) {
      return {
        success: false,
        recoveredData: data,
        recoveryMethod: 'unsupported_type',
        qualityImpact: 0,
        warnings: ['Recovery not supported for this data type']
      };
    }

    let recoveredData = { ...data };
    let qualityImpact = 0;
    const warnings: string[] = [];

    for (const error of errors) {
      switch (error.type) {
        case GeometricErrorType.DEGENERATE_GEOMETRY:
          if (recoveredData.baseline.points.length < 2) {
            // Add a minimal valid baseline
            recoveredData.baseline.points = [
              { x: 0, y: 0, id: 'recovery_1', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
              { x: 100, y: 0, id: 'recovery_2', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true }
            ];
            qualityImpact += 0.3;
            warnings.push('Added minimal baseline for degenerate geometry');
          }
          break;

        case GeometricErrorType.INVALID_PARAMETER:
          if (recoveredData.thickness <= 0) {
            recoveredData.thickness = 100; // Default thickness
            qualityImpact += 0.1;
            warnings.push('Set default thickness for invalid parameter');
          }
          break;

        case GeometricErrorType.SELF_INTERSECTION:
          // Attempt to remove self-intersections by simplifying the curve
          recoveredData.baseline.points = this.removeSelfIntersections(recoveredData.baseline.points);
          qualityImpact += 0.2;
          warnings.push('Simplified curve to remove self-intersections');
          break;
      }
    }

    return {
      success: qualityImpact < 0.5, // Success if quality impact is acceptable
      recoveredData,
      recoveryMethod: 'geometric_consistency_recovery',
      qualityImpact,
      warnings
    };
  }

  private recoverTopology(data: any, errors: GeometricError[]): RecoveryResult {
    if (!(data instanceof WallSolid)) {
      return {
        success: false,
        recoveredData: data,
        recoveryMethod: 'unsupported_type',
        qualityImpact: 0,
        warnings: ['Recovery not supported for this data type']
      };
    }

    let recoveredData = { ...data };
    let qualityImpact = 0;
    const warnings: string[] = [];

    if (recoveredData.solidGeometry) {
      recoveredData.solidGeometry = recoveredData.solidGeometry.map(polygon => {
        let recoveredPolygon = { ...polygon };

        // Fix insufficient vertices
        if (polygon.outerRing.length < 3) {
          // Create a minimal triangle
          recoveredPolygon.outerRing = [
            { x: 0, y: 0, id: 'recovery_1', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
            { x: 50, y: 0, id: 'recovery_2', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
            { x: 25, y: 50, id: 'recovery_3', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true }
          ];
          qualityImpact += 0.4;
          warnings.push('Created minimal triangle for degenerate polygon');
        }

        // Remove duplicate consecutive vertices
        if (this.hasDuplicateConsecutiveVertices(recoveredPolygon.outerRing)) {
          recoveredPolygon.outerRing = this.removeDuplicateConsecutiveVertices(recoveredPolygon.outerRing);
          qualityImpact += 0.1;
          warnings.push('Removed duplicate consecutive vertices');
        }

        // Ensure clockwise orientation
        if (!this.isClockwise(recoveredPolygon.outerRing)) {
          recoveredPolygon.outerRing = recoveredPolygon.outerRing.reverse();
          qualityImpact += 0.05;
          warnings.push('Fixed polygon orientation to clockwise');
        }

        return recoveredPolygon;
      });
    }

    return {
      success: qualityImpact < 0.5,
      recoveredData,
      recoveryMethod: 'topology_recovery',
      qualityImpact,
      warnings
    };
  }

  private recoverNumericalStability(data: any, errors: GeometricError[]): RecoveryResult {
    if (!(data instanceof WallSolid)) {
      return {
        success: false,
        recoveredData: data,
        recoveryMethod: 'unsupported_type',
        qualityImpact: 0,
        warnings: ['Recovery not supported for this data type']
      };
    }

    let recoveredData = { ...data };
    let qualityImpact = 0;
    const warnings: string[] = [];

    // Remove extremely small segments
    const minSegmentLength = 1e-6;
    const filteredPoints = [];
    
    for (let i = 0; i < recoveredData.baseline.points.length; i++) {
      const currentPoint = recoveredData.baseline.points[i];
      
      if (i === 0) {
        filteredPoints.push(currentPoint);
        continue;
      }

      const prevPoint = filteredPoints[filteredPoints.length - 1];
      const distance = Math.sqrt(
        (currentPoint.x - prevPoint.x) ** 2 + (currentPoint.y - prevPoint.y) ** 2
      );

      if (distance >= minSegmentLength) {
        filteredPoints.push(currentPoint);
      } else {
        qualityImpact += 0.05;
        warnings.push(`Removed point with small segment length: ${distance}`);
      }
    }

    recoveredData.baseline.points = filteredPoints;

    // Clamp extreme coordinates
    const maxCoordinate = 1e6;
    recoveredData.baseline.points = recoveredData.baseline.points.map(point => ({
      ...point,
      x: Math.max(-maxCoordinate, Math.min(maxCoordinate, point.x)),
      y: Math.max(-maxCoordinate, Math.min(maxCoordinate, point.y))
    }));

    return {
      success: qualityImpact < 0.3,
      recoveredData,
      recoveryMethod: 'numerical_stability_recovery',
      qualityImpact,
      warnings
    };
  }

  private calculateOverallQuality(stageResults: Map<string, ValidationStageResult>): QualityMetrics {
    const metrics: QualityMetrics = {
      geometricAccuracy: 1.0,
      topologicalConsistency: 1.0,
      manufacturability: 1.0,
      architecturalCompliance: 1.0,
      sliverFaceCount: 0,
      microGapCount: 0,
      selfIntersectionCount: 0,
      degenerateElementCount: 0,
      complexity: 0,
      processingEfficiency: 1.0,
      memoryUsage: 0
    };

    let totalWeight = 0;
    for (const [stageName, result] of stageResults) {
      const weight = this.getStageWeight(stageName);
      totalWeight += weight;

      if (result.metrics.geometricAccuracy !== undefined) {
        metrics.geometricAccuracy = Math.min(metrics.geometricAccuracy, result.metrics.geometricAccuracy);
      }
      if (result.metrics.topologicalConsistency !== undefined) {
        metrics.topologicalConsistency = Math.min(metrics.topologicalConsistency, result.metrics.topologicalConsistency);
      }
      if (result.metrics.processingEfficiency !== undefined) {
        metrics.processingEfficiency = Math.min(metrics.processingEfficiency, result.metrics.processingEfficiency);
      }

      // Count errors by type
      for (const error of result.errors) {
        switch (error.type) {
          case GeometricErrorType.SELF_INTERSECTION:
            metrics.selfIntersectionCount++;
            break;
          case GeometricErrorType.DEGENERATE_GEOMETRY:
            metrics.degenerateElementCount++;
            break;
        }
      }
    }

    // Calculate overall scores
    metrics.manufacturability = Math.min(metrics.geometricAccuracy, metrics.topologicalConsistency);
    metrics.architecturalCompliance = metrics.manufacturability * 0.9; // Slightly lower than manufacturability

    return metrics;
  }

  private generateRecommendations(
    stageResults: Map<string, ValidationStageResult>,
    recoveryResults: Map<string, RecoveryResult>
  ): string[] {
    const recommendations: string[] = [];

    for (const [stageName, result] of stageResults) {
      if (!result.passed) {
        recommendations.push(`Address ${stageName} validation issues`);
        
        for (const error of result.errors) {
          if (error.suggestedFix) {
            recommendations.push(`${stageName}: ${error.suggestedFix}`);
          }
        }
      }
    }

    for (const [stageName, result] of recoveryResults) {
      if (result.success && result.qualityImpact > 0.2) {
        recommendations.push(`Review ${stageName} recovery - significant quality impact: ${result.qualityImpact}`);
      }
    }

    return recommendations;
  }

  private getStageWeight(stageName: string): number {
    const weights: Record<string, number> = {
      'geometric_consistency': 0.3,
      'topology': 0.25,
      'numerical_stability': 0.2,
      'quality_metrics': 0.15,
      'performance': 0.1
    };
    return weights[stageName] || 0.1;
  }

  private createSuccessResult(startTime: number): PipelineExecutionResult {
    return {
      success: true,
      stageResults: new Map(),
      recoveryResults: new Map(),
      overallQuality: {
        geometricAccuracy: 1.0,
        topologicalConsistency: 1.0,
        manufacturability: 1.0,
        architecturalCompliance: 1.0,
        sliverFaceCount: 0,
        microGapCount: 0,
        selfIntersectionCount: 0,
        degenerateElementCount: 0,
        complexity: 0,
        processingEfficiency: 1.0,
        memoryUsage: 0
      },
      totalProcessingTime: performance.now() - startTime,
      recommendedActions: []
    };
  }

  // Helper methods for geometric checks
  private hasSelfIntersections(curve: Curve): boolean {
    const points = curve.points;
    for (let i = 0; i < points.length - 1; i++) {
      for (let j = i + 2; j < points.length - 1; j++) {
        if (j === points.length - 2 && i === 0) continue; // Skip adjacent segments
        
        const seg1 = { start: points[i], end: points[i + 1] };
        const seg2 = { start: points[j], end: points[j + 1] };
        
        if (this.segmentsIntersect(seg1, seg2)) {
          return true;
        }
      }
    }
    return false;
  }

  private segmentsIntersect(seg1: any, seg2: any): boolean {
    const { start: p1, end: p2 } = seg1;
    const { start: p3, end: p4 } = seg2;

    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (Math.abs(denom) < 1e-10) return false; // Parallel lines

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  private isClockwise(points: any[]): boolean {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      sum += (p2.x - p1.x) * (p2.y + p1.y);
    }
    return sum > 0;
  }

  private hasDuplicateConsecutiveVertices(points: any[]): boolean {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (Math.abs(p1.x - p2.x) < 1e-10 && Math.abs(p1.y - p2.y) < 1e-10) {
        return true;
      }
    }
    return false;
  }

  private removeDuplicateConsecutiveVertices(points: any[]): any[] {
    const filtered = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const prev = filtered[filtered.length - 1];
      const current = points[i];
      if (Math.abs(current.x - prev.x) >= 1e-10 || Math.abs(current.y - prev.y) >= 1e-10) {
        filtered.push(current);
      }
    }
    return filtered;
  }

  private removeSelfIntersections(points: any[]): any[] {
    // Simple approach: remove points that create self-intersections
    // This is a basic implementation - more sophisticated algorithms exist
    const filtered = [...points];
    let changed = true;
    
    while (changed && filtered.length > 3) {
      changed = false;
      for (let i = 0; i < filtered.length - 3; i++) {
        for (let j = i + 2; j < filtered.length - 1; j++) {
          if (j === filtered.length - 2 && i === 0) continue;
          
          const seg1 = { start: filtered[i], end: filtered[i + 1] };
          const seg2 = { start: filtered[j], end: filtered[j + 1] };
          
          if (this.segmentsIntersect(seg1, seg2)) {
            // Remove the point that creates the intersection
            filtered.splice(i + 1, 1);
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }
    
    return filtered;
  }
}