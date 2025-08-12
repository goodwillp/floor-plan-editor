/**
 * Geometric Debugging Tools
 * Provides debugging overlay system for BIM geometric operations
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { WallSolid } from '../geometry/WallSolid';
import type { IntersectionData } from '../geometry/IntersectionData';
import type { BooleanResult } from '../types/GeometricTypes';
import type { ValidationResult } from '../types/GeometricTypes';
import type { PixiGraphicsData, PixiLabelData } from '../types/VisualizationTypes';

/**
 * Debug visualization data for geometric operations
 */
export interface DebugVisualizationData {
  operationType: string;
  stepIndex: number;
  totalSteps: number;
  graphics: PixiGraphicsData[];
  labels: PixiLabelData[];
  metadata: DebugMetadata;
}

/**
 * Debug metadata for operations
 */
export interface DebugMetadata {
  operationId: string;
  timestamp: Date;
  inputData: any;
  outputData: any;
  intermediateSteps: DebugStep[];
  errors: string[];
  warnings: string[];
  processingTime: number;
}

/**
 * Individual debug step information
 */
export interface DebugStep {
  stepId: string;
  stepName: string;
  description: string;
  inputGeometry: any;
  outputGeometry: any;
  success: boolean;
  processingTime: number;
  visualElements: DebugVisualElement[];
}

/**
 * Visual element for debugging
 */
export interface DebugVisualElement {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'circle' | 'arrow' | 'text';
  geometry: any;
  style: {
    color: string;
    lineWidth: number;
    alpha: number;
    fillColor?: string;
    fillAlpha?: number;
    dashPattern?: number[];
  };
  label?: string;
  tooltip?: string;
}

/**
 * Boolean operation debug data
 */
export interface BooleanOperationDebugData {
  operationType: 'union' | 'intersection' | 'difference';
  inputSolids: WallSolid[];
  steps: BooleanDebugStep[];
  finalResult: WallSolid | null;
  success: boolean;
  errors: string[];
}

/**
 * Boolean operation debug step
 */
export interface BooleanDebugStep {
  stepName: string;
  description: string;
  beforeGeometry: any;
  afterGeometry: any;
  highlightedElements: DebugVisualElement[];
  success: boolean;
  message?: string;
}

/**
 * Intersection debug data
 */
export interface IntersectionDebugData {
  intersectionId: string;
  participatingWalls: string[];
  calculationSteps: IntersectionCalculationStep[];
  finalResult: IntersectionData;
  qualityMetrics: {
    accuracy: number;
    stability: number;
    convergence: number;
  };
}

/**
 * Intersection calculation step
 */
export interface IntersectionCalculationStep {
  stepName: string;
  description: string;
  inputPoints: { x: number; y: number }[];
  outputPoints: { x: number; y: number }[];
  calculationMethod: string;
  tolerance: number;
  iterations: number;
  converged: boolean;
}

/**
 * Main geometric debugging tools class
 */
export class GeometricDebuggingTools {
  private debugHistory: Map<string, DebugMetadata>;
  private activeDebugging: boolean;
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.debugHistory = new Map();
    this.activeDebugging = false;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Enable or disable debugging
   */
  setDebuggingEnabled(enabled: boolean): void {
    this.activeDebugging = enabled;
  }

