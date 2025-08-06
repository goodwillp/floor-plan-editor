import { vi } from 'vitest'

// Enhanced canvas mocking for visual tests
const mockCanvas = document.createElement('canvas')
mockCanvas.width = 800
mockCanvas.height = 600

const mockContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
  transform: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(800 * 600 * 4),
    width: 800,
    height: 600
  })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(800 * 600 * 4),
    width: 800,
    height: 600
  })),
  drawImage: vi.fn(),
  // Style properties
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  globalAlpha: 1,
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
}

HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === '2d') {
    return mockContext
  }
  return null
})

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)

// Mock image loading for visual tests
global.Image = class MockImage {
  constructor() {
    this.onload = null
    this.onerror = null
    this.src = ''
    this.width = 100
    this.height = 100
  }
  
  set src(value) {
    this._src = value
    setTimeout(() => {
      if (this.onload) {
        this.onload()
      }
    }, 0)
  }
  
  get src() {
    return this._src
  }
}

// Visual comparison utilities
export const compareCanvasImages = (canvas1: HTMLCanvasElement, canvas2: HTMLCanvasElement): boolean => {
  const ctx1 = canvas1.getContext('2d')
  const ctx2 = canvas2.getContext('2d')
  
  if (!ctx1 || !ctx2) return false
  
  const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height)
  const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height)
  
  if (imageData1.data.length !== imageData2.data.length) return false
  
  for (let i = 0; i < imageData1.data.length; i++) {
    if (imageData1.data[i] !== imageData2.data[i]) return false
  }
  
  return true
}

export const captureCanvasSnapshot = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL()
}