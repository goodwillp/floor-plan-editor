/**
 * Wall Type Definitions
 * 
 * Defines the different types of walls supported by the system
 */

export type WallTypeString = 'Layout' | 'Zone' | 'Area' | 'Structural' | 'Partition' | 'Curtain';

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
  Layout: {
    name: 'Layout',
    defaultThickness: 100,
    color: '#000000',
    description: 'Basic layout walls for floor plan structure'
  },
  Zone: {
    name: 'Zone',
    defaultThickness: 150,
    color: '#FF0000',
    description: 'Zone boundary walls'
  },
  Area: {
    name: 'Area',
    defaultThickness: 120,
    color: '#00FF00',
    description: 'Area definition walls'
  },
  Structural: {
    name: 'Structural',
    defaultThickness: 200,
    color: '#0000FF',
    description: 'Load-bearing structural walls',
    structuralProperties: {
      loadBearing: true,
      material: 'concrete'
    }
  },
  Partition: {
    name: 'Partition',
    defaultThickness: 80,
    color: '#FFFF00',
    description: 'Non-structural partition walls',
    structuralProperties: {
      loadBearing: false,
      material: 'drywall'
    }
  },
  Curtain: {
    name: 'Curtain',
    defaultThickness: 50,
    color: '#FF00FF',
    description: 'Curtain wall systems',
    structuralProperties: {
      loadBearing: false,
      material: 'glass'
    }
  }
};