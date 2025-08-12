/**
 * Legacy Data Converter for automatic detection and conversion of legacy wall data
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { Wall, Segment, Node, Point, WallTypeString } from '../../types';
import type { UnifiedWallData } from '../data/UnifiedWallData';
import type { Curve } from '../geometry/Curve';
import type { BIMPoint } from '../geometry/BIMPoint';
import type { WallSolid } from '../geometry/WallSolid';

export interface LegacyDataFormat {
  version: string;
  format: 'legacy-v1' | 'legacy-v2' | 'bim-v1';
  hasDeprecatedFields: boolean;
  migrationRequired: boolean;
  compatibilityLevel: 'full' | 'partial' | 'none';
}

export interface ConversionResult {
  success: boolean;
  convertedData: any;
  warnings: string[];
  errors: string[];
  dataLoss: string[];
  approximations: string[];
}

export interface ConversionOptions {
  preserveOriginal: boolean;
  allowApproximations: boolean;
  strictValidation: boolean;
  generateBackup: boolean;
}

/**
 * Handles conversion between legacy and BIM data formats
 */
export class LegacyDataConverter {
  private conversionHistory: Array<{
    timestamp: Date;
    operation: string;
    source: string;
    target: string;
    success: boolean;
    details: any;
  }> = [];

  /**
   * Detect the format of wall data
   */
  detectDataFormat(data: any): LegacyDataFormat {
    // Check for BIM data structures
    if (this.isBIMData(data)) {
      return {
        version: '1.0',
        format: 'bim-v1',
        hasDeprecatedFields: false,
        migrationRequired: false,
        compatibilityLevel: 'full'
      };
    }

    // Check for legacy data structures
    if (this.isLegacyWallData(data)) {
      const hasDeprecated = this.hasDeprecatedFields(data);
      return {
        version: this.detectLegacyVersion(data),
        format: 'legacy-v1',
        hasDeprecatedFields: hasDeprecated,
        migrationRequired: hasDeprecated,
        compatibilityLevel: hasDeprecated ? 'partial' : 'full'
      };
    }

    return {
      version: 'unknown',
      format: 'legacy-v1',
      hasDeprecatedFields: true,
      migrationRequired: true,
      compatibilityLevel: 'none'
    };
  }

  /**
   * Check if data is BIM format
   */
  private isBIMData(data: any): boolean {
    return data && (
      data.wallSolid ||
      data.offsetCurves ||
      data.intersectionData ||
      data.qualityMetrics
    );
  }

  /**
   * Check if data is legacy wall format
   */
  private isLegacyWallData(data: any): boolean {
    return data && (
      (data.type && ['layout', 'zone', 'area'].includes(data.type)) ||
      (data.segmentIds && Array.isArray(data.segmentIds)) ||
      (data.thickness && typeof data.thickness === 'number')
    );
  }

  /**
   * Check for deprecated fields in legacy data
   */
  private hasDeprecatedFields(data: any): boolean {
    const deprecatedFields = [
      'pixelTolerance',
      'fixedThickness',
      'simpleIntersection',
      'basicRendering'
    ];

    return deprecatedFields.some(field => field in data);
  }

  /**
   * Detect legacy data version
   */
  private detectLegacyVersion(data: any): string {
    // Simple version detection based on data structure
    if (data.createdAt && data.updatedAt) {
      return '1.1';
    }
    return '1.0';
  }

  /**
   * Convert legacy wall to BIM format
   */
  convertLegacyWallToBIM(
    wall: Wall,
    segments: Segment[],
    nodes: Map<string, Node>,
    options: ConversionOptions = {
      preserveOriginal: true,
      allowApproximations: true,
      strictValidation: false,
      generateBackup: true
    }
  ): ConversionResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const dataLoss: string[] = [];
    const approximations: string[] = [];

