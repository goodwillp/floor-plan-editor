import {
  Building,
  Square,
  RectangleHorizontal,
  Pencil,
  MousePointer,
  Trash2,
  Grid3X3,
  Image,
  Save,
  FolderOpen,
  Download,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Settings,
  Move,
  RotateCcw,
  Lock,
  Unlock,
  Home,
  Maximize,
  type LucideIcon
} from 'lucide-react'

export interface IconDefinition {
  icon: LucideIcon
  tooltip: string
  category: 'wall-type' | 'drawing-tool' | 'view-tool' | 'file-operation' | 'edit-operation' | 'layer-control' | 'reference-image'
}

export const iconMappings: Record<string, IconDefinition> = {
  // Wall Types
  layoutWall: {
    icon: Building,
    tooltip: 'Layout Wall (350mm)',
    category: 'wall-type'
  },
  zoneWall: {
    icon: Square,
    tooltip: 'Zone Wall (250mm)',
    category: 'wall-type'
  },
  areaWall: {
    icon: RectangleHorizontal,
    tooltip: 'Area Wall (150mm)',
    category: 'wall-type'
  },

  // Drawing Tools
  select: {
    icon: MousePointer,
    tooltip: 'Select Tool',
    category: 'drawing-tool'
  },
  drawWall: {
    icon: Pencil,
    tooltip: 'Draw Wall',
    category: 'drawing-tool'
  },
  delete: {
    icon: Trash2,
    tooltip: 'Delete Tool',
    category: 'drawing-tool'
  },
  move: {
    icon: Move,
    tooltip: 'Move Tool',
    category: 'drawing-tool'
  },

  // View Tools
  grid: {
    icon: Grid3X3,
    tooltip: 'Toggle Grid',
    category: 'view-tool'
  },
  zoomIn: {
    icon: ZoomIn,
    tooltip: 'Zoom In',
    category: 'view-tool'
  },
  zoomOut: {
    icon: ZoomOut,
    tooltip: 'Zoom Out',
    category: 'view-tool'
  },
  zoomFit: {
    icon: Maximize,
    tooltip: 'Fit to Screen',
    category: 'view-tool'
  },
  zoomActual: {
    icon: Home,
    tooltip: 'Actual Size (100%)',
    category: 'view-tool'
  },

  // File Operations
  save: {
    icon: Save,
    tooltip: 'Save Floor Plan',
    category: 'file-operation'
  },
  load: {
    icon: FolderOpen,
    tooltip: 'Load Floor Plan',
    category: 'file-operation'
  },
  export: {
    icon: Download,
    tooltip: 'Export Floor Plan',
    category: 'file-operation'
  },

  // Edit Operations
  undo: {
    icon: Undo,
    tooltip: 'Undo',
    category: 'edit-operation'
  },
  redo: {
    icon: Redo,
    tooltip: 'Redo',
    category: 'edit-operation'
  },

  // Layer Controls
  showLayer: {
    icon: Eye,
    tooltip: 'Show Layer',
    category: 'layer-control'
  },
  hideLayer: {
    icon: EyeOff,
    tooltip: 'Hide Layer',
    category: 'layer-control'
  },
  layerSettings: {
    icon: Settings,
    tooltip: 'Layer Settings',
    category: 'layer-control'
  },

  // Reference Image Controls
  referenceImage: {
    icon: Image,
    tooltip: 'Load Reference Image',
    category: 'reference-image'
  },
  lockImage: {
    icon: Lock,
    tooltip: 'Lock Reference Image',
    category: 'reference-image'
  },
  unlockImage: {
    icon: Unlock,
    tooltip: 'Unlock Reference Image',
    category: 'reference-image'
  },
  rotateImage: {
    icon: RotateCcw,
    tooltip: 'Rotate Reference Image',
    category: 'reference-image'
  }
}

// Helper functions to get icons by category
export const getIconsByCategory = (category: IconDefinition['category']): Record<string, IconDefinition> => {
  return Object.fromEntries(
    Object.entries(iconMappings).filter(([, definition]) => definition.category === category)
  )
}

export const getIcon = (key: string): IconDefinition | undefined => {
  return iconMappings[key]
}

// Type-safe icon keys
export type IconKey = keyof typeof iconMappings