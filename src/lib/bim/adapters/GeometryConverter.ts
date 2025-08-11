/**
 * GeometryConverter Implementation
 * 
 * Handles conversion between different geometric representations with
 * Martinez polygon integration for boolean operations
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { WallSolid } from '../geometry/WallSolid';
import { BIMPolygon } from '../geometry/BIMPolygon';
import { BIMPoint } from '../geometry/BIMPoint';
import { Curve } from '../geometry/Curve';
import { CurveType } from '../types/BIMTypes';

/**
 * Martinez polygon type (simplified interface)
 */
export interface MartinezPolygon {
  coordinates: number[][][];
  type: 'Polygon';
}

/**
 * Wall metadata for conversion
 */
export interface WallMetadata {
  id: string;
  thickness: number;
  wallType: string;
  baseline: Curve;
  processingTime?: number;
  qualityScore?: number;
}

/**
 * Conversion result
 */
export interface ConversionResult<T> {
  success: boolean;
  result?: T;
  errors: string[];
  warnings: string[];
  processingTime: number;
  qualityScore: number;
}

/**
 * Polygon conversion options
 */
export interface PolygonConversionOptions {
  tolerance: number;
  simplifyGeometry: boolean;
  preserveHoles: boolean;
  validateOutput: boolean;
}

/**
 * Geometry converter interface
 */
export interface IGeometryConverter {
  polygonToWallSolid(
    polygon: BIMPolygon,
    thickness: number,
    options?: Partial<PolygonConversionOptions>
  ): Promise<ConversionResult<WallSolid>>;
  
  wallSolidToPolygon(
    wallSolid: WallSolid,
    options?: Partial<PolygonConversionOptions>
  ): Promise<ConversionResult<BIMPolygon>>;
  
  wallSolidToMartinezPolygon(
    wallSolid: WallSolid
  ): Promise<ConversionResult<MartinezPolygon>>;
  
  martinezPolygonToWallSolid(
    polygon: MartinezPolygon,
    metadata: WallMetadata
  ): Promise<ConversionResult<WallSolid>>;
  
  simplifyPolygon(
    polygon: BIMPolygon,
    tolerance: number
  ): Promise<ConversionResult<BIMPolygon>>;
  
  validateGeometry(
    geometry: BIMPolygon | WallSolid
  ): Promise<{ isValid: boolean; issues: string[] }>;
}

/**
 * Geometry converter implementation
 */
export class GeometryConverter implements IGeometryConverter {
  private defaultTolerance: number = 1e-6;
  private defaultOptions: PolygonConversionOptions = {
    tolerance: this.defaultTolerance,
    simplifyGeometry: true,
    preserveHoles: true,
    validateOutput: true
  };

  /**
   * Convert polygon to wall solid
   */
  async polygonToWallSolid(
    polygon: BIMPolygon,
    thickness: number,
    options?: Partial<PolygonConversionOptions>
  ): Promise<ConversionResult<WallSolid>> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 1.0;

