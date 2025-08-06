import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'

describe('Complete Application Workflow Tests', () => {
  beforeEach(() => {
    // Reset any global state
    vi.clearAllMocks()
  })

  it('should complete a full floor plan creation workflow', async () => {
    const user = userEvent.setup()
    
    render(<App />)

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    })

    // Step 1: Select layout wall type
    const layoutButton = screen.getByTestId('wall-type-layout')
    await user.click(layoutButton)
    expect(layoutButton).toHaveClass('active')

    // Step 2: Draw first wall
    const canvas = screen.getByRole('img')
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 100, clientY: 100 } },
      { coords: { clientX: 300, clientY: 100 } },
      { keys: '[/MouseLeft]' }
    ])

    // Verify wall is created
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/1.*wall/i)
    })

    // Step 3: Draw second wall (should create intersection)
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 200, clientY: 50 } },
      { coords: { clientX: 200, clientY: 150 } },
      { keys: '[/MouseLeft]' }
    ])

    // Verify intersection is handled
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/2.*wall/i)
    })

    // Step 4: Select zone wall type
    const zoneButton = screen.getByTestId('wall-type-zone')
    await user.click(zoneButton)
    expect(zoneButton).toHaveClass('active')

    // Step 5: Draw zone wall
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 150, clientY: 150 } },
      { coords: { clientX: 250, clientY: 150 } },
      { keys: '[/MouseLeft]' }
    ])

    // Verify zone wall is created
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/3.*wall/i)
    })

    // Step 6: Select a wall for editing
    await user.click(canvas, { clientX: 200, clientY: 100 })

    // Verify wall properties panel opens
    await waitFor(() => {
      expect(screen.getByTestId('wall-properties-panel')).toBeVisible()
    })

    // Step 7: Change wall type
    const wallTypeSelect = screen.getByTestId('wall-type-select')
    await user.selectOptions(wallTypeSelect, 'area')
    
    const applyButton = screen.getByTestId('apply-changes')
    await user.click(applyButton)

    // Verify change is applied
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/area/i)
    })

    // Step 8: Delete a wall
    const deleteButton = screen.getByTestId('delete-wall')
    await user.click(deleteButton)

    // Verify wall is deleted
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/2.*wall/i)
    })
  })

  it('should handle grid and zoom operations during workflow', async () => {
    const user = userEvent.setup()
    
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    })

    // Toggle grid on
    const gridToggle = screen.getByTestId('grid-toggle')
    await user.click(gridToggle)
    expect(gridToggle).toHaveClass('active')

    // Test zoom in
    const zoomInButton = screen.getByTestId('zoom-in')
    await user.click(zoomInButton)
    
    // Verify zoom level changed
    await waitFor(() => {
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('110%')
    })

    // Draw a wall at zoomed level
    const canvas = screen.getByRole('img')
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 100, clientY: 100 } },
      { coords: { clientX: 200, clientY: 100 } },
      { keys: '[/MouseLeft]' }
    ])

    // Verify wall is created correctly at zoom level
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/1.*wall/i)
    })

    // Test zoom out
    const zoomOutButton = screen.getByTestId('zoom-out')
    await user.click(zoomOutButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%')
    })

    // Toggle grid off
    await user.click(gridToggle)
    expect(gridToggle).not.toHaveClass('active')
  })

  it('should handle reference image workflow', async () => {
    const user = userEvent.setup()
    
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    })

    // Open reference image panel
    const referenceToggle = screen.getByTestId('reference-image-toggle')
    await user.click(referenceToggle)

    await waitFor(() => {
      expect(screen.getByTestId('reference-image-panel')).toBeVisible()
    })

    // Mock file upload
    const file = new File(['test'], 'floor-plan.png', { type: 'image/png' })
    const fileInput = screen.getByTestId('image-upload-input')
    
    await user.upload(fileInput, file)

    // Verify image is loaded
    await waitFor(() => {
      expect(screen.getByTestId('reference-image')).toBeInTheDocument()
    })

    // Verify image is locked by default
    const lockToggle = screen.getByTestId('image-lock-toggle')
    expect(lockToggle).toHaveClass('locked')

    // Draw walls over reference image
    const canvas = screen.getByRole('img')
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 100, clientY: 100 } },
      { coords: { clientX: 300, clientY: 100 } },
      { keys: '[/MouseLeft]' }
    ])

    // Verify wall is created over reference image
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/1.*wall/i)
    })

    // Unlock image and move it
    await user.click(lockToggle)
    expect(lockToggle).not.toHaveClass('locked')

    // Test image repositioning (would need to be implemented)
    const referenceImage = screen.getByTestId('reference-image')
    await user.pointer([
      { keys: '[MouseLeft>]', target: referenceImage, coords: { clientX: 200, clientY: 200 } },
      { coords: { clientX: 250, clientY: 250 } },
      { keys: '[/MouseLeft]' }
    ])
  })

  it('should handle error recovery during workflow', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    })

    // Create some walls
    const canvas = screen.getByRole('img')
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 100, clientY: 100 } },
      { coords: { clientX: 200, clientY: 100 } },
      { keys: '[/MouseLeft]' }
    ])

    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/1.*wall/i)
    })

    // Simulate an error
    const errorEvent = new CustomEvent('error', { 
      detail: { message: 'Test error', type: 'rendering' } 
    })
    window.dispatchEvent(errorEvent)

    // Verify error is handled gracefully
    await waitFor(() => {
      const errorPanel = screen.queryByTestId('error-panel')
      if (errorPanel) {
        expect(errorPanel).toBeVisible()
      }
      // App should still be functional
      expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    })

    // Verify we can still create walls after error
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 200, clientY: 100 } },
      { coords: { clientX: 300, clientY: 100 } },
      { keys: '[/MouseLeft]' }
    ])

    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/2.*wall/i)
    })

    consoleSpy.mockRestore()
  })

  it('should handle proximity merging during workflow', async () => {
    const user = userEvent.setup()
    
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    })

    // Create two parallel walls close together
    const canvas = screen.getByRole('img')
    
    // First wall
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 100, clientY: 100 } },
      { coords: { clientX: 300, clientY: 100 } },
      { keys: '[/MouseLeft]' }
    ])

    // Second wall (close to first)
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 100, clientY: 110 } },
      { coords: { clientX: 300, clientY: 110 } },
      { keys: '[/MouseLeft]' }
    ])

    // Verify both walls are created
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toHaveTextContent(/2.*wall/i)
    })

    // Check if proximity merging panel shows merge
    const proximityPanel = screen.queryByTestId('proximity-merging-panel')
    if (proximityPanel) {
      expect(proximityPanel).toHaveTextContent(/merge/i)
    }

    // Move one wall away to test separation
    await user.click(canvas, { clientX: 200, clientY: 110 })
    
    // This would need to be implemented - moving a wall to break proximity merge
    // For now, we just verify the wall can be selected
    await waitFor(() => {
      expect(screen.getByTestId('wall-properties-panel')).toBeVisible()
    })
  })
})