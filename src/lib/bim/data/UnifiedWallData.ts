/**
 * UnifiedWallData Implementation
 * 
 * Unified data structure supporting both basic and BIM representations
 * with seamless mode switching and data synchronization
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { WallSolid } from '../geometry/WallSolid';
import { Curve } from '../geometry/Curve';
import { IntersectionData } from '../geometry/IntersectionData';
import { QualityMetrics } from '../types/QualityMetrics';
import { WallTypeString } from '../types/WallTypes';
import { Wall, Segment, Node } from '../../types';

/**
 * Basic geometry representation (legacy format)
 */
export interface BasicGeometry {
  segments: Segment[];
  nodes: Node[];
  polygons: Array<{
    id: string;
    points: Array<{ x: number; y: number }>;
    area: number;
    perimeter: number;
  }>;
}

/**
 * BIM geometry representation (enhanced format)
 */
export interface BIMGeometry {
  wallSolid: WallSolid;
  offsetCurves: Curve[];
  intersectionData: IntersectionData[];
  qualityMetrics: QualityMetrics;
}

/**
 * Processing history entry for tracking operations
 */
export interface ProcessingHistoryEntry {
  timestamp: Date;
  operation: string;
  mode: 'basic' | 'bim';
  success: boolean;
  processingTime: number;
  warnings: string[];
  errors: string[];
  parameters?: Record<string, any>;
}

/**
 * Mode compatibility status
 */
export interface ModeCompatibilityStatus {
  canSwitchToBIM: boolean;
  canSwitchToBasic: boolean;
  potentialDataLoss: string[];
  approximationsRequired: string[];
  qualityImpact: number;
  estimatedProcessingTime: number;
}

/**
 * Synchronization status between modes
 */
export interface SynchronizationStatus {
  isBasicSynced: boolean;
  isBIMSynced: boolean;
  lastSyncTimestamp: Date;
  syncConflicts: string[];
  requiresFullSync: boolean;
}

/**
 * Unified Wall Data interface
 */
export interface IUnifiedWallData {
  // Core properties (shared between modes)
  readonly id: string;
  type: WallTypeString;
  thickness: number;
  visible: boolean;
  baseline: Curve;
  
  // Mode representations
  basicGeometry: BasicGeometry;
  bimGeometry?: BIMGeometry;
  
  // Mode compatibility and synchronization
  readonly isBasicModeValid: boolean;
  readonly isBIMModeValid: boolean;
  readonly lastModifiedMode: 'basic' | 'bim';
  readonly requiresSync: boolean;
  readonly compatibilityStatus: ModeCompatibilityStatus;
  readonly syncStatus: SynchronizationStatus;
  
  // Metadata
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
  projectId?: string;
  
  // Processing history
  readonly processingHistory: ProcessingHistoryEntry[];
  
  // Methods
  validateBasicMode(): ValidationResult;
  validateBIMMode(): ValidationResult;
  getModeCompatibility(): ModeCompatibilityStatus;
  getSyncStatus(): SynchronizationStatus;
  addProcessingEntry(entry: Omit<ProcessingHistoryEntry, 'timestamp'>): void;
  updateMetadata(): void;
  clone(): IUnifiedWallData;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
  recommendations: string[];
}

/**
 * UnifiedWallData implementation class
 */
export class UnifiedWallData implements IUnifiedWallData {
  private _id: string;
  private _type: WallTypeString;
  private _thickness: number;
  private _visible: boolean;
  private _baseline: Curve;
  private _basicGeometry: BasicGeometry;
  private _bimGeometry?: BIMGeometry;
  private _lastModifiedMode: 'basic' | 'bim';
  private _createdAt: Date;
  private _updatedAt: Date;
  private _version: number;
  private _projectId?: string;
  private _processingHistory: ProcessingHistoryEntry[];

  constructor(options: {
    id?: string;
    type: WallTypeString;
    thickness: number;
    visible?: boolean;
    baseline: Curve;
    basicGeometry: BasicGeometry;
    bimGeometry?: BIMGeometry;
    lastModifiedMode?: 'basic' | 'bim';
    projectId?: string;
    processingHistory?: ProcessingHistoryEntry[];
  }) {
    this._id = options.id || this.generateId();
    this._type = options.type;
    this._thickness = options.thickness;
    this._visible = options.visible ?? true;
    this._baseline = options.baseline;
    this._basicGeometry = options.basicGeometry;
    this._bimGeometry = options.bimGeometry;
    this._lastModifiedMode = options.lastModifiedMode || 'basic';
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._version = 1;
    this._projectId = options.projectId;
    this._processingHistory = options.processingHistory || [];
  }

