/**
 * Main exports for the Floor Plan Editor data model
 */

export { FloorPlanModel } from './FloorPlanModel';
export { GeometryService } from './GeometryService';
export type { 
  Node, 
  Segment, 
  Wall, 
  WallType, 
  NodeType, 
  Point 
} from './types';
export { WALL_THICKNESS } from './types';

// Icon system exports
export { iconMappings, getIconsByCategory, getIcon } from './icon-mappings';
export type { IconKey } from './icon-mappings';