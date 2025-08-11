/**
 * Database Abstraction Layer Tests
 * 
 * Tests for the database interface and SQLite implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteImplementation } from '../../persistence/SQLiteImplementation';
import { DatabaseConfig } from '../../persistence/DatabaseAbstractionLayer';
import { UnifiedWallData } from '../../types/UnifiedWallData';
import { QualityMetrics, QualityIssueType } from '../../types/QualityMetrics';
import { IntersectionData } from '../../geometry/IntersectionData';
import { IntersectionType } from '../../types/IntersectionTypes';
import { createTestWall, createTestQualityMetrics, createTestIntersectionData } from '../helpers/TestDataFactory';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseAbstractionLayer', () => {
  let db: SQLiteImplementation;
  let testDbPath: string;
  let config: DatabaseConfig;

  beforeEach(async () => {
    // Create temporary database file
    testDbPath = path.join(__dirname, `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.db`);
    
    config = {
      type: 'sqlite',
      path: testDbPath,
      options: {
        verbose: false
      }
    };

    db = new SQLiteImplementation();
    await db.connect(config);
  });

  afterEach(async () => {
    await db.disconnect();
    
    // Clean up test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Connection Management', () => {
    it('should connect to SQLite database successfully', async () => {
      expect(db.isConnected()).toBe(true);
    });

    it('should throw error for invalid database type', async () => {
      const invalidConfig: DatabaseConfig = {
        type: 'postgresql', // SQLiteImplementation only supports sqlite
        path: testDbPath
      };

      const newDb = new SQLiteImplementation();
      await expect(newDb.connect(invalidConfig)).rejects.toThrow('SQLiteImplementation only supports SQLite databases');
    });

    it('should throw error when path is missing', async () => {
      const invalidConfig: DatabaseConfig = {
        type: 'sqlite'
        // path is missing
      };

      const newDb = new SQLiteImplementation();
      await expect(newDb.connect(invalidConfig)).rejects.toThrow('SQLite database path is required');
    });

    it('should disconnect properly', async () => {
      await db.disconnect();
      expect(db.isConnected()).toBe(false);
    });
  });

  describe('Schema Management', () => {
    it('should initialize schema correctly', async () => {
      const version = await db.getSchemaVersion();
      expect(version).toBe(1);
    });

    it('should return statistics', async () => {
      const stats = await db.getStatistics();
      
      expect(stats).toHaveProperty('walls_count');
      expect(stats).toHaveProperty('projects_count');
      expect(stats).toHaveProperty('quality_metrics_count');
      expect(stats).toHaveProperty('intersection_data_count');
      expect(stats).toHaveProperty('database_size_bytes');
      expect(stats).toHaveProperty('schema_version');
      
      expect(stats.walls_count).toBe(0);
      expect(stats.schema_version).toBe(1);
    });
  });

  describe('Wall CRUD Operations', () => {
    let testWall: UnifiedWallData;

    beforeEach(() => {
      testWall = createTestWall({
        id: 'test-wall-1',
        type: 'Layout',
        thickness: 100
      });
    });

    it('should save a wall successfully', async () => {
      const result = await db.saveWall(testWall);
      
      expect(result.success).toBe(true);
      expect(result.wallId).toBe(testWall.id);
      expect(result.version).toBe(testWall.version + 1);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should load a wall successfully', async () => {
      await db.saveWall(testWall);
      
      const result = await db.loadWall(testWall.id);
      
      expect(result.success).toBe(true);
      expect(result.wall).toBeDefined();
      expect(result.wall!.id).toBe(testWall.id);
      expect(result.wall!.type).toBe(testWall.type);
      expect(result.wall!.thickness).toBe(testWall.thickness);
      expect(result.wall!.visible).toBe(testWall.visible);
    });

    it('should return error when loading non-existent wall', async () => {
      const result = await db.loadWall('non-existent-wall');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update a wall successfully', async () => {
      await db.saveWall(testWall);
      
      const updatedWall = { ...testWall, thickness: 150 };
      const result = await db.updateWall(updatedWall);
      
      expect(result.success).toBe(true);
      
      const loadResult = await db.loadWall(testWall.id);
      expect(loadResult.wall!.thickness).toBe(150);
    });

    it('should delete a wall successfully', async () => {
      await db.saveWall(testWall);
      
      const deleteResult = await db.deleteWall(testWall.id);
      expect(deleteResult.success).toBe(true);
      
      const loadResult = await db.loadWall(testWall.id);
      expect(loadResult.success).toBe(false);
    });

    it('should handle wall with BIM geometry', async () => {
      const wallWithBIM = createTestWall({
        id: 'test-wall-bim',
        type: 'Structural',
        thickness: 200,
        includeBIMGeometry: true
      });

      const saveResult = await db.saveWall(wallWithBIM);
      expect(saveResult.success).toBe(true);

      const loadResult = await db.loadWall(wallWithBIM.id);
      expect(loadResult.success).toBe(true);
      expect(loadResult.wall!.bimGeometry).toBeDefined();
      expect(loadResult.wall!.isBIMModeValid).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    let testWalls: UnifiedWallData[];

    beforeEach(() => {
      testWalls = [
        createTestWall({ id: 'batch-wall-1', type: 'Layout', thickness: 100 }),
        createTestWall({ id: 'batch-wall-2', type: 'Zone', thickness: 150 }),
        createTestWall({ id: 'batch-wall-3', type: 'Area', thickness: 120 })
      ];
    });

    it('should save multiple walls in batch', async () => {
      const result = await db.saveWalls(testWalls);
      
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should load multiple walls', async () => {
      await db.saveWalls(testWalls);
      
      const wallIds = testWalls.map(w => w.id);
      const result = await db.loadWalls(wallIds);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.count).toBe(3);
      
      const loadedIds = result.data.map(w => w.id).sort();
      const expectedIds = wallIds.sort();
      expect(loadedIds).toEqual(expectedIds);
    });

    it('should delete multiple walls in batch', async () => {
      await db.saveWalls(testWalls);
      
      const wallIds = testWalls.map(w => w.id);
      const result = await db.deleteWalls(wallIds);
      
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(0);
      
      // Verify walls are deleted
      const loadResult = await db.loadWalls(wallIds);
      expect(loadResult.data).toHaveLength(0);
    });

    it('should handle partial batch failures gracefully', async () => {
      // Create a wall with invalid data to cause failure
      const invalidWall = createTestWall({ id: '', type: 'Layout', thickness: -100 });
      const mixedWalls = [...testWalls, invalidWall];
      
      const result = await db.saveWalls(mixedWalls);
      
      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Transaction Management', () => {
    let testWall: UnifiedWallData;

    beforeEach(() => {
      testWall = createTestWall({
        id: 'transaction-test-wall',
        type: 'Layout',
        thickness: 100
      });
    });

    it('should create and commit transaction', async () => {
      const transaction = await db.beginTransaction();
      
      expect(transaction.id).toBeDefined();
      expect(transaction.isActive).toBe(true);
      
      await db.saveWall(testWall, transaction);
      await transaction.commit();
      
      const result = await db.loadWall(testWall.id);
      expect(result.success).toBe(true);
    });

    it('should rollback transaction', async () => {
      const transaction = await db.beginTransaction();
      
      await db.saveWall(testWall, transaction);
      await transaction.rollback();
      
      const result = await db.loadWall(testWall.id);
      expect(result.success).toBe(false);
    });
  });

  describe('Project Operations', () => {
    const projectId = 'test-project-1';
    const projectMetadata = {
      name: 'Test Project',
      description: 'A test project for unit testing',
      version: '1.0',
      settings: {
        units: 'mm',
        precision: 0.1
      }
    };

    it('should save project metadata', async () => {
      const result = await db.saveProject(projectId, projectMetadata);
      
      expect(result.success).toBe(true);
      expect(result.wallId).toBe(projectId);
    });

    it('should load project metadata', async () => {
      await db.saveProject(projectId, projectMetadata);
      
      const result = await db.loadProject(projectId);
      
      expect(result.success).toBe(true);
      expect(result.wall).toEqual(projectMetadata);
    });

    it('should delete project', async () => {
      await db.saveProject(projectId, projectMetadata);
      
      const deleteResult = await db.deleteProject(projectId);
      expect(deleteResult.success).toBe(true);
      
      const loadResult = await db.loadProject(projectId);
      expect(loadResult.success).toBe(false);
    });
  });

  describe('Quality Metrics Operations', () => {
    let testWall: UnifiedWallData;
    let testMetrics: QualityMetrics;

    beforeEach(async () => {
      testWall = createTestWall({
        id: 'quality-test-wall',
        type: 'Layout',
        thickness: 100
      });
      
      testMetrics = createTestQualityMetrics({
        geometricAccuracy: 0.95,
        sliverFaceCount: 2,
        issues: [
          {
            type: QualityIssueType.SLIVER_FACE,
            severity: 'medium',
            description: 'Small sliver face detected',
            location: { x: 100, y: 200 },
            suggestedFix: 'Apply shape healing',
            autoFixable: true
          }
        ]
      });

      await db.saveWall(testWall);
    });

    it('should save quality metrics', async () => {
      const result = await db.saveQualityMetrics(testWall.id, testMetrics);
      
      expect(result.success).toBe(true);
      expect(result.wallId).toBe(testWall.id);
    });

    it('should load quality metrics', async () => {
      await db.saveQualityMetrics(testWall.id, testMetrics);
      
      const result = await db.loadQualityMetrics(testWall.id);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].geometricAccuracy).toBe(testMetrics.geometricAccuracy);
      expect(result.data[0].sliverFaceCount).toBe(testMetrics.sliverFaceCount);
      expect(result.data[0].issues).toHaveLength(1);
    });

    it('should return empty result for non-existent metrics', async () => {
      const result = await db.loadQualityMetrics('non-existent-wall');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('Intersection Data Operations', () => {
    let testWalls: UnifiedWallData[];
    let testIntersections: IntersectionData[];

    beforeEach(async () => {
      testWalls = [
        createTestWall({ id: 'intersection-wall-1', type: 'Layout', thickness: 100 }),
        createTestWall({ id: 'intersection-wall-2', type: 'Layout', thickness: 100 })
      ];

      testIntersections = [
        createTestIntersectionData({
          id: 'intersection-1',
          type: IntersectionType.T_JUNCTION,
          participatingWalls: ['intersection-wall-1', 'intersection-wall-2'],
          intersectionPoint: { x: 500, y: 300 }
        })
      ];

      await db.saveWalls(testWalls);
    });

    it('should save intersection data', async () => {
      const result = await db.saveIntersectionData(testIntersections);
      
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should load intersection data for walls', async () => {
      await db.saveIntersectionData(testIntersections);
      
      const result = await db.loadIntersectionData(['intersection-wall-1']);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('intersection-1');
      expect(result.data[0].type).toBe(IntersectionType.T_JUNCTION);
      expect(result.data[0].participatingWalls).toContain('intersection-wall-1');
    });

    it('should handle multiple intersections', async () => {
      const additionalIntersection = createTestIntersectionData({
        id: 'intersection-2',
        type: IntersectionType.L_JUNCTION,
        participatingWalls: ['intersection-wall-1', 'intersection-wall-2'],
        intersectionPoint: { x: 600, y: 400 }
      });

      const allIntersections = [...testIntersections, additionalIntersection];
      
      const saveResult = await db.saveIntersectionData(allIntersections);
      expect(saveResult.success).toBe(true);
      expect(saveResult.processedCount).toBe(2);

      const loadResult = await db.loadIntersectionData(['intersection-wall-1', 'intersection-wall-2']);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toHaveLength(2);
    });
  });

  describe('Spatial Queries', () => {
    let spatialWalls: UnifiedWallData[];

    beforeEach(async () => {
      spatialWalls = [
        createTestWall({
          id: 'spatial-wall-1',
          type: 'Layout',
          thickness: 100,
          baselinePoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }]
        }),
        createTestWall({
          id: 'spatial-wall-2',
          type: 'Layout',
          thickness: 100,
          baselinePoints: [{ x: 200, y: 200 }, { x: 300, y: 200 }]
        }),
        createTestWall({
          id: 'spatial-wall-3',
          type: 'Layout',
          thickness: 100,
          baselinePoints: [{ x: 50, y: 50 }, { x: 150, y: 50 }]
        })
      ];

      await db.saveWalls(spatialWalls);
    });

    it('should find walls within bounds', async () => {
      const bounds = {
        minX: -10,
        minY: -10,
        maxX: 110,
        maxY: 110
      };

      const result = await db.findWallsInBounds(bounds);
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      
      // Should include spatial-wall-1 and spatial-wall-3
      const foundIds = result.data.map(w => w.id);
      expect(foundIds).toContain('spatial-wall-1');
      expect(foundIds).toContain('spatial-wall-3');
      expect(foundIds).not.toContain('spatial-wall-2'); // Outside bounds
    });

    it('should find nearby walls', async () => {
      const result = await db.findNearbyWalls(75, 25, 100);
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      
      // Should find walls within radius
      const foundIds = result.data.map(w => w.id);
      expect(foundIds).toContain('spatial-wall-1');
      expect(foundIds).toContain('spatial-wall-3');
    });

    it('should return empty result for bounds with no walls', async () => {
      const bounds = {
        minX: 1000,
        minY: 1000,
        maxX: 1100,
        maxY: 1100
      };

      const result = await db.findWallsInBounds(bounds);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('Performance and Maintenance', () => {
    it('should perform vacuum operation', async () => {
      await expect(db.vacuum()).resolves.not.toThrow();
    });

    it('should perform analyze operation', async () => {
      await expect(db.analyze()).resolves.not.toThrow();
    });

    it('should provide database statistics after operations', async () => {
      // Add some test data
      const testWalls = [
        createTestWall({ id: 'stats-wall-1', type: 'Layout', thickness: 100 }),
        createTestWall({ id: 'stats-wall-2', type: 'Zone', thickness: 150 })
      ];
      
      await db.saveWalls(testWalls);
      
      const stats = await db.getStatistics();
      
      expect(stats.walls_count).toBe(2);
      expect(stats.database_size_bytes).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      await db.disconnect();
      
      const testWall = createTestWall({
        id: 'error-test-wall',
        type: 'Layout',
        thickness: 100
      });

      await expect(db.saveWall(testWall)).rejects.toThrow('Database not connected');
    });

    it('should handle invalid wall data', async () => {
      const invalidWall = createTestWall({
        id: '', // Invalid empty ID
        type: 'Layout',
        thickness: 100
      });

      const result = await db.saveWall(invalidWall);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const wallWithInvalidData = createTestWall({
        id: '', // Invalid empty ID will cause validation to fail
        type: 'Layout',
        thickness: 100
      });

      const result = await db.saveWall(wallWithInvalidData);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});