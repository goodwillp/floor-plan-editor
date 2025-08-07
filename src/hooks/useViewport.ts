import { useEffect, useRef, useState, useCallback } from 'react'
import { ViewportService, type ViewportConfig, type ViewportState, type ViewportEventData, DEFAULT_VIEWPORT_CONFIG } from '@/lib/ViewportService'
import type * as PIXI from 'pixi.js'

interface UseViewportProps {
  pixiApp?: PIXI.Application | null
  config?: Partial<ViewportConfig>
  canvasSize?: { width: number; height: number }
}

interface UseViewportReturn {
  // State
  zoom: number
  panX: number
  panY: number
  canvasWidth: number
  canvasHeight: number
  
  // Capabilities
  canZoomIn: boolean
  canZoomOut: boolean
  zoomPercentage: number
  
  // Zoom functions
  zoomIn: (centerX?: number, centerY?: number) => void
  zoomOut: (centerX?: number, centerY?: number) => void
  zoomTo: (zoom: number, centerX?: number, centerY?: number, animate?: boolean) => void
  zoomBy: (deltaZoom: number, centerX?: number, centerY?: number, animate?: boolean) => void
  resetZoom: () => void
  
  // Pan functions
  panTo: (panX: number, panY: number, animate?: boolean) => void
  panBy: (deltaPanX: number, deltaPanY: number, animate?: boolean) => void
  resetPan: () => void
  
  // Combined functions
  resetViewport: () => void
  fitToContent: (bounds: { minX: number; maxX: number; minY: number; maxY: number }, padding?: number) => void
  
  // Coordinate conversion
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number }
  
  // Event handling for mouse wheel and drag
  handleWheel: (event: WheelEvent) => void
  handleMouseDown: (event: MouseEvent) => void
  handleMouseMove: (event: MouseEvent) => void
  handleMouseUp: (event: MouseEvent) => void
  
  // Configuration
  updateConfig: (config: Partial<ViewportConfig>) => void
  getConfig: () => ViewportConfig
}

