/**
 * Offset Type Definitions
 * 
 * Defines the different types of offset joins and operations
 */

export enum OffsetJoinType {
  MITER = 'miter',
  BEVEL = 'bevel',
  ROUND = 'round'
}

export interface OffsetJoinTypeDefinition {
  type: OffsetJoinType;
  description: string;
  useCases: string[];
  angleRange: {
    min: number; // degrees
    max: number; // degrees
  };
  complexity: 'low' | 'medium' | 'high';
}

export const OFFSET_JOIN_TYPE_DEFINITIONS: Record<OffsetJoinType, OffsetJoinTypeDefinition> = {
  [OffsetJoinType.MITER]: {
    type: OffsetJoinType.MITER,
    description: 'Sharp corner join that extends lines to their intersection point',
    useCases: [
      'Moderate angle corners (30° - 150°)',
      'Architectural precision requirements',
      'Clean geometric intersections'
    ],
    angleRange: {
      min: 30,
      max: 150
    },
    complexity: 'medium'
  },
  [OffsetJoinType.BEVEL]: {
    type: OffsetJoinType.BEVEL,
    description: 'Flat corner join that cuts off sharp angles',
    useCases: [
      'Sharp angles (< 30° or > 150°)',
      'Manufacturing constraints',
      'Avoiding extremely long miter points'
    ],
    angleRange: {
      min: 0,
      max: 180
    },
    complexity: 'low'
  },
  [OffsetJoinType.ROUND]: {
    type: OffsetJoinType.ROUND,
    description: 'Rounded corner join with arc segments',
    useCases: [
      'Aesthetic requirements',
      'Smooth transitions',
      'Avoiding sharp corners in manufacturing'
    ],
    angleRange: {
      min: 0,
      max: 180
    },
    complexity: 'high'
  }
};

export interface OffsetParameters {
  distance: number;
  joinType: OffsetJoinType;
  miterLimit?: number;
  roundSegments?: number;
  tolerance: number;
}

export interface OffsetResult {
  success: boolean;
  offsetCurve: any; // Will be properly typed when Curve is available
  joinType: OffsetJoinType;
  warnings: string[];
  fallbackUsed: boolean;
  processingTime: number;
}