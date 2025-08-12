/**
 * Debug utilities for development
 */

let renderCount = 0
let lastRenderTime = Date.now()
const renderCounts = new Map<string, number>()

/**
 * Track component renders to detect infinite loops
 */
export function trackRender(componentName: string) {
  if (process.env.NODE_ENV !== 'development') return

  renderCount++
  const currentTime = Date.now()
  const timeSinceLastRender = currentTime - lastRenderTime
  
  // Track per-component render counts
  const componentRenderCount = (renderCounts.get(componentName) || 0) + 1
  renderCounts.set(componentName, componentRenderCount)
  
  // Warn if component is rendering too frequently
  if (componentRenderCount > 10 && timeSinceLastRender < 100) {
    console.warn(`⚠️ ${componentName} has rendered ${componentRenderCount} times in quick succession`)
  }
  
  // Warn if total renders are excessive
  if (renderCount > 50 && timeSinceLastRender < 1000) {
    console.warn(`⚠️ Total renders: ${renderCount} in ${currentTime - (lastRenderTime - 1000)}ms`)
    console.warn('Component render counts:', Object.fromEntries(renderCounts))
  }
  
  lastRenderTime = currentTime
}

/**
 * Reset render tracking
 */
export function resetRenderTracking() {
  renderCount = 0
  renderCounts.clear()
  lastRenderTime = Date.now()
}

/**
 * Log WebGL context information
 */
export function logWebGLInfo() {
  if (process.env.NODE_ENV !== 'development') return

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (!gl) {
      console.log('🔴 WebGL not supported')
      return
    }
    
    console.log('🟢 WebGL supported')
    const webglContext = gl as WebGLRenderingContext;
    console.log('WebGL Info:', {
      version: webglContext.getParameter(webglContext.VERSION),
      vendor: webglContext.getParameter(webglContext.VENDOR),
      renderer: webglContext.getParameter(webglContext.RENDERER),
      maxTextureSize: webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE),
      maxViewportDims: webglContext.getParameter(webglContext.MAX_VIEWPORT_DIMS)
    })
  } catch (error) {
    console.error('Error checking WebGL:', error)
  }
}

/**
 * Monitor memory usage
 */
export function logMemoryUsage() {
  if (process.env.NODE_ENV !== 'development') return
  
  if ('memory' in performance) {
    const memory = (performance as any).memory
    console.log('Memory Usage:', {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`
    })
  }
}

/**
 * Detect and log potential infinite loops
 */
export function detectInfiniteLoop(threshold = 100) {
  if (process.env.NODE_ENV !== 'development') return

  let callCount = 0
  const startTime = Date.now()
  
  return function checkLoop(functionName: string) {
    callCount++
    const elapsed = Date.now() - startTime
    
    if (callCount > threshold && elapsed < 1000) {
      console.error(`🚨 Potential infinite loop detected in ${functionName}`)
      console.error(`Called ${callCount} times in ${elapsed}ms`)
      console.trace('Call stack:')
      return true
    }
    
    return false
  }
}