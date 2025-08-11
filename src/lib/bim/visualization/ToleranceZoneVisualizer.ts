/**
 * Tolerance Zone Visualizer
 * Visualizes tolerance boundaries and zones for BIM operations
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { WallSolid } from '../geometry/WallSolid';
import type { IntersectionData } from '../geometry/IntersectionData';
import type { ToleranceZoneData, PixiGraphicsData } from '../types/VisualizationTypes';
import type { ToleranceContext } from '../types/BIMTypes';
import { AdaptiveToleranceManager } from '../engines/AdaptiveToleranceManager';

/**
 * Visualizer for tolerance zones and boundaries
 */
export class ToleranceZoneVisualizer {
  private toleranceManager: AdaptiveToleranceManager;
  private documentPrecision: number;
  private showActiveZones: boolean;
  private showInactiveZones: boolean;
  private zoneOpacity: number;

  constructor(
    toleranceManager: AdaptiveToleranceManager,
    documentPrecision: number = 0.1
  ) {
    this.toleranceManager = toleranceManager;
    this.documentPrecision = documentPrecision;
    this.showActiveZones = true;
    this.showInactiveZones = false;
    this.zoneOpacity = 0.3;
  }

  /**
   * Generate tolerance zone data for walls
   */
  generateToleranceZones(
    walls: WallSolid[],
    intersections: IntersectionData[]
  ): ToleranceZoneData[] {
    const zones: ToleranceZoneData[] = [];

    // Generate zones for wall vertices
    walls.forEach(wall => {
      zones.push(...this.generateWallVertexZones(wall));
      zones.push(...this.generateOffsetToleranceZones(wall));
    });

    // Generate zones for intersections
    intersections.forEach(intersection => {
      zones.push(...this.generateIntersectionZones(intersection));
    });

    return zones;
  }

  /**
   * Generate tolerance zones for wall vertices
   */
  private generateWallVertexZones(wall: WallSolid): ToleranceZoneData[] {
    const zones: ToleranceZoneData[] = [];

    wall.baseline.points.forEach((point, index) => {
      const tolerance = this.toleranceManager.getVertexMergeTolerance(
        wall.thickness,
        this.calculateLocalAngle(wall.baseline.points, index)
      );

      zones.push({
        centerPoint: { x: point.x, y: point.y },
        radius: tolerance,
        toleranceValue: tolerance,
        context: `Vertex merge tolerance for wall ${wall.id}`,
        isActive: true,
        color: this.getToleranceColor(tolerance, wall.thickness)
      });
    });

    return zones;
  }

  /**
   * Generate tolerance zones for offset operations
   */
  private generateOffsetToleranceZones(wall: WallSolid): ToleranceZoneData[] {
    const zones: ToleranceZoneData[] = [];

    // Generate zones along offset curves
    const samplePoints = this.sampleCurvePoints(wall.leftOffset, 5);
    samplePoints.forEach((point, index) => {
      const curvature = this.calculateLocalCurvature(wall.leftOffset, index);
      const tolerance = this.toleranceManager.getOffsetTolerance(wall.thickness, curvature);

      zones.push({
        centerPoint: { x: point.x, y: point.y },
        radius: tolerance,
        toleranceValue: tolerance,
        context: `Offset tolerance for wall ${wall.id}`,
        isActive: false,
        color: this.getToleranceColor(tolerance, wall.thickness, 0.5)
      });
    });

    return zones;
  }

