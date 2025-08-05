import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useReferenceImage } from '@/hooks/useReferenceImage'
import { ReferenceImageService } from '@/lib/ReferenceImageService'
import type { CanvasLayers } from '@/components/CanvasContainer'

// Mock the ReferenceImageService
vi.mock('@/lib/ReferenceImageService', () => {
  const mockService = {
    setContainer: vi.fn(),
    loadImage: vi.fn(),
    loadImageFromUrl: vi.fn(),
    removeImage: vi.fn(),
    updateConfig: vi.fn(),
    resetImage: vi.fn(),
    toggleLock: vi.fn(),
    setLocked: vi.fn(),
    toggleVisibility: vi.fn(),
    setVisible: vi.fn(),
    setPosition: vi.fn(),
    moveBy: vi.fn(),
    setScale: vi.fn(),
    setOpacity: vi.fn(),
    setRotation: vi.fn(),
    fitToCanvas: vi.fn(),
    getImageBounds: vi.fn(),
    handleMouseDown: vi.fn(),
    handleMouseMove: vi.fn(),
    handleMouseUp: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    destroy: vi.fn()
  }

  return {
    ReferenceImageService: vi.fn(() => mockService),
    DEFAULT_IMAGE_CONFIG: {
      opacity: 0.7,
      scale: 1.0,
      x: 0,
      y: 0,
      locked: true,
      visible: true,
      rotation: 0,
      fitMode: 'none'
    }
  }
})

