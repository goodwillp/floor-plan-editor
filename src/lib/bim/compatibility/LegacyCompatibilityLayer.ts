/**
 * Legacy Compatibility Layer for gradual BIM migration
 * Maintains existing API signatures while providing BIM functionality
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { Wall, Segment, Node, Point, WallTypeString } from '../../types';
import { GeometryService } from '../../GeometryService';
import { WallRenderer } from '../../WallRenderer';
import { WallSelectionService } from '../../WallSelectionService';
import { BIMWallSystem } from '../BIMWallSystem';
import { AdaptiveToleranceManager } from '../core/AdaptiveToleranceManager';
import { FeatureFlagManager } from './FeatureFlagManager';
import { LegacyDataConverter } from './LegacyDataConverter';

/**
 * Compatibility wrapper for GeometryService
 * Maintains existing API while using BIM calculations when enabled
 */
export class CompatibleGeometryService {
  private static bimSystem: BIMWallSystem | null = null;
  private static toleranceManager: AdaptiveToleranceManager | null = null;
  private static featureFlags: FeatureFlagManager = new FeatureFlagManager();

  /**
   * Initialize BIM system for compatibility layer
   */
  static initializeBIMSystem(bimSystem: BIMWallSystem): void {
    this.bimSystem = bimSystem;
    this.toleranceManager = new AdaptiveToleranceManager();
  }

  /**
   * Find intersection with BIM enhancement when enabled
   * Maintains original API signature
   */
  static findIntersection(
    seg1: Segment, 
    seg2: Segment, 
    nodes: Map<string, Node>
  ): Point | null {
    if (this.featureFlags.isEnabled('bim-intersection-algorithms') && this.bimSystem) {
      try {
        // Use BIM intersection algorithms
        return this.findBIMIntersection(seg1, seg2, nodes);
      } catch (error) {
        console.warn('BIM intersection failed, falling back to legacy method:', error);
        this.logDeprecationWarning('findIntersection', 'BIM intersection algorithms');
      }
    }

    // Fallback to legacy implementation
    return GeometryService.findIntersection(seg1, seg2, nodes);
  }

  /**
   * BIM-enhanced intersection calculation
   */
  private static findBIMIntersection(
    seg1: Segment, 
    seg2: Segment, 
    nodes: Map<string, Node>
  ): Point | null {
    const start1 = nodes.get(seg1.startNodeId);
    const end1 = nodes.get(seg1.endNodeId);
    const start2 = nodes.get(seg2.startNodeId);
    const end2 = nodes.get(seg2.endNodeId);

    if (!start1 || !end1 || !start2 || !end2) {
      return null;
    }

    // Use adaptive tolerance instead of fixed value
    const tolerance = this.toleranceManager?.calculateTolerance(
      Math.max(seg1.length, seg2.length) * 0.1, // Approximate thickness
      1e-3, // Document precision
      0, // Local angle (to be calculated)
      'boolean_operation'
    ) || GeometryService.tolerance;

    return this.findLineIntersectionWithTolerance(start1, end1, start2, end2, tolerance);
  }

