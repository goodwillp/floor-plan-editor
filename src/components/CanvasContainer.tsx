import { useEffect, useRef, useState, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { cn } from '@/lib/utils'
import type { Point } from '@/lib/types'
import { useViewport } from '@/hooks/useViewport'
import type { ViewportConfig } from '@/lib/ViewportService'

export interface CanvasViewportAPI {
  zoomIn: (centerX?: number, centerY?: number) => void
  zoomOut: (centerX?: number, centerY?: number) => void
  zoomTo: (zoom: number, centerX?: number, centerY?: number, animate?: boolean) => void
  resetZoom: () => void
  resetViewport: () => void
  fitToContent: (bounds: { minX: number; maxX: number; minY: number; maxY: number }, padding?: number) => void
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number }
}

interface CanvasContainerProps {
  className?: string
  viewportConfig?: Partial<ViewportConfig>
  onMouseMove?: (coordinates: { x: number; y: number }) => void
  onCanvasClick?: (point: Point) => void
  onCanvasDoubleClick?: (point: Point) => void
  onCanvasRightClick?: (point: Point) => void
  onCanvasReady?: (layers: CanvasLayers, app: PIXI.Application, viewportAPI: CanvasViewportAPI) => void
  onViewportChange?: (viewport: { zoom: number; panX: number; panY: number }) => void
}

export interface CanvasLayers {
  background: PIXI.Container
  reference: PIXI.Container
  grid: PIXI.Container
  wall: PIXI.Container
  selection: PIXI.Container
  ui: PIXI.Container
}