    try {
      // Generate backup if requested
      if (options.generateBackup) {
        this.generateBackup(wall, segments, nodes);
      }

      // Create baseline curve from segments
      const baseline = this.createBaselineCurve(wall, segments, nodes);
      if (!baseline) {
        errors.push('Failed to create baseline curve from segments');
        return { success: false, convertedData: null, warnings, errors, dataLoss, approximations };
      }

      // Create BIM wall solid
      const wallSolid = this.createWallSolid(wall, baseline, options);
      
      // Create unified wall data
      const unifiedData: any = {
        id: wall.id,
        type: wall.type,
        thickness: wall.thickness,
        visible: wall.visible,
        baseline: baseline,
        
        // Basic mode representation (preserved)
        basicGeometry: {
          segments: segments,
          nodes: Array.from(nodes.values()),
          polygons: [] // Would be computed from segments
        },
        
        // BIM mode representation
        bimGeometry: {
          wallSolid: wallSolid,
          offsetCurves: this.generateOffsetCurves(baseline, wall.thickness),
          intersectionData: [],
          qualityMetrics: this.calculateInitialQualityMetrics(wallSolid)
        },
        
        // Mode compatibility flags
        isBasicModeValid: true,
        isBIMModeValid: true,
        lastModifiedMode: 'basic',
        requiresSync: false
      };

      // Add legacy references for compatibility
      (wallSolid as any).legacyWall = wall;
      (wallSolid as any).legacySegments = segments;
      (wallSolid as any).legacyNodes = nodes;

      this.recordConversion('legacy-to-bim', 'wall', wall.id, true, {
        segmentCount: segments.length,
        nodeCount: nodes.size,
        warnings: warnings.length,
        approximations: approximations.length
      });

      return {
        success: true,
        convertedData: unifiedData,
        warnings,
        errors,
        dataLoss,
        approximations
      };

    } catch (error) {
      errors.push(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      
      this.recordConversion('legacy-to-bim', 'wall', wall.id, false, {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        convertedData: null,
        warnings,
        errors,
        dataLoss,
        approximations
      };
    }
  }

  /**
   * Create baseline curve from legacy segments
   */
  private createBaselineCurve(wall: Wall, segments: Segment[], nodes: Map<string, Node>): Curve | null {
    if (segments.length === 0) {
      return null;
    }

    // Build ordered points from segments
    const points: BIMPoint[] = [];
    const processedSegments = new Set<string>();
    
    // Start with first segment
    let currentSegment = segments[0];
    let currentNodeId = currentSegment.startNodeId;
    
    while (currentSegment && !processedSegments.has(currentSegment.id)) {
      processedSegments.add(currentSegment.id);
      
      const startNode = nodes.get(currentSegment.startNodeId);
      const endNode = nodes.get(currentSegment.endNodeId);
      
      if (!startNode || !endNode) {
        break;
      }

      // Add start point if not already added
      if (points.length === 0 || 
          (points[points.length - 1].x !== startNode.x || points[points.length - 1].y !== startNode.y)) {
        points.push(this.createBIMPoint(startNode));
      }

      // Add end point
      points.push(this.createBIMPoint(endNode));

      // Find next connected segment
      currentNodeId = currentSegment.endNodeId;
      currentSegment = (segments.find(seg => 
        !processedSegments.has(seg.id) && 
        (seg.startNodeId === currentNodeId || seg.endNodeId === currentNodeId)
      ) as any) || null;
    }

    // Create curve
      const curve: any = {
      id: `${wall.id}-baseline`,
      points: points,
      type: 'polyline',
      isClosed: this.isClosedCurve(points),
      length: this.calculateCurveLength(points),
      boundingBox: this.calculateBoundingBox(points),
      curvature: points.map(() => 0), // Polyline has zero curvature
      tangents: this.calculateTangents(points)
    };

    return curve;
  }

  /**
   * Create BIM point from legacy node
   */
  private createBIMPoint(node: Node): BIMPoint {
    return {
      x: node.x,
      y: node.y,
      id: node.id,
      tolerance: 1e-3, // Default tolerance, will be calculated adaptively
      creationMethod: 'legacy-conversion',
      accuracy: 1.0,
      validated: false
    } as any;
  }

  /**
   * Check if curve is closed
   */
  private isClosedCurve(points: BIMPoint[]): boolean {
    if (points.length < 3) return false;
    
    const first = points[0];
    const last = points[points.length - 1];
    const tolerance = 1e-6;
    
    return Math.abs(first.x - last.x) < tolerance && Math.abs(first.y - last.y) < tolerance;
  }

  /**
   * Calculate curve length
   */
  private calculateCurveLength(points: BIMPoint[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i-1].x;
      const dy = points[i].y - points[i-1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  /**
   * Calculate bounding box
   */
  private calculateBoundingBox(points: BIMPoint[]): any {
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = points[0].x, minY = points[0].y;
    let maxX = points[0].x, maxY = points[0].y;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Calculate tangent vectors
   */
  private calculateTangents(points: BIMPoint[]): any[] {
    const tangents = [];
    
    for (let i = 0; i < points.length; i++) {
      let tangent;
      
      if (i === 0) {
        // First point: use direction to next point
        const dx = points[1].x - points[0].x;
        const dy = points[1].y - points[0].y;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        tangent = { x: dx / length, y: dy / length };
      } else if (i === points.length - 1) {
        // Last point: use direction from previous point
        const dx = points[i].x - points[i-1].x;
        const dy = points[i].y - points[i-1].y;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        tangent = { x: dx / length, y: dy / length };
      } else {
        // Middle point: average of incoming and outgoing directions
        const dx1 = points[i].x - points[i-1].x;
        const dy1 = points[i].y - points[i-1].y;
        const dx2 = points[i+1].x - points[i].x;
        const dy2 = points[i+1].y - points[i].y;
        
        const avgDx = (dx1 + dx2) / 2;
        const avgDy = (dy1 + dy2) / 2;
        const length = Math.sqrt(avgDx * avgDx + avgDy * avgDy) || 1;
        tangent = { x: avgDx / length, y: avgDy / length };
      }
      
      tangents.push(tangent);
    }
    
    return tangents;
  }

  /**
   * Create wall solid from legacy data
   */
  private createWallSolid(wall: Wall, baseline: Curve, options: ConversionOptions): WallSolid {
    const wallSolid: any = {
      id: wall.id,
      baseline: baseline,
      thickness: wall.thickness,
      wallType: wall.type,
      
      // Geometric representation (to be computed by BIM system)
      leftOffset: baseline, // Placeholder - would be computed by RobustOffsetEngine
      rightOffset: baseline, // Placeholder - would be computed by RobustOffsetEngine
      solidGeometry: [], // Placeholder - would be computed by boolean operations
      
      // BIM metadata
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: [],
      
      // Quality metrics
      geometricQuality: this.calculateInitialQualityMetrics(null),
      lastValidated: new Date(),
      
      // Performance data
      processingTime: 0,
      complexity: this.calculateComplexity(baseline)
    };

    // Ensure required methods exist for compatibility
    wallSolid.containsPoint = (_p: any) => false;
    wallSolid.addIntersection = (_i: any) => {};
    wallSolid.removeIntersection = (_id: string) => false;
    return wallSolid as WallSolid;
  }

  /**
   * Generate offset curves (placeholder implementation)
   */
  private generateOffsetCurves(baseline: Curve, thickness: number): Curve[] {
    // This would be implemented by the RobustOffsetEngine
    // For now, return the baseline as placeholder
    return [baseline, baseline];
  }

  /**
   * Calculate initial quality metrics
   */
  private calculateInitialQualityMetrics(wallSolid: WallSolid | null): any {
    return {
      geometricAccuracy: 0.8, // Initial estimate
      topologicalConsistency: 1.0,
      manufacturability: 0.9,
      architecturalCompliance: 0.85,
      
      sliverFaceCount: 0,
      microGapCount: 0,
      selfIntersectionCount: 0,
      degenerateElementCount: 0,
      
      complexity: wallSolid ? this.calculateComplexity(wallSolid.baseline) : 1,
      processingEfficiency: 1.0,
      memoryUsage: 0
    };
  }

  /**
   * Calculate geometric complexity
   */
  private calculateComplexity(baseline: Curve): number {
    // Simple complexity based on point count and curve length
    const pointComplexity = baseline.points.length / 10; // Normalize to ~1 for typical walls
    const lengthComplexity = baseline.length / 1000; // Normalize to ~1 for typical walls
    return Math.max(1, pointComplexity + lengthComplexity);
  }

  /**
   * Convert BIM wall back to legacy format
   */
  convertBIMWallToLegacy(
    unifiedData: UnifiedWallData,
    options: ConversionOptions = {
      preserveOriginal: true,
      allowApproximations: true,
      strictValidation: false,
      generateBackup: true
    }
  ): ConversionResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const dataLoss: string[] = [];
    const approximations: string[] = [];

    try {
      // Check if basic geometry is available
      if (!unifiedData.basicGeometry) {
        errors.push('No basic geometry available for legacy conversion');
        return { success: false, convertedData: null, warnings, errors, dataLoss, approximations };
      }

      // Extract legacy data
      const wall: Wall = {
        id: unifiedData.id,
        type: unifiedData.type,
        thickness: unifiedData.thickness,
        visible: unifiedData.visible,
        segmentIds: unifiedData.basicGeometry.segments.map(s => s.id),
        createdAt: new Date(), // Approximation
        updatedAt: new Date()
      };

      const segments = unifiedData.basicGeometry.segments;
      const nodes = unifiedData.basicGeometry.nodes;

      // Note data loss from BIM features
      if (unifiedData.bimGeometry) {
        if (unifiedData.bimGeometry.intersectionData.length > 0) {
          dataLoss.push('BIM intersection data will be lost');
        }
        if (unifiedData.bimGeometry.qualityMetrics) {
          dataLoss.push('BIM quality metrics will be lost');
        }
        approximations.push('BIM geometric precision reduced to legacy format');
      }

      this.recordConversion('bim-to-legacy', 'wall', unifiedData.id, true, {
        dataLoss: dataLoss.length,
        approximations: approximations.length
      });

      return {
        success: true,
        convertedData: { wall, segments, nodes },
        warnings,
        errors,
        dataLoss,
        approximations
      };

    } catch (error) {
      errors.push(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      
      this.recordConversion('bim-to-legacy', 'wall', unifiedData.id, false, {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        convertedData: null,
        warnings,
        errors,
        dataLoss,
        approximations
      };
    }
  }

  /**
   * Generate backup of original data
   */
  private generateBackup(wall: Wall, segments: Segment[], nodes: Map<string, Node>): void {
    const backup = {
      timestamp: new Date().toISOString(),
      wall: { ...wall },
      segments: [...segments],
      nodes: Array.from(nodes.values())
    };

    try {
      const backupKey = `wall-backup-${wall.id}-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      console.debug(`📦 Backup created: ${backupKey}`);
    } catch (error) {
      console.warn('Failed to create backup:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Record conversion operation for analytics
   */
  private recordConversion(
    operation: string,
    dataType: string,
    dataId: string,
    success: boolean,
    details: any
  ): void {
    this.conversionHistory.push({
      timestamp: new Date(),
      operation,
      source: dataType,
      target: dataId,
      success,
      details
    });

    // Keep only last 100 records
    if (this.conversionHistory.length > 100) {
      this.conversionHistory.shift();
    }
  }

  /**
   * Get conversion history
   */
  getConversionHistory(): typeof this.conversionHistory {
    return [...this.conversionHistory];
  }

  /**
   * Get conversion statistics
   */
  getConversionStatistics(): {
    totalConversions: number;
    successRate: number;
    commonErrors: string[];
    dataLossFrequency: number;
  } {
    const total = this.conversionHistory.length;
    const successful = this.conversionHistory.filter(h => h.success).length;
    const successRate = total > 0 ? successful / total : 0;

    const errors = this.conversionHistory
      .filter(h => !h.success)
      .map(h => h.details?.error)
      .filter(Boolean);

    const errorCounts = errors.reduce((acc: Record<string, number>, err: any) => {
      const key = String(err);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error);

    const dataLossEvents = this.conversionHistory.filter(h => 
      h.details?.dataLoss > 0 || h.details?.approximations > 0
    ).length;
    const dataLossFrequency = total > 0 ? dataLossEvents / total : 0;

    return {
      totalConversions: total,
      successRate,
      commonErrors,
      dataLossFrequency
    };
  }

  /**
   * Clear conversion history
   */
  clearHistory(): void {
    this.conversionHistory = [];
  }
}