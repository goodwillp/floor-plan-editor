import { WallSolid } from '../geometry/WallSolid';
import { Curve } from '../geometry/Curve';
import { BIMPolygon } from '../geometry/BIMPolygon';
import { GeometricError, GeometricErrorType, ErrorSeverity } from './GeometricError';
import { QualityMetrics } from '../types/QualityTypes';

export interface RecoveryStrategy {
  name: string;
  description: string;
  applicableErrorTypes: GeometricErrorType[];
  priority: number;
  execute: (data: any, error: GeometricError) => RecoveryAttemptResult;
}

export interface RecoveryAttemptResult {
  success: boolean;
  recoveredData: any;
  strategyUsed: string;
  qualityImpact: number;
  processingTime: number;
  warnings: string[];
  requiresUserReview: boolean;
}

export interface RecoveryConfiguration {
  enableAutoRecovery: boolean;
  maxRecoveryAttempts: number;
  qualityThreshold: number;
  requireUserConfirmation: boolean;
  fallbackToSimplification: boolean;
  preserveOriginalData: boolean;
}

export interface RecoverySession {
  sessionId: string;
  startTime: number;
  originalData: any;
  currentData: any;
  appliedStrategies: string[];
  totalQualityImpact: number;
  recoveryHistory: RecoveryAttemptResult[];
  isComplete: boolean;
  requiresUserIntervention: boolean;
}

/**
 * Automatic recovery system that attempts to fix invalid geometry
 * using a prioritized set of recovery strategies
 */
export class AutomaticRecoverySystem {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private config: RecoveryConfiguration;
  private activeSessions: Map<string, RecoverySession> = new Map();

  constructor(config: Partial<RecoveryConfiguration> = {}) {
    this.config = {
      enableAutoRecovery: true,
      maxRecoveryAttempts: 5,
      qualityThreshold: 0.7,
      requireUserConfirmation: false,
      fallbackToSimplification: true,
      preserveOriginalData: true,
      ...config
    };

    this.initializeStrategies();
  }

  /**
   * Attempt to recover invalid geometry automatically
   */
  async attemptRecovery(
    data: any,
    errors: GeometricError[],
    sessionId?: string
  ): Promise<RecoverySession> {
    const session = this.createRecoverySession(data, sessionId);
    
    if (!this.config.enableAutoRecovery) {
      session.isComplete = true;
      session.requiresUserIntervention = true;
      return session;
    }

    // Sort errors by severity and recoverability
    const sortedErrors = this.prioritizeErrors(errors);
    
    for (const error of sortedErrors) {
      if (session.appliedStrategies.length >= this.config.maxRecoveryAttempts) {
        session.requiresUserIntervention = true;
        break;
      }

      const recoveryResult = await this.applyBestStrategy(session.currentData, error);
      session.recoveryHistory.push(recoveryResult);

      if (recoveryResult.success) {
        session.currentData = recoveryResult.recoveredData;
        session.appliedStrategies.push(recoveryResult.strategyUsed);
        session.totalQualityImpact += recoveryResult.qualityImpact;

        // Check if quality threshold is exceeded
        if (session.totalQualityImpact > (1 - this.config.qualityThreshold)) {
          session.requiresUserIntervention = true;
          break;
        }
      } else if (error.severity === ErrorSeverity.CRITICAL) {
        session.requiresUserIntervention = true;
        break;
      }
    }

    session.isComplete = true;
    this.activeSessions.set(session.sessionId, session);
    
    return session;
  }