export function CanvasContainer({ 
  className, 
  viewportConfig,
  onMouseMove, 
  onCanvasClick,
  onCanvasDoubleClick,
  onCanvasRightClick,
  onCanvasReady,
  onViewportChange
}: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const layersRef = useRef<CanvasLayers | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Initialize viewport management
  const viewport = useViewport({
    pixiApp: appRef.current,
    config: viewportConfig,
    canvasSize
  })

  // Initialize PixiJS application
  const initializePixi = useCallback(async () => {
    if (!containerRef.current || appRef.current) return

    try {
      // Check WebGL support before initializing
      const testCanvas = document.createElement('canvas')
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
      if (!gl) {
        console.warn('WebGL not supported, falling back to canvas renderer')
      }
      
      // Create PixiJS application with proper configuration
      const app = new PIXI.Application()
      
      // Validate canvas dimensions before initialization
      const maxDimension = 4096 // WebGL texture size limit
      const initWidth = Math.min(containerRef.current.clientWidth, maxDimension)
      const initHeight = Math.min(containerRef.current.clientHeight, maxDimension)
      
      console.log('🔍 PixiJS initialization dimensions:', {
        containerWidth: containerRef.current.clientWidth,
        containerHeight: containerRef.current.clientHeight,
        initWidth,
        initHeight,
        maxDimension
      })
      
      await app.init({
        width: initWidth,
        height: initHeight,
        backgroundColor: 0xffffff, // White background for better visibility
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        powerPreference: gl ? 'default' : 'low-power' as any, // Type assertion for compatibility
        failIfMajorPerformanceCaveat: false, // Allow fallback to software rendering
        preserveDrawingBuffer: false, // Reduce memory usage
        clearBeforeRender: true, // Clear before render to ensure proper background
        preference: gl ? 'webgl' : 'webgl' as any // Force WebGL for now, fallback handled by failIfMajorPerformanceCaveat
      })

      // Store app reference
      appRef.current = app
      
      // Debug: Log canvas background and renderer info
      console.log('🔍 Canvas initialization debug:', {
        backgroundColor: 0xffffff,
        canvasWidth: app.canvas.width,
        canvasHeight: app.canvas.height,
        rendererType: app.renderer.constructor.name,
        clearBeforeRender: false
      })

      // Update canvas size state
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }

      // Create layered rendering system
      const layers: CanvasLayers = {
        background: new PIXI.Container(),
        reference: new PIXI.Container(),
        grid: new PIXI.Container(),
        wall: new PIXI.Container(),
        selection: new PIXI.Container(),
        ui: new PIXI.Container()
      }

      // Set layer z-indices and add to stage
      layers.background.zIndex = 0
      // Ensure reference layer is above grid for reliable pointer hit and cursor
      layers.grid.zIndex = 10
      layers.reference.zIndex = 20
      layers.wall.zIndex = 30
      layers.selection.zIndex = 50
      layers.ui.zIndex = 60

      // Make grid layer explicitly non-interactive so it never captures pointer
      ;(layers.grid as any).eventMode = 'none'
      ;(layers.grid as any).interactiveChildren = false

      // Add layers to stage in order
      app.stage.addChild(layers.background)
      app.stage.addChild(layers.reference)
      app.stage.addChild(layers.grid)
      app.stage.addChild(layers.wall)
      app.stage.addChild(layers.selection)
      app.stage.addChild(layers.ui)

      // Enable sorting by z-index
      app.stage.sortableChildren = true

      // Store layers reference
      layersRef.current = layers

      // Add WebGL context loss handling
      const canvas = app.canvas as HTMLCanvasElement
      canvas.addEventListener('webglcontextlost', (event) => {
        console.warn('WebGL context lost, preventing default behavior')
        event.preventDefault()
      })
      
      canvas.addEventListener('webglcontextrestored', () => {
        console.log('WebGL context restored')
        // Reinitialize if needed
      })

      // Add canvas to DOM
      if (containerRef.current) {
        // Force canvas to be visible
        canvas.style.display = 'block'
        canvas.style.position = 'absolute'
        canvas.style.top = '0'
        canvas.style.left = '0'
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        canvas.style.zIndex = '1'
        // Prevent native browser drag & selection behaviors on the canvas
        canvas.style.userSelect = 'none'
        ;(canvas.style as any).webkitUserDrag = 'none'
        canvas.setAttribute('draggable', 'false')
        canvas.addEventListener('dragstart', (e) => e.preventDefault())
        canvas.addEventListener('dragover', (e) => e.preventDefault())
        canvas.addEventListener('drop', (e) => e.preventDefault())
        canvas.addEventListener('selectstart', (e) => e.preventDefault())
        
        containerRef.current.appendChild(canvas)
        console.log('🔍 Canvas added to DOM:', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          canvasStyle: canvas.style.cssText,
          containerChildren: containerRef.current.children.length
        })
      }

      // Start the PixiJS render loop
      app.ticker.start()
      console.log('🔍 PixiJS render loop started')
      
      // Ensure canvas is properly sized
      handleResize()
      
      // Debug canvas visibility
      console.log('🔍 Canvas visibility debug:', {
        canvasDisplay: canvas.style.display,
        canvasVisibility: canvas.style.visibility,
        canvasOpacity: canvas.style.opacity,
        canvasPosition: canvas.style.position,
        canvasZIndex: canvas.style.zIndex,
        canvasWidth: canvas.style.width,
        canvasHeight: canvas.style.height
      })
      
      // Set up basic canvas event handling
      setupEventHandlers(app)

      setIsInitialized(true)
      
      // Create viewport API
      const viewportAPI: CanvasViewportAPI = {
        zoomIn: viewport.zoomIn,
        zoomOut: viewport.zoomOut,
        zoomTo: viewport.zoomTo,
        resetZoom: viewport.resetZoom,
        resetViewport: viewport.resetViewport,
        fitToContent: viewport.fitToContent,
        screenToWorld: viewport.screenToWorld,
        worldToScreen: viewport.worldToScreen
      }
      
      // Notify parent component that canvas is ready
      onCanvasReady?.(layers, app, viewportAPI)
    } catch (error) {
      console.error('Failed to initialize PixiJS:', error)
    }
  }, [])

  // Set up canvas event handling
  const setupEventHandlers = useCallback((app: PIXI.Application) => {
    // Enable interaction
    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    
    // Mouse move event
    app.stage.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
      const native: any = (event as any).originalEvent || (event as any).nativeEvent
      const position = {
        x: Math.round(native?.pageX ?? event.global.x),
        y: Math.round(native?.pageY ?? event.global.y)
      }
      setMousePosition(position)
      onMouseMove?.(position)
    })

    // Click events for drawing
    app.stage.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
      // Prevent native drag of the canvas itself
      event.preventDefault()
      const native: any = (event as any).originalEvent || (event as any).nativeEvent
      const point: Point = {
        x: Math.round(native?.pageX ?? event.global.x),
        y: Math.round(native?.pageY ?? event.global.y)
      }
      
      if (event.detail === 2) {
        // Double click
        onCanvasDoubleClick?.(point)
      } else if (event.button === 2) {
        // Right click
        onCanvasRightClick?.(point)
      } else {
        // Left click
        onCanvasClick?.(point)
      }
    })

    // Prevent context menu on right click
    app.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })
    
    // Add viewport event handlers
    app.canvas.addEventListener('wheel', viewport.handleWheel, { passive: false })
    app.canvas.addEventListener('mousedown', viewport.handleMouseDown)
    app.canvas.addEventListener('mousemove', viewport.handleMouseMove)
    app.canvas.addEventListener('mouseup', viewport.handleMouseUp)
    
    // Cleanup viewport event handlers
    return () => {
      app.canvas.removeEventListener('wheel', viewport.handleWheel)
      app.canvas.removeEventListener('mousedown', viewport.handleMouseDown)
      app.canvas.removeEventListener('mousemove', viewport.handleMouseMove)
      app.canvas.removeEventListener('mouseup', viewport.handleMouseUp)
    }
  }, [onMouseMove, onCanvasClick, onCanvasDoubleClick, onCanvasRightClick, viewport.handleWheel, viewport.handleMouseDown, viewport.handleMouseMove, viewport.handleMouseUp])

  // Notify parent of viewport changes
  useEffect(() => {
    if (onViewportChange) {
      onViewportChange({
        zoom: viewport.zoom,
        panX: viewport.panX,
        panY: viewport.panY
      })
    }
  }, [viewport.zoom, viewport.panX, viewport.panY, onViewportChange])

  // Handle canvas resizing
  const handleResize = useCallback(() => {
    if (!appRef.current || !containerRef.current) return

    const { clientWidth, clientHeight } = containerRef.current
    
    // Debug: Log resize dimensions
    console.log('🔍 Canvas resize debug:', {
      clientWidth,
      clientHeight,
      canvasWidth: appRef.current.canvas.width,
      canvasHeight: appRef.current.canvas.height,
      screenWidth: appRef.current.screen.width,
      screenHeight: appRef.current.screen.height
    })
    
    // Use actual container dimensions to fill the entire area
    const newWidth = Math.max(1, clientWidth)
    const newHeight = Math.max(1, clientHeight)
    
    // Only resize if dimensions actually changed significantly
    const currentWidth = appRef.current.screen.width
    const currentHeight = appRef.current.screen.height
    const widthChanged = Math.abs(newWidth - currentWidth) > 10
    const heightChanged = Math.abs(newHeight - currentHeight) > 10
    
    if (widthChanged || heightChanged) {
      appRef.current.renderer.resize(newWidth, newHeight)
      
      // Update canvas size state for viewport
      setCanvasSize({ width: newWidth, height: newHeight })
      
      console.log('🔍 Canvas resized to container size:', { width: newWidth, height: newHeight })
    } else {
      console.log('🔍 Canvas resize skipped - no significant change')
    }
  }, [])

  // Set up resize observer for viewport management
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    
    resizeObserver.observe(containerRef.current)
    
    console.log('🔍 ResizeObserver enabled for dynamic canvas resizing')
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [handleResize])

  // Initialize PixiJS when component mounts
  useEffect(() => {
    initializePixi()

    // Cleanup function
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true })
        appRef.current = null
        layersRef.current = null
        setIsInitialized(false)
      }
    }
  }, [initializePixi])

  // These functions are available for future use
  // const getLayers = useCallback((): CanvasLayers | null => {
  //   return layersRef.current
  // }, [])

  // const getApp = useCallback((): PIXI.Application | null => {
  //   return appRef.current
  // }, [])

  return (
    <div 
      ref={containerRef}
      data-testid="canvas-container"
      className={cn(
        'flex-1 bg-white border border-border relative',
        'cursor-crosshair min-h-[400px] w-full h-full', // Ensure full width and height
        className
      )}
    >
      {/* Loading indicator while PixiJS initializes */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Initializing Canvas...</div>
            <div className="text-sm opacity-60">Setting up PixiJS renderer</div>
          </div>
        </div>
      )}
      
      {/* Debug info overlay (can be removed in production) */}
      {isInitialized && (
        <div className="absolute top-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Mouse: {mousePosition.x}, {mousePosition.y} | PixiJS Ready
        </div>
      )}
    </div>
  )
}

// Export types and utilities for use by other components
export type { CanvasContainerProps }