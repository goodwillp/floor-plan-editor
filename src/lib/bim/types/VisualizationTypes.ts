/**
 * Visualization types for BIM geometric data
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { WallSolid } from '../geometry/WallSolid';
import type { Curve } from '../geometry/Curve';
import type { IntersectionData } from '../geometry/IntersectionData';
import type { QualityMetrics } from './QualityMetrics';

/**
 * BIM visualization modes for different geometric data representations
 */
export enum BIMVisualizationModes {
  STANDARD = 'standard',
  OFFSET_CURVES = 'offset_curves',
  INTERSECTION_DATA = 'intersection_data',
  QUALITY_HEATMAP = 'quality_heatmap',
  TOLERANCE_ZONES = 'tolerance_zones',
  BOOLEAN_PREVIEW = 'boolean_preview',
  HEALING_OVERLAY = 'healing_overlay'
}

/**
 * Visualization configuration for different modes
 */
export interface VisualizationConfig {
  mode: BIMVisualizationModes;
  opacity: number;
  showLabels: boolean;
  colorScheme: ColorScheme;
  lineWidth: number;
  showGrid: boolean;
  animationEnabled: boolean;
}

/**
 * Color scheme for visualization modes
 */
export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  warning: string;
  error: string;
  success: string;
  background: string;
  text: string;
}

/**
 * Quality-based color mapping for heatmap visualization
 */
export interface QualityColorMapping {
  excellent: string;    // 0.9-1.0
  good: string;        // 0.7-0.9
  fair: string;        // 0.5-0.7
  poor: string;        // 0.3-0.5
  critical: string;    // 0.0-0.3
}

/**
 * Tolerance zone visualization data
 */
export interface ToleranceZoneData {
  centerPoint: { x: number; y: number };
  radius: number;
  toleranceValue: number;
  context: string;
  isActive: boolean;
  color: string;
}

/**
 * Offset curve visualization data
 */
export interface OffsetCurveVisualization {
  baseline: Curve;
  leftOffset: Curve;
  rightOffset: Curve;
  joinPoints: { x: number; y: number }[];
  joinTypes: string[];
  thickness: number;
}

/**
 * Intersection visualization data
 */
export interface IntersectionVisualization {
  intersectionData: IntersectionData;
  highlightColor: string;
  showMiterApex: boolean;
  showOffsetIntersections: boolean;
  labelText?: string;
}

/**
 * Quality heatmap data for wall visualization
 */
export interface QualityHeatmapData {
  wallId: string;
  qualityScore: number;
  color: string;
  issues: QualityIssueVisualization[];
  recommendations: string[];
}

/**
 * Quality issue visualization
 */
export interface QualityIssueVisualization {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: { x: number; y: number };
  radius: number;
  color: string;
  description: string;
  showTooltip: boolean;
}

/**
 * Boolean operation preview data
 */
export interface BooleanPreviewData {
  operationType: 'union' | 'intersection' | 'difference';
  inputSolids: WallSolid[];
  previewResult: WallSolid | null;
  showSteps: boolean;
  stepIndex: number;
  totalSteps: number;
}

/**
 * Healing overlay visualization data
 */
export interface HealingOverlayData {
  wallId: string;
  healingRequired: boolean;
  healingOperations: HealingVisualization[];
  beforeGeometry: any;
  afterGeometry: any;
  showComparison: boolean;
}

/**
 * Individual healing operation visualization
 */
export interface HealingVisualization {
  type: 'sliver_removal' | 'edge_merge' | 'gap_elimination';
  location: { x: number; y: number };
  affectedArea: { x: number; y: number }[];
  color: string;
  description: string;
  success: boolean;
}

/**
 * Visualization render data for PixiJS
 */
export interface VisualizationRenderData {
  mode: BIMVisualizationModes;
  graphics: PixiGraphicsData[];
  labels: PixiLabelData[];
  animations: PixiAnimationData[];
  interactiveElements: PixiInteractiveData[];
}

/**
 * PixiJS graphics data for rendering
 */
export interface PixiGraphicsData {
  type: 'line' | 'polygon' | 'circle' | 'arc' | 'bezier';
  points: { x: number; y: number }[];
  style: {
    lineWidth: number;
    color: string;
    alpha: number;
    fillColor?: string;
    fillAlpha?: number;
    dashPattern?: number[];
  };
  zIndex: number;
  interactive: boolean;
  id?: string;
}

/**
 * PixiJS label data for text rendering
 */
export interface PixiLabelData {
  text: string;
  position: { x: number; y: number };
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    padding?: number;
    borderRadius?: number;
  };
  anchor: { x: number; y: number };
  visible: boolean;
  id?: string;
}

/**
 * PixiJS animation data
 */
export interface PixiAnimationData {
  targetId: string;
  type: 'fade' | 'scale' | 'move' | 'rotate' | 'pulse';
  duration: number;
  easing: string;
  loop: boolean;
  autoStart: boolean;
  properties: Record<string, any>;
}

/**
 * PixiJS interactive element data
 */
export interface PixiInteractiveData {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  cursor: string;
  tooltip?: string;
  onClick?: () => void;
  onHover?: () => void;
  onHoverOut?: () => void;
}

/**
 * Default color schemes for different visualization modes
 */
export const DEFAULT_COLOR_SCHEMES: Record<BIMVisualizationModes, ColorScheme> = {
  [BIMVisualizationModes.STANDARD]: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#0ea5e9',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    background: '#ffffff',
    text: '#1f2937'
  },
  [BIMVisualizationModes.OFFSET_CURVES]: {
    primary: '#7c3aed',
    secondary: '#a78bfa',
    accent: '#c4b5fd',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    background: '#faf5ff',
    text: '#581c87'
  },
  [BIMVisualizationModes.INTERSECTION_DATA]: {
    primary: '#dc2626',
    secondary: '#f87171',
    accent: '#fca5a5',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    background: '#fef2f2',
    text: '#7f1d1d'
  },
  [BIMVisualizationModes.QUALITY_HEATMAP]: {
    primary: '#059669',
    secondary: '#34d399',
    accent: '#6ee7b7',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    background: '#ecfdf5',
    text: '#064e3b'
  },
  [BIMVisualizationModes.TOLERANCE_ZONES]: {
    primary: '#0891b2',
    secondary: '#22d3ee',
    accent: '#67e8f9',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    background: '#ecfeff',
    text: '#164e63'
  },
  [BIMVisualizationModes.BOOLEAN_PREVIEW]: {
    primary: '#7c2d12',
    secondary: '#ea580c',
    accent: '#fb923c',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    background: '#fff7ed',
    text: '#431407'
  },
  [BIMVisualizationModes.HEALING_OVERLAY]: {
    primary: '#be123c',
    secondary: '#f43f5e',
    accent: '#fb7185',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    background: '#fdf2f8',
    text: '#881337'
  }
};

/**
 * Quality color mapping for heatmap visualization
 */
export const QUALITY_COLOR_MAPPING: QualityColorMapping = {
  excellent: '#10b981',  // Green
  good: '#84cc16',       // Light green
  fair: '#f59e0b',       // Yellow
  poor: '#f97316',       // Orange
  critical: '#ef4444'    // Red
};