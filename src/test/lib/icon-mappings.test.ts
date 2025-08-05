import { describe, it, expect } from 'vitest'
import { 
  iconMappings, 
  getIconsByCategory, 
  getIcon,
  type IconKey 
} from '@/lib/icon-mappings'
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
  Redo
} from 'lucide-react'

describe('iconMappings', () => {
  it('contains all expected wall type icons', () => {
    expect(iconMappings.layoutWall).toBeDefined()
    expect(iconMappings.layoutWall.icon).toBe(Building)
    expect(iconMappings.layoutWall.tooltip).toBe('Layout Wall (350mm)')
    expect(iconMappings.layoutWall.category).toBe('wall-type')

    expect(iconMappings.zoneWall).toBeDefined()
    expect(iconMappings.zoneWall.icon).toBe(Square)
    expect(iconMappings.zoneWall.tooltip).toBe('Zone Wall (250mm)')
    expect(iconMappings.zoneWall.category).toBe('wall-type')

    expect(iconMappings.areaWall).toBeDefined()
    expect(iconMappings.areaWall.icon).toBe(RectangleHorizontal)
    expect(iconMappings.areaWall.tooltip).toBe('Area Wall (150mm)')
    expect(iconMappings.areaWall.category).toBe('wall-type')
  })

  it('contains all expected drawing tool icons', () => {
    expect(iconMappings.select).toBeDefined()
    expect(iconMappings.select.icon).toBe(MousePointer)
    expect(iconMappings.select.tooltip).toBe('Select Tool')
    expect(iconMappings.select.category).toBe('drawing-tool')

    expect(iconMappings.drawWall).toBeDefined()
    expect(iconMappings.drawWall.icon).toBe(Pencil)
    expect(iconMappings.drawWall.tooltip).toBe('Draw Wall')
    expect(iconMappings.drawWall.category).toBe('drawing-tool')

    expect(iconMappings.delete).toBeDefined()
    expect(iconMappings.delete.icon).toBe(Trash2)
    expect(iconMappings.delete.tooltip).toBe('Delete Tool')
    expect(iconMappings.delete.category).toBe('drawing-tool')
  })

  it('contains all expected view tool icons', () => {
    expect(iconMappings.grid).toBeDefined()
    expect(iconMappings.grid.icon).toBe(Grid3X3)
    expect(iconMappings.grid.tooltip).toBe('Toggle Grid')
    expect(iconMappings.grid.category).toBe('view-tool')

    expect(iconMappings.zoomIn).toBeDefined()
    expect(iconMappings.zoomIn.icon).toBe(ZoomIn)
    expect(iconMappings.zoomIn.tooltip).toBe('Zoom In')
    expect(iconMappings.zoomIn.category).toBe('view-tool')

    expect(iconMappings.zoomOut).toBeDefined()
    expect(iconMappings.zoomOut.icon).toBe(ZoomOut)
    expect(iconMappings.zoomOut.tooltip).toBe('Zoom Out')
    expect(iconMappings.zoomOut.category).toBe('view-tool')
  })

  it('contains all expected file operation icons', () => {
    expect(iconMappings.save).toBeDefined()
    expect(iconMappings.save.icon).toBe(Save)
    expect(iconMappings.save.tooltip).toBe('Save Floor Plan')
    expect(iconMappings.save.category).toBe('file-operation')

    expect(iconMappings.load).toBeDefined()
    expect(iconMappings.load.icon).toBe(FolderOpen)
    expect(iconMappings.load.tooltip).toBe('Load Floor Plan')
    expect(iconMappings.load.category).toBe('file-operation')

    expect(iconMappings.export).toBeDefined()
    expect(iconMappings.export.icon).toBe(Download)
    expect(iconMappings.export.tooltip).toBe('Export Floor Plan')
    expect(iconMappings.export.category).toBe('file-operation')
  })

  it('contains all expected edit operation icons', () => {
    expect(iconMappings.undo).toBeDefined()
    expect(iconMappings.undo.icon).toBe(Undo)
    expect(iconMappings.undo.tooltip).toBe('Undo')
    expect(iconMappings.undo.category).toBe('edit-operation')

    expect(iconMappings.redo).toBeDefined()
    expect(iconMappings.redo.icon).toBe(Redo)
    expect(iconMappings.redo.tooltip).toBe('Redo')
    expect(iconMappings.redo.category).toBe('edit-operation')
  })

  it('contains reference image icons', () => {
    expect(iconMappings.referenceImage).toBeDefined()
    expect(iconMappings.referenceImage.icon).toBe(Image)
    expect(iconMappings.referenceImage.tooltip).toBe('Load Reference Image')
    expect(iconMappings.referenceImage.category).toBe('reference-image')
  })
})