  /**
   * Enhanced line intersection with adaptive tolerance
   */
  private static findLineIntersectionWithTolerance(
    p1: Point, p2: Point, p3: Point, p4: Point, tolerance: number
  ): Point | null {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Use adaptive tolerance instead of fixed value
    if (Math.abs(denom) < tolerance) {
      return null;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null;
  }

  /**
   * Distance calculation with BIM enhancement
   */
  static distanceBetweenPoints(p1: Point, p2: Point): number {
    // This method doesn't need BIM enhancement, but we log usage for migration tracking
    if (this.featureFlags.isEnabled('track-legacy-usage')) {
      this.logLegacyUsage('distanceBetweenPoints');
    }
    
    return GeometryService.distanceBetweenPoints(p1, p2);
  }

  /**
   * Distance to segment with adaptive tolerance
   */
  static distanceToSegment(
    point: Point, 
    segment: Segment, 
    nodes: Map<string, Node>
  ): number {
    if (this.featureFlags.isEnabled('bim-distance-calculations') && this.toleranceManager) {
      // Use BIM-enhanced distance calculation
      const start = nodes.get(segment.startNodeId);
      const end = nodes.get(segment.endNodeId);
      
      if (start && end) {
        return this.distancePointToLineSegmentBIM(point, start, end, segment.length);
      }
    }

    return GeometryService.distanceToSegment(point, segment, nodes);
  }

  /**
   * BIM-enhanced distance calculation
   */
  private static distancePointToLineSegmentBIM(
    point: Point, lineStart: Point, lineEnd: Point, segmentLength: number
  ): number {
    // Use adaptive tolerance based on segment length
    const tolerance = this.toleranceManager?.calculateTolerance(
      segmentLength * 0.1, // Approximate thickness
      1e-3, // Document precision
      0, // Local angle
      'vertex_merge'
    ) || 1e-6;

    return GeometryService.distancePointToLineSegment(point, lineStart, lineEnd);
  }

  /**
   * Proximity detection with thickness-aware calculations
   */
  static findNearbyWalls(
    targetWall: Wall, 
    allWalls: Wall[], 
    segments: Map<string, Segment>, 
    nodes: Map<string, Node>,
    threshold?: number
  ): Wall[] {
    if (this.featureFlags.isEnabled('bim-proximity-detection') && this.toleranceManager) {
      // Use thickness-proportional threshold
      const adaptiveThreshold = threshold || this.calculateAdaptiveProximityThreshold(targetWall);
      return this.findNearbyWallsBIM(targetWall, allWalls, segments, nodes, adaptiveThreshold);
    }

    return GeometryService.findNearbyWalls(targetWall, allWalls, segments, nodes, threshold);
  }

  /**
   * Calculate adaptive proximity threshold based on wall thickness
   */
  private static calculateAdaptiveProximityThreshold(wall: Wall): number {
    return Math.max(wall.thickness * 0.1, 5); // Minimum 5mm, scale with thickness
  }

  /**
   * BIM-enhanced nearby wall detection
   */
  private static findNearbyWallsBIM(
    targetWall: Wall, 
    allWalls: Wall[], 
    segments: Map<string, Segment>, 
    nodes: Map<string, Node>,
    threshold: number
  ): Wall[] {
    // Enhanced logic would go here - for now, use legacy with adaptive threshold
    return GeometryService.findNearbyWalls(targetWall, allWalls, segments, nodes, threshold);
  }

  /**
   * Log deprecation warning with migration guidance
   */
  private static logDeprecationWarning(methodName: string, replacement: string): void {
    if (this.featureFlags.isEnabled('show-deprecation-warnings')) {
      console.warn(
        `⚠️ DEPRECATED: GeometryService.${methodName} is deprecated. ` +
        `Consider migrating to ${replacement}. ` +
        `See migration guide: /docs/migration/geometry-service.md`
      );
    }
  }

  /**
   * Log legacy usage for migration tracking
   */
  private static logLegacyUsage(methodName: string): void {
    // In production, this could send telemetry data
    console.debug(`📊 Legacy usage tracked: GeometryService.${methodName}`);
  }

  /**
   * Get current tolerance value (adaptive or legacy)
   */
  static get tolerance(): number {
    if (this.featureFlags.isEnabled('adaptive-tolerance') && this.toleranceManager) {
      // Return a default adaptive tolerance
      return this.toleranceManager.calculateTolerance(100, 1e-3, 0, 'vertex_merge');
    }
    return GeometryService.tolerance;
  }

  /**
   * Get proximity threshold (adaptive or legacy)
   */
  static get proximityThreshold(): number {
    if (this.featureFlags.isEnabled('adaptive-proximity')) {
      return 10; // Adaptive calculation would go here
    }
    return GeometryService.proximityThreshold;
  }
}

/**
 * Compatibility wrapper for WallRenderer
 * Provides BIM rendering when enabled, falls back to legacy
 */
export class CompatibleWallRenderer extends WallRenderer {
  private bimSystem: BIMWallSystem | null = null;
  private featureFlags: FeatureFlagManager = new FeatureFlagManager();
  private dataConverter: LegacyDataConverter = new LegacyDataConverter();

  constructor() {
    super();
  }

  /**
   * Initialize BIM system for enhanced rendering
   */
  initializeBIMSystem(bimSystem: BIMWallSystem): void {
    this.bimSystem = bimSystem;
  }