describe('useReferenceImage', () => {
  let mockLayers: CanvasLayers
  let mockService: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockLayers = {
      background: {} as any,
      reference: {} as any,
      grid: {} as any,
      wall: {} as any,
      selection: {} as any,
      ui: {} as any
    }

    // Get the mock service instance
    mockService = new (ReferenceImageService as any)()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      expect(result.current.hasImage).toBe(false)
      expect(result.current.imageInfo).toBe(null)
      expect(result.current.isLocked).toBe(true)
      expect(result.current.isVisible).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should initialize with custom config', () => {
      const initialConfig = { opacity: 0.5, locked: false }
      
      renderHook(() =>
        useReferenceImage({ 
          layers: mockLayers, 
          initialConfig 
        })
      )

      expect(ReferenceImageService).toHaveBeenCalledWith(
        expect.objectContaining(initialConfig)
      )
    })

    it('should set container when layers change', () => {
      const { rerender } = renderHook(
        ({ layers }) => useReferenceImage({ layers }),
        { initialProps: { layers: null } }
      )

      expect(mockService.setContainer).not.toHaveBeenCalled()

      rerender({ layers: mockLayers })

      expect(mockService.setContainer).toHaveBeenCalledWith(mockLayers.reference)
    })
  })

  describe('Image Loading', () => {
    it('should load image successfully', async () => {
      mockService.loadImage.mockResolvedValue(undefined)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      await act(async () => {
        await result.current.loadImage(mockFile)
      })

      expect(mockService.loadImage).toHaveBeenCalledWith(mockFile)
    })

    it('should handle loading errors', async () => {
      const errorMessage = 'Failed to load image'
      mockService.loadImage.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      await act(async () => {
        try {
          await result.current.loadImage(mockFile)
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe(errorMessage)
    })

    it('should set loading state during image load', async () => {
      let resolveLoad: () => void
      const loadPromise = new Promise<void>(resolve => {
        resolveLoad = resolve
      })
      mockService.loadImage.mockReturnValue(loadPromise)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      act(() => {
        result.current.loadImage(mockFile)
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolveLoad!()
        await loadPromise
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should load image from URL', async () => {
      mockService.loadImageFromUrl.mockResolvedValue(undefined)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      await act(async () => {
        await result.current.loadImageFromUrl('https://example.com/image.jpg', 'test.jpg')
      })

      expect(mockService.loadImageFromUrl).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        'test.jpg'
      )
    })
  })

  describe('Image Management', () => {
    it('should remove image', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.removeImage()
      })

      expect(mockService.removeImage).toHaveBeenCalled()
    })

    it('should update configuration', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const newConfig = { opacity: 0.5, scale: 2 }

      act(() => {
        result.current.updateConfig(newConfig)
      })

      expect(mockService.updateConfig).toHaveBeenCalledWith(newConfig)
    })

    it('should reset image', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.resetImage()
      })

      expect(mockService.resetImage).toHaveBeenCalled()
    })
  })

  describe('Lock and Visibility Controls', () => {
    it('should toggle lock', () => {
      mockService.toggleLock.mockReturnValue(false)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      let lockResult: boolean

      act(() => {
        lockResult = result.current.toggleLock()
      })

      expect(mockService.toggleLock).toHaveBeenCalled()
      expect(lockResult!).toBe(false)
    })

    it('should set locked state', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.setLocked(false)
      })

      expect(mockService.setLocked).toHaveBeenCalledWith(false)
    })

    it('should toggle visibility', () => {
      mockService.toggleVisibility.mockReturnValue(false)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      let visibilityResult: boolean

      act(() => {
        visibilityResult = result.current.toggleVisibility()
      })

      expect(mockService.toggleVisibility).toHaveBeenCalled()
      expect(visibilityResult!).toBe(false)
    })

    it('should set visibility', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.setVisible(false)
      })

      expect(mockService.setVisible).toHaveBeenCalledWith(false)
    })
  })

  describe('Transform Controls', () => {
    it('should set position', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.setPosition(100, 200)
      })

      expect(mockService.setPosition).toHaveBeenCalledWith(100, 200)
    })

    it('should move by delta', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.moveBy(50, 75)
      })

      expect(mockService.moveBy).toHaveBeenCalledWith(50, 75)
    })

    it('should set scale', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.setScale(1.5)
      })

      expect(mockService.setScale).toHaveBeenCalledWith(1.5)
    })

    it('should set opacity', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.setOpacity(0.8)
      })

      expect(mockService.setOpacity).toHaveBeenCalledWith(0.8)
    })

    it('should set rotation', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.setRotation(Math.PI / 4)
      })

      expect(mockService.setRotation).toHaveBeenCalledWith(Math.PI / 4)
    })
  })

  describe('Utility Functions', () => {
    it('should fit to canvas', () => {
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      act(() => {
        result.current.fitToCanvas(800, 600, 'contain')
      })

      expect(mockService.fitToCanvas).toHaveBeenCalledWith(800, 600, 'contain')
    })

    it('should get image bounds', () => {
      const mockBounds = { x: 0, y: 0, width: 800, height: 600 }
      mockService.getImageBounds.mockReturnValue(mockBounds)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const bounds = result.current.getImageBounds()

      expect(mockService.getImageBounds).toHaveBeenCalled()
      expect(bounds).toEqual(mockBounds)
    })
  })

  describe('Mouse Event Handlers', () => {
    it('should handle mouse down', () => {
      mockService.handleMouseDown.mockReturnValue(true)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const event = { x: 100, y: 200, button: 0 }
      const handled = result.current.handleMouseDown(event)

      expect(mockService.handleMouseDown).toHaveBeenCalledWith(event)
      expect(handled).toBe(true)
    })

    it('should handle mouse move', () => {
      mockService.handleMouseMove.mockReturnValue(true)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const event = { x: 150, y: 250 }
      const handled = result.current.handleMouseMove(event)

      expect(mockService.handleMouseMove).toHaveBeenCalledWith(event)
      expect(handled).toBe(true)
    })

    it('should handle mouse up', () => {
      mockService.handleMouseUp.mockReturnValue(true)
      
      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const handled = result.current.handleMouseUp()

      expect(mockService.handleMouseUp).toHaveBeenCalled()
      expect(handled).toBe(true)
    })
  })

  describe('Event Handling', () => {
    it('should set up event listeners on mount', () => {
      renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      expect(mockService.addEventListener).toHaveBeenCalledWith('image-loaded', expect.any(Function))
      expect(mockService.addEventListener).toHaveBeenCalledWith('image-removed', expect.any(Function))
      expect(mockService.addEventListener).toHaveBeenCalledWith('config-changed', expect.any(Function))
      expect(mockService.addEventListener).toHaveBeenCalledWith('lock-changed', expect.any(Function))
      expect(mockService.addEventListener).toHaveBeenCalledWith('visibility-changed', expect.any(Function))
    })

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      unmount()

      expect(mockService.removeEventListener).toHaveBeenCalledWith('image-loaded', expect.any(Function))
      expect(mockService.removeEventListener).toHaveBeenCalledWith('image-removed', expect.any(Function))
      expect(mockService.removeEventListener).toHaveBeenCalledWith('config-changed', expect.any(Function))
      expect(mockService.removeEventListener).toHaveBeenCalledWith('lock-changed', expect.any(Function))
      expect(mockService.removeEventListener).toHaveBeenCalledWith('visibility-changed', expect.any(Function))
      expect(mockService.destroy).toHaveBeenCalled()
    })

    it('should update state on image loaded event', () => {
      let imageLoadedCallback: any

      mockService.addEventListener.mockImplementation((event: string, callback: any) => {
        if (event === 'image-loaded') {
          imageLoadedCallback = callback
        }
      })

      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      // Simulate image loaded event
      act(() => {
        imageLoadedCallback({
          hasImage: true,
          imageInfo: { name: 'test.png', size: 1024, dimensions: { width: 800, height: 600 }, type: 'image/png' },
          config: { opacity: 0.7, scale: 1, x: 0, y: 0, locked: true, visible: true, rotation: 0, fitMode: 'none' }
        })
      })

      expect(result.current.hasImage).toBe(true)
      expect(result.current.imageInfo?.name).toBe('test.png')
    })

    it('should update state on image removed event', () => {
      let imageRemovedCallback: any

      mockService.addEventListener.mockImplementation((event: string, callback: any) => {
        if (event === 'image-removed') {
          imageRemovedCallback = callback
        }
      })

      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      // Simulate image removed event
      act(() => {
        imageRemovedCallback({
          hasImage: false,
          imageInfo: null,
          config: { opacity: 0.7, scale: 1, x: 0, y: 0, locked: true, visible: true, rotation: 0, fitMode: 'none' }
        })
      })

      expect(result.current.hasImage).toBe(false)
      expect(result.current.imageInfo).toBe(null)
    })
  })

  describe('Error Handling', () => {
    it('should handle service creation failure gracefully', () => {
      vi.mocked(ReferenceImageService).mockImplementation(() => {
        throw new Error('Service creation failed')
      })

      expect(() => {
        renderHook(() =>
          useReferenceImage({ layers: mockLayers })
        )
      }).toThrow('Service creation failed')
    })

    it('should handle missing service methods gracefully', () => {
      const incompleteService = {}
      vi.mocked(ReferenceImageService).mockImplementation(() => incompleteService as any)

      const { result } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      // Should not throw when calling methods on incomplete service
      expect(() => {
        result.current.removeImage()
        result.current.toggleLock()
        result.current.getImageBounds()
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should not recreate functions on every render', () => {
      const { result, rerender } = renderHook(() =>
        useReferenceImage({ layers: mockLayers })
      )

      const firstRender = {
        loadImage: result.current.loadImage,
        removeImage: result.current.removeImage,
        toggleLock: result.current.toggleLock
      }

      rerender()

      const secondRender = {
        loadImage: result.current.loadImage,
        removeImage: result.current.removeImage,
        toggleLock: result.current.toggleLock
      }

      expect(firstRender.loadImage).toBe(secondRender.loadImage)
      expect(firstRender.removeImage).toBe(secondRender.removeImage)
      expect(firstRender.toggleLock).toBe(secondRender.toggleLock)
    })
  })
})