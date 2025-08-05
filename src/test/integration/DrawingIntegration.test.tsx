import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import type { WallTypeString } from '@/lib/types'
import type { Tool } from '@/components/ToolPalette'

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn()
}))

// Mock PixiJS
vi.mock('pixi.js', () => ({
  Application: vi.fn(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    canvas: document.createElement('canvas'),
    stage: {
      addChild: vi.fn(),
      eventMode: '',
      hitArea: {},
      on: vi.fn(),
      sortableChildren: false
    },
    screen: { width: 800, height: 600 },
    renderer: {
      resize: vi.fn()
    },
    destroy: vi.fn()
  })),
  Graphics: vi.fn(() => ({
    clear: vi.fn(),
    lineStyle: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    beginFill: vi.fn(),
    endFill: vi.fn(),
    drawCircle: vi.fn(),
    destroy: vi.fn(),
    zIndex: 0
  })),
  Container: vi.fn(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    destroy: vi.fn(),
    zIndex: 0
  }))
}))

describe('Drawing Integration', () => {
  const defaultProps = {
    activeWallType: 'layout' as WallTypeString,
    activeTool: 'draw' as Tool,
    onMouseMove: vi.fn(),
    onWallCreated: vi.fn(),
    onStatusMessage: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render drawing canvas', () => {
    const { container } = render(<DrawingCanvas {...defaultProps} />)
    
    // The canvas container should be rendered
    const canvasContainer = container.querySelector('[data-testid="canvas-container"]')
    expect(canvasContainer).toBeInTheDocument()
  })

  it('should handle tool changes', () => {
    const onStatusMessage = vi.fn()
    const { rerender } = render(
      <DrawingCanvas {...defaultProps} onStatusMessage={onStatusMessage} />
    )

    // Change to select tool
    rerender(
      <DrawingCanvas 
        {...defaultProps} 
        activeTool="select" 
        onStatusMessage={onStatusMessage}
      />
    )

    // Should handle tool change without errors
    expect(onStatusMessage).toHaveBeenCalled()
  })

  it('should handle wall type changes', () => {
    const onStatusMessage = vi.fn()
    const { rerender } = render(
      <DrawingCanvas {...defaultProps} onStatusMessage={onStatusMessage} />
    )

    // Change wall type
    rerender(
      <DrawingCanvas 
        {...defaultProps} 
        activeWallType="zone" 
        onStatusMessage={onStatusMessage}
      />
    )

    // Should handle wall type change without errors
    expect(onStatusMessage).toHaveBeenCalled()
  })

  it('should provide status messages for different tools', () => {
    const onStatusMessage = vi.fn()
    
    render(
      <DrawingCanvas 
        {...defaultProps} 
        activeTool="draw"
        onStatusMessage={onStatusMessage}
      />
    )

    // Should provide status message for draw tool
    expect(onStatusMessage).toHaveBeenCalledWith(
      expect.stringContaining('Draw tool active')
    )
  })
})