/**
 * BIM Visualization Engine
 * Handles advanced visualization modes for BIM geometric data
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { WallSolid } from '../geometry/WallSolid';
import type { IntersectionData } from '../geometry/IntersectionData';
import type { QualityMetrics } from '../types/QualityMetrics';
import type {
  BIMVisualizationModes,
  VisualizationConfig,
  VisualizationRenderData,
  OffsetCurveVisualization,
  IntersectionVisualization,
  QualityHeatmapData,
  ToleranceZoneData,
  BooleanPreviewData,
  HealingOverlayData,
  PixiGraphicsData,
  PixiLabelData,
  ColorScheme,
  QualityColorMapping
} from '../types/VisualizationTypes';
import { BIMVisualizationModes as VisualizationModes, DEFAULT_COLOR_SCHEMES, QUALITY_COLOR_MAPPING } from '../types/VisualizationTypes';

/**
 * Main BIM visualization engine for rendering geometric data
 */
export class BIMVisualizationEngine {
  private config: VisualizationConfig;
  private colorScheme: ColorScheme;
  private qualityColorMapping: QualityColorMapping;

  constructor(config?: Partial<VisualizationConfig>) {
    this.config = {
      mode: VisualizationModes.STANDARD,
      opacity: 1.0,
      showLabels: true,
      colorScheme: DEFAULT_COLOR_SCHEMES[VisualizationModes.STANDARD],
      lineWidth: 2,
      showGrid: false,
      animationEnabled: true,
      ...config
    };
    
    this.colorScheme = this.config.colorScheme;
    this.qualityColorMapping = QUALITY_COLOR_MAPPING;
  }

  /**
   * Set visualization mode and update configuration
   */
  setVisualizationMode(mode: BIMVisualizationModes): void {
    this.config.mode = mode;
    this.colorScheme = DEFAULT_COLOR_SCHEMES[mode];
    this.config.colorScheme = this.colorScheme;
  }

