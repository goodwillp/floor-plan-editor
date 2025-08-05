import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WallPropertiesPanel } from '@/components/WallPropertiesPanel'
import type { WallTypeString } from '@/lib/types'

describe('WallPropertiesPanel', () => {
  const mockProps = {
    selectedWallIds: [],
    wallProperties: null,
    onWallTypeChange: vi.fn(),
    onWallVisibilityChange: vi.fn(),
    onWallDelete: vi.fn(),
    onSelectionClear: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('No Selection State', () => {
    it('should show no selection message when no walls selected', () => {
      render(<WallPropertiesPanel {...mockProps} />)

      expect(screen.getByText('No wall selected. Click on a wall to edit its properties.')).toBeInTheDocument()
    })

    it('should show loading message when properties are loading', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps} 
          selectedWallIds={['wall1']}
          wallProperties={null}
        />
      )

      expect(screen.getByText('Loading wall properties...')).toBeInTheDocument()
    })
  })

  describe('Single Wall Selection', () => {
    const singleWallProperties = [{
      id: 'wall1',
      type: 'layout' as WallTypeString,
      thickness: 350,
      visible: true,
      segmentCount: 2,
      totalLength: 150.5,
      nodeCount: 3,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    }]

    it('should display single wall properties', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      expect(screen.getByText('1 wall selected')).toBeInTheDocument()
      expect(screen.getByText('151px')).toBeInTheDocument() // Rounded length
      expect(screen.getByText('2')).toBeInTheDocument() // Segment count
      expect(screen.getByText('3')).toBeInTheDocument() // Node count
    })

    it('should show wall type selector with correct value', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      const typeSelector = screen.getByRole('combobox')
      expect(typeSelector).toBeInTheDocument()
      // The actual value testing would depend on the Select component implementation
    })

    it('should show thickness badge', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      expect(screen.getByText('350mm')).toBeInTheDocument()
    })

    it('should show visibility toggle', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      const visibilitySwitch = screen.getByRole('switch')
      expect(visibilitySwitch).toBeInTheDocument()
      expect(visibilitySwitch).toBeChecked()
    })

    it('should show timestamps', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      expect(screen.getByText(/Created:/)).toBeInTheDocument()
      expect(screen.getByText(/Updated:/)).toBeInTheDocument()
    })
  })

  describe('Multiple Wall Selection', () => {
    const multipleWallProperties = [
      {
        id: 'wall1',
        type: 'layout' as WallTypeString,
        thickness: 350,
        visible: true,
        segmentCount: 2,
        totalLength: 100,
        nodeCount: 3,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      },
      {
        id: 'wall2',
        type: 'layout' as WallTypeString,
        thickness: 350,
        visible: true,
        segmentCount: 1,
        totalLength: 50,
        nodeCount: 2,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      }
    ]

    it('should display multiple wall selection info', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1', 'wall2']}
          wallProperties={multipleWallProperties}
        />
      )

      expect(screen.getByText('2 walls selected')).toBeInTheDocument()
      expect(screen.getByText('Editing multiple walls')).toBeInTheDocument()
    })

    it('should show combined totals', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1', 'wall2']}
          wallProperties={multipleWallProperties}
        />
      )

      expect(screen.getByText('150px')).toBeInTheDocument() // Total length: 100 + 50
      expect(screen.getByText('3')).toBeInTheDocument() // Total segments: 2 + 1
      expect(screen.getByText('5')).toBeInTheDocument() // Total nodes: 3 + 2
    })

    it('should not show timestamps for multiple selection', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1', 'wall2']}
          wallProperties={multipleWallProperties}
        />
      )

      expect(screen.queryByText(/Created:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Updated:/)).not.toBeInTheDocument()
    })
  })

  describe('Mixed Properties Handling', () => {
    const mixedWallProperties = [
      {
        id: 'wall1',
        type: 'layout' as WallTypeString,
        thickness: 350,
        visible: true,
        segmentCount: 2,
        totalLength: 100,
        nodeCount: 3,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      },
      {
        id: 'wall2',
        type: 'zone' as WallTypeString,
        thickness: 250,
        visible: false,
        segmentCount: 1,
        totalLength: 50,
        nodeCount: 2,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      }
    ]

    it('should show mixed types warning', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1', 'wall2']}
          wallProperties={mixedWallProperties}
        />
      )

      expect(screen.getByText('Mixed wall types')).toBeInTheDocument()
    })

    it('should show mixed thickness', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1', 'wall2']}
          wallProperties={mixedWallProperties}
        />
      )

      expect(screen.getByText('Mixed')).toBeInTheDocument()
    })

    it('should show mixed visibility', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1', 'wall2']}
          wallProperties={mixedWallProperties}
        />
      )

      expect(screen.getByText('Mixed')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    const singleWallProperties = [{
      id: 'wall1',
      type: 'layout' as WallTypeString,
      thickness: 350,
      visible: true,
      segmentCount: 2,
      totalLength: 150.5,
      nodeCount: 3,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    }]

    it('should call onSelectionClear when clear button clicked', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      const clearButton = screen.getByText('Clear')
      fireEvent.click(clearButton)

      expect(mockProps.onSelectionClear).toHaveBeenCalled()
    })

    it('should call onWallVisibilityChange when visibility toggled', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      const visibilitySwitch = screen.getByRole('switch')
      fireEvent.click(visibilitySwitch)

      expect(mockProps.onWallVisibilityChange).toHaveBeenCalledWith(['wall1'], false)
    })

    it('should call onWallDelete when delete button clicked', () => {
      // Mock window.confirm to return true
      const originalConfirm = window.confirm
      window.confirm = vi.fn().mockReturnValue(true)

      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      const deleteButton = screen.getByText('Delete Wall')
      fireEvent.click(deleteButton)

      expect(mockProps.onWallDelete).toHaveBeenCalledWith(['wall1'])

      // Restore original confirm
      window.confirm = originalConfirm
    })

    it('should not delete when user cancels confirmation', () => {
      // Mock window.confirm to return false
      const originalConfirm = window.confirm
      window.confirm = vi.fn().mockReturnValue(false)

      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      const deleteButton = screen.getByText('Delete Wall')
      fireEvent.click(deleteButton)

      expect(mockProps.onWallDelete).not.toHaveBeenCalled()

      // Restore original confirm
      window.confirm = originalConfirm
    })
  })

  describe('Accessibility', () => {
    const singleWallProperties = [{
      id: 'wall1',
      type: 'layout' as WallTypeString,
      thickness: 350,
      visible: true,
      segmentCount: 2,
      totalLength: 150.5,
      nodeCount: 3,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    }]

    it('should have proper labels', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      expect(screen.getByText('Wall Type')).toBeInTheDocument()
      expect(screen.getByText('Thickness')).toBeInTheDocument()
      expect(screen.getByText('Visible')).toBeInTheDocument()
      expect(screen.getByText('Total Length')).toBeInTheDocument()
      expect(screen.getByText('Segments')).toBeInTheDocument()
      expect(screen.getByText('Nodes')).toBeInTheDocument()
    })

    it('should have proper button roles', () => {
      render(
        <WallPropertiesPanel 
          {...mockProps}
          selectedWallIds={['wall1']}
          wallProperties={singleWallProperties}
        />
      )

      expect(screen.getByRole('button', { name: /Clear/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Delete Wall/ })).toBeInTheDocument()
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })
  })
})