  /**
   * Generate tolerance zones for intersections
   */
  private generateIntersectionZones(intersection: IntersectionData): ToleranceZoneData[] {
    const zones: ToleranceZoneData[] = [];

    // Main intersection tolerance zone
    const intersectionTolerance = this.calculateIntersectionTolerance(intersection);
    zones.push({
      centerPoint: { x: intersection.intersectionPoint.x, y: intersection.intersectionPoint.y },
      radius: intersectionTolerance,
      toleranceValue: intersectionTolerance,
      context: `Intersection tolerance for ${intersection.type}`,
      isActive: true,
      color: this.getIntersectionToleranceColor(intersection.type)
    });

    // Miter apex tolerance zone
    if (intersection.miterApex) {
      const miterTolerance = intersectionTolerance * 0.5; // Smaller tolerance for apex
      zones.push({
        centerPoint: { x: intersection.miterApex.x, y: intersection.miterApex.y },
        radius: miterTolerance,
        toleranceValue: miterTolerance,
        context: `Miter apex tolerance for ${intersection.type}`,
        isActive: true,
        color: this.getIntersectionToleranceColor(intersection.type, 0.7)
      });
    }

    // Offset intersection tolerance zones
    intersection.offsetIntersections.forEach((offsetPoint, index) => {
      const offsetTolerance = intersectionTolerance * 0.3;
      zones.push({
        centerPoint: { x: offsetPoint.x, y: offsetPoint.y },
        radius: offsetTolerance,
        toleranceValue: offsetTolerance,
        context: `Offset intersection tolerance ${index + 1}`,
        isActive: false,
        color: this.getIntersectionToleranceColor(intersection.type, 0.4)
      });
    });

    return zones;
  }

  /**
   * Convert tolerance zones to PixiJS graphics data
   */
  convertToGraphicsData(zones: ToleranceZoneData[]): PixiGraphicsData[] {
    const graphics: PixiGraphicsData[] = [];

    zones.forEach((zone, index) => {
      if (!this.shouldShowZone(zone)) return;

      // Main tolerance circle
      graphics.push({
        type: 'circle',
        points: [{ x: zone.centerPoint.x, y: zone.centerPoint.y }],
        style: {
          lineWidth: zone.isActive ? 2 : 1,
          color: zone.color,
          alpha: zone.isActive ? this.zoneOpacity * 1.5 : this.zoneOpacity,
          fillColor: zone.color,
          fillAlpha: zone.isActive ? this.zoneOpacity * 0.3 : this.zoneOpacity * 0.1,
          dashPattern: zone.isActive ? undefined : [3, 3]
        },
        zIndex: zone.isActive ? 3 : 2,
        interactive: true,
        id: `tolerance-zone-${index}`
      });

      // Center point indicator
      graphics.push({
        type: 'circle',
        points: [{ x: zone.centerPoint.x, y: zone.centerPoint.y }],
        style: {
          lineWidth: 1,
          color: zone.color,
          alpha: 0.8,
          fillColor: zone.color,
          fillAlpha: 0.8
        },
        zIndex: 4,
        interactive: false,
        id: `tolerance-center-${index}`
      });

      // Boundary indicators (small marks at cardinal directions)
      const boundaryPoints = this.generateBoundaryIndicators(zone);
      boundaryPoints.forEach((point, pointIndex) => {
        graphics.push({
          type: 'circle',
          points: [point],
          style: {
            lineWidth: 1,
            color: zone.color,
            alpha: 0.6,
            fillColor: zone.color,
            fillAlpha: 0.6
          },
          zIndex: 3,
          interactive: false,
          id: `tolerance-boundary-${index}-${pointIndex}`
        });
      });
    });

    return graphics;
  }

