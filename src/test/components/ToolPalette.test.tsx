import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToolPalette } from '@/components/ToolPalette'
import type { WallTypeString } from '@/lib/types'

// Mock the UI components
vi.mock('@/components/ui/icon-button', () => ({
  IconButton: ({ tooltip, isActive, onClick }: any) => (
    <button 
      data-testid={`icon-button-${tooltip.toLowerCase().replace(/\s+/g, '-')}`}
      data-active={isActive}
      onClick={onClick}
    >
      {tooltip}
    </button>
  )
}))

vi.mock('@/components/ui/toggle-icon-button', () => ({
  ToggleIconButton: ({ tooltip, isToggled, onToggle }: any) => (
    <button 
      data-testid={`toggle-button-${tooltip.toLowerCase().replace(/\s+/g, '-')}`}
      data-toggled={isToggled}
      onClick={() => onToggle(!isToggled)}
    >
      {tooltip}
    </button>
  )
}))

vi.mock('@/components/ui/button-group', () => ({
  ButtonGroup: ({ children }: any) => <div data-testid="button-group">{children}</div>
}))

vi.mock('@/lib/icon-mappings', () => ({
  iconMappings: {
    layoutWall: { icon: 'Building', tooltip: 'Layout Wall (350mm)' },
    zoneWall: { icon: 'Square', tooltip: 'Zone Wall (250mm)' },
    areaWall: { icon: 'Rectangle', tooltip: 'Area Wall (150mm)' },
    select: { icon: 'MousePointer', tooltip: 'Select Tool' },
    drawWall: { icon: 'Pencil', tooltip: 'Draw Wall' },
    delete: { icon: 'Trash2', tooltip: 'Delete Tool' },
    grid: { icon: 'Grid3x3', tooltip: 'Toggle Grid' },
    referenceImage: { icon: 'Image', tooltip: 'Load Reference Image' }
  }
}))

describe('ToolPalette Wall Type System', () => {
  const defaultProps = {
    activeWallType: 'layout' as WallTypeString,
    activeTool: 'select' as const,
    gridVisible: false,
    onWallTypeChange: vi.fn(),
    onToolChange: vi.fn(),
    onGridToggle: vi.fn(),
    onReferenceImageLoad: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Wall Type Selection', () => {
    it('should render all three wall types with correct tooltips', () => {
      // Requirements: 1.1, 1.2, 1.3
      render(<ToolPalette {...defaultProps} />)
      
      expect(screen.getByTestId('icon-button-layout-wall-(350mm)')).toBeInTheDocument()
      expect(screen.getByTestId('icon-button-zone-wall-(250mm)')).toBeInTheDocument()
      expect(screen.getByTestId('icon-button-area-wall-(150mm)')).toBeInTheDocument()
    })

    it('should show layout wall as active by default', () => {
      // Requirements: 1.1
      render(<ToolPalette {...defaultProps} activeWallType="layout" />)
      
      const layoutButton = screen.getByTestId('icon-button-layout-wall-(350mm)')
      expect(layoutButton).toHaveAttribute('data-active', 'true')
    })

    it('should show zone wall as active when selected', () => {
      // Requirements: 1.2
      render(<ToolPalette {...defaultProps} activeWallType="zone" />)
      
      const zoneButton = screen.getByTestId('icon-button-zone-wall-(250mm)')
      expect(zoneButton).toHaveAttribute('data-active', 'true')
      
      const layoutButton = screen.getByTestId('icon-button-layout-wall-(350mm)')
      expect(layoutButton).toHaveAttribute('data-active', 'false')
    })

    it('should show area wall as active when selected', () => {
      // Requirements: 1.3
      render(<ToolPalette {...defaultProps} activeWallType="area" />)
      
      const areaButton = screen.getByTestId('icon-button-area-wall-(150mm)')
      expect(areaButton).toHaveAttribute('data-active', 'true')
      
      const layoutButton = screen.getByTestId('icon-button-layout-wall-(350mm)')
      expect(layoutButton).toHaveAttribute('data-active', 'false')
    })

    it('should call onWallTypeChange when layout wall is clicked', () => {
      // Requirements: 1.1
      render(<ToolPalette {...defaultProps} activeWallType="zone" />)
      
      const layoutButton = screen.getByTestId('icon-button-layout-wall-(350mm)')
      fireEvent.click(layoutButton)
      
      expect(defaultProps.onWallTypeChange).toHaveBeenCalledWith('layout')
    })

    it('should call onWallTypeChange when zone wall is clicked', () => {
      // Requirements: 1.2
      render(<ToolPalette {...defaultProps} activeWallType="layout" />)
      
      const zoneButton = screen.getByTestId('icon-button-zone-wall-(250mm)')
      fireEvent.click(zoneButton)
      
      expect(defaultProps.onWallTypeChange).toHaveBeenCalledWith('zone')
    })

    it('should call onWallTypeChange when area wall is clicked', () => {
      // Requirements: 1.3
      render(<ToolPalette {...defaultProps} activeWallType="layout" />)
      
      const areaButton = screen.getByTestId('icon-button-area-wall-(150mm)')
      fireEvent.click(areaButton)
      
      expect(defaultProps.onWallTypeChange).toHaveBeenCalledWith('area')
    })
  })

  describe('Wall Type Display', () => {
    it('should display correct thickness in tooltips', () => {
      // Requirements: 1.1, 1.2, 1.3
      render(<ToolPalette {...defaultProps} />)
      
      expect(screen.getByText('Layout Wall (350mm)')).toBeInTheDocument()
      expect(screen.getByText('Zone Wall (250mm)')).toBeInTheDocument()
      expect(screen.getByText('Area Wall (150mm)')).toBeInTheDocument()
    })

    it('should maintain wall type selection state', () => {
      const { rerender } = render(<ToolPalette {...defaultProps} activeWallType="layout" />)
      
      let layoutButton = screen.getByTestId('icon-button-layout-wall-(350mm)')
      expect(layoutButton).toHaveAttribute('data-active', 'true')
      
      // Change to zone wall
      rerender(<ToolPalette {...defaultProps} activeWallType="zone" />)
      
      layoutButton = screen.getByTestId('icon-button-layout-wall-(350mm)')
      const zoneButton = screen.getByTestId('icon-button-zone-wall-(250mm)')
      
      expect(layoutButton).toHaveAttribute('data-active', 'false')
      expect(zoneButton).toHaveAttribute('data-active', 'true')
    })
  })

  describe('Integration with Other Tools', () => {
    it('should render drawing tools alongside wall types', () => {
      render(<ToolPalette {...defaultProps} />)
      
      expect(screen.getByTestId('icon-button-select-tool')).toBeInTheDocument()
      expect(screen.getByTestId('icon-button-draw-wall')).toBeInTheDocument()
      expect(screen.getByTestId('icon-button-delete-tool')).toBeInTheDocument()
    })

    it('should render view tools alongside wall types', () => {
      render(<ToolPalette {...defaultProps} />)
      
      expect(screen.getByTestId('toggle-button-toggle-grid')).toBeInTheDocument()
      expect(screen.getByTestId('icon-button-load-reference-image')).toBeInTheDocument()
    })

    it('should maintain independent state for wall types and other tools', () => {
      render(<ToolPalette {...defaultProps} activeWallType="zone" activeTool="draw" />)
      
      const zoneButton = screen.getByTestId('icon-button-zone-wall-(250mm)')
      const drawButton = screen.getByTestId('icon-button-draw-wall')
      
      expect(zoneButton).toHaveAttribute('data-active', 'true')
      expect(drawButton).toHaveAttribute('data-active', 'true')
    })
  })
})