  // Getters
  get id(): string { return this._id; }
  get type(): WallTypeString { return this._type; }
  get thickness(): number { return this._thickness; }
  get visible(): boolean { return this._visible; }
  get baseline(): Curve { return this._baseline; }
  get basicGeometry(): BasicGeometry { return this._basicGeometry; }
  get bimGeometry(): BIMGeometry | undefined { return this._bimGeometry; }
  get lastModifiedMode(): 'basic' | 'bim' { return this._lastModifiedMode; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get version(): number { return this._version; }
  get projectId(): string | undefined { return this._projectId; }
  get processingHistory(): ProcessingHistoryEntry[] { return [...this._processingHistory]; }

  // Setters with validation and sync tracking
  set type(value: WallTypeString) {
    if (this._type !== value) {
      this._type = value;
      this.updateMetadata();
    }
  }

  set thickness(value: number) {
    if (value <= 0) {
      throw new Error('Wall thickness must be positive');
    }
    if (this._thickness !== value) {
      this._thickness = value;
      this.updateMetadata();
    }
  }

  set visible(value: boolean) {
    if (this._visible !== value) {
      this._visible = value;
      this.updateMetadata();
    }
  }

  set baseline(value: Curve) {
    this._baseline = value;
    this.updateMetadata();
  }

  set basicGeometry(value: BasicGeometry) {
    this._basicGeometry = value;
    this._lastModifiedMode = 'basic';
    this.updateMetadata();
  }

  set bimGeometry(value: BIMGeometry | undefined) {
    this._bimGeometry = value;
    if (value) {
      this._lastModifiedMode = 'bim';
    }
    this.updateMetadata();
  }

  // Computed properties
  get isBasicModeValid(): boolean {
    const validation = this.validateBasicMode();
    return validation.isValid;
  }

  get isBIMModeValid(): boolean {
    const validation = this.validateBIMMode();
    return validation.isValid;
  }

  get requiresSync(): boolean {
    const syncStatus = this.getSyncStatus();
    return !syncStatus.isBasicSynced || !syncStatus.isBIMSynced || syncStatus.requiresFullSync;
  }

  get compatibilityStatus(): ModeCompatibilityStatus {
    return this.getModeCompatibility();
  }

  get syncStatus(): SynchronizationStatus {
    return this.getSyncStatus();
  }

  /**
   * Validate basic mode representation
   */
  validateBasicMode(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let qualityScore = 1.0;

    // Check basic geometry structure
    if (!this._basicGeometry) {
      errors.push('Basic geometry is missing');
      qualityScore = 0;
    } else {
      // Validate segments
      if (!this._basicGeometry.segments || this._basicGeometry.segments.length === 0) {
        errors.push('Basic geometry has no segments');
        qualityScore -= 0.3;
      }

      // Validate nodes
      if (!this._basicGeometry.nodes || this._basicGeometry.nodes.length === 0) {
        errors.push('Basic geometry has no nodes');
        qualityScore -= 0.3;
      }

      // Check segment-node consistency
      if (this._basicGeometry.segments && this._basicGeometry.nodes) {
        const nodeIds = new Set(this._basicGeometry.nodes.map(n => n.id));
        for (const segment of this._basicGeometry.segments) {
          if (!nodeIds.has(segment.startNodeId)) {
            errors.push(`Segment ${segment.id} references missing start node ${segment.startNodeId}`);
            qualityScore -= 0.1;
          }
          if (!nodeIds.has(segment.endNodeId)) {
            errors.push(`Segment ${segment.id} references missing end node ${segment.endNodeId}`);
            qualityScore -= 0.1;
          }
        }
      }

      // Validate polygons
      if (this._basicGeometry.polygons) {
        for (const polygon of this._basicGeometry.polygons) {
          if (!polygon.points || polygon.points.length < 3) {
            warnings.push(`Polygon ${polygon.id} has insufficient points`);
            qualityScore -= 0.05;
          }
        }
      }
    }

    // Check baseline consistency
    if (!this._baseline || this._baseline.points.length < 2) {
      errors.push('Baseline curve is invalid or has insufficient points');
      qualityScore -= 0.2;
    }

    // Check thickness validity
    if (this._thickness <= 0) {
      errors.push('Wall thickness must be positive');
      qualityScore -= 0.1;
    }

    // Generate recommendations
    if (qualityScore < 0.8) {
      recommendations.push('Consider regenerating basic geometry from baseline');
    }
    if (this._basicGeometry?.polygons?.length === 0) {
      recommendations.push('Generate polygon representation for better visualization');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: Math.max(0, qualityScore),
      recommendations
    };
  }

  /**
   * Validate BIM mode representation
   */
  validateBIMMode(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let qualityScore = 1.0;

    if (!this._bimGeometry) {
      errors.push('BIM geometry is not available');
      return {
        isValid: false,
        errors,
        warnings,
        qualityScore: 0,
        recommendations: ['Generate BIM geometry from baseline curve']
      };
    }

    // Validate wall solid
    if (!this._bimGeometry.wallSolid) {
      errors.push('BIM geometry missing wall solid');
      qualityScore -= 0.4;
    } else {
      // Check wall solid consistency
      if (this._bimGeometry.wallSolid.thickness !== this._thickness) {
        warnings.push('Wall solid thickness does not match unified wall thickness');
        qualityScore -= 0.1;
      }

      if (this._bimGeometry.wallSolid.wallType !== this._type) {
        warnings.push('Wall solid type does not match unified wall type');
        qualityScore -= 0.1;
      }
    }

    // Validate offset curves
    if (!this._bimGeometry.offsetCurves || this._bimGeometry.offsetCurves.length < 2) {
      warnings.push('BIM geometry missing or incomplete offset curves');
      qualityScore -= 0.2;
    }

    // Validate quality metrics
    if (!this._bimGeometry.qualityMetrics) {
      warnings.push('BIM geometry missing quality metrics');
      qualityScore -= 0.1;
    } else {
      const metrics = this._bimGeometry.qualityMetrics;
      if (metrics.geometricAccuracy < 0.8) {
        warnings.push('Low geometric accuracy in BIM representation');
        qualityScore -= 0.1;
      }
      if (metrics.sliverFaceCount > 0) {
        warnings.push(`BIM geometry contains ${metrics.sliverFaceCount} sliver faces`);
        qualityScore -= 0.05;
      }
      if (metrics.selfIntersectionCount > 0) {
        errors.push(`BIM geometry contains ${metrics.selfIntersectionCount} self-intersections`);
        qualityScore -= 0.2;
      }
    }

    // Generate recommendations
    if (qualityScore < 0.9) {
      recommendations.push('Consider running shape healing operations');
    }
    if (this._bimGeometry.intersectionData.length === 0 && this._basicGeometry.segments.length > 1) {
      recommendations.push('Generate intersection data for multi-segment walls');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: Math.max(0, qualityScore),
      recommendations
    };
  }

  /**
   * Get mode compatibility status
   */
  getModeCompatibility(): ModeCompatibilityStatus {
    const basicValidation = this.validateBasicMode();
    const bimValidation = this.validateBIMMode();
    
    const potentialDataLoss: string[] = [];
    const approximationsRequired: string[] = [];
    let qualityImpact = 0;
    let estimatedProcessingTime = 0;

    // Check BIM to Basic conversion
    if (this._bimGeometry) {
      if (this._bimGeometry.intersectionData.length > 0) {
        potentialDataLoss.push('Intersection metadata will be lost');
        approximationsRequired.push('Complex intersections will be simplified');
        qualityImpact += 0.1;
      }
      
      if (this._bimGeometry.qualityMetrics.sliverFaceCount > 0) {
        approximationsRequired.push('Sliver faces will be approximated');
        qualityImpact += 0.05;
      }

      estimatedProcessingTime += 100; // ms for BIM to basic conversion
    }

    // Check Basic to BIM conversion
    if (this._basicGeometry.segments.length > 1) {
      estimatedProcessingTime += this._basicGeometry.segments.length * 50; // ms per segment
    }

    if (this._basicGeometry.polygons.length > 0) {
      estimatedProcessingTime += this._basicGeometry.polygons.length * 20; // ms per polygon
    }

    return {
      canSwitchToBIM: basicValidation.isValid,
      canSwitchToBasic: true, // Basic mode is always achievable
      potentialDataLoss,
      approximationsRequired,
      qualityImpact,
      estimatedProcessingTime
    };
  }

  /**
   * Get synchronization status between modes
   */
  getSyncStatus(): SynchronizationStatus {
    const now = new Date();
    const syncAge = now.getTime() - this._updatedAt.getTime();
    const maxSyncAge = 60000; // 1 minute

    let isBasicSynced = true;
    let isBIMSynced = true;
    const syncConflicts: string[] = [];
    let requiresFullSync = false;

    // Check if sync is stale
    if (syncAge > maxSyncAge) {
      requiresFullSync = true;
    }

    // Check for conflicts between representations
    if (this._bimGeometry) {
      // Check thickness consistency
      if (this._bimGeometry.wallSolid.thickness !== this._thickness) {
        syncConflicts.push('Thickness mismatch between BIM and unified data');
        isBIMSynced = false;
      }

      // Check type consistency
      if (this._bimGeometry.wallSolid.wallType !== this._type) {
        syncConflicts.push('Wall type mismatch between BIM and unified data');
        isBIMSynced = false;
      }

      // Check baseline consistency
      if (this._bimGeometry.wallSolid.baseline.id !== this._baseline.id) {
        syncConflicts.push('Baseline mismatch between BIM and unified data');
        isBIMSynced = false;
        requiresFullSync = true;
      }
    }

    // Check basic geometry consistency
    if (this._basicGeometry.segments.length === 0 && this._baseline.points.length > 1) {
      syncConflicts.push('Basic geometry missing segments for multi-point baseline');
      isBasicSynced = false;
    }

    return {
      isBasicSynced,
      isBIMSynced,
      lastSyncTimestamp: this._updatedAt,
      syncConflicts,
      requiresFullSync
    };
  }

  /**
   * Add a processing history entry
   */
  addProcessingEntry(entry: Omit<ProcessingHistoryEntry, 'timestamp'>): void {
    const fullEntry: ProcessingHistoryEntry = {
      ...entry,
      timestamp: new Date()
    };
    
    this._processingHistory.push(fullEntry);
    
    // Keep only the last 100 entries to prevent memory bloat
    if (this._processingHistory.length > 100) {
      this._processingHistory = this._processingHistory.slice(-100);
    }
    
    this.updateMetadata();
  }

  /**
   * Update metadata (version, timestamp)
   */
  updateMetadata(): void {
    this._updatedAt = new Date();
    this._version += 1;
  }

  /**
   * Create a deep clone of the unified wall data
   */
  clone(): UnifiedWallData {
    return new UnifiedWallData({
      id: this._id + '_clone_' + Date.now(),
      type: this._type,
      thickness: this._thickness,
      visible: this._visible,
      baseline: { ...this._baseline }, // Shallow clone for now
      basicGeometry: {
        segments: [...this._basicGeometry.segments],
        nodes: [...this._basicGeometry.nodes],
        polygons: [...this._basicGeometry.polygons]
      },
      bimGeometry: this._bimGeometry ? {
        wallSolid: this._bimGeometry.wallSolid, // Reference for now
        offsetCurves: [...this._bimGeometry.offsetCurves],
        intersectionData: [...this._bimGeometry.intersectionData],
        qualityMetrics: { ...this._bimGeometry.qualityMetrics }
      } : undefined,
      lastModifiedMode: this._lastModifiedMode,
      projectId: this._projectId,
      processingHistory: [...this._processingHistory]
    });
  }

  /**
   * Convert to serializable format
   */
  toSerializable() {
    return {
      id: this._id,
      type: this._type,
      thickness: this._thickness,
      visible: this._visible,
      baseline: this._baseline,
      basicGeometry: this._basicGeometry,
      bimGeometry: this._bimGeometry,
      lastModifiedMode: this._lastModifiedMode,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      version: this._version,
      projectId: this._projectId,
      processingHistory: this._processingHistory.map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }))
    };
  }

  /**
   * Create from serializable format
   */
  static fromSerializable(data: any): UnifiedWallData {
    return new UnifiedWallData({
      id: data.id,
      type: data.type,
      thickness: data.thickness,
      visible: data.visible,
      baseline: data.baseline,
      basicGeometry: data.basicGeometry,
      bimGeometry: data.bimGeometry,
      lastModifiedMode: data.lastModifiedMode,
      projectId: data.projectId,
      processingHistory: data.processingHistory?.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      })) || []
    });
  }

  /**
   * Create from legacy wall data
   */
  static fromLegacyWall(
    wall: Wall,
    segments: Segment[],
    nodes: Node[],
    baseline: Curve
  ): UnifiedWallData {
    const basicGeometry: BasicGeometry = {
      segments: segments.filter(s => s.wallId === wall.id),
      nodes: nodes.filter(n => 
        segments.some(s => s.wallId === wall.id && (s.startNodeId === n.id || s.endNodeId === n.id))
      ),
      polygons: [] // Will be computed later
    };

    return new UnifiedWallData({
      id: wall.id,
      type: wall.type,
      thickness: wall.thickness,
      visible: wall.visible,
      baseline,
      basicGeometry,
      lastModifiedMode: 'basic'
    });
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `unified_wall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}