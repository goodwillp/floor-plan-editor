/**
 * Database Schema Tests
 * 
 * Tests for database schema management and migration system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseSchema } from '../../persistence/DatabaseSchema';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseSchema', () => {
  let db: Database.Database;
  let schema: DatabaseSchema;
  let testDbPath: string;

  beforeEach(() => {
    // Create temporary database file
    testDbPath = path.join(__dirname, `schema_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.db`);
    db = new Database(testDbPath);
    schema = new DatabaseSchema(db);
  });

  afterEach(() => {
    db.close();
    
    // Clean up test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Schema Initialization', () => {
    it('should initialize schema successfully', async () => {
      await schema.initializeSchema();
      
      const version = await schema.getCurrentVersion();
      expect(version).toBe(1);
    });

    it('should create all required tables', async () => {
      await schema.initializeSchema();
      
      const validation = await schema.validateSchema();
      expect(validation.valid).toBe(true);
      expect(validation.tables).toContain('schema_version');
      expect(validation.tables).toContain('projects');
      expect(validation.tables).toContain('walls');
      expect(validation.tables).toContain('wall_spatial_index');
      expect(validation.tables).toContain('quality_metrics');
      expect(validation.tables).toContain('intersection_data');
    });

    it('should create performance indexes', async () => {
      await schema.initializeSchema();
      
      const validation = await schema.validateSchema();
      expect(validation.indexes.length).toBeGreaterThan(0);
      expect(validation.indexes).toContain('idx_walls_project_id');
      expect(validation.indexes).toContain('idx_spatial_bounds');
    });

    it('should not reinitialize if already initialized', async () => {
      await schema.initializeSchema();
      const firstVersion = await schema.getCurrentVersion();
      
      await schema.initializeSchema();
      const secondVersion = await schema.getCurrentVersion();
      
      expect(firstVersion).toBe(secondVersion);
    });
  });

  describe('Migration System', () => {
    beforeEach(async () => {
      await schema.initializeSchema();
    });

    it('should get current version correctly', async () => {
      const version = await schema.getCurrentVersion();
      expect(version).toBe(1);
    });

    it('should migrate to higher version', async () => {
      const result = await schema.migrateToVersion(2);
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(2);
      expect(result.appliedMigrations).toContain(2);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle migration to same version', async () => {
      const result = await schema.migrateToVersion(1);
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(1);
      expect(result.appliedMigrations).toHaveLength(0);
    });

    it('should migrate multiple versions', async () => {
      const result = await schema.migrateToVersion(3);
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(3);
      expect(result.appliedMigrations).toEqual([2, 3]);
    });

    it('should handle migration errors gracefully', async () => {
      // Try to migrate to a non-existent version
      const result = await schema.migrateToVersion(999);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Migration for version');
    });

    it('should get available migrations', () => {
      const migrations = schema.getAvailableMigrations();
      
      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations[0].version).toBe(1);
      expect(migrations[0].description).toContain('Initial BIM wall database schema');
    });

    it('should get migration history', async () => {
      await schema.migrateToVersion(2);
      
      const history = await schema.getMigrationHistory();
      
      expect(history.length).toBe(2);
      expect(history[0].version).toBe(1);
      expect(history[1].version).toBe(2);
      expect(history[0].applied_at).toBeDefined();
      expect(history[0].description).toBeDefined();
    });
  });

  describe('Rollback System', () => {
    beforeEach(async () => {
      await schema.initializeSchema();
      await schema.migrateToVersion(3);
    });

    it('should rollback to lower version', async () => {
      const result = await schema.rollbackToVersion(2);
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(3);
      expect(result.toVersion).toBe(2);
      expect(result.appliedMigrations).toContain(3);
    });

    it('should handle rollback to same version', async () => {
      const result = await schema.rollbackToVersion(3);
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(3);
      expect(result.toVersion).toBe(3);
      expect(result.appliedMigrations).toHaveLength(0);
    });

    it('should rollback multiple versions', async () => {
      const result = await schema.rollbackToVersion(1);
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(3);
      expect(result.toVersion).toBe(1);
      expect(result.appliedMigrations).toEqual([3, 2]);
    });

    it('should handle rollback when no rollback script available', async () => {
      // Manually insert a migration without rollback
      db.prepare(`
        INSERT INTO schema_version (version, applied_at, description) 
        VALUES (999, ?, 'Test migration without rollback')
      `).run(new Date().toISOString());

      const result = await schema.rollbackToVersion(3);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Rollback for version 999 not available');
    });
  });

  describe('Schema Validation', () => {
    it('should validate empty database', async () => {
      const validation = await schema.validateSchema();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('Required table');
    });

    it('should validate initialized schema', async () => {
      await schema.initializeSchema();
      
      const validation = await schema.validateSchema();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.tables.length).toBeGreaterThan(0);
      expect(validation.indexes.length).toBeGreaterThan(0);
    });

    it('should detect missing tables', async () => {
      await schema.initializeSchema();
      
      // Drop a required table
      db.exec('DROP TABLE walls');
      
      const validation = await schema.validateSchema();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('walls'))).toBe(true);
    });

    it('should detect orphaned spatial index entries', async () => {
      await schema.initializeSchema();
      
      // Temporarily disable foreign keys to insert orphaned entry
      db.pragma('foreign_keys = OFF');
      db.prepare(`
        INSERT INTO wall_spatial_index (wall_id, min_x, min_y, max_x, max_y)
        VALUES ('orphaned-wall', 0, 0, 100, 100)
      `).run();
      db.pragma('foreign_keys = ON');
      
      const validation = await schema.validateSchema();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Orphaned spatial index'))).toBe(true);
    });
  });

  describe('Database Optimization', () => {
    beforeEach(async () => {
      await schema.initializeSchema();
    });

    it('should optimize database successfully', async () => {
      const result = await schema.optimizeDatabase();
      
      expect(result.success).toBe(true);
      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.operations).toContain('ANALYZE completed');
      expect(result.operations).toContain('VACUUM completed');
      expect(result.errors).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should analyze individual tables', async () => {
      const result = await schema.optimizeDatabase();
      
      expect(result.operations.some(op => op.includes('ANALYZE walls'))).toBe(true);
      expect(result.operations.some(op => op.includes('ANALYZE wall_spatial_index'))).toBe(true);
    });

    it('should handle optimization errors gracefully', async () => {
      // Drop a table to cause analyze to fail
      db.exec('DROP TABLE walls');
      
      const result = await schema.optimizeDatabase();
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('walls'))).toBe(true);
    });
  });

  describe('Spatial Indexing', () => {
    beforeEach(async () => {
      await schema.initializeSchema();
    });

    it('should create spatial index table', async () => {
      const validation = await schema.validateSchema();
      
      expect(validation.tables).toContain('wall_spatial_index');
      expect(validation.indexes).toContain('idx_spatial_bounds');
    });

    it('should support spatial queries', async () => {
      // Insert test data
      db.prepare(`
        INSERT INTO walls (id, type, thickness, visible, baseline_data, basic_geometry_data, 
                          is_basic_mode_valid, is_bim_mode_valid, last_modified_mode, 
                          requires_sync, created_at, updated_at, version)
        VALUES ('test-wall', 'Layout', 100, 1, '{}', '{}', 1, 0, 'basic', 0, 
                datetime('now'), datetime('now'), 1)
      `).run();

      db.prepare(`
        INSERT INTO wall_spatial_index (wall_id, min_x, min_y, max_x, max_y)
        VALUES ('test-wall', 0, 0, 100, 100)
      `).run();

      // Test spatial query
      const stmt = db.prepare(`
        SELECT w.id FROM walls w
        JOIN wall_spatial_index wsi ON w.id = wsi.wall_id
        WHERE wsi.min_x <= ? AND wsi.max_x >= ? 
          AND wsi.min_y <= ? AND wsi.max_y >= ?
      `);

      const results = stmt.all(50, 50, 50, 50);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-wall');
    });

    it('should handle R-Tree extension if available', async () => {
      // Try to migrate to version 2 which includes R-Tree
      const result = await schema.migrateToVersion(2);
      
      // Should succeed even if R-Tree is not available
      expect(result.success).toBe(true);
      expect(result.toVersion).toBe(2);
    });
  });

  describe('Performance Indexes', () => {
    beforeEach(async () => {
      await schema.initializeSchema();
      await schema.migrateToVersion(3);
    });

    it('should create performance indexes', async () => {
      const validation = await schema.validateSchema();
      
      expect(validation.indexes).toContain('idx_walls_thickness');
      expect(validation.indexes).toContain('idx_walls_visible');
      expect(validation.indexes).toContain('idx_quality_geometric_accuracy');
    });

    it('should create partial indexes', async () => {
      const validation = await schema.validateSchema();
      
      expect(validation.indexes).toContain('idx_walls_bim_mode');
      expect(validation.indexes).toContain('idx_walls_requires_sync');
    });

    it('should create composite indexes', async () => {
      const validation = await schema.validateSchema();
      
      expect(validation.indexes).toContain('idx_walls_project_type');
      expect(validation.indexes).toContain('idx_walls_updated_visible');
    });
  });

  describe('Foreign Key Constraints', () => {
    beforeEach(async () => {
      await schema.initializeSchema();
    });

    it('should enforce foreign key constraints', async () => {
      // Insert a wall with invalid project_id
      expect(() => {
        db.prepare(`
          INSERT INTO walls (id, type, thickness, visible, baseline_data, basic_geometry_data, 
                            is_basic_mode_valid, is_bim_mode_valid, last_modified_mode, 
                            requires_sync, created_at, updated_at, version, project_id)
          VALUES ('test-wall', 'Layout', 100, 1, '{}', '{}', 1, 0, 'basic', 0, 
                  datetime('now'), datetime('now'), 1, 'non-existent-project')
        `).run();
      }).toThrow();
    });

    it('should cascade delete related records', async () => {
      // Insert project and wall
      db.prepare(`
        INSERT INTO projects (id, metadata, created_at, updated_at)
        VALUES ('test-project', '{}', datetime('now'), datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO walls (id, type, thickness, visible, baseline_data, basic_geometry_data, 
                          is_basic_mode_valid, is_bim_mode_valid, last_modified_mode, 
                          requires_sync, created_at, updated_at, version, project_id)
        VALUES ('test-wall', 'Layout', 100, 1, '{}', '{}', 1, 0, 'basic', 0, 
                datetime('now'), datetime('now'), 1, 'test-project')
      `).run();

      db.prepare(`
        INSERT INTO wall_spatial_index (wall_id, min_x, min_y, max_x, max_y)
        VALUES ('test-wall', 0, 0, 100, 100)
      `).run();

      // Delete project should cascade
      db.prepare('DELETE FROM projects WHERE id = ?').run('test-project');

      // Check that wall and spatial index are also deleted
      const wallCount = db.prepare('SELECT COUNT(*) as count FROM walls').get().count;
      const spatialCount = db.prepare('SELECT COUNT(*) as count FROM wall_spatial_index').get().count;

      expect(wallCount).toBe(0);
      expect(spatialCount).toBe(0);
    });
  });
});