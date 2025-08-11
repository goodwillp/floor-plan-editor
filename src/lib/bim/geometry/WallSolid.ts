/**
 * WallSolid class with baseline, offset curves, and BIM metadata
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type { Curve } from './Curve';
import type { BIMPolygon } from './BIMPolygon';
import type { OffsetJoinType, QualityMetrics, HealingOperation } from '../types/BIMTypes';
import type { WallTypeString } from '../../types';

/**
 * Intersection data for wall junctions
 */
export interface IntersectionData {
  id: string;
  type: string;
  participatingWalls: string[];
  intersectionPoint: { x: number; y: number };
  
  // Geometric resolution data
  miterApex: { x: number; y: number } | null;
  offsetIntersections: { x: number; y: number }[];
  resolvedGeometry: BIMPolygon;
  
  // Quality and validation
  resolutionMethod: string;
  geometricAccuracy: number;
  validated: boolean;
}

/**
 * WallSolid interface representing a complete BIM wall with geometric data
 */
export interface WallSolid {
  id: string;
  baseline: Curve;
  thickness: number;
  wallType: WallTypeString;
  
  // Geometric representation
  leftOffset: Curve;
  rightOffset: Curve;
  solidGeometry: BIMPolygon[];
  
  // BIM metadata
  joinTypes: Map<string, OffsetJoinType>; // nodeId -> joinType
  intersectionData: IntersectionData[];
  healingHistory: HealingOperation[];
  
  // Quality metrics
  geometricQuality: QualityMetrics;
  lastValidated: Date;
  
  // Performance data
  processingTime: number;
  complexity: number;
}

/**
 * WallSolid implementation with comprehensive BIM geometric data
 */
export class WallSolidImpl implements WallSolid {
  public readonly id: string;
  public readonly baseline: Curve;
  public readonly thickness: number;
  public readonly wallType: WallTypeString;
  
  // Geometric representation
  public leftOffset: Curve;
  public rightOffset: Curve;
  public solidGeometry: BIMPolygon[];
  
  // BIM metadata
  public joinTypes: Map<string, OffsetJoinType>;
  public intersectionData: IntersectionData[];
  public healingHistory: HealingOperation[];
  
  // Quality metrics
  public geometricQuality: QualityMetrics;
  public lastValidated: Date;
  
  // Performance data
  public processingTime: number;
  public complexity: number;

  constructor(
    baseline: Curve,
    thickness: number,
    wallType: WallTypeString,
    options: {
      id?: string;
      leftOffset?: Curve;
      rightOffset?: Curve;
      solidGeometry?: BIMPolygon[];
      joinTypes?: Map<string, OffsetJoinType>;
      intersectionData?: IntersectionData[];
      healingHistory?: HealingOperation[];
      geometricQuality?: QualityMetrics;
      processingTime?: number;
      complexity?: number;
    } = {}
  ) {
    this.id = options.id || this.generateId();
    this.baseline = baseline;
    this.thickness = thickness;
    this.wallType = wallType;
    
    // Initialize geometric representation
    this.leftOffset = options.leftOffset || baseline; // Will be computed by offset engine
    this.rightOffset = options.rightOffset || baseline; // Will be computed by offset engine
    this.solidGeometry = options.solidGeometry || [];
    
    // Initialize BIM metadata
    this.joinTypes = options.joinTypes || new Map();
    this.intersectionData = options.intersectionData || [];
    this.healingHistory = options.healingHistory || [];
    
    // Initialize quality metrics
    this.geometricQuality = options.geometricQuality || this.createDefaultQualityMetrics();
    this.lastValidated = new Date();
    
    // Initialize performance data
    this.processingTime = options.processingTime || 0;
    this.complexity = options.complexity || this.calculateComplexity();
  }