  /**
   * Get recovery recommendations for manual intervention
   */
  getRecoveryRecommendations(
    data: any,
    errors: GeometricError[]
  ): RecoveryRecommendation[] {
    const recommendations: RecoveryRecommendation[] = [];

    for (const error of errors) {
      const applicableStrategies = this.getApplicableStrategies(error.type);
      
      for (const strategy of applicableStrategies) {
        recommendations.push({
          errorType: error.type,
          strategyName: strategy.name,
          description: strategy.description,
          estimatedQualityImpact: this.estimateQualityImpact(strategy, error),
          requiresUserInput: this.requiresUserInput(strategy),
          confidence: this.calculateConfidence(strategy, error)
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Apply specific recovery strategy manually
   */
  async applyStrategy(
    data: any,
    error: GeometricError,
    strategyName: string
  ): Promise<RecoveryAttemptResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return {
        success: false,
        recoveredData: data,
        strategyUsed: strategyName,
        qualityImpact: 0,
        processingTime: 0,
        warnings: [`Strategy '${strategyName}' not found`],
        requiresUserReview: false
      };
    }

    return strategy.execute(data, error);
  }

  /**
   * Get active recovery session
   */
  getRecoverySession(sessionId: string): RecoverySession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Complete recovery session and clean up
   */
  completeRecoverySession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  private initializeStrategies(): void {
    // Degenerate geometry recovery
    this.strategies.set('degenerate_geometry_recovery', {
      name: 'Degenerate Geometry Recovery',
      description: 'Fix degenerate geometric elements by adding minimal valid geometry',
      applicableErrorTypes: [GeometricErrorType.DEGENERATE_GEOMETRY],
      priority: 1,
      execute: this.recoverDegenerateGeometry.bind(this)
    });

    // Self-intersection resolution
    this.strategies.set('self_intersection_resolution', {
      name: 'Self-Intersection Resolution',
      description: 'Remove self-intersections by simplifying curves',
      applicableErrorTypes: [GeometricErrorType.SELF_INTERSECTION],
      priority: 2,
      execute: this.resolveSelfIntersections.bind(this)
    });

    // Numerical stability recovery
    this.strategies.set('numerical_stability_recovery', {
      name: 'Numerical Stability Recovery',
      description: 'Fix numerical instability by adjusting precision and removing micro-segments',
      applicableErrorTypes: [GeometricErrorType.NUMERICAL_INSTABILITY],
      priority: 3,
      execute: this.recoverNumericalStability.bind(this)
    });

    // Topology repair
    this.strategies.set('topology_repair', {
      name: 'Topology Repair',
      description: 'Repair topological inconsistencies in geometric data',
      applicableErrorTypes: [GeometricErrorType.TOPOLOGY_ERROR],
      priority: 4,
      execute: this.repairTopology.bind(this)
    });

    // Duplicate vertex removal
    this.strategies.set('duplicate_vertex_removal', {
      name: 'Duplicate Vertex Removal',
      description: 'Remove duplicate and near-duplicate vertices',
      applicableErrorTypes: [GeometricErrorType.DUPLICATE_VERTICES],
      priority: 5,
      execute: this.removeDuplicateVertices.bind(this)
    });

    // Geometric simplification
    this.strategies.set('geometric_simplification', {
      name: 'Geometric Simplification',
      description: 'Simplify complex geometry to resolve issues',
      applicableErrorTypes: [
        GeometricErrorType.COMPLEXITY_EXCEEDED,
        GeometricErrorType.SELF_INTERSECTION,
        GeometricErrorType.NUMERICAL_INSTABILITY
      ],
      priority: 6,
      execute: this.simplifyGeometry.bind(this)
    });

    // Fallback reconstruction
    this.strategies.set('fallback_reconstruction', {
      name: 'Fallback Reconstruction',
      description: 'Reconstruct geometry using simplified algorithms',
      applicableErrorTypes: [
        GeometricErrorType.BOOLEAN_FAILURE,
        GeometricErrorType.OFFSET_FAILURE
      ],
      priority: 10,
      execute: this.reconstructGeometry.bind(this)
    });
  }

  private createRecoverySession(data: any, sessionId?: string): RecoverySession {
    const id = sessionId || `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sessionId: id,
      startTime: performance.now(),
      originalData: this.config.preserveOriginalData ? JSON.parse(JSON.stringify(data)) : null,
      currentData: data,
      appliedStrategies: [],
      totalQualityImpact: 0,
      recoveryHistory: [],
      isComplete: false,
      requiresUserIntervention: false
    };
  }

  private prioritizeErrors(errors: GeometricError[]): GeometricError[] {
    return errors.sort((a, b) => {
      // Sort by severity first
      const severityOrder = {
        [ErrorSeverity.CRITICAL]: 0,
        [ErrorSeverity.ERROR]: 1,
        [ErrorSeverity.WARNING]: 2
      };

      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }

      // Then by recoverability
      if (a.recoverable !== b.recoverable) {
        return a.recoverable ? -1 : 1;
      }

      return 0;
    });
  }

  private async applyBestStrategy(data: any, error: GeometricError): Promise<RecoveryAttemptResult> {
    const applicableStrategies = this.getApplicableStrategies(error.type);
    
    if (applicableStrategies.length === 0) {
      return {
        success: false,
        recoveredData: data,
        strategyUsed: 'none',
        qualityImpact: 0,
        processingTime: 0,
        warnings: [`No applicable strategies for error type: ${error.type}`],
        requiresUserReview: true
      };
    }

    // Try strategies in priority order
    for (const strategy of applicableStrategies) {
      try {
        const result = strategy.execute(data, error);
        if (result.success) {
          return result;
        }
      } catch (strategyError) {
        // Continue to next strategy
        continue;
      }
    }

    return {
      success: false,
      recoveredData: data,
      strategyUsed: 'all_failed',
      qualityImpact: 0,
      processingTime: 0,
      warnings: ['All applicable strategies failed'],
      requiresUserReview: true
    };
  }

  private getApplicableStrategies(errorType: GeometricErrorType): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];
    
    for (const strategy of this.strategies.values()) {
      if (strategy.applicableErrorTypes.includes(errorType)) {
        strategies.push(strategy);
      }
    }

    return strategies.sort((a, b) => a.priority - b.priority);
  }

  private recoverDegenerateGeometry(data: any, error: GeometricError): RecoveryAttemptResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    let qualityImpact = 0;

    if (data instanceof WallSolid) {
      let recoveredData = { ...data };

      // Fix degenerate baseline
      if (!recoveredData.baseline || recoveredData.baseline.points.length < 2) {
        recoveredData.baseline = {
          id: 'recovered_baseline',
          points: [
            { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
            { x: 100, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true }
          ],
          type: 'polyline' as any,
          isClosed: false,
          length: 100,
          boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 0 },
          curvature: [0, 0],
          tangents: [{ x: 1, y: 0 }, { x: 1, y: 0 }]
        };
        qualityImpact += 0.4;
        warnings.push('Created minimal baseline for degenerate geometry');
      }

      // Fix zero thickness
      if (recoveredData.thickness <= 0) {
        recoveredData.thickness = 100;
        qualityImpact += 0.2;
        warnings.push('Set default thickness for zero thickness');
      }

      // Fix empty solid geometry
      if (!recoveredData.solidGeometry || recoveredData.solidGeometry.length === 0) {
        recoveredData.solidGeometry = this.createMinimalSolidGeometry(recoveredData.baseline, recoveredData.thickness);
        qualityImpact += 0.3;
        warnings.push('Created minimal solid geometry');
      }

      return {
        success: true,
        recoveredData,
        strategyUsed: 'degenerate_geometry_recovery',
        qualityImpact,
        processingTime: performance.now() - startTime,
        warnings,
        requiresUserReview: qualityImpact > 0.3
      };
    }

    return {
      success: false,
      recoveredData: data,
      strategyUsed: 'degenerate_geometry_recovery',
      qualityImpact: 0,
      processingTime: performance.now() - startTime,
      warnings: ['Unsupported data type for degenerate geometry recovery'],
      requiresUserReview: true
    };
  }

  private resolveSelfIntersections(data: any, error: GeometricError): RecoveryAttemptResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    let qualityImpact = 0;

    if (data instanceof WallSolid) {
      let recoveredData = { ...data };
      
      // Simplify baseline to remove self-intersections
      const originalPointCount = recoveredData.baseline.points.length;
      recoveredData.baseline.points = this.removeSelfIntersectingSegments(recoveredData.baseline.points);
      
      const removedPoints = originalPointCount - recoveredData.baseline.points.length;
      qualityImpact = removedPoints / originalPointCount;
      
      if (removedPoints > 0) {
        warnings.push(`Removed ${removedPoints} points to resolve self-intersections`);
        
        // Recalculate baseline properties
        recoveredData.baseline.length = this.calculateCurveLength(recoveredData.baseline.points);
        recoveredData.baseline.boundingBox = this.calculateBoundingBox(recoveredData.baseline.points);
      }

      return {
        success: removedPoints > 0,
        recoveredData,
        strategyUsed: 'self_intersection_resolution',
        qualityImpact,
        processingTime: performance.now() - startTime,
        warnings,
        requiresUserReview: qualityImpact > 0.2
      };
    }

    return {
      success: false,
      recoveredData: data,
      strategyUsed: 'self_intersection_resolution',
      qualityImpact: 0,
      processingTime: performance.now() - startTime,
      warnings: ['Unsupported data type for self-intersection resolution'],
      requiresUserReview: true
    };
  }

  private recoverNumericalStability(data: any, error: GeometricError): RecoveryAttemptResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    let qualityImpact = 0;

    if (data instanceof WallSolid) {
      let recoveredData = { ...data };
      
      // Remove micro-segments
      const minSegmentLength = 1e-6;
      const originalPoints = recoveredData.baseline.points;
      const filteredPoints = this.filterMicroSegments(originalPoints, minSegmentLength);
      
      const removedSegments = originalPoints.length - filteredPoints.length;
      if (removedSegments > 0) {
        recoveredData.baseline.points = filteredPoints;
        qualityImpact += removedSegments / originalPoints.length * 0.1;
        warnings.push(`Removed ${removedSegments} micro-segments`);
      }

      // Clamp extreme coordinates
      const maxCoordinate = 1e6;
      let clampedCoordinates = 0;
      recoveredData.baseline.points = recoveredData.baseline.points.map(point => {
        const clampedX = Math.max(-maxCoordinate, Math.min(maxCoordinate, point.x));
        const clampedY = Math.max(-maxCoordinate, Math.min(maxCoordinate, point.y));
        
        if (clampedX !== point.x || clampedY !== point.y) {
          clampedCoordinates++;
        }
        
        return { ...point, x: clampedX, y: clampedY };
      });

      if (clampedCoordinates > 0) {
        qualityImpact += clampedCoordinates / originalPoints.length * 0.05;
        warnings.push(`Clamped ${clampedCoordinates} extreme coordinates`);
      }

      // Round coordinates to reasonable precision
      const precision = 1e-10;
      recoveredData.baseline.points = recoveredData.baseline.points.map(point => ({
        ...point,
        x: Math.round(point.x / precision) * precision,
        y: Math.round(point.y / precision) * precision
      }));

      return {
        success: removedSegments > 0 || clampedCoordinates > 0,
        recoveredData,
        strategyUsed: 'numerical_stability_recovery',
        qualityImpact,
        processingTime: performance.now() - startTime,
        warnings,
        requiresUserReview: qualityImpact > 0.1
      };
    }

    return {
      success: false,
      recoveredData: data,
      strategyUsed: 'numerical_stability_recovery',
      qualityImpact: 0,
      processingTime: performance.now() - startTime,
      warnings: ['Unsupported data type for numerical stability recovery'],
      requiresUserReview: true
    };
  }

  private repairTopology(data: any, error: GeometricError): RecoveryAttemptResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    let qualityImpact = 0;

    if (data instanceof WallSolid && data.solidGeometry) {
      let recoveredData = { ...data };
      
      recoveredData.solidGeometry = recoveredData.solidGeometry.map(polygon => {
        let repairedPolygon = { ...polygon };

        // Ensure minimum vertex count
        if (polygon.outerRing.length < 3) {
          repairedPolygon = this.createMinimalPolygon();
          qualityImpact += 0.5;
          warnings.push('Created minimal polygon for insufficient vertices');
        }

        // Fix orientation
        if (!this.isClockwise(repairedPolygon.outerRing)) {
          repairedPolygon.outerRing = repairedPolygon.outerRing.reverse();
          qualityImpact += 0.05;
          warnings.push('Fixed polygon orientation');
        }

        // Remove duplicate consecutive vertices
        const originalVertexCount = repairedPolygon.outerRing.length;
        repairedPolygon.outerRing = this.removeDuplicateConsecutiveVertices(repairedPolygon.outerRing);
        const removedVertices = originalVertexCount - repairedPolygon.outerRing.length;
        
        if (removedVertices > 0) {
          qualityImpact += removedVertices / originalVertexCount * 0.1;
          warnings.push(`Removed ${removedVertices} duplicate vertices`);
        }

        return repairedPolygon;
      });

      return {
        success: true,
        recoveredData,
        strategyUsed: 'topology_repair',
        qualityImpact,
        processingTime: performance.now() - startTime,
        warnings,
        requiresUserReview: qualityImpact > 0.2
      };
    }

    return {
      success: false,
      recoveredData: data,
      strategyUsed: 'topology_repair',
      qualityImpact: 0,
      processingTime: performance.now() - startTime,
      warnings: ['Unsupported data type for topology repair'],
      requiresUserReview: true
    };
  }

  private removeDuplicateVertices(data: any, error: GeometricError): RecoveryAttemptResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    let qualityImpact = 0;

    if (data instanceof WallSolid) {
      let recoveredData = { ...data };
      
      // Remove duplicates from baseline
      const originalBaselineCount = recoveredData.baseline.points.length;
      recoveredData.baseline.points = this.removeDuplicatePoints(recoveredData.baseline.points, 1e-10);
      const removedBaselinePoints = originalBaselineCount - recoveredData.baseline.points.length;
      
      if (removedBaselinePoints > 0) {
        qualityImpact += removedBaselinePoints / originalBaselineCount * 0.1;
        warnings.push(`Removed ${removedBaselinePoints} duplicate baseline points`);
      }

      // Remove duplicates from solid geometry
      if (recoveredData.solidGeometry) {
        recoveredData.solidGeometry = recoveredData.solidGeometry.map(polygon => ({
          ...polygon,
          outerRing: this.removeDuplicatePoints(polygon.outerRing, 1e-10)
        }));
      }

      return {
        success: removedBaselinePoints > 0,
        recoveredData,
        strategyUsed: 'duplicate_vertex_removal',
        qualityImpact,
        processingTime: performance.now() - startTime,
        warnings,
        requiresUserReview: false
      };
    }

    return {
      success: false,
      recoveredData: data,
      strategyUsed: 'duplicate_vertex_removal',
      qualityImpact: 0,
      processingTime: performance.now() - startTime,
      warnings: ['Unsupported data type for duplicate vertex removal'],
      requiresUserReview: true
    };
  }

  private simplifyGeometry(data: any, error: GeometricError): RecoveryAttemptResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    let qualityImpact = 0;

    if (data instanceof WallSolid) {
      let recoveredData = { ...data };
      
      // Simplify baseline using Douglas-Peucker algorithm
      const tolerance = recoveredData.thickness * 0.01; // 1% of thickness
      const originalPointCount = recoveredData.baseline.points.length;
      recoveredData.baseline.points = this.douglasPeuckerSimplify(recoveredData.baseline.points, tolerance);
      
      const removedPoints = originalPointCount - recoveredData.baseline.points.length;
      qualityImpact = removedPoints / originalPointCount * 0.3;
      
      if (removedPoints > 0) {
        warnings.push(`Simplified baseline: removed ${removedPoints} points`);
        
        // Recalculate baseline properties
        recoveredData.baseline.length = this.calculateCurveLength(recoveredData.baseline.points);
        recoveredData.baseline.boundingBox = this.calculateBoundingBox(recoveredData.baseline.points);
      }

      return {
        success: removedPoints > 0,
        recoveredData,
        strategyUsed: 'geometric_simplification',
        qualityImpact,
        processingTime: performance.now() - startTime,
        warnings,
        requiresUserReview: qualityImpact > 0.2
      };
    }

    return {
      success: false,
      recoveredData: data,
      strategyUsed: 'geometric_simplification',
      qualityImpact: 0,
      processingTime: performance.now() - startTime,
      warnings: ['Unsupported data type for geometric simplification'],
      requiresUserReview: true
    };
  }

  private reconstructGeometry(data: any, error: GeometricError): RecoveryAttemptResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    const qualityImpact = 0.6; // High quality impact for reconstruction

    if (data instanceof WallSolid) {
      // Create simplified geometry from baseline
      const recoveredData = this.createSimplifiedWallSolid(data.baseline, data.thickness);
      
      warnings.push('Reconstructed geometry using simplified algorithms');
      warnings.push('Significant quality impact - manual review recommended');

      return {
        success: true,
        recoveredData,
        strategyUsed: 'fallback_reconstruction',
        qualityImpact,
        processingTime: performance.now() - startTime,
        warnings,
        requiresUserReview: true
      };
    }

    return {
      success: false,
      recoveredData: data,
      strategyUsed: 'fallback_reconstruction',
      qualityImpact: 0,
      processingTime: performance.now() - startTime,
      warnings: ['Unsupported data type for geometry reconstruction'],
      requiresUserReview: true
    };
  }

  // Helper methods
  private createMinimalSolidGeometry(baseline: Curve, thickness: number): BIMPolygon[] {
    const halfThickness = thickness / 2;
    const points = baseline.points;
    
    if (points.length < 2) return [];

    // Create simple rectangular solid
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return [];

    const nx = -dy / length; // Normal x
    const ny = dx / length;  // Normal y

    return [{
      id: 'minimal_solid',
      outerRing: [
        { x: start.x + nx * halfThickness, y: start.y + ny * halfThickness, id: 'p1', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
        { x: end.x + nx * halfThickness, y: end.y + ny * halfThickness, id: 'p2', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
        { x: end.x - nx * halfThickness, y: end.y - ny * halfThickness, id: 'p3', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
        { x: start.x - nx * halfThickness, y: start.y - ny * halfThickness, id: 'p4', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true }
      ],
      holes: [],
      area: thickness * length,
      perimeter: 2 * (thickness + length),
      centroid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, id: 'centroid', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
      boundingBox: this.calculateBoundingBox([start, end]),
      isValid: true,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'recovery',
      healingApplied: false,
      simplificationApplied: false
    }];
  }

  private createMinimalPolygon(): BIMPolygon {
    return {
      id: 'minimal_polygon',
      outerRing: [
        { x: 0, y: 0, id: 'p1', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
        { x: 50, y: 0, id: 'p2', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
        { x: 25, y: 50, id: 'p3', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true }
      ],
      holes: [],
      area: 1250,
      perimeter: 150,
      centroid: { x: 25, y: 16.67, id: 'centroid', tolerance: 0.001, creationMethod: 'recovery', accuracy: 0.8, validated: true },
      boundingBox: { minX: 0, minY: 0, maxX: 50, maxY: 50 },
      isValid: true,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'recovery',
      healingApplied: false,
      simplificationApplied: false
    };
  }

  private createSimplifiedWallSolid(baseline: Curve, thickness: number): WallSolid {
    return {
      id: 'recovered_wall',
      baseline,
      thickness,
      wallType: 'Layout',
      leftOffset: baseline, // Simplified - same as baseline
      rightOffset: baseline, // Simplified - same as baseline
      solidGeometry: this.createMinimalSolidGeometry(baseline, thickness),
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: [],
      geometricQuality: {
        geometricAccuracy: 0.4,
        topologicalConsistency: 0.6,
        manufacturability: 0.5,
        architecturalCompliance: 0.4,
        sliverFaceCount: 0,
        microGapCount: 0,
        selfIntersectionCount: 0,
        degenerateElementCount: 0,
        complexity: 1,
        processingEfficiency: 0.8,
        memoryUsage: 1024
      },
      lastValidated: new Date(),
      processingTime: 0,
      complexity: 1
    };
  }

  // Geometric utility methods
  private removeSelfIntersectingSegments(points: any[]): any[] {
    // Implementation similar to ValidationPipeline
    const filtered = [...points];
    let changed = true;
    
    while (changed && filtered.length > 3) {
      changed = false;
      for (let i = 0; i < filtered.length - 3; i++) {
        for (let j = i + 2; j < filtered.length - 1; j++) {
          if (j === filtered.length - 2 && i === 0) continue;
          
          if (this.segmentsIntersect(
            { start: filtered[i], end: filtered[i + 1] },
            { start: filtered[j], end: filtered[j + 1] }
          )) {
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

  private filterMicroSegments(points: any[], minLength: number): any[] {
    const filtered = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const prev = filtered[filtered.length - 1];
      const current = points[i];
      const distance = Math.sqrt((current.x - prev.x) ** 2 + (current.y - prev.y) ** 2);
      
      if (distance >= minLength) {
        filtered.push(current);
      }
    }
    
    return filtered;
  }

  private removeDuplicatePoints(points: any[], tolerance: number): any[] {
    const filtered = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      let isDuplicate = false;
      
      for (const existing of filtered) {
        const distance = Math.sqrt((current.x - existing.x) ** 2 + (current.y - existing.y) ** 2);
        if (distance < tolerance) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        filtered.push(current);
      }
    }
    
    return filtered;
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

  private douglasPeuckerSimplify(points: any[], tolerance: number): any[] {
    if (points.length <= 2) return points;

    // Find the point with maximum distance from line between first and last
    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.pointToLineDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const left = this.douglasPeuckerSimplify(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeuckerSimplify(points.slice(maxIndex), tolerance);
      return left.slice(0, -1).concat(right);
    } else {
      return [start, end];
    }
  }

  private pointToLineDistance(point: any, lineStart: any, lineEnd: any): number {
    const A = lineEnd.x - lineStart.x;
    const B = lineEnd.y - lineStart.y;
    const C = point.x - lineStart.x;
    const D = point.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = A * A + B * B;
    
    if (lenSq === 0) return Math.sqrt(C * C + D * D);

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * A;
      yy = lineStart.y + param * B;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateCurveLength(points: any[]): number {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      length += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }
    return length;
  }

  private calculateBoundingBox(points: any[]): any {
    if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = points[0].x, maxX = points[0].x;
    let minY = points[0].y, maxY = points[0].y;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
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

  private segmentsIntersect(seg1: any, seg2: any): boolean {
    const { start: p1, end: p2 } = seg1;
    const { start: p3, end: p4 } = seg2;

    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (Math.abs(denom) < 1e-10) return false;

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  private estimateQualityImpact(strategy: RecoveryStrategy, error: GeometricError): number {
    // Estimate quality impact based on strategy and error type
    const baseImpact = {
      'degenerate_geometry_recovery': 0.3,
      'self_intersection_resolution': 0.2,
      'numerical_stability_recovery': 0.1,
      'topology_repair': 0.15,
      'duplicate_vertex_removal': 0.05,
      'geometric_simplification': 0.25,
      'fallback_reconstruction': 0.6
    };

    return baseImpact[strategy.name] || 0.2;
  }

  private requiresUserInput(strategy: RecoveryStrategy): boolean {
    const userInputRequired = [
      'fallback_reconstruction',
      'geometric_simplification'
    ];

    return userInputRequired.includes(strategy.name);
  }

  private calculateConfidence(strategy: RecoveryStrategy, error: GeometricError): number {
    // Calculate confidence based on strategy applicability and error characteristics
    let confidence = 0.5;

    if (strategy.applicableErrorTypes.includes(error.type)) {
      confidence += 0.3;
    }

    if (error.recoverable) {
      confidence += 0.2;
    }

    // Adjust based on strategy priority (lower priority = higher confidence for specific cases)
    confidence += (10 - strategy.priority) * 0.01;

    return Math.min(1.0, confidence);
  }
}

export interface RecoveryRecommendation {
  errorType: GeometricErrorType;
  strategyName: string;
  description: string;
  estimatedQualityImpact: number;
  requiresUserInput: boolean;
  confidence: number;
}