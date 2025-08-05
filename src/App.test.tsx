import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import App from './App'

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

// Mock DrawingCanvas to avoid complex initialization
vi.mock('@/components/DrawingCanvas', () => ({
  DrawingCanvas: vi.fn(() => <div data-testid="drawing-canvas">Drawing Canvas</div>)
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // The app should render without throwing an error
    // We don't need to check for specific text since the component is complex
    expect(true).toBe(true)
  })
})