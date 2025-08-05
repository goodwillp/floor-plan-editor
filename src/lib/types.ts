/**
 * Core data types for the Floor Plan Editor
 */

/**
 * Wall type enumeration
 * Requirements: 1.1, 1.2, 1.3
 */
export enum WallType {
  LAYOUT = 'layout',
  ZONE = 'zone',
  AREA = 'area'
}

export type WallTypeString = 'layout' | 'zone' | 'area';
export type NodeType = 'endpoint' | 'intersection' | 'junction';

/**
 * Point interface for geometric calculations
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Node represents a point in the floor plan where line segments connect
 * Requirements: 14.1, 14.2
 */
export interface Node {
  id: string;
  x: number;
  y: number;
  connectedSegments: string[]; // Array of segment IDs
  type: NodeType;
}

/**
 * Segment represents a line segment between two nodes
 * Requirements: 14.1, 14.2
 */
export interface Segment {
  id: string;
  startNodeId: string;
  endNodeId: string;
  wallId?: string; // Optional reference to parent wall
  length: number;
  angle: number;
}

/**
 * Wall represents a wall entity with specific type and thickness
 * Requirements: 14.1, 14.2
 */
export interface Wall {
  id: string;
  type: WallTypeString;
  thickness: number; // 350mm, 250mm, or 150mm based on type
  segmentIds: string[];
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Wall thickness constants based on wall types
 * Requirements: 1.1, 1.2, 1.3
 */
export const WALL_THICKNESS: Record<WallTypeString, number> = {
  [WallType.LAYOUT]: 350, // 350mm
  [WallType.ZONE]: 250,   // 250mm
  [WallType.AREA]: 150    // 150mm
};

/**
 * Wall thickness constants for easy access
 */
export const WALL_THICKNESS_MM = {
  LAYOUT: 350,
  ZONE: 250,
  AREA: 150
} as const;