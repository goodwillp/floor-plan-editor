/**
 * Wall Type Definitions
 * 
 * Defines the different types of walls supported by the system
 */

// Align with core `WallTypeString` which is lowercase-based across the app.
export type WallTypeString =
  | 'layout'
  | 'zone'
  | 'area'
  | 'structural'
  | 'partition'
  | 'curtain';

export interface WallTypeDefinition {
  name: WallTypeString;
  defaultThickness: number;
  color: string;
  description: string;
  structuralProperties?: {
    loadBearing: boolean;
    material: string;
    fireRating?: number;
  };
}

export const WALL_TYPES: Record<WallTypeString, WallTypeDefinition> = {
  layout: {
    name: 'layout',
    defaultThickness: 100,
    color: '#000000',
    description: 'Basic layout walls for floor plan structure'
  },
  zone: {
    name: 'zone',
    defaultThickness: 150,
    color: '#FF0000',
    description: 'Zone boundary walls'
  },
  area: {
    name: 'area',
    defaultThickness: 120,
    color: '#00FF00',
    description: 'Area definition walls'
  },
  structural: {
    name: 'structural',
    defaultThickness: 200,
    color: '#0000FF',
    description: 'Load-bearing structural walls',
    structuralProperties: {
      loadBearing: true,
      material: 'concrete'
    }
  },
  partition: {
    name: 'partition',
    defaultThickness: 80,
    color: '#FFFF00',
    description: 'Non-structural partition walls',
    structuralProperties: {
      loadBearing: false,
      material: 'drywall'
    }
  },
  curtain: {
    name: 'curtain',
    defaultThickness: 50,
    color: '#FF00FF',
    description: 'Curtain wall systems',
    structuralProperties: {
      loadBearing: false,
      material: 'glass'
    }
  }
};