  /**
   * Generate boundary indicator points
   */
  private generateBoundaryIndicators(zone: ToleranceZoneData): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]; // Cardinal directions

    angles.forEach(angle => {
      points.push({
        x: zone.centerPoint.x + Math.cos(angle) * zone.radius,
        y: zone.centerPoint.y + Math.sin(angle) * zone.radius
      });
    });

    return points;
  }

  /**
   * Calculate intersection tolerance based on type and geometry
   */
  private calculateIntersectionTolerance(intersection: IntersectionData): number {
    // Base tolerance from document precision
    let baseTolerance = this.documentPrecision;

    // Adjust based on intersection type
    switch (intersection.type) {
      case 't_junction':
        baseTolerance *= 1.5;
        break;
      case 'l_junction':
        baseTolerance *= 1.2;
        break;
      case 'cross_junction':
        baseTolerance *= 2.0;
        break;
      case 'parallel_overlap':
        baseTolerance *= 0.8;
        break;
    }

    return baseTolerance;
  }

  /**
   * Get color for tolerance zone based on value and context
   */
  private getToleranceColor(tolerance: number, wallThickness: number, alpha: number = 1.0): string {
    const ratio = tolerance / (wallThickness * 0.1); // Normalize to expected range
    
    if (ratio < 0.5) return this.adjustColorAlpha('#10b981', alpha); // Green - tight tolerance
    if (ratio < 1.0) return this.adjustColorAlpha('#f59e0b', alpha); // Yellow - moderate tolerance
    if (ratio < 2.0) return this.adjustColorAlpha('#f97316', alpha); // Orange - loose tolerance
    return this.adjustColorAlpha('#ef4444', alpha); // Red - very loose tolerance
  }

  /**
   * Get color for intersection tolerance zones
   */
  private getIntersectionToleranceColor(type: string, alpha: number = 1.0): string {
    switch (type) {
      case 't_junction':
        return this.adjustColorAlpha('#3b82f6', alpha); // Blue
      case 'l_junction':
        return this.adjustColorAlpha('#8b5cf6', alpha); // Purple
      case 'cross_junction':
        return this.adjustColorAlpha('#ef4444', alpha); // Red
      case 'parallel_overlap':
        return this.adjustColorAlpha('#06b6d4', alpha); // Cyan
      default:
        return this.adjustColorAlpha('#6b7280', alpha); // Gray
    }
  }

  /**
   * Adjust color alpha (simplified implementation)
   */
  private adjustColorAlpha(color: string, alpha: number): string {
    // This is a simplified implementation
    // In a real scenario, you'd properly parse and adjust the alpha channel
    return color;
  }

  /**
   * Calculate local angle at a point in a curve
   */
  private calculateLocalAngle(points: { x: number; y: number }[], index: number): number {
    if (index === 0 || index === points.length - 1) return 0;

    const prev = points[index - 1];
    const curr = points[index];
    const next = points[index + 1];

    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);

    return Math.abs(angle2 - angle1);
  }

  /**
   * Calculate local curvature at a point
   */
  private calculateLocalCurvature(curve: any, index: number): number {
    // Simplified curvature calculation
    if (!curve.curvature || index >= curve.curvature.length) {
      return 0;
    }
    return curve.curvature[index] || 0;
  }

  /**
   * Sample points along a curve
   */
  private sampleCurvePoints(curve: any, sampleCount: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const step = Math.max(1, Math.floor(curve.points.length / sampleCount));

    for (let i = 0; i < curve.points.length; i += step) {
      points.push(curve.points[i]);
    }

    return points;
  }

  /**
   * Check if zone should be shown based on current settings
   */
  private shouldShowZone(zone: ToleranceZoneData): boolean {
    if (zone.isActive && this.showActiveZones) return true;
    if (!zone.isActive && this.showInactiveZones) return true;
    return false;
  }

  /**
   * Update visualization settings
   */
  updateSettings(settings: {
    showActiveZones?: boolean;
    showInactiveZones?: boolean;
    zoneOpacity?: number;
  }): void {
    if (settings.showActiveZones !== undefined) {
      this.showActiveZones = settings.showActiveZones;
    }
    if (settings.showInactiveZones !== undefined) {
      this.showInactiveZones = settings.showInactiveZones;
    }
    if (settings.zoneOpacity !== undefined) {
      this.zoneOpacity = Math.max(0.1, Math.min(1.0, settings.zoneOpacity));
    }
  }

  /**
   * Get tolerance statistics for display
   */
  getToleranceStatistics(zones: ToleranceZoneData[]): {
    totalZones: number;
    activeZones: number;
    averageTolerance: number;
    minTolerance: number;
    maxTolerance: number;
    toleranceRange: string;
  } {
    const activeZones = zones.filter(z => z.isActive);
    const tolerances = zones.map(z => z.toleranceValue);

    return {
      totalZones: zones.length,
      activeZones: activeZones.length,
      averageTolerance: tolerances.reduce((a, b) => a + b, 0) / tolerances.length,
      minTolerance: Math.min(...tolerances),
      maxTolerance: Math.max(...tolerances),
      toleranceRange: `${Math.min(...tolerances).toFixed(3)} - ${Math.max(...tolerances).toFixed(3)}`
    };
  }
}