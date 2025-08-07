import { useEffect, useRef, useState, useCallback } from 'react'
import { ReferenceImageService, type ReferenceImageConfig, type ReferenceImageState, type ReferenceImageEventData, DEFAULT_IMAGE_CONFIG } from '@/lib/ReferenceImageService'
import type { CanvasLayers } from '@/components/CanvasContainer'

interface UseReferenceImageProps {
  layers: CanvasLayers | null
  initialConfig?: Partial<ReferenceImageConfig>
}

interface UseReferenceImageReturn {
  // State
  hasImage: boolean
  imageInfo: ReferenceImageState['imageInfo']
  config: ReferenceImageConfig
  isLocked: boolean
  isVisible: boolean
  
  // Image loading
  loadImage: (file: File) => Promise<void>
  loadImageFromUrl: (url: string, filename?: string) => Promise<void>
  removeImage: () => void
  
  // Configuration
  updateConfig: (config: Partial<ReferenceImageConfig>) => void
  resetImage: () => void
  
  // Lock/visibility controls
  toggleLock: () => boolean
  setLocked: (locked: boolean) => void
  toggleVisibility: () => boolean
  setVisible: (visible: boolean) => void
  
  // Position/transform controls
  setPosition: (x: number, y: number) => void
  moveBy: (deltaX: number, deltaY: number) => void
  setScale: (scale: number) => void
  setOpacity: (opacity: number) => void
  setRotation: (rotation: number) => void
  
  // Utility functions
  fitToCanvas: (width: number, height: number, mode?: ReferenceImageConfig['fitMode']) => void
  getImageBounds: () => { x: number; y: number; width: number; height: number } | null
  
  // Event handlers for mouse interaction
  handleMouseDown: (event: { x: number; y: number; button: number }) => boolean
  handleMouseMove: (event: { x: number; y: number }) => boolean
  handleMouseUp: () => boolean
  
  // Loading state
  isLoading: boolean
  error: string | null
}

