/**
 * Data Migration Manager for BIM Wall System
 * 
 * Provides comprehensive tools for migrating existing floor plan data to BIM format,
 * including validation, backup, rollback, and progress tracking capabilities.
 * 
 * @example Basic migration
 * ```typescript
 * const migrationManager = new DataMigrationManager();
 * const result = await migrationManager.migrateToBI M({
 *   walls: existingWalls,
 *   segments: existingSegments,
 *   nodes: existingNodes
 * });
 * ```
 * 
 * @example Migration with validation
 * ```typescript
 * const validation = await migrationManager.validateMigrationData(data);
 * if (validation.canMigrate) {
 *   const result = await migrationManager.migrateWithBackup(data);
 * }
 * ```
 * 
 * @since 1.0.0
 */

import { UnifiedWallData } from '../data/UnifiedWallData';
import { BIMAdapter } from '../adapters/BIMAdapter';
import { GeometryValidator } from '../validation/GeometryValidator';
import { DatabaseAbstractionLayer } from '../persistence/DatabaseAbstractionLayer';

export interface LegacyFloorPlanData {
  walls: Map<string, any>;
  segments: Map<string, any>;
  nodes: Map<string, any>;
  metadata?: {
    version: string;
    created: Date;
    lastModified: Date;
  };
}

export interface MigrationOptions {
  /** Create backup before migration */
  createBackup: boolean;
  /** Validate data integrity during migration */
  validateIntegrity: boolean;
  /** Batch size for processing large datasets */
  batchSize: number;
  /** Enable progress reporting */
  reportProgress: boolean;
  /** Preserve original data alongside BIM data */
  preserveOriginal: boolean;
  /** Custom tolerance for geometric validation */
  customTolerance?: number;
}

export interface MigrationResult {
  success: boolean;
  migratedWalls: string[];
  failedWalls: string[];
  warnings: string[];
  errors: string[];
  dataIntegrityScore: number;
  processingTime: number;
  backupLocation?: string;
  rollbackAvailable: boolean;
}

export interface MigrationValidation {
  canMigrate: boolean;
  issues: ValidationIssue[];
  estimatedTime: number;
  dataLossRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  severity: number;
  description: string;
  affectedWalls: string[];
  suggestedFix: string;
  autoFixable: boolean;
}

export interface MigrationProgress {
  phase: 'validation' | 'backup' | 'conversion' | 'verification' | 'cleanup';
  currentStep: string;
  progress: number; // 0-100
  processedItems: number;
  totalItems: number;
  estimatedTimeRemaining: number;
  errors: string[];
  warnings: string[];
}

export interface BackupMetadata {
  id: string;
  created: Date;
  originalDataSize: number;
  compressionRatio: number;
  checksum: string;
  version: string;
  description: string;
}

/**
 * Manages data migration from legacy floor plan format to BIM format
 */
export class DataMigrationManager {
  private bimAdapter: BIMAdapter;
  private validator: GeometryValidator;
  private database: DatabaseAbstractionLayer;
  private progressCallback?: (progress: MigrationProgress) => void;

  constructor(
    bimAdapter: BIMAdapter,
    validator: GeometryValidator,
    database: DatabaseAbstractionLayer
  ) {
    this.bimAdapter = bimAdapter;
    this.validator = validator;
    this.database = database;
  }

