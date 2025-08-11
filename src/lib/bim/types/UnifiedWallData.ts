/**
 * Unified Wall Data Structure
 * 
 * Supports both basic and BIM representations for seamless mode switching
 */

import { WallSolid } from '../geometry/WallSolid';
import { Curve } from '../geometry/Curve';
import { IntersectionData } from '../geometry/IntersectionData';
import { QualityMetrics } from './QualityMetrics';
import { WallTypeString } from './WallTypes';

export interface BasicGeometry {
  segments: any[]; // Legacy segment data
  nodes: any[]; // Legacy node data
  polygons: any[]; // Legacy polygon data
}

export interface BIMGeometry {
  wallSolid: WallSolid;
  offsetCurves: Curve[];
  intersectionData: IntersectionData[];
  qualityMetrics: QualityMetrics;
}

export interface UnifiedWallData {
  // Core properties (shared between modes)
  id: string;
  type: WallTypeString;
  thickness: number;
  visible: boolean;
  baseline: Curve;
  
  // Basic mode representation
  basicGeometry: BasicGeometry;
  
  // BIM mode representation (computed on-demand)
  bimGeometry?: BIMGeometry;
  
  // Mode compatibility flags
  isBasicModeValid: boolean;
  isBIMModeValid: boolean;
  lastModifiedMode: 'basic' | 'bim';
  requiresSync: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
  projectId?: string;
  
  // Processing history
  processingHistory: ProcessingHistoryEntry[];
}

export interface ProcessingHistoryEntry {
  timestamp: Date;
  operation: string;
  mode: 'basic' | 'bim';
  success: boolean;
  processingTime: number;
  warnings: string[];
  errors: string[];
}