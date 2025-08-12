/**
 * Comprehensive error visualization system for BIM geometric operations
 */

import { GeometricError } from '../validation/GeometricError';
import type { WallSolid } from '../geometry/WallSolid';
import type { BIMPoint } from '../geometry/BIMPoint';
import type { BIMPolygon } from '../geometry/BIMPolygon';

export interface ErrorVisualizationConfig {
  enableErrorHighlighting: boolean;
  enableTooltips: boolean;
  enableRecoveryVisualization: boolean;
  enableStatisticsDashboard: boolean;
  colorScheme: ErrorColorScheme;
  severityLevels: SeverityLevelConfig[];
}

export interface ErrorColorScheme {
  critical: string;
  high: string;
  medium: string;
  low: string;
  warning: string;
  info: string;
  background: string;
  text: string;
}

export interface SeverityLevelConfig {
  level: ErrorSeverityLevel;
  color: string;
  opacity: number;
  strokeWidth: number;
  dashPattern?: number[];
  icon?: string;
}

export enum ErrorSeverityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  WARNING = 'warning',
  INFO = 'info'
}

export interface ErrorHighlight {
  id: string;
  error: GeometricError;
  geometry: ErrorGeometry;
  severity: ErrorSeverityLevel;
  position: BIMPoint;
  bounds: BoundingBox;
  tooltip: ErrorTooltip;
  suggestedFix?: SuggestedFix;
}

export interface ErrorGeometry {
  type: 'point' | 'line' | 'polygon' | 'area';
  coordinates: BIMPoint[];
  style: ErrorVisualizationStyle;
}

export interface ErrorVisualizationStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  dashPattern?: number[];
  animation?: AnimationConfig;
}

export interface AnimationConfig {
  type: 'pulse' | 'blink' | 'glow' | 'none';
  duration: number;
  iterations: number | 'infinite';
}

export interface ErrorTooltip {
  title: string;
  description: string;
  technicalDetails: string;
  suggestedActions: string[];
  relatedErrors: string[];
  timestamp: number;
}

export interface SuggestedFix {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  steps: FixStep[];
  previewAvailable: boolean;
}

export interface FixStep {
  id: string;
  description: string;
  action: string;
  parameters: Record<string, any>;
  validation: string;
}

export interface ErrorRecoveryVisualization {
  errorId: string;
  beforeState: GeometrySnapshot;
  afterState: GeometrySnapshot;
  recoveryMethod: string;
  success: boolean;
  qualityImpact: number;
}

export interface GeometrySnapshot {
  timestamp: number;
  geometry: WallSolid | BIMPolygon | BIMPoint[];
  quality: number;
  metadata: Record<string, any>;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsBySeverity: Map<ErrorSeverityLevel, number>;
  errorTrends: ErrorTrend[];
  resolutionRate: number;
  averageResolutionTime: number;
  topErrorTypes: Array<{ type: string; count: number; percentage: number }>;
}

