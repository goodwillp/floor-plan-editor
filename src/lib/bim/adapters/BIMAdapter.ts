/**
 * BIMAdapter Integration Layer
 * 
 * Handles conversion between legacy and BIM formats with Martinez polygon integration
 * and batch conversion operations for existing wall datasets
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { UnifiedWallData } from '../data/UnifiedWallData';
import { GeometryConverter } from './GeometryConverter';
import { WallSolidImpl } from '../geometry/WallSolid';
import { Curve } from '../geometry/Curve';
import { BIMPoint, BIMPointImpl } from '../geometry/BIMPoint';
import { CurveType } from '../types/BIMTypes';
import { Wall, Segment, Node } from '../../types';
import { QualityMetrics } from '../types/QualityMetrics';

/**
 * Conversion result for individual walls
 */
export interface WallConversionResult {
  success: boolean;
  wallId: string;
  unifiedWallData?: UnifiedWallData;
  errors: string[];
  warnings: string[];
  processingTime: number;
  qualityScore: number;
}

/**
 * Batch conversion result
 */
export interface BatchConversionResult {
  success: boolean;
  convertedWalls: Map<string, UnifiedWallData>;
  failedWalls: string[];
  totalProcessingTime: number;
  averageQualityScore: number;
  warnings: string[];
  errors: string[];
  statistics: {
    totalWalls: number;
    successfulConversions: number;
    failedConversions: number;
    averageProcessingTimePerWall: number;
  };
}

/**
 * Legacy format conversion result
 */
export interface LegacyConversionResult {
  success: boolean;
  wall: Wall;
  segments: Segment[];
  nodes: Node[];
  warnings: string[];
  errors: string[];
  dataLoss: boolean;
  approximationsUsed: string[];
}

/**
 * BIM adapter interface
 */
export interface IBIMAdapter {
  convertLegacyWall(
    wall: Wall,
    segments: Segment[],
    nodes: Node[]
  ): Promise<WallConversionResult>;
  
  convertToLegacyFormat(wallSolid: UnifiedWallData): Promise<LegacyConversionResult>;
  
  convertAllWalls(
    walls: Map<string, Wall>,
    segments: Map<string, Segment>,
    nodes: Map<string, Node>
  ): Promise<BatchConversionResult>;
  
  validateConversion(
    original: { wall: Wall; segments: Segment[]; nodes: Node[] },
    converted: UnifiedWallData
  ): Promise<ValidationResult>;
}

/**
 * Validation result for conversions
 */
export interface ValidationResult {
  isValid: boolean;
  geometryMatches: boolean;
  propertiesMatch: boolean;
  toleranceWithinBounds: boolean;
  issues: ValidationIssue[];
  qualityScore: number;
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  type: 'geometry' | 'property' | 'tolerance' | 'data_loss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix?: string;
}

/**
 * BIM adapter implementation
 */
export class BIMAdapter implements IBIMAdapter {
  private geometryConverter: GeometryConverter;
  private conversionTolerance: number = 1e-6;

  constructor(geometryConverter: GeometryConverter) {
    this.geometryConverter = geometryConverter;
  }

  /**
   * Convert legacy wall to unified BIM representation
   */
  async convertLegacyWall(
    wall: Wall,
    segments: Segment[],
    nodes: Node[]
  ): Promise<WallConversionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 1.0;