  /**
   * Update visualization configuration
   */
  updateConfig(config: Partial<VisualizationConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.colorScheme) {
      this.colorScheme = config.colorScheme;
    }
  }

  /**
   * Generate visualization data for walls based on current mode
   */
  generateVisualizationData(
    walls: WallSolid[],
    intersections: IntersectionData[],
    qualityMetrics: Map<string, QualityMetrics>
  ): VisualizationRenderData {
    switch (this.config.mode) {
      case VisualizationModes.STANDARD:
        return this.generateStandardVisualization(walls);
      
      case VisualizationModes.OFFSET_CURVES:
        return this.generateOffsetCurveVisualization(walls);
      
      case VisualizationModes.INTERSECTION_DATA:
        return this.generateIntersectionVisualization(walls, intersections);
      
      case VisualizationModes.QUALITY_HEATMAP:
        return this.generateQualityHeatmapVisualization(walls, qualityMetrics);
      
      case VisualizationModes.TOLERANCE_ZONES:
        return this.generateToleranceZoneVisualization(walls);
      
      case VisualizationModes.BOOLEAN_PREVIEW:
        return this.generateBooleanPreviewVisualization(walls);
      
      case VisualizationModes.HEALING_OVERLAY:
        return this.generateHealingOverlayVisualization(walls);
      
      default:
        return this.generateStandardVisualization(walls);
    }
  }

  /**
   * Generate standard wall visualization
   */
  private generateStandardVisualization(walls: WallSolid[]): VisualizationRenderData {
    const graphics: PixiGraphicsData[] = [];
    const labels: PixiLabelData[] = [];

    walls.forEach((wall, index) => {
      // Render wall solid geometry
      wall.solidGeometry.forEach((polygon, polyIndex) => {
        graphics.push({
          type: 'polygon',
          points: polygon.outerRing.map(point => ({ x: point.x, y: point.y })),
          style: {
            lineWidth: this.config.lineWidth,
            color: this.colorScheme.primary,
            alpha: this.config.opacity,
            fillColor: this.colorScheme.primary,
            fillAlpha: 0.3
          },
          zIndex: 1,
          interactive: true,
          id: `wall-${wall.id}-poly-${polyIndex}`
        });

        // Render holes if any
        polygon.holes?.forEach((hole, holeIndex) => {
          graphics.push({
            type: 'polygon',
            points: hole.map(point => ({ x: point.x, y: point.y })),
            style: {
              lineWidth: this.config.lineWidth,
              color: this.colorScheme.background,
              alpha: this.config.opacity,
              fillColor: this.colorScheme.background,
              fillAlpha: 1.0
            },
            zIndex: 2,
            interactive: false,
            id: `wall-${wall.id}-hole-${holeIndex}`
          });
        });
      });

      // Add wall label if enabled
      if (this.config.showLabels && wall.solidGeometry.length > 0) {
        const centroid = this.calculatePolygonCentroid(wall.solidGeometry[0]);
        labels.push({
          text: `Wall ${wall.id.substring(0, 8)}`,
          position: centroid,
          style: {
            fontSize: 12,
            fontFamily: 'Arial',
            color: this.colorScheme.text,
            backgroundColor: this.colorScheme.background,
            padding: 4,
            borderRadius: 4
          },
          anchor: { x: 0.5, y: 0.5 },
          visible: true,
          id: `wall-label-${wall.id}`
        });
      }
    });

    return {
      mode: this.config.mode,
      graphics,
      labels,
      animations: [],
      interactiveElements: []
    };
  }

  /**
   * Generate offset curve visualization
   */
  private generateOffsetCurveVisualization(walls: WallSolid[]): VisualizationRenderData {
    const graphics: PixiGraphicsData[] = [];
    const labels: PixiLabelData[] = [];

    walls.forEach(wall => {
      // Render baseline curve
      graphics.push({
        type: 'line',
        points: wall.baseline.points.map(point => ({ x: point.x, y: point.y })),
        style: {
          lineWidth: this.config.lineWidth * 1.5,
          color: this.colorScheme.primary,
          alpha: this.config.opacity,
          dashPattern: [5, 5]
        },
        zIndex: 3,
        interactive: true,
        id: `baseline-${wall.id}`
      });

      // Render left offset curve
      graphics.push({
        type: 'line',
        points: wall.leftOffset.points.map(point => ({ x: point.x, y: point.y })),
        style: {
          lineWidth: this.config.lineWidth,
          color: this.colorScheme.secondary,
          alpha: this.config.opacity
        },
        zIndex: 2,
        interactive: true,
        id: `left-offset-${wall.id}`
      });

      // Render right offset curve
      graphics.push({
        type: 'line',
        points: wall.rightOffset.points.map(point => ({ x: point.x, y: point.y })),
        style: {
          lineWidth: this.config.lineWidth,
          color: this.colorScheme.accent,
          alpha: this.config.opacity
        },
        zIndex: 2,
        interactive: true,
        id: `right-offset-${wall.id}`
      });

      // Render join points
      wall.baseline.points.forEach((point, index) => {
        if (index > 0 && index < wall.baseline.points.length - 1) {
          graphics.push({
            type: 'circle',
            points: [{ x: point.x, y: point.y }],
            style: {
              lineWidth: 1,
              color: this.colorScheme.warning,
              alpha: this.config.opacity,
              fillColor: this.colorScheme.warning,
              fillAlpha: 0.7
            },
            zIndex: 4,
            interactive: true,
            id: `join-${wall.id}-${index}`
          });
        }
      });

      // Add thickness label
      if (this.config.showLabels) {
        const midPoint = this.calculateCurveMidpoint(wall.baseline);
        labels.push({
          text: `${wall.thickness}mm`,
          position: { x: midPoint.x, y: midPoint.y - 20 },
          style: {
            fontSize: 10,
            fontFamily: 'Arial',
            color: this.colorScheme.text,
            backgroundColor: this.colorScheme.background,
            padding: 2,
            borderRadius: 2
          },
          anchor: { x: 0.5, y: 0.5 },
          visible: true,
          id: `thickness-label-${wall.id}`
        });
      }
    });

    return {
      mode: this.config.mode,
      graphics,
      labels,
      animations: [],
      interactiveElements: []
    };
  }

  /**
   * Generate intersection data visualization
   */
  private generateIntersectionVisualization(
    walls: WallSolid[],
    intersections: IntersectionData[]
  ): VisualizationRenderData {
    const graphics: PixiGraphicsData[] = [];
    const labels: PixiLabelData[] = [];

    // First render walls with reduced opacity
    walls.forEach(wall => {
      wall.solidGeometry.forEach((polygon, polyIndex) => {
        graphics.push({
          type: 'polygon',
          points: polygon.outerRing.map(point => ({ x: point.x, y: point.y })),
          style: {
            lineWidth: 1,
            color: this.colorScheme.secondary,
            alpha: 0.3,
            fillColor: this.colorScheme.secondary,
            fillAlpha: 0.1
          },
          zIndex: 1,
          interactive: false,
          id: `wall-bg-${wall.id}-${polyIndex}`
        });
      });
    });

    // Render intersection data
    intersections.forEach((intersection, index) => {
      // Highlight intersection point
      graphics.push({
        type: 'circle',
        points: [{ x: intersection.intersectionPoint.x, y: intersection.intersectionPoint.y }],
        style: {
          lineWidth: 3,
          color: this.colorScheme.primary,
          alpha: this.config.opacity,
          fillColor: this.colorScheme.primary,
          fillAlpha: 0.8
        },
        zIndex: 5,
        interactive: true,
        id: `intersection-${intersection.id}`
      });

      // Render miter apex if available
      if (intersection.miterApex) {
        graphics.push({
          type: 'circle',
          points: [{ x: intersection.miterApex.x, y: intersection.miterApex.y }],
          style: {
            lineWidth: 2,
            color: this.colorScheme.accent,
            alpha: this.config.opacity,
            fillColor: this.colorScheme.accent,
            fillAlpha: 0.6
          },
          zIndex: 4,
          interactive: true,
          id: `miter-apex-${intersection.id}`
        });

        // Draw line from intersection to miter apex
        graphics.push({
          type: 'line',
          points: [
            { x: intersection.intersectionPoint.x, y: intersection.intersectionPoint.y },
            { x: intersection.miterApex.x, y: intersection.miterApex.y }
          ],
          style: {
            lineWidth: 1,
            color: this.colorScheme.accent,
            alpha: 0.7,
            dashPattern: [3, 3]
          },
          zIndex: 3,
          interactive: false,
          id: `miter-line-${intersection.id}`
        });
      }

      // Render offset intersections
      intersection.offsetIntersections.forEach((offsetPoint, offsetIndex) => {
        graphics.push({
          type: 'circle',
          points: [{ x: offsetPoint.x, y: offsetPoint.y }],
          style: {
            lineWidth: 1,
            color: this.colorScheme.warning,
            alpha: this.config.opacity,
            fillColor: this.colorScheme.warning,
            fillAlpha: 0.5
          },
          zIndex: 3,
          interactive: true,
          id: `offset-intersection-${intersection.id}-${offsetIndex}`
        });
      });

      // Add intersection type label
      if (this.config.showLabels) {
        labels.push({
          text: intersection.type.replace('_', ' ').toUpperCase(),
          position: {
            x: intersection.intersectionPoint.x + 15,
            y: intersection.intersectionPoint.y - 15
          },
          style: {
            fontSize: 10,
            fontFamily: 'Arial',
            color: this.colorScheme.text,
            backgroundColor: this.colorScheme.background,
            padding: 3,
            borderRadius: 3
          },
          anchor: { x: 0, y: 0.5 },
          visible: true,
          id: `intersection-label-${intersection.id}`
        });
      }
    });

    return {
      mode: this.config.mode,
      graphics,
      labels,
      animations: [],
      interactiveElements: []
    };
  }

  /**
   * Generate quality heatmap visualization
   */
  private generateQualityHeatmapVisualization(
    walls: WallSolid[],
    qualityMetrics: Map<string, QualityMetrics>
  ): VisualizationRenderData {
    const graphics: PixiGraphicsData[] = [];
    const labels: PixiLabelData[] = [];

    walls.forEach(wall => {
      const metrics = qualityMetrics.get(wall.id);
      const qualityScore = metrics?.geometricAccuracy ?? 0.5;
      const color = this.getQualityColor(qualityScore);

      // Render wall with quality-based color
      wall.solidGeometry.forEach((polygon, polyIndex) => {
        graphics.push({
          type: 'polygon',
          points: polygon.outerRing.map(point => ({ x: point.x, y: point.y })),
          style: {
            lineWidth: this.config.lineWidth,
            color: color,
            alpha: this.config.opacity,
            fillColor: color,
            fillAlpha: 0.6
          },
          zIndex: 1,
          interactive: true,
          id: `quality-wall-${wall.id}-${polyIndex}`
        });
      });

      // Render quality issues if any
      if (metrics?.issues) {
        metrics.issues.forEach((issue, issueIndex) => {
          if (issue.location) {
            const issueColor = this.getIssueColor(issue.severity);
            graphics.push({
              type: 'circle',
              points: [{ x: issue.location.x, y: issue.location.y }],
              style: {
                lineWidth: 2,
                color: issueColor,
                alpha: this.config.opacity,
                fillColor: issueColor,
                fillAlpha: 0.8
              },
              zIndex: 3,
              interactive: true,
              id: `quality-issue-${wall.id}-${issueIndex}`
            });
          }
        });
      }

      // Add quality score label
      if (this.config.showLabels) {
        const centroid = this.calculatePolygonCentroid(wall.solidGeometry[0]);
        labels.push({
          text: `${(qualityScore * 100).toFixed(0)}%`,
          position: centroid,
          style: {
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: color,
            padding: 4,
            borderRadius: 4
          },
          anchor: { x: 0.5, y: 0.5 },
          visible: true,
          id: `quality-label-${wall.id}`
        });
      }
    });

    return {
      mode: this.config.mode,
      graphics,
      labels,
      animations: [],
      interactiveElements: []
    };
  }

  /**
   * Generate tolerance zone visualization
   */
  private generateToleranceZoneVisualization(walls: WallSolid[]): VisualizationRenderData {
    const graphics: PixiGraphicsData[] = [];
    const labels: PixiLabelData[] = [];

    // First render walls with reduced opacity
    walls.forEach(wall => {
      wall.solidGeometry.forEach((polygon, polyIndex) => {
        graphics.push({
          type: 'polygon',
          points: polygon.outerRing.map(point => ({ x: point.x, y: point.y })),
          style: {
            lineWidth: 1,
            color: this.colorScheme.secondary,
            alpha: 0.2,
            fillColor: this.colorScheme.secondary,
            fillAlpha: 0.05
          },
          zIndex: 1,
          interactive: false,
          id: `wall-bg-${wall.id}-${polyIndex}`
        });
      });

      // Render tolerance zones around key points
      wall.baseline.points.forEach((point, pointIndex) => {
        const toleranceRadius = wall.thickness * 0.1; // 10% of thickness as tolerance
        
        graphics.push({
          type: 'circle',
          points: [{ x: point.x, y: point.y }],
          style: {
            lineWidth: 1,
            color: this.colorScheme.primary,
            alpha: 0.5,
            fillColor: this.colorScheme.primary,
            fillAlpha: 0.1
          },
          zIndex: 2,
          interactive: true,
          id: `tolerance-zone-${wall.id}-${pointIndex}`
        });

        // Add tolerance value label
        if (this.config.showLabels && pointIndex % 2 === 0) {
          labels.push({
            text: `±${toleranceRadius.toFixed(2)}`,
            position: { x: point.x + toleranceRadius + 5, y: point.y },
            style: {
              fontSize: 8,
              fontFamily: 'Arial',
              color: this.colorScheme.text,
              backgroundColor: this.colorScheme.background,
              padding: 2,
              borderRadius: 2
            },
            anchor: { x: 0, y: 0.5 },
            visible: true,
            id: `tolerance-label-${wall.id}-${pointIndex}`
          });
        }
      });
    });

    return {
      mode: this.config.mode,
      graphics,
      labels,
      animations: [],
      interactiveElements: []
    };
  }

  /**
   * Generate boolean operation preview visualization
   */
  private generateBooleanPreviewVisualization(walls: WallSolid[]): VisualizationRenderData {
    const graphics: PixiGraphicsData[] = [];
    const labels: PixiLabelData[] = [];

    // This is a simplified preview - in a real implementation,
    // this would show step-by-step boolean operations
    walls.forEach((wall, index) => {
      const isEven = index % 2 === 0;
      const color = isEven ? this.colorScheme.primary : this.colorScheme.secondary;
      const alpha = isEven ? 0.7 : 0.5;

      wall.solidGeometry.forEach((polygon, polyIndex) => {
        graphics.push({
          type: 'polygon',
          points: polygon.outerRing.map(point => ({ x: point.x, y: point.y })),
          style: {
            lineWidth: this.config.lineWidth,
            color: color,
            alpha: this.config.opacity * alpha,
            fillColor: color,
            fillAlpha: 0.3 * alpha
          },
          zIndex: isEven ? 2 : 1,
          interactive: true,
          id: `boolean-preview-${wall.id}-${polyIndex}`
        });
      });

      // Add operation label
      if (this.config.showLabels) {
        const centroid = this.calculatePolygonCentroid(wall.solidGeometry[0]);
        labels.push({
          text: isEven ? 'A' : 'B',
          position: centroid,
          style: {
            fontSize: 14,
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: color,
            padding: 6,
            borderRadius: 6
          },
          anchor: { x: 0.5, y: 0.5 },
          visible: true,
          id: `boolean-label-${wall.id}`
        });
      }
    });

    return {
      mode: this.config.mode,
      graphics,
      labels,
      animations: [],
      interactiveElements: []
    };
  }

  /**
   * Generate healing overlay visualization
   */
  private generateHealingOverlayVisualization(walls: WallSolid[]): VisualizationRenderData {
    const graphics: PixiGraphicsData[] = [];
    const labels: PixiLabelData[] = [];

    walls.forEach(wall => {
      // Render wall with healing indicators
      wall.solidGeometry.forEach((polygon, polyIndex) => {
        const needsHealing = wall.healingHistory.length > 0;
        const color = needsHealing ? this.colorScheme.warning : this.colorScheme.success;

        graphics.push({
          type: 'polygon',
          points: polygon.outerRing.map(point => ({ x: point.x, y: point.y })),
          style: {
            lineWidth: this.config.lineWidth,
            color: color,
            alpha: this.config.opacity,
            fillColor: color,
            fillAlpha: 0.3
          },
          zIndex: 1,
          interactive: true,
          id: `healing-wall-${wall.id}-${polyIndex}`
        });
      });

      // Show healing operations
      wall.healingHistory.forEach((healing, healingIndex) => {
        if (wall.solidGeometry.length > 0) {
          const centroid = this.calculatePolygonCentroid(wall.solidGeometry[0]);
          const offset = healingIndex * 15;
          
          graphics.push({
            type: 'circle',
            points: [{ x: centroid.x + offset, y: centroid.y + offset }],
            style: {
              lineWidth: 2,
              color: healing.success ? this.colorScheme.success : this.colorScheme.error,
              alpha: this.config.opacity,
              fillColor: healing.success ? this.colorScheme.success : this.colorScheme.error,
              fillAlpha: 0.6
            },
            zIndex: 3,
            interactive: true,
            id: `healing-indicator-${wall.id}-${healingIndex}`
          });
        }
      });

      // Add healing status label
      if (this.config.showLabels && wall.healingHistory.length > 0) {
        const centroid = this.calculatePolygonCentroid(wall.solidGeometry[0]);
        const successCount = wall.healingHistory.filter(h => h.success).length;
        
        labels.push({
          text: `Healed: ${successCount}/${wall.healingHistory.length}`,
          position: { x: centroid.x, y: centroid.y - 20 },
          style: {
            fontSize: 10,
            fontFamily: 'Arial',
            color: this.colorScheme.text,
            backgroundColor: this.colorScheme.background,
            padding: 3,
            borderRadius: 3
          },
          anchor: { x: 0.5, y: 0.5 },
          visible: true,
          id: `healing-label-${wall.id}`
        });
      }
    });

    return {
      mode: this.config.mode,
      graphics,
      labels,
      animations: [],
      interactiveElements: []
    };
  }

  /**
   * Get color based on quality score
   */
  private getQualityColor(score: number): string {
    if (score >= 0.9) return this.qualityColorMapping.excellent;
    if (score >= 0.7) return this.qualityColorMapping.good;
    if (score >= 0.5) return this.qualityColorMapping.fair;
    if (score >= 0.3) return this.qualityColorMapping.poor;
    return this.qualityColorMapping.critical;
  }

  /**
   * Get color based on issue severity
   */
  private getIssueColor(severity: string): string {
    switch (severity) {
      case 'low': return this.colorScheme.success;
      case 'medium': return this.colorScheme.warning;
      case 'high': return this.colorScheme.error;
      case 'critical': return '#dc2626';
      default: return this.colorScheme.secondary;
    }
  }

  /**
   * Calculate polygon centroid
   */
  private calculatePolygonCentroid(polygon: any): { x: number; y: number } {
    const points = polygon.outerRing;
    let x = 0, y = 0;
    
    points.forEach((point: any) => {
      x += point.x;
      y += point.y;
    });
    
    return {
      x: x / points.length,
      y: y / points.length
    };
  }

  /**
   * Calculate curve midpoint
   */
  private calculateCurveMidpoint(curve: any): { x: number; y: number } {
    const midIndex = Math.floor(curve.points.length / 2);
    return {
      x: curve.points[midIndex].x,
      y: curve.points[midIndex].y
    };
  }

  /**
   * Get current visualization configuration
   */
  getConfig(): VisualizationConfig {
    return { ...this.config };
  }

  /**
   * Get available visualization modes
   */
  getAvailableModes(): BIMVisualizationModes[] {
    return Object.values(VisualizationModes);
  }
}