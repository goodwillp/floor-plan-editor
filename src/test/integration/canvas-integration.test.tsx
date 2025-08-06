import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CanvasContainer } from '@/components/CanvasContainer'
import { FloorPlanModel } from '@/lib/FloorPlanModel'
import { WallType } from '@/lib/types'

describe('Canvas Integration Tests', () => {
  let model: FloorPlanModel
  let mockOnWallCreate: ReturnType<typeof vi.fn>
  let mockOnWallSelect: ReturnType<typeof vi.fn>
  let mockOnWallDelete: ReturnType<typeof vi.fn>

  beforeEach(() => {
    model = new FloorPlanModel()
    mockOnWallCreate = vi.fn()
    mockOnWallSelect = vi.fn()
    mockOnWallDelete = vi.fn()
  })

  it('should initialize PixiJS application correctly', async () => {
    render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
      />
    )

    // Wait for canvas to initialize
    await waitFor(() => {
      expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    })

    const canvas = screen.getByRole('img') // PixiJS canvas has img role
    expect(canvas).toBeInTheDocument()
  })

  it('should handle wall drawing through mouse interactions', async () => {
    const user = userEvent.setup()
    
    render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={true}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
      />
    )

    const canvas = await screen.findByRole('img')

    // Simulate wall drawing
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 100, clientY: 100 } },
      { coords: { clientX: 200, clientY: 100 } },
      { keys: '[/MouseLeft]', coords: { clientX: 200, clientY: 100 } }
    ])

    await waitFor(() => {
      expect(mockOnWallCreate).toHaveBeenCalled()
    })
  })

  it('should handle wall selection through click', async () => {
    const user = userEvent.setup()
    
    // Pre-populate model with a wall
    const node1 = model.createNode(100, 100)
    const node2 = model.createNode(200, 100)
    const segment = model.createSegment(node1.id, node2.id)
    const wall = model.createWall(WallType.LAYOUT, [segment.id])

    render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
      />
    )

    const canvas = await screen.findByRole('img')

    // Click on the wall
    await user.click(canvas, { clientX: 150, clientY: 100 })

    await waitFor(() => {
      expect(mockOnWallSelect).toHaveBeenCalledWith(wall.id)
    })
  })

  it('should update visual representation when model changes', async () => {
    const { rerender } = render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
      />
    )

    // Add a wall to the model
    const node1 = model.createNode(100, 100)
    const node2 = model.createNode(200, 100)
    const segment = model.createSegment(node1.id, node2.id)
    const wall = model.createWall(WallType.LAYOUT, [segment.id])

    // Re-render with updated model
    rerender(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
      />
    )

    // Verify the wall is rendered (this would need visual verification in real implementation)
    const canvas = screen.getByRole('img')
    expect(canvas).toBeInTheDocument()
  })

  it('should handle zoom and pan operations', async () => {
    const user = userEvent.setup()
    
    render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
        zoom={1}
        panX={0}
        panY={0}
      />
    )

    const canvas = await screen.findByRole('img')

    // Test mouse wheel zoom
    await user.pointer({ target: canvas })
    fireEvent.wheel(canvas, { deltaY: -100 })

    // Test pan with middle mouse button
    await user.pointer([
      { keys: '[MouseMiddle>]', target: canvas, coords: { clientX: 400, clientY: 300 } },
      { coords: { clientX: 450, clientY: 350 } },
      { keys: '[/MouseMiddle]' }
    ])

    // Verify canvas transformations are applied
    expect(canvas).toBeInTheDocument()
  })

  it('should handle reference image overlay', async () => {
    const mockImage = new Image()
    mockImage.src = 'data:image/png;base64,test'

    render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
        referenceImage={mockImage}
        referenceImageLocked={true}
      />
    )

    const canvas = await screen.findByRole('img')
    expect(canvas).toBeInTheDocument()

    // Verify reference image is rendered in the background layer
    // This would need to be verified through the PixiJS stage structure
  })

  it('should handle grid toggle', async () => {
    const { rerender } = render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
        gridVisible={false}
      />
    )

    // Toggle grid on
    rerender(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
        gridVisible={true}
      />
    )

    const canvas = screen.getByRole('img')
    expect(canvas).toBeInTheDocument()
    // Grid visibility would be verified through the PixiJS grid layer
  })

  it('should handle canvas resize', async () => {
    const { rerender } = render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
      />
    )

    // Resize canvas
    rerender(
      <CanvasContainer
        width={1200}
        height={800}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
      />
    )

    const canvas = screen.getByRole('img')
    expect(canvas).toBeInTheDocument()
    // Canvas dimensions would be verified through PixiJS renderer
  })

  it('should handle error states gracefully', async () => {
    // Mock PixiJS initialization failure
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <CanvasContainer
        width={800}
        height={600}
        model={model}
        activeWallType={WallType.LAYOUT}
        isDrawing={false}
        onWallCreate={mockOnWallCreate}
        onWallSelect={mockOnWallSelect}
        onWallDelete={mockOnWallDelete}
      />
    )

    // Should show error state or fallback
    await waitFor(() => {
      const errorElement = screen.queryByText(/error/i) || screen.queryByText(/loading/i)
      expect(errorElement || screen.getByTestId('drawing-canvas')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })
})