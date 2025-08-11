/**
 * SQLite Implementation of Database Abstraction Layer
 * 
 * Provides SQLite-specific implementation with spatial indexing support
 */

import Database from 'better-sqlite3';
import {
  DatabaseAbstractionLayer,
  DatabaseConfig,
  DatabaseConnection,
  SaveResult,
  LoadResult,
  DeleteResult,
  BatchResult,
  QueryResult,
  TransactionContext
} from './DatabaseAbstractionLayer';
import { UnifiedWallData } from '../types/UnifiedWallData';
import { QualityMetrics } from '../types/QualityMetrics';
import { IntersectionData } from '../geometry/IntersectionData';
import { GeometricDataSerializer } from './GeometricDataSerializer';

export class SQLiteImplementation implements DatabaseAbstractionLayer {
  private db: Database.Database | null = null;
  private connection: DatabaseConnection | null = null;
  private serializer: GeometricDataSerializer;
  private activeTransactions: Map<string, Database.Transaction> = new Map();

  constructor() {
    this.serializer = new GeometricDataSerializer();
  }

  async connect(config: DatabaseConfig): Promise<DatabaseConnection> {
    try {
      if (config.type !== 'sqlite') {
        throw new Error('SQLiteImplementation only supports SQLite databases');
      }

      if (!config.path) {
        throw new Error('SQLite database path is required');
      }

      // Open database connection
      this.db = new Database(config.path, {
        verbose: config.options?.verbose ? console.log : undefined,
        fileMustExist: false
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      // Load R-Tree extension for spatial indexing
      try {
        this.db.loadExtension('mod_spatialite');
      } catch (error) {
        console.warn('Spatial extension not available, spatial queries will be limited');
      }

      this.connection = {
        isConnected: true,
        config,
        close: async () => {
          if (this.db) {
            this.db.close();
            this.db = null;
            this.connection = null;
          }
        }
      };

      // Initialize schema if needed
      await this.initializeSchema();

      return this.connection;
    } catch (error) {
      throw new Error(`Failed to connect to SQLite database: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
    }
  }

  isConnected(): boolean {
    return this.connection?.isConnected ?? false;
  }

  async beginTransaction(): Promise<TransactionContext> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Begin transaction manually
    this.db.exec('BEGIN TRANSACTION');
    
    return {
      id: transactionId,
      isActive: true,
      commit: async () => {
        if (this.db) {
          this.db.exec('COMMIT');
        }
      },
      rollback: async () => {
        if (this.db) {
          this.db.exec('ROLLBACK');
        }
      }
    };
  }

  async saveWall(wall: UnifiedWallData, transaction?: TransactionContext): Promise<SaveResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const serializedWall = await this.serializer.serializeWall(wall);
      const now = new Date();

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO walls (
          id, type, thickness, visible, baseline_data, basic_geometry_data,
          bim_geometry_data, is_basic_mode_valid, is_bim_mode_valid,
          last_modified_mode, requires_sync, created_at, updated_at,
          version, project_id, processing_history_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        wall.id,
        wall.type,
        wall.thickness,
        wall.visible ? 1 : 0,
        serializedWall.baselineData,
        serializedWall.basicGeometryData,
        serializedWall.bimGeometryData,
        wall.isBasicModeValid ? 1 : 0,
        wall.isBIMModeValid ? 1 : 0,
        wall.lastModifiedMode,
        wall.requiresSync ? 1 : 0,
        wall.createdAt.toISOString(),
        now.toISOString(),
        wall.version + 1,
        wall.projectId || null,
        serializedWall.processingHistoryData
      );

      // Update spatial index if geometry exists
      if (serializedWall.boundingBox) {
        const spatialStmt = this.db.prepare(`
          INSERT OR REPLACE INTO wall_spatial_index (
            wall_id, min_x, min_y, max_x, max_y
          ) VALUES (?, ?, ?, ?, ?)
        `);
        
        spatialStmt.run(
          wall.id,
          serializedWall.boundingBox.minX,
          serializedWall.boundingBox.minY,
          serializedWall.boundingBox.maxX,
          serializedWall.boundingBox.maxY
        );
      }

      return {
        success: true,
        wallId: wall.id,
        version: wall.version + 1,
        timestamp: now
      };
    } catch (error) {
      return {
        success: false,
        wallId: wall.id,
        version: wall.version,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  async loadWall(wallId: string): Promise<LoadResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM walls WHERE id = ?
      `);

      const row = stmt.get(wallId);
      if (!row) {
        return {
          success: false,
          error: `Wall with id ${wallId} not found`
        };
      }

      const wall = await this.serializer.deserializeWall(row);

      return {
        success: true,
        wall,
        version: row.version,
        timestamp: new Date(row.updated_at)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateWall(wall: UnifiedWallData, transaction?: TransactionContext): Promise<SaveResult> {
    // Update is the same as save in SQLite with INSERT OR REPLACE
    return this.saveWall(wall, transaction);
  }

  async deleteWall(wallId: string, transaction?: TransactionContext): Promise<DeleteResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM walls WHERE id = ?');
      const result = stmt.run(wallId);

      // Also remove from spatial index
      const spatialStmt = this.db.prepare('DELETE FROM wall_spatial_index WHERE wall_id = ?');
      spatialStmt.run(wallId);

      return {
        success: result.changes > 0,
        wallId
      };
    } catch (error) {
      return {
        success: false,
        wallId,
        error: error.message
      };
    }
  }

  async saveWalls(walls: UnifiedWallData[], transaction?: TransactionContext): Promise<BatchResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const batchTransaction = this.db.transaction((wallsToSave: UnifiedWallData[]) => {
      for (const wall of wallsToSave) {
        try {
          // This is a synchronous version of saveWall for batch processing
          const serializedWall = this.serializer.serializeWallSync(wall);
          const now = new Date();

          const stmt = this.db!.prepare(`
            INSERT OR REPLACE INTO walls (
              id, type, thickness, visible, baseline_data, basic_geometry_data,
              bim_geometry_data, is_basic_mode_valid, is_bim_mode_valid,
              last_modified_mode, requires_sync, created_at, updated_at,
              version, project_id, processing_history_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          stmt.run(
            wall.id,
            wall.type,
            wall.thickness,
            wall.visible ? 1 : 0,
            serializedWall.baselineData,
            serializedWall.basicGeometryData,
            serializedWall.bimGeometryData,
            wall.isBasicModeValid ? 1 : 0,
            wall.isBIMModeValid ? 1 : 0,
            wall.lastModifiedMode,
            wall.requiresSync ? 1 : 0,
            wall.createdAt.toISOString(),
            now.toISOString(),
            wall.version + 1,
            wall.projectId || null,
            serializedWall.processingHistoryData
          );

          // Update spatial index if geometry exists
          if (serializedWall.boundingBox) {
            const spatialStmt = this.db!.prepare(`
              INSERT OR REPLACE INTO wall_spatial_index (
                wall_id, min_x, min_y, max_x, max_y
              ) VALUES (?, ?, ?, ?, ?)
            `);
            
            spatialStmt.run(
              wall.id,
              serializedWall.boundingBox.minX,
              serializedWall.boundingBox.minY,
              serializedWall.boundingBox.maxX,
              serializedWall.boundingBox.maxY
            );
          }

          processedCount++;
        } catch (error) {
          failedCount++;
          errors.push(`Wall ${wall.id}: ${error.message}`);
        }
      }
    });

    try {
      batchTransaction(walls);
      
      return {
        success: failedCount === 0,
        processedCount,
        failedCount,
        errors,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        processedCount: 0,
        failedCount: walls.length,
        errors: [error.message],
        processingTime: Date.now() - startTime
      };
    }
  }

  async loadWalls(wallIds: string[]): Promise<QueryResult<UnifiedWallData>> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const placeholders = wallIds.map(() => '?').join(',');
      const stmt = this.db.prepare(`
        SELECT * FROM walls WHERE id IN (${placeholders})
      `);

      const rows = stmt.all(...wallIds);
      const walls: UnifiedWallData[] = [];

      for (const row of rows) {
        try {
          const wall = await this.serializer.deserializeWall(row);
          walls.push(wall);
        } catch (error) {
          console.warn(`Failed to deserialize wall ${row.id}: ${error.message}`);
        }
      }

      return {
        success: true,
        data: walls,
        count: walls.length
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        count: 0,
        error: error.message
      };
    }
  }

  async deleteWalls(wallIds: string[], transaction?: TransactionContext): Promise<BatchResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      const placeholders = wallIds.map(() => '?').join(',');
      const stmt = this.db.prepare(`DELETE FROM walls WHERE id IN (${placeholders})`);
      const spatialStmt = this.db.prepare(`DELETE FROM wall_spatial_index WHERE wall_id IN (${placeholders})`);

      const result = stmt.run(...wallIds);
      spatialStmt.run(...wallIds);

      processedCount = result.changes;

      return {
        success: true,
        processedCount,
        failedCount: 0,
        errors: [],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        processedCount: 0,
        failedCount: wallIds.length,
        errors: [error.message],
        processingTime: Date.now() - startTime
      };
    }
  }

  async saveProject(projectId: string, metadata: Record<string, any>): Promise<SaveResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO projects (id, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);

      const now = new Date();
      stmt.run(
        projectId,
        JSON.stringify(metadata),
        now.toISOString(),
        now.toISOString()
      );

      return {
        success: true,
        wallId: projectId,
        version: 1,
        timestamp: now
      };
    } catch (error) {
      return {
        success: false,
        wallId: projectId,
        version: 0,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  async loadProject(projectId: string): Promise<LoadResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
      const row = stmt.get(projectId);

      if (!row) {
        return {
          success: false,
          error: `Project with id ${projectId} not found`
        };
      }

      return {
        success: true,
        wall: JSON.parse(row.metadata),
        version: 1,
        timestamp: new Date(row.updated_at)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteProject(projectId: string): Promise<DeleteResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
      const result = stmt.run(projectId);

      return {
        success: result.changes > 0,
        wallId: projectId
      };
    } catch (error) {
      return {
        success: false,
        wallId: projectId,
        error: error.message
      };
    }
  }

  async saveQualityMetrics(wallId: string, metrics: QualityMetrics): Promise<SaveResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO quality_metrics (
          wall_id, geometric_accuracy, topological_consistency, manufacturability,
          architectural_compliance, sliver_face_count, micro_gap_count,
          self_intersection_count, degenerate_element_count, complexity,
          processing_efficiency, memory_usage, calculated_at, calculation_method,
          tolerance_used, issues_data, recommendations_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        wallId,
        metrics.geometricAccuracy,
        metrics.topologicalConsistency,
        metrics.manufacturability,
        metrics.architecturalCompliance,
        metrics.sliverFaceCount,
        metrics.microGapCount,
        metrics.selfIntersectionCount,
        metrics.degenerateElementCount,
        metrics.complexity,
        metrics.processingEfficiency,
        metrics.memoryUsage,
        metrics.calculatedAt.toISOString(),
        metrics.calculationMethod,
        metrics.toleranceUsed,
        JSON.stringify(metrics.issues),
        JSON.stringify(metrics.recommendations)
      );

      return {
        success: true,
        wallId,
        version: 1,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        wallId,
        version: 0,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  async loadQualityMetrics(wallId: string): Promise<QueryResult<QualityMetrics>> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM quality_metrics WHERE wall_id = ?');
      const row = stmt.get(wallId);

      if (!row) {
        return {
          success: true,
          data: [],
          count: 0
        };
      }

      const metrics: QualityMetrics = {
        geometricAccuracy: row.geometric_accuracy,
        topologicalConsistency: row.topological_consistency,
        manufacturability: row.manufacturability,
        architecturalCompliance: row.architectural_compliance,
        sliverFaceCount: row.sliver_face_count,
        microGapCount: row.micro_gap_count,
        selfIntersectionCount: row.self_intersection_count,
        degenerateElementCount: row.degenerate_element_count,
        complexity: row.complexity,
        processingEfficiency: row.processing_efficiency,
        memoryUsage: row.memory_usage,
        calculatedAt: new Date(row.calculated_at),
        calculationMethod: row.calculation_method,
        toleranceUsed: row.tolerance_used,
        issues: JSON.parse(row.issues_data || '[]'),
        recommendations: JSON.parse(row.recommendations_data || '[]')
      };

      return {
        success: true,
        data: [metrics],
        count: 1
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        count: 0,
        error: error.message
      };
    }
  }

  async saveIntersectionData(intersectionData: IntersectionData[]): Promise<BatchResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const batchTransaction = this.db.transaction((data: IntersectionData[]) => {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO intersection_data (
          id, type, participating_walls, intersection_point_x, intersection_point_y,
          miter_apex_x, miter_apex_y, offset_intersections_data, resolved_geometry_data,
          resolution_method, geometric_accuracy, validated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const intersection of data) {
        try {
          stmt.run(
            intersection.id,
            intersection.type,
            JSON.stringify(intersection.participatingWalls),
            intersection.intersectionPoint.x,
            intersection.intersectionPoint.y,
            intersection.miterApex?.x || null,
            intersection.miterApex?.y || null,
            JSON.stringify(intersection.offsetIntersections),
            JSON.stringify(intersection.resolvedGeometry),
            intersection.resolutionMethod,
            intersection.geometricAccuracy,
            intersection.validated ? 1 : 0
          );
          processedCount++;
        } catch (error) {
          failedCount++;
          errors.push(`Intersection ${intersection.id}: ${error.message}`);
        }
      }
    });

    try {
      batchTransaction(intersectionData);
      
      return {
        success: failedCount === 0,
        processedCount,
        failedCount,
        errors,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        processedCount: 0,
        failedCount: intersectionData.length,
        errors: [error.message],
        processingTime: Date.now() - startTime
      };
    }
  }

  async loadIntersectionData(wallIds: string[]): Promise<QueryResult<IntersectionData>> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // Find intersections that involve any of the specified walls
      const stmt = this.db.prepare(`
        SELECT DISTINCT * FROM intersection_data 
        WHERE participating_walls LIKE '%' || ? || '%'
      `);

      const intersections: IntersectionData[] = [];
      const seenIntersectionIds = new Set<string>();
      
      for (const wallId of wallIds) {
        const rows = stmt.all(wallId);
        
        for (const row of rows) {
          // Skip if we've already processed this intersection
          if (seenIntersectionIds.has(row.id)) {
            continue;
          }
          
          const participatingWalls = JSON.parse(row.participating_walls);
          
          // Only include if the wall is actually in the participating walls list
          if (participatingWalls.includes(wallId)) {
            const intersection: IntersectionData = {
              id: row.id,
              type: row.type,
              participatingWalls,
              intersectionPoint: { x: row.intersection_point_x, y: row.intersection_point_y },
              miterApex: row.miter_apex_x !== null ? 
                { x: row.miter_apex_x, y: row.miter_apex_y } : null,
              offsetIntersections: JSON.parse(row.offset_intersections_data || '[]'),
              resolvedGeometry: JSON.parse(row.resolved_geometry_data || '{}'),
              resolutionMethod: row.resolution_method,
              geometricAccuracy: row.geometric_accuracy,
              validated: row.validated === 1
            };
            
            intersections.push(intersection);
            seenIntersectionIds.add(row.id);
          }
        }
      }

      return {
        success: true,
        data: intersections,
        count: intersections.length
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        count: 0,
        error: error.message
      };
    }
  }

  async findWallsInBounds(bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }): Promise<QueryResult<UnifiedWallData>> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT w.* FROM walls w
        JOIN wall_spatial_index wsi ON w.id = wsi.wall_id
        WHERE wsi.min_x <= ? AND wsi.max_x >= ? 
          AND wsi.min_y <= ? AND wsi.max_y >= ?
      `);

      const rows = stmt.all(bounds.maxX, bounds.minX, bounds.maxY, bounds.minY);
      const walls: UnifiedWallData[] = [];

      for (const row of rows) {
        try {
          const wall = await this.serializer.deserializeWall(row);
          walls.push(wall);
        } catch (error) {
          console.warn(`Failed to deserialize wall ${row.id}: ${error.message}`);
        }
      }

      return {
        success: true,
        data: walls,
        count: walls.length
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        count: 0,
        error: error.message
      };
    }
  }

  async findNearbyWalls(
    centerX: number,
    centerY: number,
    radius: number
  ): Promise<QueryResult<UnifiedWallData>> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // Use bounding box approximation for nearby search
      const bounds = {
        minX: centerX - radius,
        minY: centerY - radius,
        maxX: centerX + radius,
        maxY: centerY + radius
      };

      return this.findWallsInBounds(bounds);
    } catch (error) {
      return {
        success: false,
        data: [],
        count: 0,
        error: error.message
      };
    }
  }

  async initializeSchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Create schema version table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);

    // Create main tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS walls (
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
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wall_spatial_index (
        wall_id TEXT PRIMARY KEY,
        min_x REAL NOT NULL,
        min_y REAL NOT NULL,
        max_x REAL NOT NULL,
        max_y REAL NOT NULL,
        FOREIGN KEY (wall_id) REFERENCES walls(id) ON DELETE CASCADE
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_metrics (
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
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS intersection_data (
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
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_walls_project_id ON walls(project_id);
      CREATE INDEX IF NOT EXISTS idx_walls_type ON walls(type);
      CREATE INDEX IF NOT EXISTS idx_walls_updated_at ON walls(updated_at);
      CREATE INDEX IF NOT EXISTS idx_spatial_bounds ON wall_spatial_index(min_x, min_y, max_x, max_y);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_wall_id ON quality_metrics(wall_id);
      CREATE INDEX IF NOT EXISTS idx_intersection_walls ON intersection_data(participating_walls);
    `);

    // Set initial schema version
    const currentVersion = await this.getSchemaVersion();
    if (currentVersion === 0) {
      this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
        1,
        new Date().toISOString()
      );
    }
  }

  async migrateSchema(targetVersion: number): Promise<void> {
    const currentVersion = await this.getSchemaVersion();
    
    if (currentVersion >= targetVersion) {
      return; // Already at or above target version
    }

    // Add migration logic here as needed
    console.log(`Schema migration from version ${currentVersion} to ${targetVersion} not implemented yet`);
  }

  async getSchemaVersion(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare('SELECT MAX(version) as version FROM schema_version');
      const result = stmt.get();
      return result?.version || 0;
    } catch (error) {
      return 0; // Schema version table doesn't exist yet
    }
  }

  async vacuum(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    this.db.exec('VACUUM');
  }

  async analyze(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    this.db.exec('ANALYZE');
  }

  async getStatistics(): Promise<Record<string, any>> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const stats: Record<string, any> = {};

    // Get table counts
    const tables = ['walls', 'projects', 'quality_metrics', 'intersection_data'];
    for (const table of tables) {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
      const result = stmt.get();
      stats[`${table}_count`] = result.count;
    }

    // Get database size
    const sizeStmt = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
    const sizeResult = sizeStmt.get();
    stats.database_size_bytes = sizeResult.size;

    // Get schema version
    stats.schema_version = await this.getSchemaVersion();

    return stats;
  }
}