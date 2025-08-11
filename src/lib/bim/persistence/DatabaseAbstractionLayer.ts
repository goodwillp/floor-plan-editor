/**
 * Database Abstraction Layer Interface
 * 
 * Provides a unified interface for database operations that can be implemented
 * by different database backends (SQLite, PostgreSQL, etc.)
 */

import { UnifiedWallData } from '../types/UnifiedWallData';
import { QualityMetrics } from '../types/QualityMetrics';
import { IntersectionData } from '../geometry/IntersectionData';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql';
  path?: string; // For SQLite
  host?: string; // For PostgreSQL
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  options?: Record<string, any>;
}

export interface DatabaseConnection {
  isConnected: boolean;
  config: DatabaseConfig;
  close(): Promise<void>;
}

export interface SaveResult {
  success: boolean;
  wallId: string;
  version: number;
  timestamp: Date;
  error?: string;
}

export interface LoadResult {
  success: boolean;
  wall?: UnifiedWallData;
  version?: number;
  timestamp?: Date;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  wallId: string;
  error?: string;
}

export interface BatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
  processingTime: number;
}

export interface QueryResult<T> {
  success: boolean;
  data: T[];
  count: number;
  error?: string;
}

export interface TransactionContext {
  id: string;
  isActive: boolean;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Main database abstraction interface
 */
export interface DatabaseAbstractionLayer {
  // Connection management
  connect(config: DatabaseConfig): Promise<DatabaseConnection>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Transaction management
  beginTransaction(): Promise<TransactionContext>;
  
  // Wall CRUD operations
  saveWall(wall: UnifiedWallData, transaction?: TransactionContext): Promise<SaveResult>;
  loadWall(wallId: string): Promise<LoadResult>;
  updateWall(wall: UnifiedWallData, transaction?: TransactionContext): Promise<SaveResult>;
  deleteWall(wallId: string, transaction?: TransactionContext): Promise<DeleteResult>;
  
  // Batch operations
  saveWalls(walls: UnifiedWallData[], transaction?: TransactionContext): Promise<BatchResult>;
  loadWalls(wallIds: string[]): Promise<QueryResult<UnifiedWallData>>;
  deleteWalls(wallIds: string[], transaction?: TransactionContext): Promise<BatchResult>;
  
  // Project operations
  saveProject(projectId: string, metadata: Record<string, any>): Promise<SaveResult>;
  loadProject(projectId: string): Promise<LoadResult>;
  deleteProject(projectId: string): Promise<DeleteResult>;
  
  // Quality metrics operations
  saveQualityMetrics(wallId: string, metrics: QualityMetrics): Promise<SaveResult>;
  loadQualityMetrics(wallId: string): Promise<QueryResult<QualityMetrics>>;
  
  // Intersection data operations
  saveIntersectionData(intersectionData: IntersectionData[]): Promise<BatchResult>;
  loadIntersectionData(wallIds: string[]): Promise<QueryResult<IntersectionData>>;
  
  // Spatial queries (requires spatial indexing)
  findWallsInBounds(bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }): Promise<QueryResult<UnifiedWallData>>;
  
  findNearbyWalls(
    centerX: number,
    centerY: number,
    radius: number
  ): Promise<QueryResult<UnifiedWallData>>;
  
  // Schema management
  initializeSchema(): Promise<void>;
  migrateSchema(targetVersion: number): Promise<void>;
  getSchemaVersion(): Promise<number>;
  
  // Performance and maintenance
  vacuum(): Promise<void>;
  analyze(): Promise<void>;
  getStatistics(): Promise<Record<string, any>>;
}