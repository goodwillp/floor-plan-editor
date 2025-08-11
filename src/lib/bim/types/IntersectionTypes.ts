/**
 * Intersection Type Definitions
 * 
 * Defines the different types of wall intersections
 */

export enum IntersectionType {
  T_JUNCTION = 't_junction',
  L_JUNCTION = 'l_junction',
  CROSS_JUNCTION = 'cross_junction',
  PARALLEL_OVERLAP = 'parallel_overlap'
}

export interface IntersectionTypeDefinition {
  type: IntersectionType;
  description: string;
  minWalls: number;
  maxWalls: number;
  complexityLevel: 'low' | 'medium' | 'high';
}

export const INTERSECTION_TYPE_DEFINITIONS: Record<IntersectionType, IntersectionTypeDefinition> = {
  [IntersectionType.T_JUNCTION]: {
    type: IntersectionType.T_JUNCTION,
    description: 'T-shaped intersection where one wall meets another perpendicularly',
    minWalls: 2,
    maxWalls: 2,
    complexityLevel: 'low'
  },
  [IntersectionType.L_JUNCTION]: {
    type: IntersectionType.L_JUNCTION,
    description: 'L-shaped corner intersection between two walls',
    minWalls: 2,
    maxWalls: 2,
    complexityLevel: 'low'
  },
  [IntersectionType.CROSS_JUNCTION]: {
    type: IntersectionType.CROSS_JUNCTION,
    description: 'Cross-shaped intersection where multiple walls meet at a point',
    minWalls: 3,
    maxWalls: 8,
    complexityLevel: 'high'
  },
  [IntersectionType.PARALLEL_OVERLAP]: {
    type: IntersectionType.PARALLEL_OVERLAP,
    description: 'Parallel walls that overlap along their length',
    minWalls: 2,
    maxWalls: 2,
    complexityLevel: 'medium'
  }
};