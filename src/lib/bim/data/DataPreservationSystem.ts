/**
 * DataPreservationSystem Implementation
 * 
 * Handles data preservation, rollback capabilities, and approximation handling
 * for lossy conversions between basic and BIM modes
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { UnifiedWallData } from './UnifiedWallData';
import { QualityMetrics } from '../types/QualityMetrics';

/**
 * Mode snapshot for rollback functionality
 */
export interface ModeSnapshot {
  id: string;
  timestamp: Date;
  mode: 'basic' | 'bim';
  wallSnapshots: Map<string, WallSnapshot>;
  metadata: {
    reason: string;
    userInitiated: boolean;
    automaticCleanup: boolean;
    expiresAt?: Date;
  };
}

/**
 * Individual wall snapshot
 */
export interface WallSnapshot {
  wallId: string;
  unifiedWallData: string; // Serialized UnifiedWallData
  checksum: string;
  preservationLevel: PreservationLevel;
  approximations: ApproximationRecord[];
}

/**
 * Preservation level enum
 */
export enum PreservationLevel {
  FULL = 'full',           // Complete data preservation
  HIGH = 'high',           // Minor approximations acceptable
  MEDIUM = 'medium',       // Moderate approximations acceptable
  LOW = 'low'              // Significant approximations acceptable
}

/**
 * Approximation record for tracking data transformations
 */
export interface ApproximationRecord {
  id: string;
  type: ApproximationType;
  description: string;
  originalValue: any;
  approximatedValue: any;
  qualityImpact: number;
  reversible: boolean;
  timestamp: Date;
  context: string;
}

/**
 * Approximation types
 */
export enum ApproximationType {
  GEOMETRIC_SIMPLIFICATION = 'geometric_simplification',
  PRECISION_REDUCTION = 'precision_reduction',
  METADATA_LOSS = 'metadata_loss',
  INTERSECTION_APPROXIMATION = 'intersection_approximation',
  CURVE_LINEARIZATION = 'curve_linearization',
  BOOLEAN_SIMPLIFICATION = 'boolean_simplification'
}

/**
 * Preservation result
 */
export interface PreservationResult {
  success: boolean;
  snapshotId: string;
  dataPreserved: boolean;
  approximationsUsed: ApproximationRecord[];
  qualityImpact: number;
  rollbackAvailable: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean;
  restoredWalls: string[];
  failedWalls: string[];
  dataLoss: boolean;
  qualityRestored: number;
  warnings: string[];
  errors: string[];
}

/**
 * Approximation result
 */
export interface ApproximationResult {
  success: boolean;
  approximationRecord: ApproximationRecord;
  qualityImpact: number;
  reversible: boolean;
  warnings: string[];
}

/**
 * Real-time compatibility monitoring status
 */
export interface CompatibilityMonitoringStatus {
  isMonitoring: boolean;
  lastCheck: Date;
  compatibilityScore: number;
  issues: CompatibilityIssue[];
  recommendations: string[];
  autoFixAvailable: boolean;
}

/**
 * Compatibility issue
 */
export interface CompatibilityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedWalls: string[];
  suggestedFix: string;
  autoFixable: boolean;
}

/**
 * Data preservation system interface
 */
export interface IDataPreservationSystem {
  preserveWallData(wall: UnifiedWallData, targetMode: 'basic' | 'bim'): Promise<PreservationResult>;
  handleApproximations(
    originalData: any,
    approximatedData: any,
    approximationType: ApproximationType,
    context: string
  ): Promise<ApproximationResult>;
  createModeSnapshot(walls: Map<string, UnifiedWallData>, reason: string): Promise<ModeSnapshot>;
  rollbackToSnapshot(snapshot: ModeSnapshot): Promise<RollbackResult>;
  monitorCompatibility(walls: Map<string, UnifiedWallData>): Promise<CompatibilityMonitoringStatus>;
  cleanupExpiredSnapshots(): Promise<number>;
}

/**
 * Data preservation system implementation
 */
export class DataPreservationSystem implements IDataPreservationSystem {
  private snapshots: Map<string, ModeSnapshot> = new Map();
  private maxSnapshots: number = 50;
  private defaultExpirationHours: number = 24;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(options?: {
    maxSnapshots?: number;
    defaultExpirationHours?: number;
  }) {
    this.maxSnapshots = options?.maxSnapshots || 50;
    this.defaultExpirationHours = options?.defaultExpirationHours || 24;
  }