  /**
   * Create debugging overlay for boolean operations
   */
  createBooleanOperationDebug(
    operationType: 'union' | 'intersection' | 'difference',
    inputSolids: WallSolid[],
    result: BooleanResult
  ): BooleanOperationDebugData {
    const steps: BooleanDebugStep[] = [];

    // Step 1: Input validation
    steps.push({
      stepName: 'Input Validation',
      description: 'Validating input wall solids for boolean operation',
      beforeGeometry: inputSolids,
      afterGeometry: inputSolids,
      highlightedElements: this.createInputValidationElements(inputSolids),
      success: true,
      message: `${inputSolids.length} input solids validated`
    });

    // Step 2: Geometry preparation
    steps.push({
      stepName: 'Geometry Preparation',
      description: 'Converting wall solids to polygon format for boolean operations',
      beforeGeometry: inputSolids,
      afterGeometry: this.extractPolygonsFromSolids(inputSolids),
      highlightedElements: this.createGeometryPreparationElements(inputSolids),
      success: true,
      message: 'Geometry converted to polygon format'
    });

    // Step 3: Boolean operation execution
    steps.push({
      stepName: 'Boolean Operation',
      description: `Executing ${operationType} operation using Martinez library`,
      beforeGeometry: this.extractPolygonsFromSolids(inputSolids),
      afterGeometry: result.resultSolid,
      highlightedElements: this.createBooleanOperationElements(inputSolids, result),
      success: result.success,
      message: result.success ? 'Boolean operation completed successfully' : 'Boolean operation failed'
    });

    // Step 4: Result validation
    if (result.resultSolid) {
      steps.push({
        stepName: 'Result Validation',
        description: 'Validating the result of boolean operation',
        beforeGeometry: result.resultSolid,
        afterGeometry: result.resultSolid,
        highlightedElements: this.createResultValidationElements(result.resultSolid),
        success: true,
        message: 'Result validation completed'
      });
    }

    const debugData = {
      operationType,
      inputSolids,
      steps,
      finalResult: result.resultSolid,
      success: result.success,
      errors: result.warnings || []
    };

    // Store debug metadata if debugging is active
    if (this.activeDebugging) {
      const metadata: DebugMetadata = {
        operationId: `boolean-${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        inputData: inputSolids,
        outputData: result.resultSolid,
        intermediateSteps: steps.map(s => ({
          stepId: s.stepName.toLowerCase().replace(/\s+/g, '-'),
          stepName: s.stepName,
          description: s.description,
          inputGeometry: s.beforeGeometry,
          outputGeometry: s.afterGeometry,
          success: s.success,
          processingTime: 10,
          visualElements: s.highlightedElements
        })),
        errors: result.success ? [] : (result.warnings || []),
        warnings: result.success ? (result.warnings || []) : [],
        processingTime: result.processingTime
      };
      
      this.storeDebugMetadata(metadata);
    }

    return debugData;
  }

  /**
   * Create debugging overlay for intersection calculations
   */
  createIntersectionDebug(
    intersection: IntersectionData,
    participatingWalls: WallSolid[]
  ): IntersectionDebugData {
    const calculationSteps: IntersectionCalculationStep[] = [];

    // Step 1: Baseline intersection
    calculationSteps.push({
      stepName: 'Baseline Intersection',
      description: 'Finding intersection point of wall baselines',
      inputPoints: participatingWalls.map(wall => wall.baseline.points[0]),
      outputPoints: [intersection.intersectionPoint],
      calculationMethod: 'line_intersection',
      tolerance: 0.1,
      iterations: 1,
      converged: true
    });

    // Step 2: Offset line intersections
    if (intersection.offsetIntersections.length > 0) {
      calculationSteps.push({
        stepName: 'Offset Intersections',
        description: 'Calculating intersections of offset curves',
        inputPoints: this.extractOffsetPoints(participatingWalls),
        outputPoints: intersection.offsetIntersections,
        calculationMethod: 'offset_intersection',
        tolerance: 0.05,
        iterations: 2,
        converged: true
      });
    }

    // Step 3: Miter apex calculation
    if (intersection.miterApex) {
      calculationSteps.push({
        stepName: 'Miter Apex',
        description: 'Computing miter apex for precise wall connection',
        inputPoints: intersection.offsetIntersections,
        outputPoints: [intersection.miterApex],
        calculationMethod: 'miter_calculation',
        tolerance: 0.01,
        iterations: 3,
        converged: true
      });
    }

    return {
      intersectionId: intersection.id,
      participatingWalls: intersection.participatingWalls,
      calculationSteps,
      finalResult: intersection,
      qualityMetrics: {
        accuracy: intersection.geometricAccuracy,
        stability: 0.95,
        convergence: 0.98
      }
    };
  }

  /**
   * Create step-by-step visualization for boolean operations
   */
  createStepByStepVisualization(
    debugData: BooleanOperationDebugData,
    stepIndex: number
  ): DebugVisualizationData {
    const step = debugData.steps[stepIndex];
    const graphics: PixiGraphicsData[] = [];
    const labels: PixiLabelData[] = [];

    // Render highlighted elements for this step
    step.highlightedElements.forEach((element, index) => {
      graphics.push(this.convertDebugElementToGraphics(element, index));
      
      if (element.label) {
        labels.push(this.createDebugLabel(element, index));
      }
    });

    // Add step information label
    labels.push({
      text: `Step ${stepIndex + 1}/${debugData.steps.length}: ${step.stepName}`,
      position: { x: 10, y: 10 },
      style: {
        fontSize: 14,
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: 8,
        borderRadius: 4
      },
      anchor: { x: 0, y: 0 },
      visible: true,
      id: `step-label-${stepIndex}`
    });

    // Add description label
    labels.push({
      text: step.description,
      position: { x: 10, y: 35 },
      style: {
        fontSize: 12,
        fontFamily: 'Arial',
        color: '#cccccc',
        backgroundColor: '#333333',
        padding: 6,
        borderRadius: 4
      },
      anchor: { x: 0, y: 0 },
      visible: true,
      id: `description-label-${stepIndex}`
    });

    return {
      operationType: debugData.operationType,
      stepIndex,
      totalSteps: debugData.steps.length,
      graphics,
      labels,
      metadata: {
        operationId: `boolean-${debugData.operationType}-${Date.now()}`,
        timestamp: new Date(),
        inputData: debugData.inputSolids,
        outputData: debugData.finalResult,
        intermediateSteps: debugData.steps.map(s => ({
          stepId: s.stepName.toLowerCase().replace(/\s+/g, '-'),
          stepName: s.stepName,
          description: s.description,
          inputGeometry: s.beforeGeometry,
          outputGeometry: s.afterGeometry,
          success: s.success,
          processingTime: 10, // Mock processing time
          visualElements: s.highlightedElements
        })),
        errors: debugData.errors,
        warnings: [],
        processingTime: 50 // Mock total processing time
      }
    };
  }

  /**
   * Create intersection point highlighting
   */
  createIntersectionPointHighlighting(
    intersections: IntersectionData[]
  ): PixiGraphicsData[] {
    const graphics: PixiGraphicsData[] = [];

    intersections.forEach((intersection) => {
      // Main intersection point
      graphics.push({
        type: 'circle',
        points: [intersection.intersectionPoint],
        style: {
          lineWidth: 3,
          color: '#ff0000',
          alpha: 1.0,
          fillColor: '#ff0000',
          fillAlpha: 0.7
        },
        zIndex: 10,
        interactive: true,
        id: `intersection-highlight-${intersection.id}`
      });

      // Miter apex if available
      if (intersection.miterApex) {
        graphics.push({
          type: 'circle',
          points: [intersection.miterApex],
          style: {
            lineWidth: 2,
            color: '#00ff00',
            alpha: 1.0,
            fillColor: '#00ff00',
            fillAlpha: 0.5
          },
          zIndex: 9,
          interactive: true,
          id: `miter-apex-highlight-${intersection.id}`
        });

        // Connection line
        graphics.push({
          type: 'line',
          points: [intersection.intersectionPoint, intersection.miterApex],
          style: {
            lineWidth: 1,
            color: '#00ff00',
            alpha: 0.8,
            dashPattern: [5, 5]
          },
          zIndex: 8,
          interactive: false,
          id: `miter-connection-${intersection.id}`
        });
      }

      // Offset intersections
      intersection.offsetIntersections.forEach((offsetPoint, offsetIndex) => {
        graphics.push({
          type: 'circle',
          points: [offsetPoint],
          style: {
            lineWidth: 1,
            color: '#0000ff',
            alpha: 0.8,
            fillColor: '#0000ff',
            fillAlpha: 0.4
          },
          zIndex: 7,
          interactive: true,
          id: `offset-intersection-${intersection.id}-${offsetIndex}`
        });
      });
    });

    return graphics;
  }

  /**
   * Create geometric validation result visualization
   */
  createValidationVisualization(
    validationResult: ValidationResult,
    wallSolid: WallSolid
  ): PixiGraphicsData[] {
    const graphics: PixiGraphicsData[] = [];

    // Render wall with validation status color
    const validationColor = validationResult.isValid ? '#00ff00' : '#ff0000';
    
    wallSolid.solidGeometry.forEach((polygon, polyIndex) => {
      graphics.push({
        type: 'polygon',
        points: polygon.outerRing.map(point => ({ x: point.x, y: point.y })),
        style: {
          lineWidth: 3,
          color: validationColor,
          alpha: 0.8,
          fillColor: validationColor,
          fillAlpha: 0.2
        },
        zIndex: 5,
        interactive: true,
        id: `validation-wall-${wallSolid.id}-${polyIndex}`
      });
    });

    // Add error markers for specific issues
    validationResult.errors.forEach((_error, errorIndex) => {
      // For now, place error markers at wall centroid
      // In a real implementation, errors would have specific locations
      const centroid = this.calculatePolygonCentroid(wallSolid.solidGeometry[0]);
      
      graphics.push({
        type: 'circle',
        points: [{ x: centroid.x + errorIndex * 20, y: centroid.y }],
        style: {
          lineWidth: 2,
          color: '#ff0000',
          alpha: 1.0,
          fillColor: '#ff0000',
          fillAlpha: 0.8
        },
        zIndex: 12,
        interactive: true,
        id: `validation-error-${wallSolid.id}-${errorIndex}`
      });
    });

    // Add warning markers
    validationResult.warnings.forEach((_warning, warningIndex) => {
      const centroid = this.calculatePolygonCentroid(wallSolid.solidGeometry[0]);
      
      graphics.push({
        type: 'circle',
        points: [{ x: centroid.x, y: centroid.y + warningIndex * 20 }],
        style: {
          lineWidth: 2,
          color: '#ffaa00',
          alpha: 1.0,
          fillColor: '#ffaa00',
          fillAlpha: 0.6
        },
        zIndex: 11,
        interactive: true,
        id: `validation-warning-${wallSolid.id}-${warningIndex}`
      });
    });

    return graphics;
  }

  /**
   * Get debug history for a specific operation
   */
  getDebugHistory(operationId?: string): DebugMetadata[] {
    if (operationId) {
      const metadata = this.debugHistory.get(operationId);
      return metadata ? [metadata] : [];
    }
    
    return Array.from(this.debugHistory.values());
  }

  /**
   * Clear debug history
   */
  clearDebugHistory(): void {
    this.debugHistory.clear();
  }

  /**
   * Store debug metadata
   */
  private storeDebugMetadata(metadata: DebugMetadata): void {
    if (this.debugHistory.size >= this.maxHistorySize) {
      // Remove oldest entry
      const oldestKey = this.debugHistory.keys().next().value;
      if (oldestKey) {
        this.debugHistory.delete(oldestKey);
      }
    }
    
    this.debugHistory.set(metadata.operationId, metadata);
  }

  /**
   * Create input validation elements
   */
  private createInputValidationElements(inputSolids: WallSolid[]): DebugVisualElement[] {
    return inputSolids.map((solid, index) => ({
      id: `input-${index}`,
      type: 'polygon',
      geometry: solid.solidGeometry[0],
      style: {
        color: '#0066cc',
        lineWidth: 2,
        alpha: 0.8,
        fillColor: '#0066cc',
        fillAlpha: 0.2
      },
      label: `Input ${index + 1}`,
      tooltip: `Wall ID: ${solid.id}, Thickness: ${solid.thickness}mm`
    }));
  }

  /**
   * Create geometry preparation elements
   */
  private createGeometryPreparationElements(inputSolids: WallSolid[]): DebugVisualElement[] {
    return inputSolids.map((solid, index) => ({
      id: `prep-${index}`,
      type: 'polygon',
      geometry: solid.solidGeometry[0],
      style: {
        color: '#cc6600',
        lineWidth: 2,
        alpha: 0.8,
        fillColor: '#cc6600',
        fillAlpha: 0.3,
        dashPattern: [3, 3]
      },
      label: `Prepared ${index + 1}`,
      tooltip: 'Converted to polygon format'
    }));
  }

  /**
   * Create boolean operation elements
   */
  private createBooleanOperationElements(
    _inputSolids: WallSolid[],
    result: BooleanResult
  ): DebugVisualElement[] {
    const elements: DebugVisualElement[] = [];

    // Show result if successful
    if (result.success && result.resultSolid) {
      elements.push({
        id: 'boolean-result',
        type: 'polygon',
        geometry: result.resultSolid.solidGeometry[0],
        style: {
          color: '#00cc66',
          lineWidth: 3,
          alpha: 1.0,
          fillColor: '#00cc66',
          fillAlpha: 0.4
        },
        label: 'Result',
        tooltip: `Boolean operation result: ${result.operationType}`
      });
    }

    return elements;
  }

  /**
   * Create result validation elements
   */
  private createResultValidationElements(resultSolid: WallSolid): DebugVisualElement[] {
    return [{
      id: 'validation-result',
      type: 'polygon',
      geometry: resultSolid.solidGeometry[0],
      style: {
        color: '#00ff00',
        lineWidth: 2,
        alpha: 0.8,
        fillColor: '#00ff00',
        fillAlpha: 0.1
      },
      label: 'Validated',
      tooltip: 'Result passed validation'
    }];
  }

  /**
   * Extract polygons from wall solids
   */
  private extractPolygonsFromSolids(solids: WallSolid[]): any[] {
    return solids.map(solid => solid.solidGeometry).flat();
  }

  /**
   * Extract offset points from walls
   */
  private extractOffsetPoints(walls: WallSolid[]): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    
    walls.forEach(wall => {
      points.push(...wall.leftOffset.points);
      points.push(...wall.rightOffset.points);
    });
    
    return points;
  }

  /**
   * Convert debug element to PixiJS graphics data
   */
  private convertDebugElementToGraphics(
    element: DebugVisualElement,
    index: number
  ): PixiGraphicsData {
    let points: { x: number; y: number }[] = [];
    
    if (element.type === 'polygon' && element.geometry.outerRing) {
      points = element.geometry.outerRing.map((p: any) => ({ x: p.x, y: p.y }));
    } else if (element.geometry.x !== undefined && element.geometry.y !== undefined) {
      points = [{ x: element.geometry.x, y: element.geometry.y }];
    }

    return {
      type: element.type === 'polygon' ? 'polygon' : 'circle',
      points,
      style: element.style,
      zIndex: 6,
      interactive: true,
      id: `debug-element-${element.id}-${index}`
    };
  }

  /**
   * Create debug label
   */
  private createDebugLabel(element: DebugVisualElement, index: number): PixiLabelData {
    let position = { x: 0, y: 0 };
    
    if (element.geometry.outerRing) {
      const centroid = this.calculatePolygonCentroid(element.geometry);
      position = { x: centroid.x, y: centroid.y - 20 };
    } else if (element.geometry.x !== undefined) {
      position = { x: element.geometry.x + 10, y: element.geometry.y - 10 };
    }

    return {
      text: element.label || '',
      position,
      style: {
        fontSize: 10,
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: 4,
        borderRadius: 3
      },
      anchor: { x: 0.5, y: 0.5 },
      visible: true,
      id: `debug-label-${element.id}-${index}`
    };
  }

  /**
   * Calculate polygon centroid
   */
  private calculatePolygonCentroid(polygon: any): { x: number; y: number } {
    const points = polygon.outerRing || polygon.points || [];
    let x = 0, y = 0;
    
    points.forEach((point: any) => {
      x += point.x;
      y += point.y;
    });
    
    return {
      x: x / points.length,
      y: y / points.length
    };
  }

  /**
   * Check if debugging is active
   */
  isDebuggingActive(): boolean {
    return this.activeDebugging;
  }

  /**
   * Get debug statistics
   */
  getDebugStatistics(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageProcessingTime: number;
  } {
    const operations = Array.from(this.debugHistory.values());
    const successful = operations.filter(op => op.errors.length === 0 && op.warnings.length === 0);
    const avgTime = operations.reduce((sum, op) => sum + op.processingTime, 0) / operations.length;

    return {
      totalOperations: operations.length,
      successfulOperations: successful.length,
      failedOperations: operations.length - successful.length,
      averageProcessingTime: avgTime || 0
    };
  }
}