  /**
   * Create default quality metrics
   */
  private createDefaultQualityMetrics(): QualityMetrics {
    return {
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
  }

  /**
   * Calculate the complexity of the wall solid
   */
  private calculateComplexity(): number {
    let complexity = 0;
    
    // Base complexity from baseline points
    complexity += this.baseline.points.length;
    
    // Add complexity from solid geometry
    for (const polygon of this.solidGeometry) {
      complexity += polygon.outerRing.length;
      complexity += polygon.holes.reduce((sum, hole) => sum + hole.length, 0);
    }
    
    // Add complexity from intersections
    complexity += this.intersectionData.length * 5;
    
    // Add complexity from healing operations
    complexity += this.healingHistory.length * 2;
    
    return complexity;
  }

  /**
   * Get the total area of the wall solid
   */
  getTotalArea(): number {
    return this.solidGeometry.reduce((total, polygon) => total + polygon.area, 0);
  }

  /**
   * Get the total perimeter of the wall solid
   */
  getTotalPerimeter(): number {
    return this.solidGeometry.reduce((total, polygon) => total + polygon.perimeter, 0);
  }

  /**
   * Get the bounding box of the entire wall solid
   */
  getBoundingBox() {
    if (this.solidGeometry.length === 0) {
      return this.baseline.boundingBox;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const polygon of this.solidGeometry) {
      const bbox = polygon.boundingBox;
      minX = Math.min(minX, bbox.minX);
      minY = Math.min(minY, bbox.minY);
      maxX = Math.max(maxX, bbox.maxX);
      maxY = Math.max(maxY, bbox.maxY);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Check if the wall solid contains a point
   */
  containsPoint(point: { x: number; y: number }): boolean {
    return this.solidGeometry.some(polygon => 
      polygon.containsPoint({
        id: 'temp',
        x: point.x,
        y: point.y,
        tolerance: 1e-6,
        creationMethod: 'point_test',
        accuracy: 1.0,
        validated: false,
        distanceTo: function(other) { 
          return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2); 
        },
        equals: function(other, tolerance = 1e-6) { 
          return this.distanceTo(other) <= tolerance; 
        }
      } as any)
    );
  }

  /**
   * Add an intersection to the wall solid
   */
  addIntersection(intersection: IntersectionData): void {
    this.intersectionData.push(intersection);
    this.complexity = this.calculateComplexity();
    this.lastValidated = new Date();
  }

  /**
   * Remove an intersection from the wall solid
   */
  removeIntersection(intersectionId: string): boolean {
    const initialLength = this.intersectionData.length;
    this.intersectionData = this.intersectionData.filter(intersection => intersection.id !== intersectionId);
    
    if (this.intersectionData.length < initialLength) {
      this.complexity = this.calculateComplexity();
      this.lastValidated = new Date();
      return true;
    }
    
    return false;
  }

  /**
   * Add a healing operation to the history
   */
  addHealingOperation(operation: HealingOperation): void {
    this.healingHistory.push(operation);
    this.complexity = this.calculateComplexity();
    this.lastValidated = new Date();
  }

  /**
   * Update the geometric quality metrics
   */
  updateQualityMetrics(metrics: Partial<QualityMetrics>): void {
    this.geometricQuality = {
      ...this.geometricQuality,
      ...metrics
    };
    this.lastValidated = new Date();
  }

  /**
   * Set the join type for a specific node
   */
  setJoinType(nodeId: string, joinType: OffsetJoinType): void {
    this.joinTypes.set(nodeId, joinType);
    this.lastValidated = new Date();
  }

  /**
   * Get the join type for a specific node
   */
  getJoinType(nodeId: string): OffsetJoinType | undefined {
    return this.joinTypes.get(nodeId);
  }

  /**
   * Update the solid geometry
   */
  updateSolidGeometry(geometry: BIMPolygon[]): void {
    this.solidGeometry = [...geometry];
    this.complexity = this.calculateComplexity();
    this.lastValidated = new Date();
  }

  /**
   * Update the offset curves
   */
  updateOffsetCurves(leftOffset: Curve, rightOffset: Curve): void {
    this.leftOffset = leftOffset;
    this.rightOffset = rightOffset;
    this.lastValidated = new Date();
  }

  /**
   * Check if the wall solid needs validation
   */
  needsValidation(maxAge: number = 60000): boolean {
    return Date.now() - this.lastValidated.getTime() > maxAge;
  }

  /**
   * Get a summary of the wall solid's properties
   */
  getSummary() {
    return {
      id: this.id,
      wallType: this.wallType,
      thickness: this.thickness,
      baselineLength: this.baseline.length,
      totalArea: this.getTotalArea(),
      totalPerimeter: this.getTotalPerimeter(),
      intersectionCount: this.intersectionData.length,
      healingOperationCount: this.healingHistory.length,
      complexity: this.complexity,
      geometricQuality: this.geometricQuality.geometricAccuracy,
      lastValidated: this.lastValidated,
      processingTime: this.processingTime
    };
  }

  /**
   * Create a copy of the wall solid with updated properties
   */
  withUpdates(updates: Partial<{
    leftOffset: Curve;
    rightOffset: Curve;
    solidGeometry: BIMPolygon[];
    intersectionData: IntersectionData[];
    healingHistory: HealingOperation[];
    geometricQuality: QualityMetrics;
    processingTime: number;
  }>): WallSolidImpl {
    return new WallSolidImpl(this.baseline, this.thickness, this.wallType, {
      id: this.id,
      leftOffset: updates.leftOffset || this.leftOffset,
      rightOffset: updates.rightOffset || this.rightOffset,
      solidGeometry: updates.solidGeometry || this.solidGeometry,
      joinTypes: new Map(this.joinTypes),
      intersectionData: updates.intersectionData || [...this.intersectionData],
      healingHistory: updates.healingHistory || [...this.healingHistory],
      geometricQuality: updates.geometricQuality || this.geometricQuality,
      processingTime: updates.processingTime || this.processingTime,
      complexity: this.complexity
    });
  }

  /**
   * Convert to a simplified representation for serialization
   */
  toSerializable() {
    return {
      id: this.id,
      baseline: {
        id: this.baseline.id,
        points: this.baseline.points.map(p => ({ x: p.x, y: p.y })),
        type: this.baseline.type,
        isClosed: this.baseline.isClosed
      },
      thickness: this.thickness,
      wallType: this.wallType,
      leftOffset: {
        id: this.leftOffset.id,
        points: this.leftOffset.points.map(p => ({ x: p.x, y: p.y })),
        type: this.leftOffset.type,
        isClosed: this.leftOffset.isClosed
      },
      rightOffset: {
        id: this.rightOffset.id,
        points: this.rightOffset.points.map(p => ({ x: p.x, y: p.y })),
        type: this.rightOffset.type,
        isClosed: this.rightOffset.isClosed
      },
      solidGeometry: this.solidGeometry.map(polygon => ({
        id: polygon.id,
        outerRing: polygon.outerRing.map(p => ({ x: p.x, y: p.y })),
        holes: polygon.holes.map(hole => hole.map(p => ({ x: p.x, y: p.y })))
      })),
      joinTypes: Array.from(this.joinTypes.entries()),
      intersectionData: this.intersectionData,
      healingHistory: this.healingHistory,
      geometricQuality: this.geometricQuality,
      lastValidated: this.lastValidated.toISOString(),
      processingTime: this.processingTime,
      complexity: this.complexity
    };
  }

  /**
   * Generate a unique ID for the wall solid
   */
  private generateId(): string {
    return `wall_solid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create WallSolid from baseline curve
   */
  static fromBaseline(
    baseline: Curve,
    thickness: number,
    wallType: WallTypeString,
    options?: {
      id?: string;
      processingTime?: number;
    }
  ): WallSolidImpl {
    return new WallSolidImpl(baseline, thickness, wallType, options);
  }

  /**
   * Create WallSolid from serialized data
   */
  static fromSerializable(data: any): WallSolidImpl {
    // This would need proper deserialization logic
    // For now, return a basic implementation
    throw new Error('Deserialization not yet implemented');
  }
}