import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as PIXI from 'pixi.js'
import { ReferenceImageService, DEFAULT_IMAGE_CONFIG, type ReferenceImageConfig } from '@/lib/ReferenceImageService'

// Mock PixiJS
vi.mock('pixi.js', () => ({
  Assets: {
    load: vi.fn()
  },
  Sprite: vi.fn().mockImplementation(() => ({
    x: 0,
    y: 0,
    scale: { set: vi.fn() },
    alpha: 1,
    rotation: 0,
    visible: true,
    zIndex: 0,
    eventMode: 'static',
    cursor: 'default',
    destroy: vi.fn(),
    parent: null
  })),
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn()
  })),
  Texture: {
    from: vi.fn().mockImplementation(() => ({
      width: 800,
      height: 600,
      destroy: vi.fn()
    }))
  },
  BaseTexture: vi.fn().mockImplementation(() => ({
    valid: true,
    once: vi.fn(),
    width: 800,
    height: 600
  }))
}))

// Mock URL methods
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-object-url'),
    revokeObjectURL: vi.fn()
  }
})

describe('ReferenceImageService', () => {
  let service: ReferenceImageService
  let mockContainer: any
  let mockTexture: any
  let mockSprite: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockContainer = {
      addChild: vi.fn(),
      removeChild: vi.fn()
    }
    
    mockTexture = {
      width: 800,
      height: 600,
      destroy: vi.fn()
    }
    
    mockSprite = {
      x: 0,
      y: 0,
      scale: { set: vi.fn() },
      alpha: 1,
      rotation: 0,
      visible: true,
      zIndex: 0,
      eventMode: 'static',
      cursor: 'default',
      destroy: vi.fn(),
      parent: mockContainer
    }
    
    vi.mocked(PIXI.Sprite).mockImplementation(() => mockSprite)
    vi.mocked(PIXI.Texture.from).mockResolvedValue(mockTexture)
    
    service = new ReferenceImageService()
  })

  afterEach(() => {
    service.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const state = service.getState()
      
      expect(state.hasImage).toBe(false)
      expect(state.imageInfo).toBe(null)
      expect(state.config).toEqual(DEFAULT_IMAGE_CONFIG)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<ReferenceImageConfig> = {
        opacity: 0.5,
        scale: 2.0,
        locked: false
      }
      
      const customService = new ReferenceImageService(customConfig)
      const state = customService.getState()
      
      expect(state.config.opacity).toBe(0.5)
      expect(state.config.scale).toBe(2.0)
      expect(state.config.locked).toBe(false)
      
      customService.destroy()
    })

    it('should set container correctly', () => {
      service.setContainer(mockContainer)
      
      // Container should be stored internally
      expect(() => service.setContainer(mockContainer)).not.toThrow()
    })
  })

  describe('Image Loading', () => {
    const createMockFile = (name: string, type: string, size: number = 1024) => {
      return new File(['mock content'], name, { type, lastModified: Date.now() })
    }

    it('should load image from file successfully', async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      
      const eventSpy = vi.fn()
      service.addEventListener('image-loaded', eventSpy)
      
      await service.loadImage(mockFile)
      
      expect(PIXI.Texture.from).toHaveBeenCalledWith('mock-object-url')
      expect(PIXI.Sprite).toHaveBeenCalledWith(mockTexture)
      expect(mockContainer.addChild).toHaveBeenCalledWith(mockSprite)
      expect(eventSpy).toHaveBeenCalled()
      
      const state = service.getState()
      expect(state.hasImage).toBe(true)
      expect(state.imageInfo?.name).toBe('test.png')
      expect(state.config.locked).toBe(true) // Default to locked
    })

    it('should load image from URL successfully', async () => {
      const testUrl = 'https://example.com/image.jpg'
      service.setContainer(mockContainer)
      
      const eventSpy = vi.fn()
      service.addEventListener('image-loaded', eventSpy)
      
      await service.loadImageFromUrl(testUrl, 'test-image.jpg')
      
      expect(PIXI.Assets.load).toHaveBeenCalledWith(testUrl)
      expect(mockContainer.addChild).toHaveBeenCalledWith(mockSprite)
      expect(eventSpy).toHaveBeenCalled()
      
      const state = service.getState()
      expect(state.hasImage).toBe(true)
      expect(state.imageInfo?.name).toBe('test-image.jpg')
    })

    it('should reject invalid file types', async () => {
      const invalidFile = createMockFile('test.txt', 'text/plain')
      
      await expect(service.loadImage(invalidFile)).rejects.toThrow('Invalid image file')
    })

    it('should handle loading errors', async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      vi.mocked(PIXI.Texture.from).mockRejectedValue(new Error('Load failed'))

      await expect(service.loadImage(mockFile)).rejects.toThrow('Failed to load image: Load failed')
      expect(service.imageInfo).toBeNull()
      expect(service.imageSprite).toBeNull()
    })

    it('should clean up previous image when loading new one', async () => {
      const mockFile1 = createMockFile('test1.png', 'image/png')
      const mockFile2 = createMockFile('test2.png', 'image/png')
      
      service.setContainer(mockContainer)
      
      // Load first image
      await service.loadImage(mockFile1)
      const firstSprite = mockSprite
      
      // Load second image
      await service.loadImage(mockFile2)
      
      expect(firstSprite.destroy).toHaveBeenCalled()
      expect(mockTexture.destroy).toHaveBeenCalled()
    })
  })

  describe('Image Removal', () => {
    it('should remove image successfully', async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      
      await service.loadImage(mockFile)
      
      const eventSpy = vi.fn()
      service.addEventListener('image-removed', eventSpy)
      
      service.removeImage()
      
      expect(mockContainer.removeChild).toHaveBeenCalledWith(mockSprite)
      expect(mockSprite.destroy).toHaveBeenCalled()
      expect(mockTexture.destroy).toHaveBeenCalled()
      expect(eventSpy).toHaveBeenCalled()
      
      const state = service.getState()
      expect(state.hasImage).toBe(false)
      expect(state.imageInfo).toBe(null)
    })
  })

  describe('Configuration Management', () => {
    beforeEach(async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      await service.loadImage(mockFile)
    })

    it('should update configuration', () => {
      const newConfig = { opacity: 0.5, scale: 1.5 }
      
      service.updateConfig(newConfig)
      
      const state = service.getState()
      expect(state.config.opacity).toBe(0.5)
      expect(state.config.scale).toBe(1.5)
      expect(mockSprite.alpha).toBe(0.5)
      expect(mockSprite.scale.set).toHaveBeenCalledWith(1.5)
    })

    it('should emit events for configuration changes', () => {
      const configSpy = vi.fn()
      const lockSpy = vi.fn()
      const visibilitySpy = vi.fn()
      
      service.addEventListener('config-changed', configSpy)
      service.addEventListener('lock-changed', lockSpy)
      service.addEventListener('visibility-changed', visibilitySpy)
      
      service.updateConfig({ locked: false, visible: false })
      
      expect(configSpy).toHaveBeenCalled()
      expect(lockSpy).toHaveBeenCalled()
      expect(visibilitySpy).toHaveBeenCalled()
    })

    it('should toggle lock state', () => {
      expect(service.getState().config.locked).toBe(true)
      
      const result = service.toggleLock()
      
      expect(result).toBe(false)
      expect(service.getState().config.locked).toBe(false)
    })

    it('should toggle visibility', () => {
      expect(service.getState().config.visible).toBe(true)
      
      const result = service.toggleVisibility()
      
      expect(result).toBe(false)
      expect(service.getState().config.visible).toBe(false)
      expect(mockSprite.visible).toBe(false)
    })
  })

  describe('Position and Transform Controls', () => {
    beforeEach(async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      await service.loadImage(mockFile)
    })

    it('should set position when unlocked', () => {
      service.setLocked(false)
      
      service.setPosition(100, 200)
      
      expect(mockSprite.x).toBe(100)
      expect(mockSprite.y).toBe(200)
    })

    it('should not set position when locked', () => {
      service.setLocked(true)
      
      service.setPosition(100, 200)
      
      expect(mockSprite.x).toBe(0) // Should remain at original position
      expect(mockSprite.y).toBe(0)
    })

    it('should move by delta when unlocked', () => {
      service.setLocked(false)
      service.setPosition(50, 50)
      
      service.moveBy(25, 30)
      
      expect(mockSprite.x).toBe(75)
      expect(mockSprite.y).toBe(80)
    })

    it('should set scale with limits', () => {
      service.setLocked(false)
      
      service.setScale(2.5)
      expect(mockSprite.scale.set).toHaveBeenCalledWith(2.5)
      
      service.setScale(0.05) // Below minimum
      expect(mockSprite.scale.set).toHaveBeenCalledWith(0.1)
      
      service.setScale(15) // Above maximum
      expect(mockSprite.scale.set).toHaveBeenCalledWith(10)
    })

    it('should set opacity with limits', () => {
      service.setOpacity(0.5)
      expect(mockSprite.alpha).toBe(0.5)
      
      service.setOpacity(-0.1) // Below minimum
      expect(mockSprite.alpha).toBe(0)
      
      service.setOpacity(1.5) // Above maximum
      expect(mockSprite.alpha).toBe(1)
    })

    it('should set rotation when unlocked', () => {
      service.setLocked(false)
      
      service.setRotation(Math.PI / 4)
      
      expect(mockSprite.rotation).toBe(Math.PI / 4)
    })
  })

  describe('Canvas Fitting', () => {
    beforeEach(async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      await service.loadImage(mockFile)
      service.setLocked(false)
    })

    it('should fit to canvas with contain mode', () => {
      service.fitToCanvas(1600, 1200, 'contain')
      
      const state = service.getState()
      expect(state.config.scale).toBe(1.5) // Min of 1600/800=2, 1200/600=2, so 1.5 for contain
    })

    it('should fit to canvas with cover mode', () => {
      service.fitToCanvas(1600, 1200, 'cover')
      
      const state = service.getState()
      expect(state.config.scale).toBe(2) // Max of 1600/800=2, 1200/600=2
    })

    it('should center image with none mode', () => {
      service.fitToCanvas(1600, 1200, 'none')
      
      const state = service.getState()
      expect(state.config.x).toBe(400) // (1600-800)/2
      expect(state.config.y).toBe(300) // (1200-600)/2
    })

    it('should not fit when locked', () => {
      service.setLocked(true)
      const originalConfig = service.getState().config
      
      service.fitToCanvas(1600, 1200, 'contain')
      
      const newConfig = service.getState().config
      expect(newConfig).toEqual(originalConfig)
    })
  })

  describe('Mouse Interaction', () => {
    beforeEach(async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      await service.loadImage(mockFile)
      service.setLocked(false)
    })

    it('should handle mouse down within image bounds', () => {
      const result = service.handleMouseDown({ x: 400, y: 300, button: 0 })
      
      expect(result).toBe(true)
    })

    it('should not handle mouse down outside image bounds', () => {
      const result = service.handleMouseDown({ x: 1000, y: 1000, button: 0 })
      
      expect(result).toBe(false)
    })

    it('should not handle mouse down when locked', () => {
      service.setLocked(true)
      
      const result = service.handleMouseDown({ x: 400, y: 300, button: 0 })
      
      expect(result).toBe(false)
    })

    it('should handle mouse move during drag', () => {
      service.handleMouseDown({ x: 400, y: 300, button: 0 })
      
      const result = service.handleMouseMove({ x: 450, y: 350 })
      
      expect(result).toBe(true)
      expect(mockSprite.x).toBe(50) // Moved by delta
      expect(mockSprite.y).toBe(50)
    })

    it('should handle mouse up to end drag', () => {
      service.handleMouseDown({ x: 400, y: 300, button: 0 })
      
      const result = service.handleMouseUp()
      
      expect(result).toBe(true)
    })
  })

  describe('Utility Functions', () => {
    it('should check if image exists', () => {
      expect(service.hasImage()).toBe(false)
    })

    it('should get image bounds', async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      await service.loadImage(mockFile)
      
      const bounds = service.getImageBounds()
      
      expect(bounds).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600
      })
    })

    it('should return null bounds when no image', () => {
      const bounds = service.getImageBounds()
      
      expect(bounds).toBe(null)
    })

    it('should reset image configuration', async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      await service.loadImage(mockFile)
      
      service.updateConfig({ opacity: 0.5, scale: 2 })
      service.resetImage()
      
      const state = service.getState()
      expect(state.config).toEqual(DEFAULT_IMAGE_CONFIG)
    })
  })

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const callback = vi.fn()
      
      service.addEventListener('image-loaded', callback)
      service.removeEventListener('image-loaded', callback)
      
      // Should not throw
      expect(() => service.removeEventListener('image-loaded', callback)).not.toThrow()
    })

    it('should handle errors in event listeners gracefully', async () => {
      const faultyCallback = vi.fn(() => { throw new Error('Callback error') })
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      service.addEventListener('image-loaded', faultyCallback)
      
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      
      // Should not throw despite callback error
      await expect(service.loadImage(mockFile)).resolves.toBeUndefined()
      
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Resource Cleanup', () => {
    it('should destroy resources properly', async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      await service.loadImage(mockFile)
      
      service.destroy()
      
      expect(mockSprite.destroy).toHaveBeenCalled()
      expect(mockTexture.destroy).toHaveBeenCalled()
    })

    it('should handle destroy without image', () => {
      expect(() => service.destroy()).not.toThrow()
    })

    it('should handle multiple destroy calls', async () => {
      const mockFile = createMockFile('test.png', 'image/png')
      service.setContainer(mockContainer)
      await service.loadImage(mockFile)
      
      service.destroy()
      service.destroy() // Second call
      
      // Should not throw on second destroy
      expect(() => service.destroy()).not.toThrow()
    })
  })
})