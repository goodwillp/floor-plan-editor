import { expect, afterEach, vi, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import 'vitest-canvas-mock'

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Mock ResizeObserver for tests
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver for tests
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock PixiJS Application for tests
vi.mock('pixi.js', async () => {
  const actual = await vi.importActual('pixi.js')
  return {
    ...actual,
    Application: vi.fn().mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(undefined),
      stage: {
        addChild: vi.fn(),
        removeChild: vi.fn(),
        children: [],
        destroy: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        eventMode: 'static',
        hitArea: null,
        scale: { set: vi.fn(), x: 1, y: 1 },
        position: { set: vi.fn(), x: 0, y: 0 },
        sortableChildren: true,
      },
      renderer: {
        width: 800,
        height: 600,
        resize: vi.fn(),
        destroy: vi.fn(),
      },
      view: {
        canvas: document.createElement('canvas'),
        style: {},
      },
      canvas: document.createElement('canvas'),
      screen: { width: 800, height: 600 },
      destroy: vi.fn(),
    })),
    Container: vi.fn().mockImplementation(() => ({
      addChild: vi.fn(),
      removeChild: vi.fn(),
      children: [],
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      x: 0,
      y: 0,
      visible: true,
      alpha: 1,
      scale: { set: vi.fn(), x: 1, y: 1 },
      position: { set: vi.fn(), x: 0, y: 0 },
      zIndex: 0,
    })),
    Graphics: vi.fn().mockImplementation(() => ({
      clear: vi.fn(),
      lineStyle: vi.fn(),
      beginFill: vi.fn(),
      endFill: vi.fn(),
      drawRect: vi.fn(),
      drawCircle: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      x: 0,
      y: 0,
      visible: true,
      alpha: 1,
      scale: { set: vi.fn(), x: 1, y: 1 },
      position: { set: vi.fn(), x: 0, y: 0 },
    })),
    Sprite: vi.fn().mockImplementation(() => ({
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      visible: true,
      alpha: 1,
      anchor: { set: vi.fn(), x: 0.5, y: 0.5 },
      scale: { set: vi.fn(), x: 1, y: 1 },
      position: { set: vi.fn(), x: 0, y: 0 },
    })),
    Texture: {
      from: vi.fn().mockReturnValue({
        destroy: vi.fn(),
        width: 100,
        height: 100,
      }),
    },
  }
})

// Mock File API for image upload tests
global.File = class MockFile {
  constructor(bits, name, options = {}) {
    this.bits = bits
    this.name = name
    this.size = options.size || 0
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
  }
}

global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0
    this.result = null
    this.error = null
    this.onload = null
    this.onerror = null
    this.onabort = null
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2
      this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      if (this.onload) this.onload({ target: this })
    }, 0)
  }
  
  abort() {
    this.readyState = 2
    if (this.onabort) this.onabort({ target: this })
  }
}

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock matchMedia for accessibility tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
}))

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock')

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})