  /**
   * Preserve wall data with rollback capability
   */
  async preserveWallData(
    wall: UnifiedWallData,
    targetMode: 'basic' | 'bim'
  ): Promise<PreservationResult> {
    const approximationsUsed: ApproximationRecord[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    let qualityImpact = 0;

    try {
      // Create snapshot before any modifications
      const snapshotId = await this.createWallSnapshot(wall, `preserve_for_${targetMode}_mode`);

      // Analyze potential data loss
      const compatibility = wall.getModeCompatibility();
      
      if (targetMode === 'basic' && wall.bimGeometry) {
        // Handle BIM to basic conversion approximations
        if (wall.bimGeometry.intersectionData.length > 0) {
          const approximation = await this.handleApproximations(
            wall.bimGeometry.intersectionData,
            [], // Will be empty in basic mode
            ApproximationType.METADATA_LOSS,
            'BIM intersection data lost in basic mode conversion'
          );
          approximationsUsed.push(approximation.approximationRecord);
          qualityImpact += approximation.qualityImpact;
        }

        if (wall.bimGeometry.qualityMetrics.sliverFaceCount > 0) {
          const approximation = await this.handleApproximations(
            wall.bimGeometry.wallSolid.solidGeometry,
            'simplified_polygons', // Placeholder
            ApproximationType.GEOMETRIC_SIMPLIFICATION,
            'Sliver faces approximated in basic representation'
          );
          approximationsUsed.push(approximation.approximationRecord);
          qualityImpact += approximation.qualityImpact;
        }

        // Handle curve approximations
        if (wall.bimGeometry.offsetCurves.some(curve => curve.type !== 'polyline')) {
          const approximation = await this.handleApproximations(
            wall.bimGeometry.offsetCurves,
            'linearized_curves',
            ApproximationType.CURVE_LINEARIZATION,
            'Complex curves linearized for basic representation'
          );
          approximationsUsed.push(approximation.approximationRecord);
          qualityImpact += approximation.qualityImpact;
        }
      }

      if (targetMode === 'bim' && !wall.bimGeometry) {
        // Handle basic to BIM conversion approximations
        if (wall.basicGeometry.segments.length > 10) {
          warnings.push('Large number of segments may impact BIM conversion performance');
        }

        if (wall.basicGeometry.polygons.length === 0) {
          warnings.push('No polygon data available for BIM solid generation');
        }
      }

      return {
        success: true,
        snapshotId,
        dataPreserved: approximationsUsed.length === 0,
        approximationsUsed,
        qualityImpact,
        rollbackAvailable: true,
        warnings,
        errors
      };
    } catch (error) {
      errors.push(`Preservation failed: ${error}`);
      return {
        success: false,
        snapshotId: '',
        dataPreserved: false,
        approximationsUsed,
        qualityImpact: 1.0,
        rollbackAvailable: false,
        warnings,
        errors
      };
    }
  }

  /**
   * Handle approximations for lossy conversions
   */
  async handleApproximations(
    originalData: any,
    approximatedData: any,
    approximationType: ApproximationType,
    context: string
  ): Promise<ApproximationResult> {
    const warnings: string[] = [];

    try {
      // Calculate quality impact based on approximation type
      let qualityImpact = 0;
      let reversible = false;

      switch (approximationType) {
        case ApproximationType.GEOMETRIC_SIMPLIFICATION:
          qualityImpact = 0.05;
          reversible = false;
          break;
        case ApproximationType.PRECISION_REDUCTION:
          qualityImpact = 0.02;
          reversible = true;
          break;
        case ApproximationType.METADATA_LOSS:
          qualityImpact = 0.1;
          reversible = false;
          break;
        case ApproximationType.INTERSECTION_APPROXIMATION:
          qualityImpact = 0.15;
          reversible = false;
          break;
        case ApproximationType.CURVE_LINEARIZATION:
          qualityImpact = 0.08;
          reversible = false;
          break;
        case ApproximationType.BOOLEAN_SIMPLIFICATION:
          qualityImpact = 0.12;
          reversible = false;
          break;
      }

      // Create approximation record
      const approximationRecord: ApproximationRecord = {
        id: this.generateId(),
        type: approximationType,
        description: context,
        originalValue: this.serializeData(originalData),
        approximatedValue: this.serializeData(approximatedData),
        qualityImpact,
        reversible,
        timestamp: new Date(),
        context
      };

      if (!reversible) {
        warnings.push(`Irreversible approximation: ${context}`);
      }

      return {
        success: true,
        approximationRecord,
        qualityImpact,
        reversible,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        approximationRecord: {
          id: this.generateId(),
          type: approximationType,
          description: `Failed approximation: ${error}`,
          originalValue: null,
          approximatedValue: null,
          qualityImpact: 0.5,
          reversible: false,
          timestamp: new Date(),
          context
        },
        qualityImpact: 0.5,
        reversible: false,
        warnings: [`Approximation handling failed: ${error}`]
      };
    }
  }

  /**
   * Create mode snapshot for rollback
   */
  async createModeSnapshot(
    walls: Map<string, UnifiedWallData>,
    reason: string
  ): Promise<ModeSnapshot> {
    const snapshotId = this.generateId();
    const wallSnapshots = new Map<string, WallSnapshot>();

    // Create snapshots for each wall
    for (const [wallId, wallData] of walls) {
      const wallSnapshot: WallSnapshot = {
        wallId,
        unifiedWallData: JSON.stringify(wallData.toSerializable()),
        checksum: this.calculateChecksum(wallData),
        preservationLevel: this.determinePreservationLevel(wallData),
        approximations: []
      };
      wallSnapshots.set(wallId, wallSnapshot);
    }

    // Create mode snapshot
    const snapshot: ModeSnapshot = {
      id: snapshotId,
      timestamp: new Date(),
      mode: walls.values().next().value?.lastModifiedMode || 'basic',
      wallSnapshots,
      metadata: {
        reason,
        userInitiated: true,
        automaticCleanup: true,
        expiresAt: new Date(Date.now() + this.defaultExpirationHours * 60 * 60 * 1000)
      }
    };

    // Store snapshot
    this.snapshots.set(snapshotId, snapshot);

    // Clean up old snapshots if needed
    await this.cleanupOldSnapshots();

    return snapshot;
  }

  /**
   * Rollback to a previous snapshot
   */
  async rollbackToSnapshot(snapshot: ModeSnapshot): Promise<RollbackResult> {
    const restoredWalls: string[] = [];
    const failedWalls: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    let totalQualityRestored = 0;

    try {
      // Check if snapshot is still valid
      if (snapshot.metadata.expiresAt && snapshot.metadata.expiresAt < new Date()) {
        errors.push('Snapshot has expired and cannot be restored');
        return {
          success: false,
          restoredWalls,
          failedWalls,
          dataLoss: true,
          qualityRestored: 0,
          warnings,
          errors
        };
      }

      // Restore each wall
      for (const [wallId, wallSnapshot] of snapshot.wallSnapshots) {
        try {
          // Deserialize wall data
          const serializedData = JSON.parse(wallSnapshot.unifiedWallData);
          const restoredWallData = UnifiedWallData.fromSerializable(serializedData);

          // Verify checksum
          const currentChecksum = this.calculateChecksum(restoredWallData);
          if (currentChecksum !== wallSnapshot.checksum) {
            warnings.push(`Checksum mismatch for wall ${wallId} - data may be corrupted`);
          }

          restoredWalls.push(wallId);
          
          // Calculate quality restoration
          if (wallSnapshot.approximations.length > 0) {
            const approximationImpact = wallSnapshot.approximations.reduce(
              (sum, approx) => sum + approx.qualityImpact, 0
            );
            totalQualityRestored += Math.min(1.0, approximationImpact);
          } else {
            totalQualityRestored += 1.0;
          }
        } catch (error) {
          failedWalls.push(wallId);
          errors.push(`Failed to restore wall ${wallId}: ${error}`);
        }
      }

      const averageQualityRestored = restoredWalls.length > 0 
        ? totalQualityRestored / restoredWalls.length 
        : 0;

      return {
        success: failedWalls.length === 0,
        restoredWalls,
        failedWalls,
        dataLoss: failedWalls.length > 0,
        qualityRestored: averageQualityRestored,
        warnings,
        errors
      };
    } catch (error) {
      errors.push(`Rollback failed: ${error}`);
      return {
        success: false,
        restoredWalls,
        failedWalls: Array.from(snapshot.wallSnapshots.keys()),
        dataLoss: true,
        qualityRestored: 0,
        warnings,
        errors
      };
    }
  }

  /**
   * Monitor real-time compatibility during editing operations
   */
  async monitorCompatibility(
    walls: Map<string, UnifiedWallData>
  ): Promise<CompatibilityMonitoringStatus> {
    const issues: CompatibilityIssue[] = [];
    const recommendations: string[] = [];
    let compatibilityScore = 1.0;
    let autoFixAvailable = false;

    try {
      for (const [wallId, wallData] of walls) {
        // Check basic mode validity
        const basicValidation = wallData.validateBasicMode();
        if (!basicValidation.isValid) {
          issues.push({
            type: 'basic_mode_invalid',
            severity: 'high',
            description: `Basic mode validation failed: ${basicValidation.errors.join(', ')}`,
            affectedWalls: [wallId],
            suggestedFix: 'Regenerate basic geometry from baseline',
            autoFixable: true
          });
          compatibilityScore -= 0.2;
          autoFixAvailable = true;
        }

        // Check BIM mode validity
        if (wallData.bimGeometry) {
          const bimValidation = wallData.validateBIMMode();
          if (!bimValidation.isValid) {
            issues.push({
              type: 'bim_mode_invalid',
              severity: 'high',
              description: `BIM mode validation failed: ${bimValidation.errors.join(', ')}`,
              affectedWalls: [wallId],
              suggestedFix: 'Regenerate BIM geometry or run shape healing',
              autoFixable: true
            });
            compatibilityScore -= 0.2;
            autoFixAvailable = true;
          }
        }

        // Check synchronization status
        const syncStatus = wallData.getSyncStatus();
        if (!syncStatus.isBasicSynced || !syncStatus.isBIMSynced) {
          issues.push({
            type: 'sync_conflict',
            severity: 'medium',
            description: `Synchronization conflicts: ${syncStatus.syncConflicts.join(', ')}`,
            affectedWalls: [wallId],
            suggestedFix: 'Run mode synchronization',
            autoFixable: true
          });
          compatibilityScore -= 0.1;
          autoFixAvailable = true;
        }

        // Check quality metrics
        if (wallData.bimGeometry?.qualityMetrics) {
          const metrics = wallData.bimGeometry.qualityMetrics;
          if (metrics.geometricAccuracy < 0.8) {
            issues.push({
              type: 'low_quality',
              severity: 'medium',
              description: `Low geometric accuracy: ${metrics.geometricAccuracy}`,
              affectedWalls: [wallId],
              suggestedFix: 'Run geometry optimization',
              autoFixable: true
            });
            compatibilityScore -= 0.05;
            autoFixAvailable = true;
          }
        }
      }

      // Generate recommendations
      if (issues.length > 0) {
        recommendations.push('Run compatibility check and fix identified issues');
      }
      if (autoFixAvailable) {
        recommendations.push('Use automatic fixes for common compatibility issues');
      }
      if (compatibilityScore < 0.7) {
        recommendations.push('Consider regenerating wall geometry from scratch');
      }

      return {
        isMonitoring: true,
        lastCheck: new Date(),
        compatibilityScore: Math.max(0, compatibilityScore),
        issues,
        recommendations,
        autoFixAvailable
      };
    } catch (error) {
      return {
        isMonitoring: false,
        lastCheck: new Date(),
        compatibilityScore: 0,
        issues: [{
          type: 'monitoring_error',
          severity: 'critical',
          description: `Compatibility monitoring failed: ${error}`,
          affectedWalls: Array.from(walls.keys()),
          suggestedFix: 'Restart compatibility monitoring',
          autoFixable: false
        }],
        recommendations: ['Fix monitoring system errors'],
        autoFixAvailable: false
      };
    }
  }

  /**
   * Clean up expired snapshots
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [snapshotId, snapshot] of this.snapshots) {
      if (snapshot.metadata.expiresAt && snapshot.metadata.expiresAt < now) {
        this.snapshots.delete(snapshotId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring(
    walls: Map<string, UnifiedWallData>,
    intervalMs: number = 30000
  ): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.monitorCompatibility(walls);
    }, intervalMs);
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): ModeSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(snapshotId: string): ModeSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Delete snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }

  // Private helper methods

  private async createWallSnapshot(wall: UnifiedWallData, reason: string): Promise<string> {
    const snapshotId = this.generateId();
    const singleWallMap = new Map([['temp', wall]]);
    await this.createModeSnapshot(singleWallMap, reason);
    return snapshotId;
  }

  private async cleanupOldSnapshots(): Promise<void> {
    if (this.snapshots.size > this.maxSnapshots) {
      // Sort by timestamp and remove oldest
      const sortedSnapshots = Array.from(this.snapshots.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());

      const toRemove = sortedSnapshots.slice(0, this.snapshots.size - this.maxSnapshots);
      for (const [snapshotId] of toRemove) {
        this.snapshots.delete(snapshotId);
      }
    }
  }

  private determinePreservationLevel(wall: UnifiedWallData): PreservationLevel {
    const compatibility = wall.getModeCompatibility();
    
    if (compatibility.potentialDataLoss.length === 0) {
      return PreservationLevel.FULL;
    } else if (compatibility.qualityImpact < 0.1) {
      return PreservationLevel.HIGH;
    } else if (compatibility.qualityImpact < 0.3) {
      return PreservationLevel.MEDIUM;
    } else {
      return PreservationLevel.LOW;
    }
  }

  private calculateChecksum(wall: UnifiedWallData): string {
    const serialized = JSON.stringify(wall.toSerializable());
    // Simple checksum - in production, use a proper hash function
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private serializeData(data: any): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      return `[Serialization failed: ${error}]`;
    }
  }

  private generateId(): string {
    return `preservation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}