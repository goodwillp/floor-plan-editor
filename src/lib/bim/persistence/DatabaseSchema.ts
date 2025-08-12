/**
 * Database Schema Management
 * 
 * Manages database schema creation, migration, and spatial indexing
 */

import Database from 'better-sqlite3';

export interface SchemaVersion {
  version: number;
  description: string;
  sql: string[];
  rollback?: string[];
}

export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  appliedMigrations: number[];
  errors: string[];
  processingTime: number;
}

export class DatabaseSchema {
  private db: Database.Database;
  private migrations: Map<number, SchemaVersion> = new Map();

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeMigrations();
  }

  /**
   * Initialize all schema migrations
   */
  private initializeMigrations(): void {
    // Version 1: Initial schema
    this.migrations.set(1, {
      version: 1,
      description: 'Initial BIM wall database schema',
      sql: [
        // Schema version tracking
        `CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL,
          description TEXT
        )`,

        // Projects table
        `CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          metadata TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,

        // Main walls table
        `CREATE TABLE IF NOT EXISTS walls (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          thickness REAL NOT NULL,
          visible INTEGER NOT NULL,
          baseline_data TEXT NOT NULL,
          basic_geometry_data TEXT NOT NULL,
          bim_geometry_data TEXT,
          is_basic_mode_valid INTEGER NOT NULL,
          is_bim_mode_valid INTEGER NOT NULL,
          last_modified_mode TEXT NOT NULL,
          requires_sync INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          version INTEGER NOT NULL,
          project_id TEXT,
          processing_history_data TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )`,

        // Spatial indexing table
        `CREATE TABLE IF NOT EXISTS wall_spatial_index (
          wall_id TEXT PRIMARY KEY,
          min_x REAL NOT NULL,
          min_y REAL NOT NULL,
          max_x REAL NOT NULL,
          max_y REAL NOT NULL,
          FOREIGN KEY (wall_id) REFERENCES walls(id) ON DELETE CASCADE
        )`,

        // Quality metrics table
        `CREATE TABLE IF NOT EXISTS quality_metrics (
          wall_id TEXT PRIMARY KEY,
          geometric_accuracy REAL NOT NULL,
          topological_consistency REAL NOT NULL,
          manufacturability REAL NOT NULL,
          architectural_compliance REAL NOT NULL,
          sliver_face_count INTEGER NOT NULL,
          micro_gap_count INTEGER NOT NULL,
          self_intersection_count INTEGER NOT NULL,
          degenerate_element_count INTEGER NOT NULL,
          complexity REAL NOT NULL,
          processing_efficiency REAL NOT NULL,
          memory_usage REAL NOT NULL,
          calculated_at TEXT NOT NULL,
          calculation_method TEXT NOT NULL,
          tolerance_used REAL NOT NULL,
          issues_data TEXT,
          recommendations_data TEXT,
          FOREIGN KEY (wall_id) REFERENCES walls(id) ON DELETE CASCADE
        )`,

        // Intersection data table
        `CREATE TABLE IF NOT EXISTS intersection_data (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          participating_walls TEXT NOT NULL,
          intersection_point_x REAL NOT NULL,
          intersection_point_y REAL NOT NULL,
          miter_apex_x REAL,
          miter_apex_y REAL,
          offset_intersections_data TEXT,
          resolved_geometry_data TEXT,
          resolution_method TEXT NOT NULL,
          geometric_accuracy REAL NOT NULL,
          validated INTEGER NOT NULL
        )`,

        // Performance indexes
        `CREATE INDEX IF NOT EXISTS idx_walls_project_id ON walls(project_id)`,
        `CREATE INDEX IF NOT EXISTS idx_walls_type ON walls(type)`,
        `CREATE INDEX IF NOT EXISTS idx_walls_updated_at ON walls(updated_at)`,
        `CREATE INDEX IF NOT EXISTS idx_spatial_bounds ON wall_spatial_index(min_x, min_y, max_x, max_y)`,
        `CREATE INDEX IF NOT EXISTS idx_quality_metrics_wall_id ON quality_metrics(wall_id)`,
        `CREATE INDEX IF NOT EXISTS idx_intersection_walls ON intersection_data(participating_walls)`
      ]
    });

    // Version 2: Enhanced spatial indexing (future migration)
    this.migrations.set(2, {
      version: 2,
      description: 'Enhanced spatial indexing with R-Tree support',
      sql: [
        // Try to create R-Tree virtual table for better spatial queries
        `CREATE VIRTUAL TABLE IF NOT EXISTS wall_rtree_index USING rtree(
          id INTEGER PRIMARY KEY,
          min_x REAL,
          max_x REAL,
          min_y REAL,
          max_y REAL
        )`,

        // Trigger to keep R-Tree in sync with wall_spatial_index
        `CREATE TRIGGER IF NOT EXISTS wall_spatial_insert 
         AFTER INSERT ON wall_spatial_index
         BEGIN
           INSERT OR REPLACE INTO wall_rtree_index 
           VALUES (
             (SELECT rowid FROM walls WHERE id = NEW.wall_id),
             NEW.min_x, NEW.max_x, NEW.min_y, NEW.max_y
           );
         END`,

        `CREATE TRIGGER IF NOT EXISTS wall_spatial_update 
         AFTER UPDATE ON wall_spatial_index
         BEGIN
           INSERT OR REPLACE INTO wall_rtree_index 
           VALUES (
             (SELECT rowid FROM walls WHERE id = NEW.wall_id),
             NEW.min_x, NEW.max_x, NEW.min_y, NEW.max_y
           );
         END`,

        `CREATE TRIGGER IF NOT EXISTS wall_spatial_delete 
         AFTER DELETE ON wall_spatial_index
         BEGIN
           DELETE FROM wall_rtree_index 
           WHERE id = (SELECT rowid FROM walls WHERE id = OLD.wall_id);
         END`
      ],
      rollback: [
        `DROP TRIGGER IF EXISTS wall_spatial_delete`,
        `DROP TRIGGER IF EXISTS wall_spatial_update`,
        `DROP TRIGGER IF EXISTS wall_spatial_insert`,
        `DROP TABLE IF EXISTS wall_rtree_index`
      ]
    });

    // Version 3: Performance optimizations (future migration)
    this.migrations.set(3, {
      version: 3,
      description: 'Performance optimizations and additional indexes',
      sql: [
        // Additional performance indexes
        `CREATE INDEX IF NOT EXISTS idx_walls_thickness ON walls(thickness)`,
        `CREATE INDEX IF NOT EXISTS idx_walls_visible ON walls(visible)`,
        `CREATE INDEX IF NOT EXISTS idx_quality_geometric_accuracy ON quality_metrics(geometric_accuracy)`,
        `CREATE INDEX IF NOT EXISTS idx_intersection_type ON intersection_data(type)`,
        `CREATE INDEX IF NOT EXISTS idx_intersection_validated ON intersection_data(validated)`,

        // Partial indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_walls_bim_mode ON walls(id) WHERE is_bim_mode_valid = 1`,
        `CREATE INDEX IF NOT EXISTS idx_walls_requires_sync ON walls(id) WHERE requires_sync = 1`,

        // Composite indexes for common queries
        `CREATE INDEX IF NOT EXISTS idx_walls_project_type ON walls(project_id, type)`,
        `CREATE INDEX IF NOT EXISTS idx_walls_updated_visible ON walls(updated_at, visible)`
      ],
      rollback: [
        `DROP INDEX IF EXISTS idx_walls_updated_visible`,
        `DROP INDEX IF EXISTS idx_walls_project_type`,
        `DROP INDEX IF EXISTS idx_walls_requires_sync`,
        `DROP INDEX IF EXISTS idx_walls_bim_mode`,
        `DROP INDEX IF EXISTS idx_intersection_validated`,
        `DROP INDEX IF EXISTS idx_intersection_type`,
        `DROP INDEX IF EXISTS idx_quality_geometric_accuracy`,
        `DROP INDEX IF EXISTS idx_walls_visible`,
        `DROP INDEX IF EXISTS idx_walls_thickness`
      ]
    });
  }

  /**
   * Initialize the database schema
   */
  async initializeSchema(): Promise<void> {
    try {
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      // Try to load spatial extension
      try {
        this.db.loadExtension('mod_spatialite');
        console.log('Spatial extension loaded successfully');
      } catch (_error) {
        console.warn('Spatial extension not available, using basic spatial indexing');
      }

      // Apply initial schema if needed
      const currentVersion = await this.getCurrentVersion();
      if (currentVersion === 0) {
        await this.applyMigration(1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize database schema: ${message}`);
    }
  }

  /**
   * Get the current schema version
   */
  async getCurrentVersion(): Promise<number> {
    try {
      const stmt = this.db.prepare('SELECT MAX(version) as version FROM schema_version');
      const result = stmt.get() as { version?: number } | undefined;
      return result?.version || 0;
    } catch (error) {
      return 0; // Schema version table doesn't exist yet
    }
  }

  /**
   * Migrate to a specific version
   */
  async migrateToVersion(targetVersion: number): Promise<MigrationResult> {
    const startTime = Date.now();
    const currentVersion = await this.getCurrentVersion();
    const appliedMigrations: number[] = [];
    const errors: string[] = [];

    if (currentVersion >= targetVersion) {
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: currentVersion,
        appliedMigrations: [],
        errors: [],
        processingTime: Date.now() - startTime
      };
    }

    try {
      // Apply migrations in sequence
      for (let version = currentVersion + 1; version <= targetVersion; version++) {
        const migration = this.migrations.get(version);
        if (!migration) {
          errors.push(`Migration for version ${version} not found`);
          continue;
        }

        try {
          await this.applyMigration(version);
          appliedMigrations.push(version);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to apply migration ${version}: ${message}`);
          break; // Stop on first error
        }
      }

      const finalVersion = await this.getCurrentVersion();
      
      return {
        success: errors.length === 0 && finalVersion === targetVersion,
        fromVersion: currentVersion,
        toVersion: finalVersion,
        appliedMigrations,
        errors,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Migration process failed: ${message}`);
      
      return {
        success: false,
        fromVersion: currentVersion,
        toVersion: await this.getCurrentVersion(),
        appliedMigrations,
        errors,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Apply a specific migration
   */
  private async applyMigration(version: number): Promise<void> {
    const migration = this.migrations.get(version);
    if (!migration) {
      throw new Error(`Migration for version ${version} not found`);
    }

    // Start transaction
    const transaction = this.db.transaction(() => {
      // Execute all SQL statements in the migration
      for (const sql of migration.sql) {
        try {
          this.db.exec(sql);
        } catch (error) {
          // Some statements might fail if features aren't available (like R-Tree)
          // Log warning but continue
          if (sql.includes('rtree') || sql.includes('VIRTUAL TABLE')) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Optional spatial feature not available: ${message}`);
          } else {
            throw error;
          }
        }
      }

      // Record the migration
      const stmt = this.db.prepare(`
        INSERT INTO schema_version (version, applied_at, description) 
        VALUES (?, ?, ?)
      `);
      stmt.run(version, new Date().toISOString(), migration.description);
    });

    transaction();
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(targetVersion: number): Promise<MigrationResult> {
    const startTime = Date.now();
    const currentVersion = await this.getCurrentVersion();
    const appliedMigrations: number[] = [];
    const errors: string[] = [];

    if (currentVersion <= targetVersion) {
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: currentVersion,
        appliedMigrations: [],
        errors: [],
        processingTime: Date.now() - startTime
      };
    }

    try {
      // Rollback migrations in reverse order
      for (let version = currentVersion; version > targetVersion; version--) {
        const migration = this.migrations.get(version);
        if (!migration || !migration.rollback) {
          errors.push(`Rollback for version ${version} not available`);
          continue;
        }

        try {
          await this.rollbackMigration(version);
          appliedMigrations.push(version);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to rollback migration ${version}: ${message}`);
          break; // Stop on first error
        }
      }

      const finalVersion = await this.getCurrentVersion();
      
      return {
        success: errors.length === 0 && finalVersion === targetVersion,
        fromVersion: currentVersion,
        toVersion: finalVersion,
        appliedMigrations,
        errors,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Rollback process failed: ${message}`);
      
      return {
        success: false,
        fromVersion: currentVersion,
        toVersion: await this.getCurrentVersion(),
        appliedMigrations,
        errors,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Rollback a specific migration
   */
  private async rollbackMigration(version: number): Promise<void> {
    const migration = this.migrations.get(version);
    if (!migration || !migration.rollback) {
      throw new Error(`Rollback for version ${version} not available`);
    }

    // Start transaction
    const transaction = this.db.transaction(() => {
      // Execute all rollback statements
      for (const sql of migration.rollback ?? []) {
        this.db.exec(sql);
      }

      // Remove the migration record
      const stmt = this.db.prepare('DELETE FROM schema_version WHERE version = ?');
      stmt.run(version);
    });

    transaction();
  }

  /**
   * Get all available migrations
   */
  getAvailableMigrations(): SchemaVersion[] {
    return Array.from(this.migrations.values()).sort((a, b) => a.version - b.version);
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<Array<{
    version: number;
    appliedAt: string;
    description: string;
  }>> {
    try {
      const stmt = this.db.prepare(`
        SELECT version, applied_at, description 
        FROM schema_version 
        ORDER BY version
      `);
      const rows = stmt.all() as Array<{ version: number; applied_at: string; description: string }>;
      return rows.map(r => ({ version: r.version, appliedAt: r.applied_at, description: r.description }));
    } catch (_error) {
      return [];
    }
  }

  /**
   * Validate schema integrity
   */
  async validateSchema(): Promise<{
    valid: boolean;
    issues: string[];
    tables: string[];
    indexes: string[];
  }> {
    const issues: string[] = [];
    const tables: string[] = [];
    const indexes: string[] = [];

    try {
      // Get all tables
      const tableStmt = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      const tableResults = tableStmt.all() as Array<{ name: string }>;
      tables.push(...tableResults.map(r => r.name));

      // Get all indexes
      const indexStmt = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      const indexResults = indexStmt.all() as Array<{ name: string }>;
      indexes.push(...indexResults.map(r => r.name));

      // Check for required tables
      const requiredTables = ['schema_version', 'projects', 'walls', 'wall_spatial_index', 'quality_metrics', 'intersection_data'];
      for (const table of requiredTables) {
        if (!tables.includes(table)) {
          issues.push(`Required table '${table}' is missing`);
        }
      }

      // Check foreign key constraints
      const fkStmt = this.db.prepare('PRAGMA foreign_key_check');
      const fkResults = fkStmt.all() as any[];
      if (fkResults.length > 0) {
        issues.push(`Foreign key constraint violations: ${fkResults.length}`);
      }

      // Check for orphaned spatial index entries
      const orphanStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM wall_spatial_index wsi
        LEFT JOIN walls w ON wsi.wall_id = w.id
        WHERE w.id IS NULL
      `);
      const orphanResult = orphanStmt.get() as { count?: number } | undefined;
      if ((orphanResult?.count ?? 0) > 0) {
        issues.push(`Orphaned spatial index entries: ${orphanResult?.count}`);
      }

      return {
        valid: issues.length === 0,
        issues,
        tables,
        indexes
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(`Schema validation failed: ${message}`);
      return {
        valid: false,
        issues,
        tables,
        indexes
      };
    }
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase(): Promise<{
    success: boolean;
    operations: string[];
    errors: string[];
    processingTime: number;
  }> {
    const startTime = Date.now();
    const operations: string[] = [];
    const errors: string[] = [];

    try {
      // Analyze tables for query optimization
      this.db.exec('ANALYZE');
      operations.push('ANALYZE completed');

      // Vacuum to reclaim space and defragment
      this.db.exec('VACUUM');
      operations.push('VACUUM completed');

      // Update table statistics
      const tables = ['walls', 'wall_spatial_index', 'quality_metrics', 'intersection_data'];
      for (const table of tables) {
        try {
          this.db.exec(`ANALYZE ${table}`);
          operations.push(`ANALYZE ${table} completed`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to analyze ${table}: ${message}`);
        }
      }

      return {
        success: errors.length === 0,
        operations,
        errors,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Database optimization failed: ${message}`);
      return {
        success: false,
        operations,
        errors,
        processingTime: Date.now() - startTime
      };
    }
  }
}