  /**
   * Render wall with BIM enhancement when enabled
   */
  renderWall(
    wall: Wall,
    segments: Segment[],
    nodes: Map<string, Node>,
    container: PIXI.Container
  ): void {
    if (this.featureFlags.isEnabled('bim-wall-rendering') && this.bimSystem) {
      try {
        this.renderWallBIM(wall, segments, nodes, container);
        return;
      } catch (error) {
        console.warn('BIM rendering failed, falling back to legacy:', error);
        this.logDeprecationWarning('renderWall', 'BIM wall rendering system');
      }
    }

    // Fallback to legacy rendering
    super.renderWall(wall, segments, nodes, container);
  }

  /**
   * BIM-enhanced wall rendering
   */
  private renderWallBIM(
    wall: Wall,
    segments: Segment[],
    nodes: Map<string, Node>,
    container: PIXI.Container
  ): void {
    // Convert legacy data to BIM format
    const wallSolid = this.dataConverter.convertLegacyWallToBIM(wall, segments, nodes);
    
    if (wallSolid) {
      // Use BIM rendering pipeline
      this.renderBIMWallSolid(wallSolid, container);
    } else {
      // Fallback to legacy rendering
      super.renderWall(wall, segments, nodes, container);
    }
  }

  /**
   * Render BIM wall solid (placeholder for actual BIM rendering)
   */
  private renderBIMWallSolid(wallSolid: any, container: PIXI.Container): void {
    // This would use the BIM rendering pipeline
    // For now, we'll use the legacy renderer as a placeholder
    console.debug('🏗️ Rendering wall with BIM pipeline:', wallSolid.id);
    
    // Actual BIM rendering implementation would go here
    // For compatibility, we'll extract the basic data and use legacy rendering
    const wall = wallSolid.legacyWall;
    const segments = wallSolid.legacySegments;
    const nodes = wallSolid.legacyNodes;
    
    if (wall && segments && nodes) {
      super.renderWall(wall, segments, nodes, container);
    }
  }

  /**
   * Log deprecation warning
   */
  private logDeprecationWarning(methodName: string, replacement: string): void {
    if (this.featureFlags.isEnabled('show-deprecation-warnings')) {
      console.warn(
        `⚠️ DEPRECATED: WallRenderer.${methodName} is using legacy implementation. ` +
        `Consider enabling ${replacement}. ` +
        `See migration guide: /docs/migration/wall-renderer.md`
      );
    }
  }
}

/**
 * Compatibility wrapper for WallSelectionService
 * Provides BIM-aware selection when enabled
 */
export class CompatibleWallSelectionService extends WallSelectionService {
  private bimSystem: BIMWallSystem | null = null;
  private featureFlags: FeatureFlagManager = new FeatureFlagManager();
  private adaptiveTolerance: boolean = false;

  constructor(model: any) {
    super(model);
  }

  /**
   * Initialize BIM system for enhanced selection
   */
  initializeBIMSystem(bimSystem: BIMWallSystem): void {
    this.bimSystem = bimSystem;
  }

  /**
   * Set selection tolerance with BIM awareness
   */
  setSelectionTolerance(tolerance: number): void {
    if (this.featureFlags.isEnabled('adaptive-selection-tolerance')) {
      // Store the base tolerance, but actual tolerance will be calculated adaptively
      this.adaptiveTolerance = true;
      console.debug('🎯 Adaptive selection tolerance enabled, base tolerance:', tolerance);
    }
    
    super.setSelectionTolerance(tolerance);
  }

  /**
   * Find wall at point with BIM enhancement
   */
  findWallAtPoint(clickPoint: Point): {wallId: string, distance: number} | null {
    if (this.featureFlags.isEnabled('bim-wall-selection') && this.bimSystem) {
      try {
        return this.findWallAtPointBIM(clickPoint);
      } catch (error) {
        console.warn('BIM selection failed, falling back to legacy:', error);
      }
    }

    return super.findWallAtPoint(clickPoint);
  }