    try {
      // Validate input polygon
      if (!polygon.outerRing || polygon.outerRing.length < 3) {
        errors.push('Polygon must have at least 3 points in outer ring');
        return this.createFailureResult(errors, warnings, startTime);
      }

      if (thickness <= 0) {
        errors.push('Wall thickness must be positive');
        return this.createFailureResult(errors, warnings, startTime);
      }

      // Create baseline from polygon centroid line
      const baseline = await this.extractBaselineFromPolygon(polygon);
      if (!baseline) {
        errors.push('Failed to extract baseline from polygon');
        return this.createFailureResult(errors, warnings, startTime);
      }

      // Create wall solid (simplified implementation)
      const wallSolid = await this.createWallSolidFromBaseline(baseline, thickness, polygon);
      
      if (opts.validateOutput) {
        const validation = await this.validateGeometry(wallSolid);
        if (!validation.isValid) {
          warnings.push(`Validation issues: ${validation.issues.join(', ')}`);
          qualityScore -= 0.1;
        }
      }

      return {
        success: true,
        result: wallSolid,
        errors,
        warnings,
        processingTime: Date.now() - startTime,
        qualityScore
      };
    } catch (error) {
      errors.push(`Conversion failed: ${error}`);
      return this.createFailureResult(errors, warnings, startTime);
    }
  }

  /**
   * Convert wall solid to polygon
   */
  async wallSolidToPolygon(
    wallSolid: WallSolid,
    options?: Partial<PolygonConversionOptions>
  ): Promise<ConversionResult<BIMPolygon>> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 1.0;

    try {
      // Use existing solid geometry if available
      if (wallSolid.solidGeometry && wallSolid.solidGeometry.length > 0) {
        const primaryPolygon = wallSolid.solidGeometry[0];
        
        if (opts.simplifyGeometry) {
          const simplificationResult = await this.simplifyPolygon(primaryPolygon, opts.tolerance);
          if (simplificationResult.success && simplificationResult.result) {
            return {
              success: true,
              result: simplificationResult.result,
              errors,
              warnings: [...warnings, ...simplificationResult.warnings],
              processingTime: Date.now() - startTime,
              qualityScore: simplificationResult.qualityScore
            };
          }
        }

        return {
          success: true,
          result: primaryPolygon,
          errors,
          warnings,
          processingTime: Date.now() - startTime,
          qualityScore
        };
      }

      // Generate polygon from baseline and thickness
      const polygon = await this.generatePolygonFromBaseline(wallSolid.baseline, wallSolid.thickness);
      
      if (opts.validateOutput) {
        const validation = await this.validateGeometry(polygon);
        if (!validation.isValid) {
          warnings.push(`Validation issues: ${validation.issues.join(', ')}`);
          qualityScore -= 0.1;
        }
      }

      return {
        success: true,
        result: polygon,
        errors,
        warnings,
        processingTime: Date.now() - startTime,
        qualityScore
      };
    } catch (error) {
      errors.push(`Conversion failed: ${error}`);
      return this.createFailureResult(errors, warnings, startTime);
    }
  }

  /**
   * Convert wall solid to Martinez polygon format
   */
  async wallSolidToMartinezPolygon(
    wallSolid: WallSolid
  ): Promise<ConversionResult<MartinezPolygon>> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // First convert to BIM polygon
      const polygonResult = await this.wallSolidToPolygon(wallSolid);
      if (!polygonResult.success || !polygonResult.result) {
        return {
          success: false,
          errors: [...errors, ...polygonResult.errors],
          warnings: [...warnings, ...polygonResult.warnings],
          processingTime: Date.now() - startTime,
          qualityScore: 0
        };
      }

      const bimPolygon = polygonResult.result;

      // Convert to Martinez format
      const coordinates: number[][][] = [];
      
      // Outer ring
      const outerRing = bimPolygon.outerRing.map(point => [point.x, point.y]);
      // Close the ring if not already closed
      if (outerRing.length > 0) {
        const first = outerRing[0];
        const last = outerRing[outerRing.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          outerRing.push([first[0], first[1]]);
        }
      }
      coordinates.push(outerRing);

      // Holes
      for (const hole of bimPolygon.holes) {
        const holeRing = hole.map(point => [point.x, point.y]);
        // Close the hole ring if not already closed
        if (holeRing.length > 0) {
          const first = holeRing[0];
          const last = holeRing[holeRing.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            holeRing.push([first[0], first[1]]);
          }
        }
        coordinates.push(holeRing);
      }

      const martinezPolygon: MartinezPolygon = {
        type: 'Polygon',
        coordinates
      };

      return {
        success: true,
        result: martinezPolygon,
        errors,
        warnings: [...warnings, ...polygonResult.warnings],
        processingTime: Date.now() - startTime,
        qualityScore: polygonResult.qualityScore
      };
    } catch (error) {
      errors.push(`Martinez conversion failed: ${error}`);
      return this.createFailureResult(errors, warnings, startTime);
    }
  }

  /**
   * Convert Martinez polygon to wall solid
   */
  async martinezPolygonToWallSolid(
    polygon: MartinezPolygon,
    metadata: WallMetadata
  ): Promise<ConversionResult<WallSolid>> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate Martinez polygon
      if (!polygon.coordinates || polygon.coordinates.length === 0) {
        errors.push('Martinez polygon has no coordinates');
        return this.createFailureResult(errors, warnings, startTime);
      }

      // Convert coordinates to BIM points
      const outerRingCoords = polygon.coordinates[0];
      if (!outerRingCoords || outerRingCoords.length < 3) {
        errors.push('Martinez polygon outer ring has insufficient points');
        return this.createFailureResult(errors, warnings, startTime);
      }

      // Create BIM points for outer ring
      const outerRing: BIMPoint[] = outerRingCoords.slice(0, -1).map((coord, index) => ({
        id: `martinez_point_${metadata.id}_${index}`,
        x: coord[0],
        y: coord[1],
        tolerance: this.defaultTolerance,
        creationMethod: 'martinez_conversion',
        accuracy: 0.95,
        validated: false,
        distanceTo: function(other) { 
          return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2); 
        },
        equals: function(other, tolerance = 1e-6) { 
          return this.distanceTo(other) <= tolerance; 
        }
      }));

      // Create BIM points for holes
      const holes: BIMPoint[][] = [];
      for (let i = 1; i < polygon.coordinates.length; i++) {
        const holeCoords = polygon.coordinates[i];
        const hole: BIMPoint[] = holeCoords.slice(0, -1).map((coord, index) => ({
          id: `martinez_hole_${metadata.id}_${i}_${index}`,
          x: coord[0],
          y: coord[1],
          tolerance: this.defaultTolerance,
          creationMethod: 'martinez_conversion',
          accuracy: 0.95,
          validated: false,
          distanceTo: function(other) { 
            return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2); 
          },
          equals: function(other, tolerance = 1e-6) { 
            return this.distanceTo(other) <= tolerance; 
          }
        }));
        holes.push(hole);
      }

      // Create BIM polygon
      const bimPolygon = await this.createBIMPolygonFromPoints(outerRing, holes, metadata.id);

      // Convert to wall solid
      const wallSolidResult = await this.polygonToWallSolid(bimPolygon, metadata.thickness);
      
      return {
        success: wallSolidResult.success,
        result: wallSolidResult.result,
        errors: [...errors, ...wallSolidResult.errors],
        warnings: [...warnings, ...wallSolidResult.warnings],
        processingTime: Date.now() - startTime,
        qualityScore: wallSolidResult.qualityScore
      };
    } catch (error) {
      errors.push(`Martinez to wall solid conversion failed: ${error}`);
      return this.createFailureResult(errors, warnings, startTime);
    }
  }

  /**
   * Simplify polygon geometry
   */
  async simplifyPolygon(
    polygon: BIMPolygon,
    tolerance: number
  ): Promise<ConversionResult<BIMPolygon>> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 1.0;

    try {
      // Simplify outer ring using Douglas-Peucker algorithm
      const simplifiedOuterRing = this.douglasPeuckerSimplify(polygon.outerRing, tolerance);
      
      if (simplifiedOuterRing.length < 3) {
        errors.push('Simplification resulted in insufficient points');
        return this.createFailureResult(errors, warnings, startTime);
      }

      // Simplify holes
      const simplifiedHoles: BIMPoint[][] = [];
      for (const hole of polygon.holes) {
        const simplifiedHole = this.douglasPeuckerSimplify(hole, tolerance);
        if (simplifiedHole.length >= 3) {
          simplifiedHoles.push(simplifiedHole);
        } else {
          warnings.push('Hole removed due to insufficient points after simplification');
          qualityScore -= 0.05;
        }
      }

      // Calculate quality impact
      const originalPointCount = polygon.outerRing.length + polygon.holes.reduce((sum, hole) => sum + hole.length, 0);
      const simplifiedPointCount = simplifiedOuterRing.length + simplifiedHoles.reduce((sum, hole) => sum + hole.length, 0);
      const reductionRatio = (originalPointCount - simplifiedPointCount) / originalPointCount;
      
      if (reductionRatio > 0.5) {
        warnings.push(`Significant point reduction: ${(reductionRatio * 100).toFixed(1)}%`);
        qualityScore -= reductionRatio * 0.2;
      }

      // Create simplified polygon
      const simplifiedPolygon = await this.createBIMPolygonFromPoints(
        simplifiedOuterRing,
        simplifiedHoles,
        `${polygon.id}_simplified`
      );

      return {
        success: true,
        result: simplifiedPolygon,
        errors,
        warnings,
        processingTime: Date.now() - startTime,
        qualityScore: Math.max(0, qualityScore)
      };
    } catch (error) {
      errors.push(`Simplification failed: ${error}`);
      return this.createFailureResult(errors, warnings, startTime);
    }
  }

  /**
   * Validate geometry
   */
  async validateGeometry(
    geometry: BIMPolygon | WallSolid
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      if ('outerRing' in geometry) {
        // Validate BIM polygon
        const polygon = geometry as BIMPolygon;
        
        if (polygon.outerRing.length < 3) {
          issues.push('Polygon outer ring has insufficient points');
        }

        if (polygon.area <= 0) {
          issues.push('Polygon has zero or negative area');
        }

        if (polygon.selfIntersects) {
          issues.push('Polygon has self-intersections');
        }

        // Check for duplicate consecutive points
        for (let i = 0; i < polygon.outerRing.length - 1; i++) {
          const current = polygon.outerRing[i];
          const next = polygon.outerRing[i + 1];
          if (current.equals(next, this.defaultTolerance)) {
            issues.push(`Duplicate consecutive points at index ${i}`);
          }
        }
      } else {
        // Validate wall solid
        const wallSolid = geometry as WallSolid;
        
        if (wallSolid.thickness <= 0) {
          issues.push('Wall solid has invalid thickness');
        }

        if (wallSolid.baseline.points.length < 2) {
          issues.push('Wall solid baseline has insufficient points');
        }

        if (wallSolid.solidGeometry.length === 0) {
          issues.push('Wall solid has no geometry');
        }

        // Validate quality metrics
        if (wallSolid.geometricQuality.selfIntersectionCount > 0) {
          issues.push('Wall solid has self-intersections');
        }

        if (wallSolid.geometricQuality.degenerateElementCount > 0) {
          issues.push('Wall solid has degenerate elements');
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Validation error: ${error}`);
      return {
        isValid: false,
        issues
      };
    }
  }

  // Private helper methods

  private createFailureResult<T>(
    errors: string[],
    warnings: string[],
    startTime: number
  ): ConversionResult<T> {
    return {
      success: false,
      errors,
      warnings,
      processingTime: Date.now() - startTime,
      qualityScore: 0
    };
  }

  private async extractBaselineFromPolygon(polygon: BIMPolygon): Promise<Curve | null> {
    try {
      // Simplified baseline extraction - find the longest edge or centroid line
      if (polygon.outerRing.length < 2) {
        return null;
      }

      // For now, use the first two points as a simple baseline
      const points = polygon.outerRing.slice(0, 2);
      
      const length = points[0].distanceTo(points[1]);
      const boundingBox = {
        minX: Math.min(points[0].x, points[1].x),
        minY: Math.min(points[0].y, points[1].y),
        maxX: Math.max(points[0].x, points[1].x),
        maxY: Math.max(points[0].y, points[1].y)
      };

      return {
        id: `baseline_${polygon.id}`,
        points,
        type: CurveType.POLYLINE,
        isClosed: false,
        length,
        boundingBox,
        curvature: [0, 0],
        tangents: [
          { x: 1, y: 0, normalize: () => ({ x: 1, y: 0 }), dot: () => 0, cross: () => 0, angle: () => 0, rotate: () => ({ x: 1, y: 0 }) },
          { x: 1, y: 0, normalize: () => ({ x: 1, y: 0 }), dot: () => 0, cross: () => 0, angle: () => 0, rotate: () => ({ x: 1, y: 0 }) }
        ] as any
      };
    } catch (error) {
      return null;
    }
  }

  private async createWallSolidFromBaseline(
    baseline: Curve,
    thickness: number,
    sourcePolygon: BIMPolygon
  ): Promise<WallSolid> {
    // This would use the actual WallSolidImpl in a real implementation
    // For now, return a simplified mock
    return {
      id: `wall_solid_${baseline.id}`,
      baseline,
      thickness,
      wallType: 'Layout' as any,
      leftOffset: baseline,
      rightOffset: baseline,
      solidGeometry: [sourcePolygon],
      joinTypes: new Map(),
      intersectionData: [],
      healingHistory: [],
      geometricQuality: {
        geometricAccuracy: 0.9,
        topologicalConsistency: 1.0,
        manufacturability: 0.85,
        architecturalCompliance: 1.0,
        sliverFaceCount: 0,
        microGapCount: 0,
        selfIntersectionCount: 0,
        degenerateElementCount: 0,
        complexity: 5,
        processingEfficiency: 0.8,
        memoryUsage: 256
      },
      lastValidated: new Date(),
      processingTime: 0,
      complexity: 5
    } as WallSolid;
  }

  private async generatePolygonFromBaseline(baseline: Curve, thickness: number): Promise<BIMPolygon> {
    // Simplified polygon generation from baseline
    const halfThickness = thickness / 2;
    const points = baseline.points;
    
    if (points.length < 2) {
      throw new Error('Baseline must have at least 2 points');
    }

    // Create offset points (simplified)
    const leftPoints: BIMPoint[] = [];
    const rightPoints: BIMPoint[] = [];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      // Simplified offset - just move perpendicular to the line
      const offsetX = halfThickness;
      const offsetY = 0;

      leftPoints.push({
        ...point,
        id: `left_${point.id}`,
        x: point.x - offsetX,
        y: point.y - offsetY
      });

      rightPoints.push({
        ...point,
        id: `right_${point.id}`,
        x: point.x + offsetX,
        y: point.y + offsetY
      });
    }

    // Create polygon by connecting left and right points
    const outerRing = [...leftPoints, ...rightPoints.reverse()];
    
    return await this.createBIMPolygonFromPoints(outerRing, [], `polygon_${baseline.id}`);
  }

  private async createBIMPolygonFromPoints(
    outerRing: BIMPoint[],
    holes: BIMPoint[][],
    id: string
  ): Promise<BIMPolygon> {
    // Calculate area using shoelace formula
    let area = 0;
    for (let i = 0; i < outerRing.length; i++) {
      const j = (i + 1) % outerRing.length;
      area += outerRing[i].x * outerRing[j].y;
      area -= outerRing[j].x * outerRing[i].y;
    }
    area = Math.abs(area) / 2;

    // Calculate perimeter
    let perimeter = 0;
    for (let i = 0; i < outerRing.length; i++) {
      const j = (i + 1) % outerRing.length;
      perimeter += outerRing[i].distanceTo(outerRing[j]);
    }

    // Calculate centroid
    let centroidX = 0;
    let centroidY = 0;
    for (const point of outerRing) {
      centroidX += point.x;
      centroidY += point.y;
    }
    centroidX /= outerRing.length;
    centroidY /= outerRing.length;

    const centroid: BIMPoint = {
      id: `centroid_${id}`,
      x: centroidX,
      y: centroidY,
      tolerance: this.defaultTolerance,
      creationMethod: 'calculated',
      accuracy: 1.0,
      validated: true,
      distanceTo: function(other) { 
        return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2); 
      },
      equals: function(other, tolerance = 1e-6) { 
        return this.distanceTo(other) <= tolerance; 
      }
    };

    // Calculate bounding box
    const xs = outerRing.map(p => p.x);
    const ys = outerRing.map(p => p.y);
    const boundingBox = {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys)
    };

    return {
      id,
      outerRing,
      holes,
      area,
      perimeter,
      centroid,
      boundingBox,
      isValid: true,
      selfIntersects: false,
      hasSliversFaces: false,
      creationMethod: 'geometry_converter',
      healingApplied: false,
      simplificationApplied: false,
      containsPoint: function(point) {
        // Simplified point-in-polygon test
        return this.boundingBox.minX <= point.x && point.x <= this.boundingBox.maxX &&
               this.boundingBox.minY <= point.y && point.y <= this.boundingBox.maxY;
      }
    };
  }

  private douglasPeuckerSimplify(points: BIMPoint[], tolerance: number): BIMPoint[] {
    if (points.length <= 2) {
      return [...points];
    }

    // Find the point with maximum distance from the line between first and last points
    let maxDistance = 0;
    let maxIndex = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.pointToLineDistance(points[i], first, last);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftPart = this.douglasPeuckerSimplify(points.slice(0, maxIndex + 1), tolerance);
      const rightPart = this.douglasPeuckerSimplify(points.slice(maxIndex), tolerance);
      
      // Combine results, avoiding duplicate middle point
      return [...leftPart.slice(0, -1), ...rightPart];
    } else {
      // All points are within tolerance, return just endpoints
      return [first, last];
    }
  }

  private pointToLineDistance(point: BIMPoint, lineStart: BIMPoint, lineEnd: BIMPoint): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line start and end are the same point
      return point.distanceTo(lineStart);
    }

    const param = dot / lenSq;

    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}