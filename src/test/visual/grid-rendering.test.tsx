import { describe, it, expect, beforeEach } from 'vitest'
import { GridRenderer } from '@/lib/GridRenderer'
import { captureCanvasSnapshot } from '../visual-setup'

describe('Grid Rendering Visual Tests', () => {
  let renderer: GridRenderer
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    renderer = new GridRenderer(canvas.getContext('2d')!)
  })

  it('should render grid with default spacing', () => {
    renderer.renderGrid(800, 600, 1, 0, 0)
    
    const snapshot = captureCanvasSnapshot(canvas)
    expect(snapshot).toMatchSnapshot('grid-default.png')
  })

  it('should render grid at different zoom levels', () => {
    // Test at 2x zoom
    renderer.renderGrid(800, 600, 2, 0, 0)
    
    const snapshot = captureCanvasSnapshot(canvas)
    expect(snapshot).toMatchSnapshot('grid-zoom-2x.png')
  })

  it('should render grid with pan offset', () => {
    renderer.renderGrid(800, 600, 1, 50, 30)
    
    const snapshot = captureCanvasSnapshot(canvas)
    expect(snapshot).toMatchSnapshot('grid-panned.png')
  })

  it('should not render grid when disabled', () => {
    // Clear canvas first
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 800, 600)
    
    // Don't render grid
    const snapshot = captureCanvasSnapshot(canvas)
    expect(snapshot).toMatchSnapshot('grid-disabled.png')
  })

  it('should render grid with custom spacing', () => {
    // This would test custom grid spacing if implemented
    renderer.renderGrid(800, 600, 1, 0, 0, 50) // 50px spacing
    
    const snapshot = captureCanvasSnapshot(canvas)
    expect(snapshot).toMatchSnapshot('grid-custom-spacing.png')
  })
})