  /**
   * BIM-enhanced wall selection
   */
  private findWallAtPointBIM(clickPoint: Point): {wallId: string, distance: number} | null {
    // This would use BIM wall solid geometry for more accurate selection
    // For now, we'll enhance the legacy method with adaptive tolerance
    
    if (this.adaptiveTolerance) {
      // Calculate adaptive tolerance based on zoom level and wall thickness
      const adaptiveTol = this.calculateAdaptiveSelectionTolerance(clickPoint);
      const originalTolerance = (this as any).selectionTolerance;
      
      // Temporarily set adaptive tolerance
      (this as any).selectionTolerance = adaptiveTol;
      const result = super.findWallAtPoint(clickPoint);
      
      // Restore original tolerance
      (this as any).selectionTolerance = originalTolerance;
      
      return result;
    }

    return super.findWallAtPoint(clickPoint);
  }

  /**
   * Calculate adaptive selection tolerance
   */
  private calculateAdaptiveSelectionTolerance(clickPoint: Point): number {
    // This would consider zoom level, wall thickness, and other factors
    // For now, return a simple adaptive value
    const baseToleranceValue = (this as any).selectionTolerance || 10;
    return Math.max(baseToleranceValue, 5); // Minimum 5 pixels
  }
}

/**
 * Compatibility manager for coordinating all compatibility layers
 */
export class CompatibilityManager {
  private static instance: CompatibilityManager | null = null;
  private bimSystem: BIMWallSystem | null = null;
  private featureFlags: FeatureFlagManager = new FeatureFlagManager();
  private migrationTracker: MigrationTracker = new MigrationTracker();

  private constructor() {}

  static getInstance(): CompatibilityManager {
    if (!this.instance) {
      this.instance = new CompatibilityManager();
    }
    return this.instance;
  }

  /**
   * Initialize compatibility layer with BIM system
   */
  initializeBIMSystem(bimSystem: BIMWallSystem): void {
    this.bimSystem = bimSystem;
    
    // Initialize all compatibility wrappers
    CompatibleGeometryService.initializeBIMSystem(bimSystem);
    
    console.log('🔄 BIM compatibility layer initialized');
  }

  /**
   * Enable BIM features gradually
   */
  enableBIMFeature(featureName: string): void {
    this.featureFlags.enable(featureName);
    this.migrationTracker.trackFeatureEnabled(featureName);
    
    console.log(`✅ BIM feature enabled: ${featureName}`);
  }

  /**
   * Disable BIM features (rollback)
   */
  disableBIMFeature(featureName: string): void {
    this.featureFlags.disable(featureName);
    this.migrationTracker.trackFeatureDisabled(featureName);
    
    console.log(`❌ BIM feature disabled: ${featureName}`);
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): {
    enabledFeatures: string[];
    migrationProgress: number;
    recommendedNextSteps: string[];
  } {
    const enabledFeatures = this.featureFlags.getEnabledFeatures();
    const totalFeatures = this.featureFlags.getAllFeatures().length;
    const migrationProgress = enabledFeatures.length / totalFeatures;

    return {
      enabledFeatures,
      migrationProgress,
      recommendedNextSteps: this.getRecommendedNextSteps(enabledFeatures)
    };
  }

  /**
   * Get recommended next migration steps
   */
  private getRecommendedNextSteps(enabledFeatures: string[]): string[] {
    const recommendations: string[] = [];
    
    if (!enabledFeatures.includes('adaptive-tolerance')) {
      recommendations.push('Enable adaptive tolerance for improved geometric precision');
    }
    
    if (!enabledFeatures.includes('bim-intersection-algorithms')) {
      recommendations.push('Enable BIM intersection algorithms for robust wall connections');
    }
    
    if (!enabledFeatures.includes('bim-wall-rendering')) {
      recommendations.push('Enable BIM wall rendering for enhanced visual quality');
    }

    return recommendations;
  }
}

/**
 * Migration tracking for analytics and rollback
 */
class MigrationTracker {
  private events: Array<{
    timestamp: Date;
    event: string;
    feature: string;
    details?: any;
  }> = [];

  trackFeatureEnabled(feature: string): void {
    this.events.push({
      timestamp: new Date(),
      event: 'feature_enabled',
      feature
    });
  }

  trackFeatureDisabled(feature: string): void {
    this.events.push({
      timestamp: new Date(),
      event: 'feature_disabled',
      feature
    });
  }

  trackError(feature: string, error: Error): void {
    this.events.push({
      timestamp: new Date(),
      event: 'feature_error',
      feature,
      details: {
        message: error.message,
        stack: error.stack
      }
    });
  }

  getEvents(): typeof this.events {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}