describe('getIconsByCategory', () => {
  it('returns only wall type icons', () => {
    const wallTypeIcons = getIconsByCategory('wall-type')
    
    expect(Object.keys(wallTypeIcons)).toHaveLength(3)
    expect(wallTypeIcons.layoutWall).toBeDefined()
    expect(wallTypeIcons.zoneWall).toBeDefined()
    expect(wallTypeIcons.areaWall).toBeDefined()
    
    // Should not contain icons from other categories
    expect(wallTypeIcons.select).toBeUndefined()
    expect(wallTypeIcons.save).toBeUndefined()
  })

  it('returns only drawing tool icons', () => {
    const drawingToolIcons = getIconsByCategory('drawing-tool')
    
    expect(Object.keys(drawingToolIcons)).toHaveLength(4) // select, drawWall, delete, move
    expect(drawingToolIcons.select).toBeDefined()
    expect(drawingToolIcons.drawWall).toBeDefined()
    expect(drawingToolIcons.delete).toBeDefined()
    expect(drawingToolIcons.move).toBeDefined()
    
    // Should not contain icons from other categories
    expect(drawingToolIcons.layoutWall).toBeUndefined()
    expect(drawingToolIcons.save).toBeUndefined()
  })

  it('returns only view tool icons', () => {
    const viewToolIcons = getIconsByCategory('view-tool')
    
    expect(Object.keys(viewToolIcons)).toHaveLength(5) // grid, zoomIn, zoomOut, zoomFit, zoomActual
    expect(viewToolIcons.grid).toBeDefined()
    expect(viewToolIcons.zoomIn).toBeDefined()
    expect(viewToolIcons.zoomOut).toBeDefined()
    expect(viewToolIcons.zoomFit).toBeDefined()
    expect(viewToolIcons.zoomActual).toBeDefined()
  })

  it('returns only file operation icons', () => {
    const fileOperationIcons = getIconsByCategory('file-operation')
    
    expect(Object.keys(fileOperationIcons)).toHaveLength(3)
    expect(fileOperationIcons.save).toBeDefined()
    expect(fileOperationIcons.load).toBeDefined()
    expect(fileOperationIcons.export).toBeDefined()
  })

  it('returns empty object for non-existent category', () => {
    const nonExistentIcons = getIconsByCategory('non-existent' as any)
    expect(Object.keys(nonExistentIcons)).toHaveLength(0)
  })
})

describe('getIcon', () => {
  it('returns correct icon definition for valid key', () => {
    const layoutWallIcon = getIcon('layoutWall')
    
    expect(layoutWallIcon).toBeDefined()
    expect(layoutWallIcon?.icon).toBe(Building)
    expect(layoutWallIcon?.tooltip).toBe('Layout Wall (350mm)')
    expect(layoutWallIcon?.category).toBe('wall-type')
  })

  it('returns undefined for invalid key', () => {
    const invalidIcon = getIcon('nonExistentIcon')
    expect(invalidIcon).toBeUndefined()
  })

  it('works with all defined icon keys', () => {
    // Test with a few known keys
    const testKeys = ['layoutWall', 'select', 'grid', 'save']

    testKeys.forEach(key => {
      const icon = getIcon(key)
      expect(icon).toBeDefined()
      if (icon) {
        expect(icon.icon).toBeDefined()
        expect(icon.tooltip).toBeDefined()
        expect(icon.category).toBeDefined()
      }
    })
  })
})

describe('icon mapping structure', () => {
  it('has consistent structure for all icons', () => {
    // Test a few known icons
    const testIcons = ['layoutWall', 'select', 'grid', 'save']
    
    testIcons.forEach(key => {
      const definition = iconMappings[key]
      expect(definition).toBeDefined()
      
      if (definition) {
        expect(definition).toHaveProperty('icon')
        expect(definition).toHaveProperty('tooltip')
        expect(definition).toHaveProperty('category')
        
        expect(definition.icon).toBeDefined()
        expect(typeof definition.tooltip).toBe('string')
        expect(typeof definition.category).toBe('string')
        
        // Tooltip should not be empty
        expect(definition.tooltip.length).toBeGreaterThan(0)
      }
    })
  })

  it('has valid categories for all icons', () => {
    const validCategories = [
      'wall-type',
      'drawing-tool',
      'view-tool',
      'file-operation',
      'edit-operation',
      'layer-control',
      'reference-image'
    ]

    Object.entries(iconMappings).forEach(([key, definition]) => {
      expect(validCategories).toContain(definition.category)
    })
  })
})