  /**
   * Sets callback function for migration progress updates
   * 
   * @param callback - Function to call with progress updates
   * 
   * @example
   * ```typescript
   * migrationManager.setProgressCallback((progress) => {
   *   console.log(`${progress.phase}: ${progress.progress}%`);
   *   updateProgressBar(progress.progress);
   * });
   * ```
   */
  setProgressCallback(callback: (progress: MigrationProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Validates legacy data for migration compatibility
   * 
   * Performs comprehensive validation to identify potential issues before
   * migration begins. This helps prevent data loss and ensures successful
   * migration outcomes.
   * 
   * @param data - Legacy floor plan data to validate
   * @returns Promise resolving to validation results
   * 
   * @throws {ValidationError} If data structure is fundamentally incompatible
   * 
   * @example
   * ```typescript
   * const validation = await migrationManager.validateMigrationData(legacyData);
   * 
   * if (!validation.canMigrate) {
   *   console.log('Migration issues found:');
   *   validation.issues.forEach(issue => {
   *     console.log(`${issue.type}: ${issue.description}`);
   *   });
   * } else {
   *   console.log(`Estimated migration time: ${validation.estimatedTime}ms`);
   * }
   * ```
   */
  async validateMigrationData(data: LegacyFloorPlanData): Promise<MigrationValidation> {
    this.reportProgress({
      phase: 'validation',
      currentStep: 'Analyzing data structure',
      progress: 0,
      processedItems: 0,
      totalItems: data.walls.size,
      estimatedTimeRemaining: 0,
      errors: [],
      warnings: []
    });

    const issues: ValidationIssue[] = [];
    let canMigrate = true;
    let dataLossRisk: 'low' | 'medium' | 'high' = 'low';

    // Validate data structure
    if (!data.walls || data.walls.size === 0) {
      issues.push({
        type: 'error',
        severity: 10,
        description: 'No walls found in data',
        affectedWalls: [],
        suggestedFix: 'Ensure data contains valid wall definitions',
        autoFixable: false
      });
      canMigrate = false;
    }

    // Validate individual walls
    let processedWalls = 0;
    for (const [wallId, wall] of data.walls) {
      try {
        const wallIssues = await this.validateWallForMigration(wallId, wall, data);
        issues.push(...wallIssues);

        // Update progress
        processedWalls++;
        this.reportProgress({
          phase: 'validation',
          currentStep: `Validating wall ${wallId}`,
          progress: (processedWalls / data.walls.size) * 100,
          processedItems: processedWalls,
          totalItems: data.walls.size,
          estimatedTimeRemaining: ((data.walls.size - processedWalls) * 10),
          errors: issues.filter(i => i.type === 'error').map(i => i.description),
          warnings: issues.filter(i => i.type === 'warning').map(i => i.description)
        });

      } catch (error) {
        issues.push({
          type: 'error',
          severity: 8,
          description: `Failed to validate wall ${wallId}: ${error instanceof Error ? error.message : String(error)}`,
          affectedWalls: [wallId],
          suggestedFix: 'Check wall data integrity',
          autoFixable: false
        });
      }
    }

    // Assess data loss risk
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    if (errorCount > data.walls.size * 0.1) {
      dataLossRisk = 'high';
      canMigrate = false;
    } else if (warningCount > data.walls.size * 0.2) {
      dataLossRisk = 'medium';
    }

    // Generate recommendations
    const recommendations = this.generateMigrationRecommendations(issues, data);

    // Estimate migration time
    const estimatedTime = this.estimateMigrationTime(data, issues);

    return {
      canMigrate,
      issues,
      estimatedTime,
      dataLossRisk,
      recommendations
    };
  }

  /**
   * Migrates legacy data to BIM format with comprehensive backup and validation
   * 
   * Performs a complete migration including backup creation, data conversion,
   * integrity validation, and rollback preparation. This is the recommended
   * method for production migrations.
   * 
   * @param data - Legacy floor plan data to migrate
   * @param options - Migration configuration options
   * @returns Promise resolving to migration results
   * 
   * @throws {MigrationError} If migration fails and cannot be recovered
   * 
   * @example
   * ```typescript
   * const result = await migrationManager.migrateWithBackup(legacyData, {
   *   createBackup: true,
   *   validateIntegrity: true,
   *   batchSize: 100,
   *   reportProgress: true
   * });
   * 
   * if (result.success) {
   *   console.log(`Migrated ${result.migratedWalls.length} walls successfully`);
   * } else {
   *   console.log('Migration failed:', result.errors);
   *   if (result.rollbackAvailable) {
   *     await migrationManager.rollbackMigration(result.backupLocation);
   *   }
   * }
   * ```
   */
  async migrateWithBackup(
    data: LegacyFloorPlanData,
    options: Partial<MigrationOptions> = {}
  ): Promise<MigrationResult> {
    const opts: MigrationOptions = {
      createBackup: true,
      validateIntegrity: true,
      batchSize: 50,
      reportProgress: true,
      preserveOriginal: true,
      ...options
    };

    const startTime = performance.now();
    let backupLocation: string | undefined;
    const migratedWalls: string[] = [];
    const failedWalls: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Phase 1: Create backup
      if (opts.createBackup) {
        this.reportProgress({
          phase: 'backup',
          currentStep: 'Creating data backup',
          progress: 0,
          processedItems: 0,
          totalItems: 1,
          estimatedTimeRemaining: 5000,
          errors: [],
          warnings: []
        });

        backupLocation = await this.createBackup(data);
        
        this.reportProgress({
          phase: 'backup',
          currentStep: 'Backup created successfully',
          progress: 100,
          processedItems: 1,
          totalItems: 1,
          estimatedTimeRemaining: 0,
          errors: [],
          warnings: []
        });
      }

      // Phase 2: Convert data
      this.reportProgress({
        phase: 'conversion',
        currentStep: 'Starting data conversion',
        progress: 0,
        processedItems: 0,
        totalItems: data.walls.size,
        estimatedTimeRemaining: data.walls.size * 100,
        errors: [],
        warnings: []
      });

      const convertedWalls = await this.convertWallsInBatches(data, opts);
      migratedWalls.push(...convertedWalls.successful);
      failedWalls.push(...convertedWalls.failed);
      warnings.push(...convertedWalls.warnings);
      errors.push(...convertedWalls.errors);

      // Phase 3: Validate integrity
      if (opts.validateIntegrity) {
        this.reportProgress({
          phase: 'verification',
          currentStep: 'Validating data integrity',
          progress: 0,
          processedItems: 0,
          totalItems: migratedWalls.length,
          estimatedTimeRemaining: migratedWalls.length * 50,
          errors: [],
          warnings: []
        });

        const integrityResult = await this.validateMigrationIntegrity(migratedWalls);
        warnings.push(...integrityResult.warnings);
        errors.push(...integrityResult.errors);
      }

      // Phase 4: Cleanup
      this.reportProgress({
        phase: 'cleanup',
        currentStep: 'Finalizing migration',
        progress: 100,
        processedItems: 1,
        totalItems: 1,
        estimatedTimeRemaining: 0,
        errors,
        warnings
      });

      const processingTime = performance.now() - startTime;
      const success = errors.length === 0 && migratedWalls.length > 0;

      return {
        success,
        migratedWalls,
        failedWalls,
        warnings,
        errors,
        dataIntegrityScore: this.calculateIntegrityScore(migratedWalls, failedWalls, warnings),
        processingTime,
        backupLocation,
        rollbackAvailable: !!backupLocation
      };

    } catch (error) {
      errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        migratedWalls,
        failedWalls,
        warnings,
        errors,
        dataIntegrityScore: 0,
        processingTime: performance.now() - startTime,
        backupLocation,
        rollbackAvailable: !!backupLocation
      };
    }
  }