export interface ErrorTrend {
  timestamp: number;
  errorCount: number;
  severity: ErrorSeverityLevel;
  type: string;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class ErrorVisualizationSystem {
  private config: ErrorVisualizationConfig;
  private errorHighlights: Map<string, ErrorHighlight> = new Map();
  private recoveryVisualizations: Map<string, ErrorRecoveryVisualization> = new Map();
  private errorHistory: GeometricError[] = [];
  private fixSuggestions: Map<string, SuggestedFix> = new Map();

  constructor(config?: Partial<ErrorVisualizationConfig>) {
    this.config = {
      enableErrorHighlighting: true,
      enableTooltips: true,
      enableRecoveryVisualization: true,
      enableStatisticsDashboard: true,
      colorScheme: {
        critical: '#FF0000',
        high: '#FF6600',
        medium: '#FFAA00',
        low: '#FFDD00',
        warning: '#FFF000',
        info: '#00AAFF',
        background: '#FFFFFF',
        text: '#000000'
      },
      severityLevels: [
        {
          level: ErrorSeverityLevel.CRITICAL,
          color: '#FF0000',
          opacity: 0.8,
          strokeWidth: 3,
          dashPattern: [5, 5]
        },
        {
          level: ErrorSeverityLevel.HIGH,
          color: '#FF6600',
          opacity: 0.7,
          strokeWidth: 2,
          dashPattern: [3, 3]
        },
        {
          level: ErrorSeverityLevel.MEDIUM,
          color: '#FFAA00',
          opacity: 0.6,
          strokeWidth: 2
        },
        {
          level: ErrorSeverityLevel.LOW,
          color: '#FFDD00',
          opacity: 0.5,
          strokeWidth: 1
        },
        {
          level: ErrorSeverityLevel.WARNING,
          color: '#FFF000',
          opacity: 0.4,
          strokeWidth: 1
        },
        {
          level: ErrorSeverityLevel.INFO,
          color: '#00AAFF',
          opacity: 0.3,
          strokeWidth: 1
        }
      ],
      ...config
    };
  }

  /**
   * Highlight geometric errors with visual indicators
   */
  highlightError(error: GeometricError, geometry: any): string {
    if (!this.config.enableErrorHighlighting) return '';

    const highlightId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const severity = this.mapErrorToSeverity(error);
    const position = this.extractErrorPosition(error, geometry);
    const bounds = this.calculateBounds(geometry);
    
    const highlight: ErrorHighlight = {
      id: highlightId,
      error,
      geometry: this.createErrorGeometry(error, geometry, severity),
      severity,
      position,
      bounds,
      tooltip: this.createErrorTooltip(error),
      suggestedFix: this.generateSuggestedFix(error)
    };

    this.errorHighlights.set(highlightId, highlight);
    this.errorHistory.push(error);

    return highlightId;
  }

  /**
   * Remove error highlight
   */
  removeErrorHighlight(highlightId: string): boolean {
    return this.errorHighlights.delete(highlightId);
  }

  /**
   * Get all current error highlights
   */
  getErrorHighlights(severityFilter?: ErrorSeverityLevel[]): ErrorHighlight[] {
    const highlights = Array.from(this.errorHighlights.values());
    
    if (severityFilter && severityFilter.length > 0) {
      return highlights.filter(h => severityFilter.includes(h.severity));
    }
    
    return highlights;
  }

  /**
   * Create error tooltip with detailed information
   */
  createErrorTooltip(error: GeometricError): ErrorTooltip {
    const relatedErrors = this.findRelatedErrors(error);
    
    return {
      title: this.getErrorTitle(error),
      description: error.message,
      technicalDetails: this.formatTechnicalDetails(error),
      suggestedActions: this.getSuggestedActions(error),
      relatedErrors: relatedErrors.map(e => e.id),
      timestamp: Date.now()
    };
  }

  /**
   * Visualize error recovery process
   */
  visualizeErrorRecovery(
    errorId: string,
    beforeGeometry: any,
    afterGeometry: any,
    recoveryMethod: string,
    success: boolean
  ): string {
    if (!this.config.enableRecoveryVisualization) return '';

    const visualizationId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const recovery: ErrorRecoveryVisualization = {
      errorId,
      beforeState: {
        timestamp: Date.now() - 1000,
        geometry: beforeGeometry,
        quality: this.calculateGeometryQuality(beforeGeometry),
        metadata: { state: 'before_recovery' }
      },
      afterState: {
        timestamp: Date.now(),
        geometry: afterGeometry,
        quality: this.calculateGeometryQuality(afterGeometry),
        metadata: { state: 'after_recovery' }
      },
      recoveryMethod,
      success,
      qualityImpact: this.calculateQualityImpact(beforeGeometry, afterGeometry)
    };

    this.recoveryVisualizations.set(visualizationId, recovery);
    return visualizationId;
  }

  /**
   * Generate error statistics dashboard data
   */
  generateErrorStatistics(timeWindow?: number): ErrorStatistics {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const relevantErrors = this.errorHistory.filter(e => e.timestamp.getTime() >= cutoffTime);

    const errorsByType = new Map<string, number>();
    const errorsBySeverity = new Map<ErrorSeverityLevel, number>();

    relevantErrors.forEach(error => {
      const type = error.type;
      const severity = this.mapErrorToSeverity(error);

      errorsByType.set(type, (errorsByType.get(type) || 0) + 1);
      errorsBySeverity.set(severity, (errorsBySeverity.get(severity) || 0) + 1);
    });

    const totalErrors = relevantErrors.length;
    const topErrorTypes = Array.from(errorsByType.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalErrors) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const errorTrends = this.calculateErrorTrends(relevantErrors);
    const resolutionStats = this.calculateResolutionStats();

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      errorTrends,
      resolutionRate: resolutionStats.resolutionRate,
      averageResolutionTime: resolutionStats.averageResolutionTime,
      topErrorTypes
    };
  }

  /**
   * Get suggested fixes for an error
   */
  getSuggestedFix(errorId: string): SuggestedFix | null {
    return this.fixSuggestions.get(errorId) || null;
  }

