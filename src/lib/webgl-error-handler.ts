/**
 * WebGL Error Handler
 * Handles WebGL context loss and recovery
 */

export interface WebGLErrorHandler {
  handleContextLoss: () => void
  handleContextRestore: () => void
  isContextLost: () => boolean
}

export class WebGLContextManager {
  private canvas: HTMLCanvasElement | null = null
  private gl: WebGLRenderingContext | null = null
  private contextLost = false
  private onContextLoss?: () => void
  private onContextRestore?: () => void

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.setCanvas(canvas)
    }
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.setupEventListeners()
    this.initializeContext()
  }

  private setupEventListeners() {
    if (!this.canvas) return

    this.canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this), false)
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this), false)
  }

  private handleContextLost(event: Event) {
    event.preventDefault()
    this.contextLost = true
    console.warn('WebGL context lost')
    
    if (this.onContextLoss) {
      this.onContextLoss()
    }
  }

  private handleContextRestored() {
    this.contextLost = false
    console.log('WebGL context restored')
    
    this.initializeContext()
    
    if (this.onContextRestore) {
      this.onContextRestore()
    }
  }

  private initializeContext() {
    if (!this.canvas) return

    try {
      this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl')
      if (!this.gl) {
        throw new Error('WebGL not supported')
      }
    } catch (error) {
      console.error('Failed to initialize WebGL context:', error)
    }
  }

  isContextLost(): boolean {
    return this.contextLost || (this.gl?.isContextLost() ?? true)
  }

  getContext(): WebGLRenderingContext | null {
    return this.contextLost ? null : this.gl
  }

  setOnContextLoss(callback: () => void) {
    this.onContextLoss = callback
  }

  setOnContextRestore(callback: () => void) {
    this.onContextRestore = callback
  }

  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost.bind(this))
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored.bind(this))
    }
    this.canvas = null
    this.gl = null
  }
}

/**
 * Check if WebGL is supported in the current browser
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch (error) {
    return false
  }
}

/**
 * Get WebGL capabilities and limitations
 */
export function getWebGLInfo(): {
  supported: boolean
  version?: string
  vendor?: string
  renderer?: string
  maxTextureSize?: number
  maxViewportDims?: [number, number]
} {
  if (!isWebGLSupported()) {
    return { supported: false }
  }

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (!gl) {
      return { supported: false }
    }

    return {
      supported: true,
      version: gl.getParameter(gl.VERSION),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
    }
  } catch (error) {
    console.error('Error getting WebGL info:', error)
    return { supported: false }
  }
}