/**
 * Hook for managing reference image functionality
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export function useReferenceImage({
  layers,
  initialConfig
}: UseReferenceImageProps): UseReferenceImageReturn {
  const [state, setState] = useState<ReferenceImageState>({
    hasImage: false,
    imageInfo: null,
    config: { ...DEFAULT_IMAGE_CONFIG, ...initialConfig }
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const serviceRef = useRef<ReferenceImageService | null>(null)

  // Initialize reference image service
  useEffect(() => {
    const initialServiceConfig = { ...DEFAULT_IMAGE_CONFIG, ...initialConfig }
    serviceRef.current = new ReferenceImageService(initialServiceConfig)

    // Set up event listeners
    const handleImageLoaded = (data: ReferenceImageEventData) => {
      setState({
        hasImage: data.hasImage,
        imageInfo: data.imageInfo,
        config: data.config
      })
      setIsLoading(false)
      setError(null)
    }

    const handleImageRemoved = (data: ReferenceImageEventData) => {
      setState({
        hasImage: data.hasImage,
        imageInfo: data.imageInfo,
        config: data.config
      })
      setError(null)
    }

    const handleConfigChanged = (data: ReferenceImageEventData) => {
      setState(prev => ({
        ...prev,
        config: data.config
      }))
    }

    serviceRef.current.addEventListener('image-loaded', handleImageLoaded)
    serviceRef.current.addEventListener('image-removed', handleImageRemoved)
    serviceRef.current.addEventListener('config-changed', handleConfigChanged)
    serviceRef.current.addEventListener('lock-changed', handleConfigChanged)
    serviceRef.current.addEventListener('visibility-changed', handleConfigChanged)

    return () => {
      if (serviceRef.current) {
        serviceRef.current.removeEventListener('image-loaded', handleImageLoaded)
        serviceRef.current.removeEventListener('image-removed', handleImageRemoved)
        serviceRef.current.removeEventListener('config-changed', handleConfigChanged)
        serviceRef.current.removeEventListener('lock-changed', handleConfigChanged)
        serviceRef.current.removeEventListener('visibility-changed', handleConfigChanged)
        serviceRef.current.destroy()
        serviceRef.current = null
      }
    }
  }, []) // Only run once on mount

  // Update container when layers change
  useEffect(() => {
    if (serviceRef.current && layers?.reference) {
      serviceRef.current.setContainer(layers.reference)
      // Provide selection layer as overlay for outlines if available
      if (layers.selection) {
        serviceRef.current.setOverlayContainer(layers.selection as any)
      }
    }
  }, [layers])

  // Update configuration when initialConfig changes
  useEffect(() => {
    if (serviceRef.current && initialConfig) {
      serviceRef.current.updateConfig(initialConfig)
    }
  }, [initialConfig])

  // Image loading functions
  const loadImage = useCallback(async (file: File) => {
    if (!serviceRef.current) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      await serviceRef.current.loadImage(file)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image'
      setError(errorMessage)
      setIsLoading(false)
      throw new Error(errorMessage)
    }
  }, [])

  const loadImageFromUrl = useCallback(async (url: string, filename?: string) => {
    if (!serviceRef.current) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      await serviceRef.current.loadImageFromUrl(url, filename)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image from URL'
      setError(errorMessage)
      setIsLoading(false)
      throw new Error(errorMessage)
    }
  }, [])

  const removeImage = useCallback(() => {
    serviceRef.current?.removeImage()
  }, [])

  // Configuration functions
  const updateConfig = useCallback((newConfig: Partial<ReferenceImageConfig>) => {
    serviceRef.current?.updateConfig(newConfig)
  }, [])

  const resetImage = useCallback(() => {
    serviceRef.current?.resetImage()
  }, [])

  // Lock/visibility controls
  const toggleLock = useCallback(() => {
    return serviceRef.current?.toggleLock() ?? false
  }, [])

  const setLocked = useCallback((locked: boolean) => {
    serviceRef.current?.setLocked(locked)
  }, [])

  const toggleVisibility = useCallback(() => {
    return serviceRef.current?.toggleVisibility() ?? false
  }, [])

  const setVisible = useCallback((visible: boolean) => {
    serviceRef.current?.setVisible(visible)
  }, [])

  // Position/transform controls
  const setPosition = useCallback((x: number, y: number) => {
    serviceRef.current?.setPosition(x, y)
  }, [])

  const moveBy = useCallback((deltaX: number, deltaY: number) => {
    serviceRef.current?.moveBy(deltaX, deltaY)
  }, [])

  const setScale = useCallback((scale: number) => {
    serviceRef.current?.setScale(scale)
  }, [])

  const setOpacity = useCallback((opacity: number) => {
    serviceRef.current?.setOpacity(opacity)
  }, [])

  const setRotation = useCallback((rotation: number) => {
    serviceRef.current?.setRotation(rotation)
  }, [])

  // Utility functions
  const fitToCanvas = useCallback((width: number, height: number, mode?: ReferenceImageConfig['fitMode']) => {
    serviceRef.current?.fitToCanvas(width, height, mode)
  }, [])

  const getImageBounds = useCallback(() => {
    return serviceRef.current?.getImageBounds() ?? null
  }, [])

  // Event handlers for mouse interaction
  const handleMouseDown = useCallback((event: { x: number; y: number; button: number }) => {
    return serviceRef.current?.handleMouseDown(event) ?? false
  }, [])

  const handleMouseMove = useCallback((event: { x: number; y: number }) => {
    return serviceRef.current?.handleMouseMove(event) ?? false
  }, [])

  const handleMouseUp = useCallback(() => {
    return serviceRef.current?.handleMouseUp() ?? false
  }, [])

  return {
    // State
    hasImage: state.hasImage,
    imageInfo: state.imageInfo,
    config: state.config,
    isLocked: state.config.locked,
    isVisible: state.config.visible,
    
    // Image loading
    loadImage,
    loadImageFromUrl,
    removeImage,
    
    // Configuration
    updateConfig,
    resetImage,
    
    // Lock/visibility controls
    toggleLock,
    setLocked,
    toggleVisibility,
    setVisible,
    
    // Position/transform controls
    setPosition,
    moveBy,
    setScale,
    setOpacity,
    setRotation,
    
    // Utility functions
    fitToCanvas,
    getImageBounds,
    
    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    
    // Loading state
    isLoading,
    error
  }
}