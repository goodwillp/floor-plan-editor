/**
 * Geometric Data Serialization
 * 
 * Handles serialization and deserialization of complex geometric data structures
 * for database storage with compression and validation
 */

import { UnifiedWallData, BasicGeometry, BIMGeometry } from '../types/UnifiedWallData';
import { Curve } from '../geometry/Curve';
import { WallSolid } from '../geometry/WallSolid';
import { BIMPoint } from '../geometry/BIMPoint';

export interface SerializedWallData {
  baselineData: string;
  basicGeometryData: string;
  bimGeometryData: string | null;
  processingHistoryData: string;
  boundingBox?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface SerializationOptions {
  compress: boolean;
  validateOnSerialize: boolean;
  validateOnDeserialize: boolean;
  includeMetadata: boolean;
}

export class GeometricDataSerializer {
  private defaultOptions: SerializationOptions = {
    compress: true,
    validateOnSerialize: true,
    validateOnDeserialize: true,
    includeMetadata: true
  };

  constructor(private options: Partial<SerializationOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Serialize a wall for database storage
   */
  async serializeWall(wall: UnifiedWallData): Promise<SerializedWallData> {
    try {
      // Validate before serialization if enabled
      if (this.options.validateOnSerialize) {
        this.validateWallData(wall);
      }

      // Serialize baseline curve
      const baselineData = await this.serializeCurve(wall.baseline);

      // Serialize basic geometry
      const basicGeometryData = await this.serializeBasicGeometry(wall.basicGeometry);

      // Serialize BIM geometry if present
      let bimGeometryData: string | null = null;
      if (wall.bimGeometry) {
        bimGeometryData = await this.serializeBIMGeometry(wall.bimGeometry);
      }

      // Serialize processing history
      const processingHistoryData = JSON.stringify(wall.processingHistory);

      // Calculate bounding box for spatial indexing
      const boundingBox = this.calculateBoundingBox(wall);

      const result: SerializedWallData = {
        baselineData,
        basicGeometryData,
        bimGeometryData,
        processingHistoryData,
        boundingBox
      };

      // Apply compression if enabled
      if (this.options.compress) {
        return this.compressSerializedData(result);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to serialize wall ${wall.id}: ${message}`);
    }
  }

  /**
   * Synchronous version for batch operations
   */
  serializeWallSync(wall: UnifiedWallData): SerializedWallData {
    try {
      // Validate before serialization if enabled
      if (this.options.validateOnSerialize) {
        this.validateWallData(wall);
      }

      // Serialize baseline curve (sync version)
      const baselineData = this.serializeCurveSync(wall.baseline);

      // Serialize basic geometry (sync version)
      const basicGeometryData = this.serializeBasicGeometrySync(wall.basicGeometry);

      // Serialize BIM geometry if present (sync version)
      let bimGeometryData: string | null = null;
      if (wall.bimGeometry) {
        bimGeometryData = this.serializeBIMGeometrySync(wall.bimGeometry);
      }

      // Serialize processing history
      const processingHistoryData = JSON.stringify(wall.processingHistory);

      // Calculate bounding box for spatial indexing
      const boundingBox = this.calculateBoundingBox(wall);

      const result: SerializedWallData = {
        baselineData,
        basicGeometryData,
        bimGeometryData,
        processingHistoryData,
        boundingBox
      };

      // Apply compression if enabled
      if (this.options.compress) {
        return this.compressSerializedDataSync(result);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to serialize wall ${wall.id}: ${message}`);
    }
  }

  /**
   * Deserialize a wall from database storage
   */
  async deserializeWall(row: any): Promise<UnifiedWallData> {
    try {
      // Decompress data if needed
      let serializedData: SerializedWallData = {
        baselineData: row.baseline_data,
        basicGeometryData: row.basic_geometry_data,
        bimGeometryData: row.bim_geometry_data,
        processingHistoryData: row.processing_history_data
      };

      if (this.options.compress) {
        serializedData = await this.decompressSerializedData(serializedData);
      }

      // Deserialize components
      const baseline = await this.deserializeCurve(serializedData.baselineData);
      const basicGeometry = await this.deserializeBasicGeometry(serializedData.basicGeometryData);
      
      let bimGeometry: BIMGeometry | undefined;
      if (serializedData.bimGeometryData) {
        bimGeometry = await this.deserializeBIMGeometry(serializedData.bimGeometryData);
      }

      const processingHistory = JSON.parse(serializedData.processingHistoryData || '[]');

      const wall: UnifiedWallData = {
        id: row.id,
        type: row.type,
        thickness: row.thickness,
        visible: row.visible === 1,
        baseline,
        basicGeometry,
        bimGeometry,
        isBasicModeValid: row.is_basic_mode_valid === 1,
        isBIMModeValid: row.is_bim_mode_valid === 1,
        lastModifiedMode: row.last_modified_mode,
        requiresSync: row.requires_sync === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        version: row.version,
        projectId: row.project_id,
        processingHistory
      };

      // Validate after deserialization if enabled
      if (this.options.validateOnDeserialize) {
        this.validateWallData(wall);
      }

      return wall;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to deserialize wall from database: ${message}`);
    }
  }

  /**
   * Serialize a curve to JSON string
   */
  private async serializeCurve(curve: Curve): Promise<string> {
    const serializedCurve = {
      id: curve.id,
      points: curve.points.map(point => ({
        x: point.x,
        y: point.y,
        id: (point as BIMPoint).id,
        tolerance: (point as BIMPoint).tolerance,
        creationMethod: (point as BIMPoint).creationMethod,
        accuracy: (point as BIMPoint).accuracy,
        validated: (point as BIMPoint).validated
      })),
      type: curve.type,
      isClosed: curve.isClosed,
      length: curve.length,
      boundingBox: curve.boundingBox,
      curvature: curve.curvature,
      tangents: curve.tangents
    };

    return JSON.stringify(serializedCurve);
  }

  /**
   * Synchronous curve serialization
   */
  private serializeCurveSync(curve: Curve): string {
    const serializedCurve = {
      id: curve.id,
      points: curve.points.map(point => ({
        x: point.x,
        y: point.y,
        id: (point as BIMPoint).id,
        tolerance: (point as BIMPoint).tolerance,
        creationMethod: (point as BIMPoint).creationMethod,
        accuracy: (point as BIMPoint).accuracy,
        validated: (point as BIMPoint).validated
      })),
      type: curve.type,
      isClosed: curve.isClosed,
      length: curve.length,
      boundingBox: curve.boundingBox,
      curvature: curve.curvature,
      tangents: curve.tangents
    };

    return JSON.stringify(serializedCurve);
  }

  /**
   * Deserialize a curve from JSON string
   */
  private async deserializeCurve(data: string): Promise<Curve> {
    const parsed = JSON.parse(data);
    
    return {
      id: parsed.id,
      points: parsed.points.map((p: any) => ({
        x: p.x,
        y: p.y,
        id: p.id,
        tolerance: p.tolerance,
        creationMethod: p.creationMethod,
        accuracy: p.accuracy,
        validated: p.validated
      })),
      type: parsed.type,
      isClosed: parsed.isClosed,
      length: parsed.length,
      boundingBox: parsed.boundingBox,
      curvature: parsed.curvature || [],
      tangents: parsed.tangents || []
    };
  }

  /**
   * Serialize basic geometry
   */
  private async serializeBasicGeometry(geometry: BasicGeometry): Promise<string> {
    return JSON.stringify(geometry);
  }

  /**
   * Synchronous basic geometry serialization
   */
  private serializeBasicGeometrySync(geometry: BasicGeometry): string {
    return JSON.stringify(geometry);
  }

  /**
   * Deserialize basic geometry
   */
  private async deserializeBasicGeometry(data: string): Promise<BasicGeometry> {
    return JSON.parse(data);
  }

  /**
   * Serialize BIM geometry
   */
  private async serializeBIMGeometry(geometry: BIMGeometry): Promise<string> {
    const serialized = {
      wallSolid: this.serializeWallSolid(geometry.wallSolid),
      offsetCurves: await Promise.all(geometry.offsetCurves.map(curve => this.serializeCurve(curve))),
      intersectionData: geometry.intersectionData.map(intersection => ({
        id: intersection.id,
        type: intersection.type,
        participatingWalls: intersection.participatingWalls,
        intersectionPoint: intersection.intersectionPoint,
        miterApex: intersection.miterApex,
        offsetIntersections: intersection.offsetIntersections,
        resolvedGeometry: intersection.resolvedGeometry,
        resolutionMethod: intersection.resolutionMethod,
        geometricAccuracy: intersection.geometricAccuracy,
        validated: intersection.validated
      })),
      qualityMetrics: geometry.qualityMetrics
    };

    return JSON.stringify(serialized);
  }

  /**
   * Synchronous BIM geometry serialization
   */
  private serializeBIMGeometrySync(geometry: BIMGeometry): string {
    const serialized = {
      wallSolid: this.serializeWallSolid(geometry.wallSolid),
      offsetCurves: geometry.offsetCurves.map(curve => this.serializeCurveSync(curve)),
      intersectionData: geometry.intersectionData.map(intersection => ({
        id: intersection.id,
        type: intersection.type,
        participatingWalls: intersection.participatingWalls,
        intersectionPoint: intersection.intersectionPoint,
        miterApex: intersection.miterApex,
        offsetIntersections: intersection.offsetIntersections,
        resolvedGeometry: intersection.resolvedGeometry,
        resolutionMethod: intersection.resolutionMethod,
        geometricAccuracy: intersection.geometricAccuracy,
        validated: intersection.validated
      })),
      qualityMetrics: geometry.qualityMetrics
    };

    return JSON.stringify(serialized);
  }

  /**
   * Deserialize BIM geometry
   */
  private async deserializeBIMGeometry(data: string): Promise<BIMGeometry> {
    const parsed = JSON.parse(data);
    
    return {
      wallSolid: this.deserializeWallSolid(parsed.wallSolid),
      offsetCurves: await Promise.all(parsed.offsetCurves.map((curveData: string) => 
        this.deserializeCurve(curveData)
      )),
      intersectionData: parsed.intersectionData,
      qualityMetrics: parsed.qualityMetrics
    };
  }

  /**
   * Serialize wall solid
   */
  private serializeWallSolid(wallSolid: WallSolid): any {
    return {
      id: wallSolid.id,
      baseline: this.serializeCurveSync(wallSolid.baseline),
      thickness: wallSolid.thickness,
      wallType: wallSolid.wallType,
      leftOffset: this.serializeCurveSync(wallSolid.leftOffset),
      rightOffset: this.serializeCurveSync(wallSolid.rightOffset),
      solidGeometry: wallSolid.solidGeometry,
      joinTypes: Array.from(wallSolid.joinTypes.entries()),
      intersectionData: wallSolid.intersectionData,
      healingHistory: wallSolid.healingHistory,
      geometricQuality: wallSolid.geometricQuality,
      lastValidated: wallSolid.lastValidated.toISOString(),
      processingTime: wallSolid.processingTime,
      complexity: wallSolid.complexity
    };
  }

  /**
   * Deserialize wall solid
   */
  private deserializeWallSolid(data: any): WallSolid {
    return {
      id: data.id,
      baseline: JSON.parse(data.baseline),
      thickness: data.thickness,
      wallType: data.wallType,
      leftOffset: JSON.parse(data.leftOffset),
      rightOffset: JSON.parse(data.rightOffset),
      solidGeometry: data.solidGeometry,
      joinTypes: new Map(data.joinTypes),
      intersectionData: data.intersectionData,
      healingHistory: data.healingHistory,
      geometricQuality: data.geometricQuality,
      lastValidated: new Date(data.lastValidated),
      processingTime: data.processingTime,
      complexity: data.complexity,
      containsPoint: (_p: any) => false,
      addIntersection: (_i: any) => {},
      removeIntersection: (_id: string) => false
    } as any;
  }

  /**
   * Calculate bounding box for spatial indexing
   */
  private calculateBoundingBox(wall: UnifiedWallData): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | undefined {
    if (!wall.baseline.points || wall.baseline.points.length === 0) {
      return undefined;
    }

    let minX = wall.baseline.points[0].x;
    let minY = wall.baseline.points[0].y;
    let maxX = wall.baseline.points[0].x;
    let maxY = wall.baseline.points[0].y;

    for (const point of wall.baseline.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    // Expand by wall thickness for accurate spatial queries
    const halfThickness = wall.thickness / 2;
    return {
      minX: minX - halfThickness,
      minY: minY - halfThickness,
      maxX: maxX + halfThickness,
      maxY: maxY + halfThickness
    };
  }

  /**
   * Validate wall data structure
   */
  private validateWallData(wall: UnifiedWallData): void {
    if (!wall.id) {
      throw new Error('Wall ID is required');
    }

    if (!wall.type) {
      throw new Error('Wall type is required');
    }

    if (wall.thickness <= 0) {
      throw new Error('Wall thickness must be positive');
    }

    if (!wall.baseline || !wall.baseline.points || wall.baseline.points.length < 2) {
      throw new Error('Wall baseline must have at least 2 points');
    }

    if (!wall.basicGeometry) {
      throw new Error('Basic geometry is required');
    }

    // Validate BIM geometry if present
    if (wall.bimGeometry) {
      if (!wall.bimGeometry.wallSolid) {
        throw new Error('BIM geometry must include wall solid');
      }

      if (!wall.bimGeometry.qualityMetrics) {
        throw new Error('BIM geometry must include quality metrics');
      }
    }
  }

  /**
   * Compress serialized data (placeholder for actual compression)
   */
  private compressSerializedData(data: SerializedWallData): SerializedWallData {
    // In a real implementation, you might use a compression library like pako
    // For now, we'll just return the data as-is
    return data;
  }

  /**
   * Synchronous compression
   */
  private compressSerializedDataSync(data: SerializedWallData): SerializedWallData {
    // In a real implementation, you might use a compression library like pako
    // For now, we'll just return the data as-is
    return data;
  }

  /**
   * Decompress serialized data (placeholder for actual decompression)
   */
  private async decompressSerializedData(data: SerializedWallData): Promise<SerializedWallData> {
    // In a real implementation, you might use a compression library like pako
    // For now, we'll just return the data as-is
    return data;
  }

  /**
   * Create a backup-compatible serialization format
   */
  async createBackupFormat(wall: UnifiedWallData): Promise<string> {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      wall: await this.serializeWall(wall),
      metadata: {
        serializationOptions: this.options,
        schemaVersion: 1
      }
    };

    return JSON.stringify(backupData, null, 2);
  }

  /**
   * Restore from backup format
   */
  async restoreFromBackup(backupData: string): Promise<UnifiedWallData> {
    const parsed = JSON.parse(backupData);
    
    if (!parsed.version || !parsed.wall) {
      throw new Error('Invalid backup format');
    }

    // Handle version compatibility here if needed
    if (parsed.version !== '1.0') {
      console.warn(`Backup version ${parsed.version} may not be fully compatible`);
    }

    // Create a mock database row for deserialization
    const mockRow = {
      id: parsed.wall.id,
      type: parsed.wall.type,
      thickness: parsed.wall.thickness,
      visible: parsed.wall.visible ? 1 : 0,
      baseline_data: parsed.wall.baselineData,
      basic_geometry_data: parsed.wall.basicGeometryData,
      bim_geometry_data: parsed.wall.bimGeometryData,
      is_basic_mode_valid: parsed.wall.isBasicModeValid ? 1 : 0,
      is_bim_mode_valid: parsed.wall.isBIMModeValid ? 1 : 0,
      last_modified_mode: parsed.wall.lastModifiedMode,
      requires_sync: parsed.wall.requiresSync ? 1 : 0,
      created_at: parsed.wall.createdAt,
      updated_at: parsed.wall.updatedAt,
      version: parsed.wall.version,
      project_id: parsed.wall.projectId,
      processing_history_data: parsed.wall.processingHistoryData
    };

    return this.deserializeWall(mockRow);
  }
}