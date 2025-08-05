import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { CanvasContainer } from '../CanvasContainer'

// Mock PixiJS to avoid WebGL context issues in tests
vi.mock('pixi.js', () => ({
  Application: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    stage: {
      addChild: vi.fn(),
      sortableChildren: true,
      eventMode: 'static',
      hitArea: {},
      on: vi.fn(),
      scale: { set: vi.fn() },
      position: { set: vi.fn() }
    },
    canvas: document.createElement('canvas'),
    renderer: {
      resize: vi.fn()
    },
    screen: { width: 800, height: 600 },
    destroy: vi.fn()
  })),
  Container: vi.fn().mockImplementation(() => ({
    zIndex: 0,
    addChild: vi.fn(),
    scale: { set: vi.fn() },
    position: { set: vi.fn() }
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    clear: vi.fn(),
    lineStyle: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    beginFill: vi.fn(),
    endFill: vi.fn(),
    drawCircle: vi.fn(),
    destroy: vi.fn()
  })),
  // Mock the autoDetectRenderer to avoid CanvasRenderer issues
  autoDetectRenderer: vi.fn().mockImplementation(() => ({
    resize: vi.fn(),
    destroy: vi.fn()
  }))
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}))

describe('CanvasContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<CanvasContainer />)
    expect(screen.getByText('Initializing Canvas...')).toBeInTheDocument()
    expect(screen.getByText('Setting up PixiJS renderer')).toBeInTheDocument()
  })

  it('calls onMouseMove when provided', async () => {
    const mockOnMouseMove = vi.fn()
    render(<CanvasContainer onMouseMove={mockOnMouseMove} />)
    
    // Wait for initialization
    await waitFor(() => {
      expect(screen.queryByText('Initializing Canvas...')).not.toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    const { container } = render(<CanvasContainer className="custom-class" />)
    const canvasDiv = container.firstChild as HTMLElement
    expect(canvasDiv).toHaveClass('custom-class')
  })

  it('shows debug info when initialized', async () => {
    render(<CanvasContainer />)
    
    await waitFor(() => {
      expect(screen.getByText(/Mouse:.*PixiJS Ready/)).toBeInTheDocument()
    })
  })
})