/**
 * Hook for managing viewport zoom and pan functionality
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export function useViewport({
  pixiApp,
  config,
  canvasSize
}: UseViewportProps = {}): UseViewportReturn {
  const [state, setState] = useState<ViewportState>({
    zoom: DEFAULT_VIEWPORT_CONFIG.defaultZoom,
    panX: 0,
    panY: 0,
    canvasWidth: 800,
    canvasHeight: 600
  })
  
  const [capabilities, setCapabilities] = useState({
    canZoomIn: true,
    canZoomOut: true,
    zoomPercentage: 100
  })
  
  const serviceRef = useRef<ViewportService | null>(null)
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const dragStartPos = useRef({ x: 0, y: 0 })

  // Initialize viewport service
  useEffect(() => {
    const initialConfig = { ...DEFAULT_VIEWPORT_CONFIG, ...config }
    serviceRef.current = new ViewportService(initialConfig)

    // Set up event listeners
    const handleViewportChange = (data: ViewportEventData) => {
      setState({
        zoom: data.zoom,
        panX: data.panX,
        panY: data.panY,
        canvasWidth: data.canvasWidth,
        canvasHeight: data.canvasHeight
      })
      
      setCapabilities({
        canZoomIn: serviceRef.current!.canZoomIn(),
        canZoomOut: serviceRef.current!.canZoomOut(),
        zoomPercentage: serviceRef.current!.getZoomPercentage()
      })
    }

    serviceRef.current.addEventListener('viewport-changed', handleViewportChange)

    return () => {
      if (serviceRef.current) {
        serviceRef.current.removeEventListener('viewport-changed', handleViewportChange)
        serviceRef.current.destroy()
        serviceRef.current = null
      }
    }
  }, []) // Only run once on mount

  // Update PixiJS app when it changes
  useEffect(() => {
    if (serviceRef.current && pixiApp) {
      serviceRef.current.setPixiApp(pixiApp)
    }
  }, [pixiApp])

  // Update canvas size when it changes
  useEffect(() => {
    if (serviceRef.current && canvasSize) {
      serviceRef.current.updateCanvasSize(canvasSize.width, canvasSize.height)
    }
  }, [canvasSize])

  // Update configuration when it changes
  useEffect(() => {
    if (serviceRef.current && config) {
      serviceRef.current.updateConfig(config)
    }
  }, [config])

  // Zoom functions
  const zoomIn = useCallback((centerX?: number, centerY?: number) => {
    serviceRef.current?.zoomIn(centerX, centerY)
  }, [])

  const zoomOut = useCallback((centerX?: number, centerY?: number) => {
    serviceRef.current?.zoomOut(centerX, centerY)
  }, [])

  const zoomTo = useCallback((zoom: number, centerX?: number, centerY?: number, animate: boolean = true) => {
    serviceRef.current?.zoomTo(zoom, centerX, centerY, animate)
  }, [])

  const zoomBy = useCallback((deltaZoom: number, centerX?: number, centerY?: number, animate: boolean = true) => {
    serviceRef.current?.zoomBy(deltaZoom, centerX, centerY, animate)
  }, [])

  const resetZoom = useCallback(() => {
    serviceRef.current?.resetZoom()
  }, [])

  // Pan functions
  const panTo = useCallback((panX: number, panY: number, animate: boolean = true) => {
    serviceRef.current?.panTo(panX, panY, animate)
  }, [])

  const panBy = useCallback((deltaPanX: number, deltaPanY: number, animate: boolean = false) => {
    serviceRef.current?.panBy(deltaPanX, deltaPanY, animate)
  }, [])

  const resetPan = useCallback(() => {
    serviceRef.current?.resetPan()
  }, [])

  // Combined functions
  const resetViewport = useCallback(() => {
    serviceRef.current?.resetViewport()
  }, [])

  const fitToContent = useCallback((bounds: { 
    minX: number; maxX: number; minY: number; maxY: number 
  }, padding: number = 50) => {
    serviceRef.current?.fitToContent(bounds, padding)
  }, [])

  // Coordinate conversion
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return serviceRef.current?.screenToWorld(screenX, screenY) || { x: screenX, y: screenY }
  }, [])

  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    return serviceRef.current?.worldToScreen(worldX, worldY) || { x: worldX, y: worldY }
  }, [])

  // Mouse wheel zoom handler
  // Requirements: 12.1, 12.3
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!serviceRef.current) return
    
    event.preventDefault()
    
    // Get cursor position relative to canvas
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    const cursorX = event.clientX - rect.left
    const cursorY = event.clientY - rect.top
    
    // Calculate zoom delta based on wheel direction
    const config = serviceRef.current.getConfig()
    const deltaZoom = event.deltaY > 0 ? -config.zoomStep : config.zoomStep
    
    // Zoom with cursor as center
    serviceRef.current.zoomBy(deltaZoom, cursorX, cursorY, false)
  }, [])

  // Mouse drag pan handlers
  // Requirements: 12.2
  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Only start viewport panning with:
    // - Middle mouse button, OR
    // - Left mouse button while holding a modifier (Ctrl/Meta/Alt/Shift)
    const isMiddleButton = event.button === 1
    const isPanWithModifier = event.button === 0 && (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
    if (!isMiddleButton && !isPanWithModifier) return

    isDragging.current = true
    lastMousePos.current = { x: event.clientX, y: event.clientY }
    dragStartPos.current = { x: event.clientX, y: event.clientY }

    // Change cursor to grabbing
    const target = event.target as HTMLElement
    target.style.cursor = 'grabbing'

    event.preventDefault()
  }, [])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging.current || !serviceRef.current) return
    
    const deltaX = event.clientX - lastMousePos.current.x
    const deltaY = event.clientY - lastMousePos.current.y
    
    // Pan by mouse delta (no zoom scaling needed as we're in screen space)
    serviceRef.current.panBy(deltaX, deltaY, false)
    
    lastMousePos.current = { x: event.clientX, y: event.clientY }
    
    event.preventDefault()
  }, [])

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!isDragging.current) return
    
    isDragging.current = false
    
    // Reset cursor
    const target = event.target as HTMLElement
    target.style.cursor = 'default'
    
    // Check if this was a drag or just a click
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - dragStartPos.current.x, 2) + 
      Math.pow(event.clientY - dragStartPos.current.y, 2)
    )
    
    // If it was just a small movement, don't consider it a drag
    if (dragDistance < 5) {
      // This was likely just a click, not a drag
    }
    
    event.preventDefault()
  }, [])

  // Configuration functions
  const updateConfig = useCallback((newConfig: Partial<ViewportConfig>) => {
    serviceRef.current?.updateConfig(newConfig)
  }, [])

  const getConfig = useCallback(() => {
    return serviceRef.current?.getConfig() || DEFAULT_VIEWPORT_CONFIG
  }, [])

  return {
    // State
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    
    // Capabilities
    canZoomIn: capabilities.canZoomIn,
    canZoomOut: capabilities.canZoomOut,
    zoomPercentage: capabilities.zoomPercentage,
    
    // Zoom functions
    zoomIn,
    zoomOut,
    zoomTo,
    zoomBy,
    resetZoom,
    
    // Pan functions
    panTo,
    panBy,
    resetPan,
    
    // Combined functions
    resetViewport,
    fitToContent,
    
    // Coordinate conversion
    screenToWorld,
    worldToScreen,
    
    // Event handling
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    
    // Configuration
    updateConfig,
    getConfig
  }
}