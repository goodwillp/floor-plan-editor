/**
 * Quality-based Color Coding System
 * Provides gradient visualization for wall quality metrics
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { QualityMetrics, QualityIssue } from '../types/QualityMetrics';
import type { QualityColorMapping } from '../types/VisualizationTypes';
import { QUALITY_COLOR_MAPPING } from '../types/VisualizationTypes';

/**
 * Color coding system for quality visualization
 */
export class QualityColorCoding {
  private colorMapping: QualityColorMapping;
  private gradientSteps: number;

  constructor(colorMapping?: QualityColorMapping, gradientSteps: number = 100) {
    this.colorMapping = colorMapping || QUALITY_COLOR_MAPPING;
    this.gradientSteps = gradientSteps;
  }

  /**
   * Get color for a quality score (0-1)
   */
  getQualityColor(score: number): string {
    // Clamp score to valid range
    const clampedScore = Math.max(0, Math.min(1, score));

    if (clampedScore >= 0.9) return this.colorMapping.excellent;
    if (clampedScore >= 0.7) return this.colorMapping.good;
    if (clampedScore >= 0.5) return this.colorMapping.fair;
    if (clampedScore >= 0.3) return this.colorMapping.poor;
    return this.colorMapping.critical;
  }

  /**
   * Get interpolated color between two quality levels
   */
  getInterpolatedQualityColor(score: number): string {
    const clampedScore = Math.max(0, Math.min(1, score));

    if (clampedScore >= 0.9) {
      return this.interpolateColors(
        this.colorMapping.good,
        this.colorMapping.excellent,
        (clampedScore - 0.9) / 0.1
      );
    } else if (clampedScore >= 0.7) {
      return this.interpolateColors(
        this.colorMapping.fair,
        this.colorMapping.good,
        (clampedScore - 0.7) / 0.2
      );
    } else if (clampedScore >= 0.5) {
      return this.interpolateColors(
        this.colorMapping.poor,
        this.colorMapping.fair,
        (clampedScore - 0.5) / 0.2
      );
    } else if (clampedScore >= 0.3) {
      return this.interpolateColors(
        this.colorMapping.critical,
        this.colorMapping.poor,
        (clampedScore - 0.3) / 0.2
      );
    } else {
      return this.colorMapping.critical;
    }
  }

  /**
   * Generate gradient colors for heatmap visualization
   */
  generateGradientColors(minScore: number, maxScore: number): string[] {
    const colors: string[] = [];
    const range = maxScore - minScore;
    
    for (let i = 0; i <= this.gradientSteps; i++) {
      const score = minScore + (range * i) / this.gradientSteps;
      colors.push(this.getInterpolatedQualityColor(score));
    }
    
    return colors;
  }

  /**
   * Get color for quality issue severity
   */
  getIssueColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (severity) {
      case 'low':
        return this.colorMapping.good;
      case 'medium':
        return this.colorMapping.fair;
      case 'high':
        return this.colorMapping.poor;
      case 'critical':
        return this.colorMapping.critical;
      default:
        return this.colorMapping.fair;
    }
  }

  /**
   * Get color opacity based on issue count
   */
  getIssueOpacity(issueCount: number, maxIssues: number = 10): number {
    const normalizedCount = Math.min(issueCount, maxIssues) / maxIssues;
    return 0.3 + (normalizedCount * 0.7); // Range from 0.3 to 1.0
  }

  /**
   * Generate quality heatmap data for walls
   */
  generateHeatmapData(
    wallQualityMap: Map<string, QualityMetrics>
  ): Map<string, { color: string; opacity: number; issues: QualityIssue[] }> {
    const heatmapData = new Map();

    wallQualityMap.forEach((metrics, wallId) => {
      const overallScore = this.calculateOverallQualityScore(metrics);
      const color = this.getInterpolatedQualityColor(overallScore);
      const opacity = this.getQualityOpacity(metrics);
      
      heatmapData.set(wallId, {
        color,
        opacity,
        issues: metrics.issues || []
      });
    });

    return heatmapData;
  }

  /**
   * Calculate overall quality score from metrics
   */
  private calculateOverallQualityScore(metrics: QualityMetrics): number {
    const weights = {
      geometricAccuracy: 0.3,
      topologicalConsistency: 0.25,
      manufacturability: 0.25,
      architecturalCompliance: 0.2
    };

    return (
      metrics.geometricAccuracy * weights.geometricAccuracy +
      metrics.topologicalConsistency * weights.topologicalConsistency +
      metrics.manufacturability * weights.manufacturability +
      metrics.architecturalCompliance * weights.architecturalCompliance
    );
  }

  /**
   * Get opacity based on quality metrics
   */
  private getQualityOpacity(metrics: QualityMetrics): number {
    const issueCount = (metrics.issues?.length || 0);
    const maxIssues = 20;
    
    // Base opacity on issue count and severity
    let severityWeight = 0;
    metrics.issues?.forEach(issue => {
      switch (issue.severity) {
        case 'low': severityWeight += 0.1; break;
        case 'medium': severityWeight += 0.3; break;
        case 'high': severityWeight += 0.6; break;
        case 'critical': severityWeight += 1.0; break;
      }
    });

    const normalizedSeverity = Math.min(severityWeight, maxIssues) / maxIssues;
    return 0.4 + (normalizedSeverity * 0.6); // Range from 0.4 to 1.0
  }

  /**
   * Interpolate between two hex colors
   */
  private interpolateColors(color1: string, color2: string, factor: number): string {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return color1;

    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);

    return this.rgbToHex(r, g, b);
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Convert RGB to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * Generate color legend for quality visualization
   */
  generateColorLegend(): Array<{ score: number; color: string; label: string }> {
    return [
      { score: 1.0, color: this.colorMapping.excellent, label: 'Excellent (90-100%)' },
      { score: 0.8, color: this.colorMapping.good, label: 'Good (70-90%)' },
      { score: 0.6, color: this.colorMapping.fair, label: 'Fair (50-70%)' },
      { score: 0.4, color: this.colorMapping.poor, label: 'Poor (30-50%)' },
      { score: 0.1, color: this.colorMapping.critical, label: 'Critical (0-30%)' }
    ];
  }

  /**
   * Get quality category from score
   */
  getQualityCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.7) return 'good';
    if (score >= 0.5) return 'fair';
    if (score >= 0.3) return 'poor';
    return 'critical';
  }

  /**
   * Update color mapping
   */
  updateColorMapping(newMapping: Partial<QualityColorMapping>): void {
    this.colorMapping = { ...this.colorMapping, ...newMapping };
  }

  /**
   * Get current color mapping
   */
  getColorMapping(): QualityColorMapping {
    return { ...this.colorMapping };
  }
}