  /**
   * Apply a suggested fix
   */
  applySuggestedFix(fixId: string, parameters?: Record<string, any>): Promise<boolean> {
    const fix = this.fixSuggestions.get(fixId);
    if (!fix) return Promise.resolve(false);

    return this.executeFix(fix, parameters);
  }

  /**
   * Preview the effect of a suggested fix
   */
  previewFix(fixId: string, parameters?: Record<string, any>): Promise<GeometrySnapshot | null> {
    const fix = this.fixSuggestions.get(fixId);
    if (!fix || !fix.previewAvailable) return Promise.resolve(null);

    return this.generateFixPreview(fix, parameters);
  }

  /**
   * Update visualization configuration
   */
  updateConfig(newConfig: Partial<ErrorVisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Refresh existing highlights with new configuration
    this.refreshHighlights();
  }

  /**
   * Export error data for analysis
   */
  exportErrorData(timeWindow?: number): string {
    const statistics = this.generateErrorStatistics(timeWindow);
    const highlights = this.getErrorHighlights();
    const recoveries = Array.from(this.recoveryVisualizations.values());

    return JSON.stringify({
      statistics,
      highlights: highlights.map(h => ({
        id: h.id,
        error: h.error,
        severity: h.severity,
        position: h.position,
        tooltip: h.tooltip
      })),
      recoveries,
      config: this.config,
      exportTimestamp: Date.now()
    }, null, 2);
  }

  /**
   * Clear old error data
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAge;
    
    // Clean up error history
    this.errorHistory = this.errorHistory.filter(e => e.timestamp.getTime() >= cutoffTime);
    
    // Clean up highlights
    for (const [id, highlight] of this.errorHighlights.entries()) {
      if (highlight.error.timestamp.getTime() < cutoffTime) {
        this.errorHighlights.delete(id);
      }
    }
    
    // Clean up recovery visualizations
    for (const [id, recovery] of this.recoveryVisualizations.entries()) {
      if (recovery.beforeState.timestamp < cutoffTime) {
        this.recoveryVisualizations.delete(id);
      }
    }
  }

  /**
   * Map geometric error to severity level
   */
  private mapErrorToSeverity(error: GeometricError): ErrorSeverityLevel {
    switch (error.severity) {
      case 'critical':
        return ErrorSeverityLevel.CRITICAL;
      case 'error':
        return ErrorSeverityLevel.HIGH;
      case 'warning':
        return ErrorSeverityLevel.MEDIUM;
      default:
        return ErrorSeverityLevel.LOW;
    }
  }

  /**
   * Extract error position from geometry
   */
  private extractErrorPosition(error: GeometricError, geometry: any): BIMPoint {
    // Try to extract position from error metadata
    if (error.metadata && error.metadata.position) {
      return error.metadata.position as BIMPoint;
    }

    // Try to extract from geometry
    if (geometry && geometry.centroid) {
      return geometry.centroid;
    }

    if (geometry && geometry.points && geometry.points.length > 0) {
      return geometry.points[0];
    }

    // Default position
    return { 
      x: 0, 
      y: 0, 
      id: 'error_position', 
      tolerance: 0.001,
      creationMethod: 'error_fallback',
      accuracy: 1.0,
      validated: false
    };
  }