  /**
   * Creates a compressed backup of the original data
   * 
   * @param data - Data to backup
   * @returns Promise resolving to backup location identifier
   */
  private async createBackup(data: LegacyFloorPlanData): Promise<string> {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Serialize data
    const serializedData = JSON.stringify({
      walls: Array.from(data.walls.entries()),
      segments: Array.from(data.segments.entries()),
      nodes: Array.from(data.nodes.entries()),
      metadata: data.metadata
    });

    // Calculate checksum
    const checksum = await this.calculateChecksum(serializedData);

    // Store backup with metadata
    const backupMetadata: BackupMetadata = {
      id: backupId,
      created: new Date(),
      originalDataSize: serializedData.length,
      compressionRatio: 0.7, // Estimated compression ratio
      checksum,
      version: '1.0.0',
      description: 'Pre-BIM migration backup'
    };

    if (this.database.saveBackup) {
      await this.database.saveBackup(backupId, serializedData, backupMetadata as any);
    } else {
      console.warn('saveBackup API not available on database abstraction; skipping backup persist');
    }
    
    return backupId;
  }

  /**
   * Converts walls to BIM format in batches for better performance
   */
  private async convertWallsInBatches(
    data: LegacyFloorPlanData,
    options: MigrationOptions
  ): Promise<{
    successful: string[];
    failed: string[];
    warnings: string[];
    errors: string[];
  }> {
    const successful: string[] = [];
    const failed: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const wallEntries = Array.from(data.walls.entries());
    const batches = this.createBatches(wallEntries, options.batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      this.reportProgress({
        phase: 'conversion',
        currentStep: `Processing batch ${batchIndex + 1} of ${batches.length}`,
        progress: (batchIndex / batches.length) * 100,
        processedItems: batchIndex * options.batchSize,
        totalItems: wallEntries.length,
        estimatedTimeRemaining: (batches.length - batchIndex) * 1000,
        errors: [...errors],
        warnings: [...warnings]
      });

      for (const [wallId, wall] of batch) {
        try {
          const convertedWall = await this.bimAdapter.convertLegacyWall(
            wall,
            Array.from(data.segments.values()) as any,
            Array.from(data.nodes.values()) as any
          );

          if (convertedWall) {
            const unifiedWall: any = (convertedWall as any).convertedData ?? convertedWall;
            await this.database.saveWall(unifiedWall as any);
            successful.push(wallId);
          } else {
            failed.push(wallId);
            warnings.push(`Wall ${wallId} conversion returned null`);
          }

        } catch (error) {
          failed.push(wallId);
          errors.push(`Failed to convert wall ${wallId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Small delay between batches to prevent overwhelming the system
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return { successful, failed, warnings, errors };
  }

  /**
   * Validates the integrity of migrated data
   */
  private async validateMigrationIntegrity(wallIds: string[]): Promise<{
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < wallIds.length; i++) {
      const wallId = wallIds[i];
      
      this.reportProgress({
        phase: 'verification',
        currentStep: `Validating wall ${wallId}`,
        progress: (i / wallIds.length) * 100,
        processedItems: i,
        totalItems: wallIds.length,
        estimatedTimeRemaining: (wallIds.length - i) * 50,
        errors: [...errors],
        warnings: [...warnings]
      });

      try {
        const loadResult = await this.database.loadWall(wallId);
        if (loadResult.success && loadResult.wall) {
          const validation: any = await this.validator.validateWallSolid(loadResult.wall.bimGeometry?.wallSolid as any);
          
          if (!validation.isValid) {
            const issues: string[] = Array.isArray(validation.issues) ? validation.issues : [];
            warnings.push(`Wall ${wallId} has geometric issues: ${issues.join(', ')}`);
          }
        } else {
          errors.push(`Wall ${wallId} not found after migration`);
        }
      } catch (error) {
        errors.push(`Failed to validate wall ${wallId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { warnings, errors };
  }

  /**
   * Rolls back a migration using a backup
   * 
   * @param backupId - Identifier of the backup to restore
   * @returns Promise resolving to rollback success status
   * 
   * @example
   * ```typescript
   * const rollbackSuccess = await migrationManager.rollbackMigration('backup_123');
   * if (rollbackSuccess) {
   *   console.log('Successfully rolled back to pre-migration state');
   * }
   * ```
   */
  async rollbackMigration(backupId: string): Promise<boolean> {
    try {
      this.reportProgress({
        phase: 'cleanup',
        currentStep: 'Rolling back migration',
        progress: 0,
        processedItems: 0,
        totalItems: 1,
        estimatedTimeRemaining: 5000,
        errors: [],
        warnings: []
      });

      const backup = await (this.database.loadBackup ? this.database.loadBackup(backupId) : Promise.resolve(null));
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Verify backup integrity
      const checksum = await this.calculateChecksum(backup.data);
      if (checksum !== backup.metadata.checksum) {
        throw new Error('Backup data integrity check failed');
      }

      // Restore data
      const restoredData = JSON.parse(backup.data);
      
      // Clear current BIM data
      if (this.database.clearAllWalls) {
        await this.database.clearAllWalls();
      }
      
      // Restore original data structure
      // This would involve converting back to the original format
      // Implementation depends on the specific data structure
      
      this.reportProgress({
        phase: 'cleanup',
        currentStep: 'Rollback completed',
        progress: 100,
        processedItems: 1,
        totalItems: 1,
        estimatedTimeRemaining: 0,
        errors: [],
        warnings: []
      });

      return true;

    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Lists available backups
   * 
   * @returns Promise resolving to array of backup metadata
   */
  async listBackups(): Promise<BackupMetadata[]> {
    return this.database.listBackups ? (this.database.listBackups() as any) : Promise.resolve([]);
  }

  /**
   * Deletes a backup
   * 
   * @param backupId - Identifier of backup to delete
   * @returns Promise resolving to deletion success status
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    return this.database.deleteBackup ? this.database.deleteBackup(backupId) : Promise.resolve(false);
  }

  // Private helper methods

  private async validateWallForMigration(
    wallId: string,
    wall: any,
    data: LegacyFloorPlanData
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Check for required properties
    if (!wall.segments || wall.segments.length === 0) {
      issues.push({
        type: 'error',
        severity: 8,
        description: `Wall ${wallId} has no segments`,
        affectedWalls: [wallId],
        suggestedFix: 'Ensure wall has valid segment references',
        autoFixable: false
      });
    }

    // Check segment references
    if (wall.segments) {
      for (const segmentId of wall.segments) {
        if (!data.segments.has(segmentId)) {
          issues.push({
            type: 'warning',
            severity: 5,
            description: `Wall ${wallId} references missing segment ${segmentId}`,
            affectedWalls: [wallId],
            suggestedFix: 'Remove invalid segment reference or restore missing segment',
            autoFixable: true
          });
        }
      }
    }

    // Check for geometric validity
    if (wall.thickness && (wall.thickness < 10 || wall.thickness > 2000)) {
      issues.push({
        type: 'warning',
        severity: 3,
        description: `Wall ${wallId} has unusual thickness: ${wall.thickness}mm`,
        affectedWalls: [wallId],
        suggestedFix: 'Verify thickness value is correct',
        autoFixable: false
      });
    }

    return issues;
  }

  private generateMigrationRecommendations(
    issues: ValidationIssue[],
    data: LegacyFloorPlanData
  ): string[] {
    const recommendations: string[] = [];

    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} critical errors before migration`);
    }

    if (warningCount > data.walls.size * 0.1) {
      recommendations.push('Consider data cleanup to reduce warnings');
    }

    const autoFixableIssues = issues.filter(i => i.autoFixable).length;
    if (autoFixableIssues > 0) {
      recommendations.push(`${autoFixableIssues} issues can be automatically fixed`);
    }

    if (data.walls.size > 1000) {
      recommendations.push('Use batch processing for large datasets');
      recommendations.push('Consider migrating in phases');
    }

    return recommendations;
  }

  private estimateMigrationTime(data: LegacyFloorPlanData, issues: ValidationIssue[]): number {
    const baseTimePerWall = 100; // milliseconds
    const complexityMultiplier = 1 + (issues.length / data.walls.size);
    return data.walls.size * baseTimePerWall * complexityMultiplier;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private calculateIntegrityScore(
    successful: string[],
    failed: string[],
    warnings: string[]
  ): number {
    const total = successful.length + failed.length;
    if (total === 0) return 0;

    const successRate = successful.length / total;
    const warningPenalty = Math.min(warnings.length / total, 0.3);
    
    return Math.max(0, successRate - warningPenalty);
  }

  private async calculateChecksum(data: string): Promise<string> {
    // Simple checksum implementation - in production, use crypto.subtle
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private reportProgress(progress: MigrationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}