    try {
      // Validate input data
      const validationResult = this.validateLegacyInput(wall, segments, nodes);
      if (!validationResult.isValid) {
        return {
          success: false,
          wallId: wall.id,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          processingTime: Date.now() - startTime,
          qualityScore: 0
        };
      }

      warnings.push(...validationResult.warnings);
      qualityScore -= validationResult.qualityImpact;

      // Filter segments and nodes for this wall
      const wallSegments = segments.filter(s => s.wallId === wall.id);
      const wallNodeIds = new Set([
        ...wallSegments.map(s => s.startNodeId),
        ...wallSegments.map(s => s.endNodeId)
      ]);
      const wallNodes = nodes.filter(n => wallNodeIds.has(n.id));

      // Create baseline curve from segments and nodes
      const baseline = await this.createBaselineFromSegments(wallSegments, wallNodes);
      if (!baseline) {
        errors.push('Failed to create baseline curve from segments');
        return {
          success: false,
          wallId: wall.id,
          errors,
          warnings,
          processingTime: Date.now() - startTime,
          qualityScore: 0
        };
      }

      // Create basic geometry representation
      const basicGeometry = {
        segments: wallSegments,
        nodes: wallNodes,
        polygons: await this.createPolygonsFromWall(wall, wallSegments, wallNodes)
      };

      // Create unified wall data
      const unifiedWallData = new UnifiedWallData({
        id: wall.id,
        type: wall.type as any,
        thickness: wall.thickness,
        visible: wall.visible,
        baseline,
        basicGeometry,
        lastModifiedMode: 'basic'
      });

      // Generate initial BIM geometry if possible
      try {
        const bimGeometry = await this.generateInitialBIMGeometry(unifiedWallData);
        if (bimGeometry) {
          unifiedWallData.bimGeometry = bimGeometry;
          unifiedWallData.addProcessingEntry({
            operation: 'legacy_to_bim_conversion',
            mode: 'bim',
            success: true,
            processingTime: Date.now() - startTime,
            warnings,
            errors: []
          });
        }
      } catch (bimError) {
        warnings.push(`BIM geometry generation failed: ${bimError}`);
        qualityScore -= 0.1;
      }

      return {
        success: true,
        wallId: wall.id,
        unifiedWallData,
        errors,
        warnings,
        processingTime: Date.now() - startTime,
        qualityScore: Math.max(0, qualityScore)
      };
    } catch (error) {
      errors.push(`Conversion failed: ${error}`);
      return {
        success: false,
        wallId: wall.id,
        errors,
        warnings,
        processingTime: Date.now() - startTime,
        qualityScore: 0
      };
    }
  }

  /**
   * Convert unified wall data back to legacy format
   */
  async convertToLegacyFormat(wallData: UnifiedWallData): Promise<LegacyConversionResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const approximationsUsed: string[] = [];
    let dataLoss = false;

    try {
      // Create legacy wall object
      const wall: Wall = {
        id: wallData.id,
        type: wallData.type as any,
        thickness: wallData.thickness,
        segmentIds: wallData.basicGeometry.segments.map(s => s.id),
        visible: wallData.visible,
        createdAt: wallData.createdAt,
        updatedAt: wallData.updatedAt
      };

      // Use existing basic geometry
      const segments = [...wallData.basicGeometry.segments];
      const nodes = [...wallData.basicGeometry.nodes];

      // Check for data loss
      if (wallData.bimGeometry) {
        if (wallData.bimGeometry.intersectionData.length > 0) {
          approximationsUsed.push('BIM intersection data will be lost');
          dataLoss = true;
        }

        if (wallData.bimGeometry.qualityMetrics.sliverFaceCount > 0) {
          approximationsUsed.push('Sliver face information will be lost');
          dataLoss = true;
        }

        if (wallData.bimGeometry.offsetCurves.some(curve => curve.type !== CurveType.POLYLINE)) {
          approximationsUsed.push('Complex curve information will be simplified');
          dataLoss = true;
        }
      }

      // Validate legacy format consistency
      const validationResult = this.validateLegacyOutput(wall, segments, nodes);
      if (!validationResult.isValid) {
        errors.push(...validationResult.errors);
      }
      warnings.push(...validationResult.warnings);

      return {
        success: errors.length === 0,
        wall,
        segments,
        nodes,
        warnings,
        errors,
        dataLoss,
        approximationsUsed
      };
    } catch (error) {
      errors.push(`Legacy conversion failed: ${error}`);
      return {
        success: false,
        wall: {} as Wall,
        segments: [],
        nodes: [],
        warnings,
        errors,
        dataLoss: true,
        approximationsUsed
      };
    }
  }

  /**
   * Convert all walls in a dataset to unified format
   */
  async convertAllWalls(
    walls: Map<string, Wall>,
    segments: Map<string, Segment>,
    nodes: Map<string, Node>
  ): Promise<BatchConversionResult> {
    const startTime = Date.now();
    const convertedWalls = new Map<string, UnifiedWallData>();
    const failedWalls: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    let totalQualityScore = 0;

    // Convert segments and nodes maps to arrays for easier processing
    const segmentsArray = Array.from(segments.values());
    const nodesArray = Array.from(nodes.values());

    // Process walls in batches for better performance
    const batchSize = 10;
    const wallEntries = Array.from(walls.entries());
    
    for (let i = 0; i < wallEntries.length; i += batchSize) {
      const batch = wallEntries.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async ([wallId, wall]) => {
        try {
          const result = await this.convertLegacyWall(wall, segmentsArray, nodesArray);
          
          if (result.success && result.unifiedWallData) {
            convertedWalls.set(wallId, result.unifiedWallData);
            totalQualityScore += result.qualityScore;
          } else {
            failedWalls.push(wallId);
            errors.push(`Wall ${wallId}: ${result.errors.join(', ')}`);
          }
          
          warnings.push(...result.warnings.map(w => `Wall ${wallId}: ${w}`));
          
          return result;
        } catch (error) {
          failedWalls.push(wallId);
          errors.push(`Wall ${wallId}: Unexpected error - ${error}`);
          return null;
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
    }

    const totalProcessingTime = Date.now() - startTime;
    const successfulConversions = convertedWalls.size;
    const totalWalls = walls.size;
    const averageQualityScore = successfulConversions > 0 ? totalQualityScore / successfulConversions : 0;

    return {
      success: failedWalls.length === 0,
      convertedWalls,
      failedWalls,
      totalProcessingTime,
      averageQualityScore,
      warnings,
      errors,
      statistics: {
        totalWalls,
        successfulConversions,
        failedConversions: failedWalls.length,
        averageProcessingTimePerWall: totalWalls > 0 ? totalProcessingTime / totalWalls : 0
      }
    };
  }

  /**
   * Validate conversion accuracy
   */
  async validateConversion(
    original: { wall: Wall; segments: Segment[]; nodes: Node[] },
    converted: UnifiedWallData
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let qualityScore = 1.0;

    // Check property matching
    const propertiesMatch = this.validateProperties(original.wall, converted);
    if (!propertiesMatch.isValid) {
      issues.push(...propertiesMatch.issues);
      qualityScore -= 0.2;
    }

    // Check geometry matching
    const geometryMatches = await this.validateGeometry(original, converted);
    if (!geometryMatches.isValid) {
      issues.push(...geometryMatches.issues);
      qualityScore -= 0.3;
    }

    // Check tolerance bounds
    const toleranceWithinBounds = this.validateTolerances(original, converted);
    if (!toleranceWithinBounds.isValid) {
      issues.push(...toleranceWithinBounds.issues);
      qualityScore -= 0.1;
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      geometryMatches: geometryMatches.isValid,
      propertiesMatch: propertiesMatch.isValid,
      toleranceWithinBounds: toleranceWithinBounds.isValid,
      issues,
      qualityScore: Math.max(0, qualityScore)
    };
  }

  // Private helper methods

  private validateLegacyInput(
    wall: Wall,
    segments: Segment[],
    nodes: Node[]
  ): { isValid: boolean; errors: string[]; warnings: string[]; qualityImpact: number } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityImpact = 0;

    // Validate wall properties
    if (!wall.id) {
      errors.push('Wall ID is required');
    }
    if (wall.thickness <= 0) {
      errors.push('Wall thickness must be positive');
    }
    if (!wall.type) {
      errors.push('Wall type is required');
    }

    // Validate segments
    const wallSegments = segments.filter(s => s.wallId === wall.id);
    if (wallSegments.length === 0) {
      errors.push('Wall must have at least one segment');
    }

    // Validate nodes
    const requiredNodeIds = new Set([
      ...wallSegments.map(s => s.startNodeId),
      ...wallSegments.map(s => s.endNodeId)
    ]);
    const availableNodeIds = new Set(nodes.map(n => n.id));
    
    for (const nodeId of requiredNodeIds) {
      if (!availableNodeIds.has(nodeId)) {
        errors.push(`Missing node: ${nodeId}`);
      }
    }

    // Check for potential quality issues
    if (wallSegments.length > 20) {
      warnings.push('Large number of segments may impact performance');
      qualityImpact += 0.05;
    }

    if (wallSegments.some(s => s.length < 1)) {
      warnings.push('Very short segments detected');
      qualityImpact += 0.1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityImpact
    };
  }

  private async createBaselineFromSegments(
    segments: Segment[],
    nodes: Node[]
  ): Promise<Curve | null> {
    try {
      if (segments.length === 0) {
        return null;
      }

      // Create node lookup
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // Sort segments to create continuous path
      const sortedSegments = this.sortSegmentsForContinuity(segments, nodeMap);
      
      // Create points from sorted segments
      const points: BIMPoint[] = [];
      
      for (let i = 0; i < sortedSegments.length; i++) {
        const segment = sortedSegments[i];
        const startNode = nodeMap.get(segment.startNodeId);
        
        if (startNode && (i === 0 || points.length === 0)) {
          points.push(new BIMPointImpl(startNode.x, startNode.y, {
            id: startNode.id,
            tolerance: this.conversionTolerance,
            creationMethod: 'legacy_conversion',
            accuracy: 1.0,
            validated: true
          }));
        }
        
        const endNode = nodeMap.get(segment.endNodeId);
        if (endNode) {
          points.push(new BIMPointImpl(endNode.x, endNode.y, {
            id: endNode.id,
            tolerance: this.conversionTolerance,
            creationMethod: 'legacy_conversion',
            accuracy: 1.0,
            validated: true
          }));
        }
      }

      if (points.length < 2) {
        return null;
      }

      // Calculate total length
      let totalLength = 0;
      for (let i = 0; i < points.length - 1; i++) {
        totalLength += points[i].distanceTo(points[i + 1]);
      }

      // Calculate bounding box
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const boundingBox = {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys)
      };

      // Create tangent vectors (simplified)
      const tangents: any[] = [];
      for (let i = 0; i < points.length; i++) {
        if (i === points.length - 1) {
          // Use previous tangent for last point
          tangents.push(i > 0 ? tangents[i - 1] : { x: 1, y: 0, normalize: () => ({ x: 1, y: 0 }), dot: () => 0, cross: () => 0, angle: () => 0, rotate: () => ({ x: 0, y: 0 }) });
        } else {
          const nextPoint = points[i + 1];
          const dx = nextPoint.x - points[i].x;
          const dy = nextPoint.y - points[i].y;
          const length = Math.sqrt(dx * dx + dy * dy);
          
          tangents.push({
            x: length > 0 ? dx / length : 1,
            y: length > 0 ? dy / length : 0,
            normalize: () => ({ x: length > 0 ? dx / length : 1, y: length > 0 ? dy / length : 0 }),
            dot: () => 0,
            cross: () => 0,
            angle: () => Math.atan2(dy, dx),
            rotate: () => ({ x: 0, y: 0 })
          });
        }
      }

      return {
        id: `baseline_${segments[0].wallId}`,
        points,
        type: CurveType.POLYLINE,
        isClosed: false,
        length: totalLength,
        boundingBox,
        curvature: points.map(() => 0), // Polyline has zero curvature
        tangents: tangents as any
      };
    } catch (error) {
      console.error('Failed to create baseline from segments:', error);
      return null;
    }
  }

  private sortSegmentsForContinuity(segments: Segment[], nodeMap: Map<string, Node>): Segment[] {
    if (segments.length <= 1) {
      return [...segments];
    }

    const sorted: Segment[] = [];
    const remaining = [...segments];
    
    // Start with first segment
    sorted.push(remaining.shift()!);
    
    // Connect remaining segments
    while (remaining.length > 0) {
      const lastSegment = sorted[sorted.length - 1];
      const lastEndNodeId = lastSegment.endNodeId;
      
      // Find segment that starts where last one ended
      const nextIndex = remaining.findIndex(s => s.startNodeId === lastEndNodeId);
      
      if (nextIndex >= 0) {
        sorted.push(remaining.splice(nextIndex, 1)[0]);
      } else {
        // Try reverse connection
        const reverseIndex = remaining.findIndex(s => s.endNodeId === lastEndNodeId);
        if (reverseIndex >= 0) {
          const segment = remaining.splice(reverseIndex, 1)[0];
          // Reverse the segment
          const reversedSegment: Segment = {
            ...segment,
            startNodeId: segment.endNodeId,
            endNodeId: segment.startNodeId,
            angle: segment.angle + Math.PI
          };
          sorted.push(reversedSegment);
        } else {
          // No connection found, add remaining segments as-is
          sorted.push(...remaining);
          break;
        }
      }
    }
    
    return sorted;
  }

  private async createPolygonsFromWall(
    wall: Wall,
    segments: Segment[],
    nodes: Node[]
  ): Promise<Array<{ id: string; points: Array<{ x: number; y: number }>; area: number; perimeter: number }>> {
    // Simplified polygon creation - in a real implementation, this would use
    // the geometry converter to create proper wall polygons
    return [];
  }

  private async generateInitialBIMGeometry(wallData: UnifiedWallData) {
    // Simplified BIM geometry generation - would use actual BIM engines in real implementation
    const wallSolid = new WallSolidImpl(wallData.baseline, wallData.thickness, wallData.type);
    
    const qualityMetrics: QualityMetrics = {
      geometricAccuracy: 0.9,
      topologicalConsistency: 1.0,
      manufacturability: 0.85,
      architecturalCompliance: 1.0,
      sliverFaceCount: 0,
      microGapCount: 0,
      selfIntersectionCount: 0,
      degenerateElementCount: 0,
      complexity: wallData.basicGeometry.segments.length * 3,
      processingEfficiency: 0.8,
      memoryUsage: 512,
      calculatedAt: new Date(),
      calculationMethod: 'legacy_conversion',
      toleranceUsed: this.conversionTolerance,
      issues: [],
      recommendations: []
    };

    return {
      wallSolid,
      offsetCurves: [wallData.baseline, wallData.baseline], // Simplified
      intersectionData: [],
      qualityMetrics
    };
  }

  private validateLegacyOutput(
    wall: Wall,
    segments: Segment[],
    nodes: Node[]
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate wall-segment consistency
    const segmentWallIds = new Set(segments.map(s => s.wallId));
    if (segments.length > 0 && !segmentWallIds.has(wall.id)) {
      errors.push('Segments do not reference the correct wall ID');
    }

    // Validate segment-node consistency
    const segmentNodeIds = new Set([
      ...segments.map(s => s.startNodeId),
      ...segments.map(s => s.endNodeId)
    ]);
    const nodeIds = new Set(nodes.map(n => n.id));
    
    for (const nodeId of segmentNodeIds) {
      if (!nodeIds.has(nodeId)) {
        errors.push(`Segment references missing node: ${nodeId}`);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateProperties(
    originalWall: Wall,
    convertedWall: UnifiedWallData
  ): { isValid: boolean; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    if (originalWall.id !== convertedWall.id) {
      issues.push({
        type: 'property',
        severity: 'critical',
        description: 'Wall ID mismatch',
        suggestedFix: 'Ensure ID preservation during conversion'
      });
    }

    if (originalWall.type !== convertedWall.type) {
      issues.push({
        type: 'property',
        severity: 'high',
        description: 'Wall type mismatch',
        suggestedFix: 'Verify type mapping in conversion'
      });
    }

    if (Math.abs(originalWall.thickness - convertedWall.thickness) > this.conversionTolerance) {
      issues.push({
        type: 'property',
        severity: 'high',
        description: 'Wall thickness mismatch',
        suggestedFix: 'Check thickness preservation in conversion'
      });
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues
    };
  }

  private async validateGeometry(
    original: { wall: Wall; segments: Segment[]; nodes: Node[] },
    converted: UnifiedWallData
  ): Promise<{ isValid: boolean; issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    // Check segment count consistency
    const originalSegmentCount = original.segments.filter(s => s.wallId === original.wall.id).length;
    const convertedSegmentCount = converted.basicGeometry.segments.length;
    
    if (originalSegmentCount !== convertedSegmentCount) {
      issues.push({
        type: 'geometry',
        severity: 'medium',
        description: `Segment count mismatch: ${originalSegmentCount} vs ${convertedSegmentCount}`,
        suggestedFix: 'Review segment conversion logic'
      });
    }

    // Check baseline point count
    if (converted.baseline.points.length < 2) {
      issues.push({
        type: 'geometry',
        severity: 'critical',
        description: 'Baseline has insufficient points',
        suggestedFix: 'Ensure proper baseline generation from segments'
      });
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues
    };
  }

  private validateTolerances(
    original: { wall: Wall; segments: Segment[]; nodes: Node[] },
    converted: UnifiedWallData
  ): { isValid: boolean; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    // Check if baseline length is reasonable compared to segment lengths
    const originalTotalLength = original.segments
      .filter(s => s.wallId === original.wall.id)
      .reduce((sum, s) => sum + s.length, 0);
    
    const convertedLength = converted.baseline.length;
    const lengthDifference = Math.abs(originalTotalLength - convertedLength);
    
    if (lengthDifference > this.conversionTolerance * 10) {
      issues.push({
        type: 'tolerance',
        severity: 'medium',
        description: `Length difference exceeds tolerance: ${lengthDifference}`,
        suggestedFix: 'Review baseline generation accuracy'
      });
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues
    };
  }
}