  /**
   * Calculate bounding box for geometry
   */
  private calculateBounds(geometry: any): BoundingBox {
    if (!geometry || !geometry.points || geometry.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    const points = geometry.points as BIMPoint[];
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Create error geometry visualization
   */
  private createErrorGeometry(error: GeometricError, geometry: any, severity: ErrorSeverityLevel): ErrorGeometry {
    const severityConfig = this.config.severityLevels.find(s => s.level === severity);
    const style: ErrorVisualizationStyle = {
      fillColor: severityConfig?.color || this.config.colorScheme.medium,
      strokeColor: severityConfig?.color || this.config.colorScheme.medium,
      strokeWidth: severityConfig?.strokeWidth || 2,
      opacity: severityConfig?.opacity || 0.6,
      dashPattern: severityConfig?.dashPattern,
      animation: severity === ErrorSeverityLevel.CRITICAL ? {
        type: 'pulse',
        duration: 1000,
        iterations: 'infinite'
      } : undefined
    };

    let type: 'point' | 'line' | 'polygon' | 'area' = 'point';
    let coordinates: BIMPoint[] = [];

    if (geometry && geometry.points) {
      coordinates = geometry.points;
      if (coordinates.length === 1) {
        type = 'point';
      } else if (coordinates.length === 2) {
        type = 'line';
      } else {
        type = 'polygon';
      }
    } else {
      // Create a point at error position
      coordinates = [this.extractErrorPosition(error, geometry)];
      type = 'point';
    }

    return {
      type,
      coordinates,
      style
    };
  }

  /**
   * Get error title based on error type
   */
  private getErrorTitle(error: GeometricError): string {
    const titles: Record<string, string> = {
      'offset_failure': 'Offset Operation Failed',
      'boolean_failure': 'Boolean Operation Failed',
      'self_intersection': 'Self-Intersection Detected',
      'degenerate_geometry': 'Degenerate Geometry',
      'tolerance_exceeded': 'Tolerance Exceeded',
      'numerical_instability': 'Numerical Instability'
    };

    return titles[error.type] || 'Geometric Error';
  }

  /**
   * Format technical details for tooltip
   */
  private formatTechnicalDetails(error: GeometricError): string {
    const details = [
      `Type: ${error.type}`,
      `Operation: ${error.operation}`,
      `Timestamp: ${new Date(error.timestamp).toLocaleString()}`
    ];

    if (error.metadata) {
      Object.entries(error.metadata).forEach(([key, value]) => {
        details.push(`${key}: ${JSON.stringify(value)}`);
      });
    }

    return details.join('\n');
  }

  /**
   * Get suggested actions for error
   */
  private getSuggestedActions(error: GeometricError): string[] {
    const actions: Record<string, string[]> = {
      'offset_failure': [
        'Try reducing wall thickness',
        'Adjust tolerance settings',
        'Simplify baseline geometry',
        'Use different join type'
      ],
      'boolean_failure': [
        'Check for self-intersections',
        'Increase tolerance values',
        'Simplify geometry before operation',
        'Use alternative boolean algorithm'
      ],
      'self_intersection': [
        'Remove self-intersecting segments',
        'Apply geometry healing',
        'Adjust curve parameters',
        'Use intersection resolution'
      ],
      'degenerate_geometry': [
        'Remove zero-length segments',
        'Merge duplicate points',
        'Apply geometry validation',
        'Increase minimum segment length'
      ]
    };

    return actions[error.type] || ['Review geometry parameters', 'Check input data', 'Contact support'];
  }

  /**
   * Find related errors
   */
  private findRelatedErrors(error: GeometricError): GeometricError[] {
    return this.errorHistory.filter(e => 
      e.id !== error.id && 
      (e.operation === error.operation || 
       e.type === error.type ||
       Math.abs(e.timestamp.getTime() - error.timestamp.getTime()) < 5000) // Within 5 seconds
    ).slice(0, 5); // Limit to 5 related errors
  }

  /**
   * Generate suggested fix for error
   */
  private generateSuggestedFix(error: GeometricError): SuggestedFix {
    const fixId = `fix_${error.id}`;
    
    const fixes: Record<string, Partial<SuggestedFix>> = {
      'offset_failure': {
        title: 'Fix Offset Operation',
        description: 'Adjust parameters to resolve offset failure',
        difficulty: 'medium',
        estimatedTime: 5,
        steps: [
          {
            id: 'step1',
            description: 'Reduce wall thickness by 10%',
            action: 'adjust_thickness',
            parameters: { factor: 0.9 },
            validation: 'thickness > 0'
          },
          {
            id: 'step2',
            description: 'Increase tolerance by 50%',
            action: 'adjust_tolerance',
            parameters: { factor: 1.5 },
            validation: 'tolerance < max_tolerance'
          }
        ]
      },
      'boolean_failure': {
        title: 'Fix Boolean Operation',
        description: 'Resolve boolean operation failure',
        difficulty: 'hard',
        estimatedTime: 10,
        steps: [
          {
            id: 'step1',
            description: 'Apply geometry healing',
            action: 'heal_geometry',
            parameters: {},
            validation: 'geometry.isValid'
          },
          {
            id: 'step2',
            description: 'Retry with increased tolerance',
            action: 'retry_boolean',
            parameters: { tolerance_multiplier: 2.0 },
            validation: 'operation.success'
          }
        ]
      }
    };

    const baseFix = fixes[error.type] || {
      title: 'Generic Fix',
      description: 'Apply generic error resolution',
      difficulty: 'medium',
      estimatedTime: 5,
      steps: []
    };

    const fix: SuggestedFix = {
      id: fixId,
      title: baseFix.title || 'Fix Error',
      description: baseFix.description || 'Apply error resolution',
      difficulty: baseFix.difficulty || 'medium',
      estimatedTime: baseFix.estimatedTime || 5,
      steps: baseFix.steps || [],
      previewAvailable: true
    };

    this.fixSuggestions.set(fixId, fix);
    return fix;
  }

  /**
   * Calculate geometry quality score
   */
  private calculateGeometryQuality(geometry: any): number {
    if (!geometry) return 0;

    let score = 100;

    // Check for basic validity
    if (!geometry.isValid) score -= 50;

    // Check for self-intersections
    if (geometry.selfIntersects) score -= 30;

    // Check for degenerate elements
    if (geometry.hasSliversFaces) score -= 20;

    // Check for micro-gaps
    if (geometry.hasMicroGaps) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Calculate quality impact of recovery
   */
  private calculateQualityImpact(beforeGeometry: any, afterGeometry: any): number {
    const beforeQuality = this.calculateGeometryQuality(beforeGeometry);
    const afterQuality = this.calculateGeometryQuality(afterGeometry);
    
    return afterQuality - beforeQuality;
  }

  /**
   * Calculate error trends
   */
  private calculateErrorTrends(errors: GeometricError[]): ErrorTrend[] {
    const trends: ErrorTrend[] = [];
    const timeWindow = 60 * 60 * 1000; // 1 hour windows
    const now = Date.now();

    for (let i = 0; i < 24; i++) { // Last 24 hours
      const windowStart = now - (i + 1) * timeWindow;
      const windowEnd = now - i * timeWindow;
      
      const windowErrors = errors.filter(e => 
        e.timestamp.getTime() >= windowStart && e.timestamp.getTime() < windowEnd
      );

      const errorsByType = new Map<string, number>();
      windowErrors.forEach(error => {
        errorsByType.set(error.type, (errorsByType.get(error.type) || 0) + 1);
      });

      errorsByType.forEach((count, type) => {
        trends.push({
          timestamp: windowEnd,
          errorCount: count,
          severity: this.mapErrorToSeverity(windowErrors.find(e => e.type === type)!),
          type
        });
      });
    }

    return trends.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate resolution statistics
   */
  private calculateResolutionStats(): { resolutionRate: number; averageResolutionTime: number } {
    const resolvedErrors = this.errorHistory.filter(e => e.resolved);
    const totalErrors = this.errorHistory.length;
    
    const resolutionRate = totalErrors > 0 ? resolvedErrors.length / totalErrors : 0;
    
    const resolutionTimes = resolvedErrors
      .filter(e => e.resolvedAt)
      .map(e => e.resolvedAt!.getTime() - e.timestamp.getTime());
    
    const averageResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    return { resolutionRate, averageResolutionTime };
  }

  /**
   * Execute a suggested fix
   */
  private async executeFix(fix: SuggestedFix, parameters?: Record<string, any>): Promise<boolean> {
    try {
      for (const step of fix.steps) {
        const success = await this.executeFixStep(step, parameters);
        if (!success) return false;
      }
      return true;
    } catch (error) {
      console.error('Fix execution failed:', error);
      return false;
    }
  }

  /**
   * Execute a single fix step
   */
  private async executeFixStep(_step: FixStep, _parameters?: Record<string, any>): Promise<boolean> {
    // This would integrate with the actual BIM operations
    // For now, return a simulated result
    return new Promise(resolve => {
      setTimeout(() => resolve(Math.random() > 0.2), 100); // 80% success rate
    });
  }

  /**
   * Generate fix preview
   */
  private async generateFixPreview(_fix: SuggestedFix, _parameters?: Record<string, any>): Promise<GeometrySnapshot> {
    // This would generate a preview of the fix result
    // For now, return a simulated preview
    return {
      timestamp: Date.now(),
      geometry: [] as any[], // Empty array as placeholder
      quality: 85, // Simulated improved quality
      metadata: { preview: true, fixId: _fix.id }
    };
  }

  /**
   * Refresh all highlights with current configuration
   */
  private refreshHighlights(): void {
    const highlights = Array.from(this.errorHighlights.values());
    this.errorHighlights.clear();

    highlights.forEach(highlight => {
      const newGeometry = this.createErrorGeometry(
        highlight.error,
        highlight.geometry,
        highlight.severity
      );
      
      this.errorHighlights.set(highlight.id, {
        ...highlight,
        geometry: newGeometry
      });
    });
  }
}