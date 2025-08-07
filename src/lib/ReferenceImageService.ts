import * as PIXI from 'pixi.js'

/**
 * Reference image configuration interface
 */
export interface ReferenceImageConfig {
  /** Image opacity (0-1) */
  opacity: number
  /** Image scale factor */
  scale: number
  /** Image position X */
  x: number
  /** Image position Y */
  y: number
  /** Whether image is locked from movement */
  locked: boolean
  /** Whether image is visible */
  visible: boolean
  /** Image rotation in radians */
  rotation: number
  /** Image fit mode */
  fitMode: 'none' | 'contain' | 'cover' | 'fill'
}

/**
 * Default reference image configuration
 */
export const DEFAULT_IMAGE_CONFIG: ReferenceImageConfig = {
  opacity: 0.7,
  scale: 1.0,
  x: 0,
  y: 0,
  locked: true,      // Default to locked (Requirement 13.3)
  visible: true,
  rotation: 0,
  fitMode: 'none'
}

/**
 * Reference image state interface
 */
export interface ReferenceImageState {
  /** Whether an image is loaded */
  hasImage: boolean
  /** Image file information */
  imageInfo: {
    name: string
    size: number
    dimensions: { width: number; height: number }
    type: string
  } | null
  /** Current configuration */
  config: ReferenceImageConfig
}

/**
 * Reference image event types
 */
export type ReferenceImageEvent = 
  | 'image-loaded' 
  | 'image-removed' 
  | 'config-changed' 
  | 'lock-changed'
  | 'visibility-changed'

/**
 * Reference image event data
 */
export interface ReferenceImageEventData {
  hasImage: boolean
  imageInfo: ReferenceImageState['imageInfo']
  config: ReferenceImageConfig
  previousConfig?: ReferenceImageConfig
}

/**
 * ReferenceImageService manages reference image loading and manipulation
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export class ReferenceImageService {
  private config: ReferenceImageConfig
  private imageTexture: PIXI.Texture | null = null
  private imageSprite: PIXI.Sprite | null = null
  private container: PIXI.Container | null = null
  private overlayContainer: PIXI.Container | null = null
  private selectionOverlay: PIXI.Graphics | null = null
  private imageInfo: ReferenceImageState['imageInfo'] = null
  private eventListeners: Map<ReferenceImageEvent, Set<(data: ReferenceImageEventData) => void>> = new Map()
  private isDragging = false
  private dragStartPos = { x: 0, y: 0 }
  private dragStartImagePos = { x: 0, y: 0 }

  constructor(config: ReferenceImageConfig = DEFAULT_IMAGE_CONFIG) {
    this.config = { ...config }
    this.initializeEventListeners()
  }

  /**
   * Initialize event listener maps
   */
  private initializeEventListeners(): void {
    this.eventListeners.set('image-loaded', new Set())
    this.eventListeners.set('image-removed', new Set())
    this.eventListeners.set('config-changed', new Set())
    this.eventListeners.set('lock-changed', new Set())
    this.eventListeners.set('visibility-changed', new Set())
  }

  /**
   * Set the PixiJS container for rendering
   * Requirements: 13.1, 13.2
   * 
   * @param container PixiJS container (should be reference layer)
   */
  setContainer(container: PIXI.Container): void {
    this.container = container
    if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
      console.log('🧩 setContainer(reference)', { hasImage: !!this.imageSprite, childCount: container.children?.length })
    }
    
    // If we have an image, add it to the new container
    if (this.imageSprite && this.container) {
      this.container.addChild(this.imageSprite)
      this.applyConfiguration()
      if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
        console.log('🧩 image added to reference container', { x: this.imageSprite.x, y: this.imageSprite.y })
      }
    }
  }

  /**
   * Optional: set a separate overlay container (e.g., selection layer) so the outline
   * appears above grid/walls. Falls back to reference container if not provided.
   */
  setOverlayContainer(container: PIXI.Container): void {
    this.overlayContainer = container
    // Re-create overlay in the new container if it already exists
    if (this.selectionOverlay) {
      if (this.selectionOverlay.parent) {
        this.selectionOverlay.parent.removeChild(this.selectionOverlay)
      }
      this.overlayContainer.addChild(this.selectionOverlay)
    }
    if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
      console.log('🧩 setOverlayContainer(selection)', { hasOverlay: !!this.selectionOverlay, childCount: container.children?.length })
    }
  }

  /**
   * Load an image from a file
   * Requirements: 13.1, 13.2, 13.3
   * 
   * @param file Image file to load
   * @returns Promise that resolves when image is loaded
   */
  async loadImage(file: File): Promise<void> {
    if (!this.isValidImageFile(file)) {
      throw new Error('Invalid image file. Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP')
    }

    try {
      // Convert file to data URL to avoid blob URL issues with Assets system
      const dataUrl = await this.fileToDataUrl(file)
      
      // Load texture using Image element and BaseTexture to bypass Assets system
      const texture = await this.loadTextureFromDataUrl(dataUrl)
      
      // Clean up previous image
      this.removeImage()
      
      // Store new texture and create sprite
      this.imageTexture = texture
      this.imageSprite = new PIXI.Sprite(texture)
      
      // Store image information
      this.imageInfo = {
        name: file.name,
        size: file.size,
        dimensions: {
          width: texture.width,
          height: texture.height
        },
        type: file.type
      }
      
      // Add to container if available
      if (this.container) {
        this.container.addChild(this.imageSprite)
        if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
          console.log('🖼️ image sprite created & added', { size: this.imageInfo?.dimensions, containerChildren: this.container.children?.length })
        }
      }
      
      // Apply configuration and set up interaction
      this.applyConfiguration()
      this.setupInteraction()
      this.ensureSelectionOverlay()
      if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
        console.log('🖼️ after setup', { locked: this.config.locked })
      }
      
      // Reset to default locked state (Requirement 13.3)
      this.config.locked = true
      
      // Emit event
      this.emitEvent('image-loaded', this.getEventData())
      
    } catch (error) {
      throw new Error(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Load an image from a URL
   * Requirements: 13.1, 13.2, 13.3
   * 
   * @param url Image URL to load
   * @param filename Optional filename for display
   * @returns Promise that resolves when image is loaded
   */
  async loadImageFromUrl(url: string, filename?: string): Promise<void> {
    try {
      // Load texture using the same direct approach
      const texture = await this.loadTextureFromUrl(url)
      
      // Clean up previous image
      this.removeImage()
      
      // Store new texture and create sprite
      this.imageTexture = texture
      this.imageSprite = new PIXI.Sprite(texture)
      
      // Store image information
      this.imageInfo = {
        name: filename || 'reference-image',
        size: 0, // Unknown for URL
        dimensions: {
          width: texture.width,
          height: texture.height
        },
        type: 'image/unknown'
      }
      
      // Add to container if available
      if (this.container) {
        this.container.addChild(this.imageSprite)
      }
      
      // Apply configuration and set up interaction
      this.applyConfiguration()
      this.setupInteraction()
      this.ensureSelectionOverlay()
      
      // Reset to default locked state (Requirement 13.3)
      this.config.locked = true
      
      // Emit event
      this.emitEvent('image-loaded', this.getEventData())
      
    } catch (error) {
      throw new Error(`Failed to load image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Remove the current reference image
   * Requirements: 13.1
   */
  removeImage(): void {
    if (this.imageSprite) {
      // Remove from container
      if (this.container && this.imageSprite.parent === this.container) {
        this.container.removeChild(this.imageSprite)
      }
      
      // Destroy sprite
      this.imageSprite.destroy()
      this.imageSprite = null
    }
    
    if (this.imageTexture) {
      // Destroy texture
      this.imageTexture.destroy()
      this.imageTexture = null
    }
    
    // Clear image info
    this.imageInfo = null
    
    // Reset configuration to defaults
    this.config = { ...DEFAULT_IMAGE_CONFIG }
    
    // Remove selection overlay
    if (this.selectionOverlay) {
      if (this.container && this.selectionOverlay.parent === this.container) {
        this.container.removeChild(this.selectionOverlay)
      }
      this.selectionOverlay.destroy()
      this.selectionOverlay = null
    }
    
    // Emit event
    this.emitEvent('image-removed', this.getEventData())
  }

  /**
   * Get current image state
   */
  getState(): ReferenceImageState {
    return {
      hasImage: this.imageSprite !== null,
      imageInfo: this.imageInfo ? { ...this.imageInfo } : null,
      config: { ...this.config }
    }
  }

  /**
   * Update image configuration
   * Requirements: 13.4, 13.5
   * 
   * @param newConfig Partial configuration to update
   */
  updateConfig(newConfig: Partial<ReferenceImageConfig>): void {
    const previousConfig = { ...this.config }
    this.config = { ...this.config, ...newConfig }
    
    this.applyConfiguration()
    // Update interaction-related props when lock state changes
    if (this.imageSprite && newConfig.locked !== undefined) {
      this.imageSprite.cursor = this.config.locked ? 'default' : 'move'
    }
    // Update overlay visibility on config changes
    if (this.selectionOverlay) {
      this.selectionOverlay.visible = this.isDragging
    }
    
    // Emit specific events for certain changes
    if (previousConfig.locked !== this.config.locked) {
      this.emitEvent('lock-changed', this.getEventData({ previousConfig }))
    }
    
    if (previousConfig.visible !== this.config.visible) {
      this.emitEvent('visibility-changed', this.getEventData({ previousConfig }))
    }
    
    // Always emit config-changed
    this.emitEvent('config-changed', this.getEventData({ previousConfig }))
  }

  /**
   * Toggle image lock state
   * Requirements: 13.4, 13.5
   */
  toggleLock(): boolean {
    this.updateConfig({ locked: !this.config.locked })
    return this.config.locked
  }

  /**
   * Set image lock state
   * Requirements: 13.4, 13.5
   * 
   * @param locked Whether image should be locked
   */
  setLocked(locked: boolean): void {
    this.updateConfig({ locked })
  }

  /**
   * Toggle image visibility
   */
  toggleVisibility(): boolean {
    this.updateConfig({ visible: !this.config.visible })
    return this.config.visible
  }

  /**
   * Set image visibility
   * 
   * @param visible Whether image should be visible
   */
  setVisible(visible: boolean): void {
    this.updateConfig({ visible })
  }

  /**
   * Set image position
   * Requirements: 13.5
   * 
   * @param x X coordinate
   * @param y Y coordinate
   */
  setPosition(x: number, y: number): void {
    if (this.config.locked) return
    this.updateConfig({ x, y })
  }

  /**
   * Move image by delta
   * Requirements: 13.5
   * 
   * @param deltaX X delta
   * @param deltaY Y delta
   */
  moveBy(deltaX: number, deltaY: number): void {
    if (this.config.locked) return
    this.setPosition(this.config.x + deltaX, this.config.y + deltaY)
  }

  /**
   * Set image scale
   * 
   * @param scale Scale factor
   */
  setScale(scale: number): void {
    if (this.config.locked) return
    this.updateConfig({ scale: Math.max(0.1, Math.min(10, scale)) })
  }

  /**
   * Set image opacity
   * 
   * @param opacity Opacity (0-1)
   */
  setOpacity(opacity: number): void {
    this.updateConfig({ opacity: Math.max(0, Math.min(1, opacity)) })
  }

  /**
   * Set image rotation
   * 
   * @param rotation Rotation in radians
   */
  setRotation(rotation: number): void {
    if (this.config.locked) return
    this.updateConfig({ rotation })
  }

  /**
   * Fit image to canvas size
   * 
   * @param canvasWidth Canvas width
   * @param canvasHeight Canvas height
   * @param mode Fit mode
   */
  fitToCanvas(canvasWidth: number, canvasHeight: number, mode: ReferenceImageConfig['fitMode'] = 'contain'): void {
    if (!this.imageTexture || this.config.locked) return
    
    const imageWidth = this.imageTexture.width
    const imageHeight = this.imageTexture.height
    
    let scale = 1
    let x = 0
    let y = 0
    
    switch (mode) {
      case 'contain':
        scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight)
        x = (canvasWidth - imageWidth * scale) / 2
        y = (canvasHeight - imageHeight * scale) / 2
        break
        
      case 'cover':
        scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight)
        x = (canvasWidth - imageWidth * scale) / 2
        y = (canvasHeight - imageHeight * scale) / 2
        break
        
      case 'fill':
        scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight)
        x = 0
        y = 0
        break
        
      case 'none':
      default:
        // Center without scaling
        x = (canvasWidth - imageWidth) / 2
        y = (canvasHeight - imageHeight) / 2
        break
    }
    
    this.updateConfig({ scale, x, y, fitMode: mode })
  }

  /**
   * Reset image to default configuration
   */
  resetImage(): void {
    this.updateConfig(DEFAULT_IMAGE_CONFIG)
  }

  /**
   * Check if image has been loaded
   */
  hasImage(): boolean {
    return this.imageSprite !== null
  }

  /**
   * Get image bounds in world coordinates
   */
  getImageBounds(): { x: number; y: number; width: number; height: number } | null {
    if (!this.imageSprite || !this.imageTexture) return null
    
    return {
      x: this.config.x,
      y: this.config.y,
      width: this.imageTexture.width * this.config.scale,
      height: this.imageTexture.height * this.config.scale
    }
  }

  /** Ensure selection overlay exists and is attached above the image */
  private ensureSelectionOverlay(): void {
    if (!this.container && !this.overlayContainer) return
    if (!this.selectionOverlay) {
      this.selectionOverlay = new PIXI.Graphics()
      // Draw above grid by default; parent container ordering decides cross-layer
      this.selectionOverlay.zIndex = 1000
      this.selectionOverlay.visible = false
      const parent = this.overlayContainer ?? this.container!
      parent.addChild(this.selectionOverlay)
      if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
        console.log('📐 selection overlay created', { parentIsOverlay: !!this.overlayContainer })
      }
    }
    this.updateSelectionOverlay()
  }

  /** Update selection overlay geometry to match current image bounds */
  private updateSelectionOverlay(): void {
    if (!this.selectionOverlay) return
    const b = this.getImageBounds()
    this.selectionOverlay.clear()
    if (b) {
      this.selectionOverlay.alpha = 1
      const g: any = this.selectionOverlay as any
      if (typeof g.rect === 'function' && typeof g.stroke === 'function') {
        g.rect(b.x, b.y, b.width, b.height)
        g.stroke({ width: 2, color: 0x4f46e5, alpha: 0.95 })
      } else {
        // Fallback for older API if needed
        this.selectionOverlay.lineStyle(2, 0x4f46e5, 0.95)
        this.selectionOverlay.drawRect(b.x, b.y, b.width, b.height)
      }
      if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
        console.log('📐 selection overlay updated', b)
      }
    }
  }

  /**
   * Handle mouse down for dragging
   * Requirements: 13.5
   */
  handleMouseDown(event: { x: number; y: number; button: number }): boolean {
    if (!this.imageSprite || this.config.locked || event.button !== 0) return false
    
    const bounds = this.getImageBounds()
    if (!bounds) return false
    
    if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
      console.log('🖼️ ReferenceImage mousedown', { event, bounds })
    }

    // Check if click is within image bounds
    if (event.x >= bounds.x && event.x <= bounds.x + bounds.width &&
        event.y >= bounds.y && event.y <= bounds.y + bounds.height) {
      
      this.isDragging = true
      this.dragStartPos = { x: event.x, y: event.y }
      this.dragStartImagePos = { x: this.config.x, y: this.config.y }
      // Debug: log drag start for troubleshooting
      if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
        console.log('🖼️ ReferenceImage drag start', { event, bounds, config: this.config })
      }
      // Show selection overlay
      if (this.selectionOverlay) {
        this.selectionOverlay.visible = true
        this.updateSelectionOverlay()
      }
      return true
    }
    
    return false
  }

  /**
   * Handle mouse move for dragging
   * Requirements: 13.5
   */
  handleMouseMove(event: { x: number; y: number }): boolean {
    if (!this.isDragging || this.config.locked) return false
    
    const deltaX = event.x - this.dragStartPos.x
    const deltaY = event.y - this.dragStartPos.y
    
    this.setPosition(
      this.dragStartImagePos.x + deltaX,
      this.dragStartImagePos.y + deltaY
    )
    // Debug: log drag move for troubleshooting
    if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
      console.log('🖼️ ReferenceImage dragging', { event, newPos: { x: this.config.x, y: this.config.y } })
    }
    // Update overlay as it moves
    this.updateSelectionOverlay()
    
    return true
  }

  /**
   * Handle mouse up for dragging
   */
  handleMouseUp(): boolean {
    if (!this.isDragging) return false
    
    this.isDragging = false
    if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
      console.log('🖼️ ReferenceImage drag end', { config: this.config })
    }
    if (this.selectionOverlay) {
      this.selectionOverlay.visible = false
    }
    return true
  }

  /**
   * Apply current configuration to the sprite
   */
  private applyConfiguration(): void {
    if (!this.imageSprite) return
    
    this.imageSprite.x = this.config.x
    this.imageSprite.y = this.config.y
    this.imageSprite.scale.set(this.config.scale)
    this.imageSprite.alpha = this.config.opacity
    this.imageSprite.rotation = this.config.rotation
    this.imageSprite.visible = this.config.visible
    
    // Keep sprite at base order within reference layer; the layer itself is below others
    this.imageSprite.zIndex = 0
    // Keep overlay in sync
    this.updateSelectionOverlay()
    if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
      console.log('⚙️ applyConfiguration', { config: this.config })
    }
  }

  /**
   * Set up sprite interaction
   */
  private setupInteraction(): void {
    if (!this.imageSprite) return
    
    // Dynamic so interactive bounds update as the sprite moves
    this.imageSprite.eventMode = 'dynamic'
    this.imageSprite.cursor = this.config.locked ? 'default' : 'move'
    // Attach sprite-level pointer handlers for reliable dragging
    const sprite = this.imageSprite
    const onPointerDown = (e: PIXI.FederatedPointerEvent) => {
      if (this.config.locked) return
      if (e.button !== 0) return
      const gx = Math.round(e.globalX ?? e.global.x)
      const gy = Math.round(e.globalY ?? e.global.y)
      const bounds = this.getImageBounds()
      if (!bounds) return
      // Loosen hit test to tolerant small coordinate drift at edges
      const margin = 2
      if (gx < bounds.x - margin || gx > bounds.x + bounds.width + margin || gy < bounds.y - margin || gy > bounds.y + bounds.height + margin) return
      this.isDragging = true
      this.dragStartPos = { x: gx, y: gy }
      this.dragStartImagePos = { x: this.config.x, y: this.config.y }
      if (this.selectionOverlay) {
        this.selectionOverlay.visible = true
        this.updateSelectionOverlay()
      }
      e.stopPropagation()
      if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
        console.log('🖱️ sprite pointerdown', { gx, gy })
      }
    }
    // Use global events so dragging continues even when the cursor leaves the sprite
    const onPointerMove = (e: PIXI.FederatedPointerEvent) => {
      if (!this.isDragging || this.config.locked) return
      const gx = Math.round(e.globalX ?? e.global.x)
      const gy = Math.round(e.globalY ?? e.global.y)
      const deltaX = gx - this.dragStartPos.x
      const deltaY = gy - this.dragStartPos.y
      this.setPosition(this.dragStartImagePos.x + deltaX, this.dragStartImagePos.y + deltaY)
      this.updateSelectionOverlay()
      e.stopPropagation()
    }
    const onPointerUp = (e: PIXI.FederatedPointerEvent) => {
      if (!this.isDragging) return
      this.isDragging = false
      if (this.selectionOverlay) this.selectionOverlay.visible = false
      e.stopPropagation()
      if ((globalThis as any).DEBUG_REFERENCE_IMAGE) {
        console.log('🖱️ sprite pointerup', { x: e.globalX ?? e.global.x, y: e.globalY ?? e.global.y, finalPos: { x: this.config.x, y: this.config.y } })
      }
    }
    sprite.on('pointerdown', onPointerDown)
    sprite.on('globalpointermove', onPointerMove)
    sprite.on('globalpointerup', onPointerUp)
    sprite.on('pointerupoutside', onPointerUp)
  }

  /**
   * Validate image file type
   * 
   * @param file File to validate
   * @returns Whether file is a valid image
   */
  private isValidImageFile(file: File): boolean {
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/bmp',
      'image/webp'
    ]
    
    return validTypes.includes(file.type.toLowerCase())
  }

  /**
   * Convert a file to a data URL
   */
  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Load texture from data URL using Image element
   */
  private loadTextureFromDataUrl(dataUrl: string): Promise<PIXI.Texture> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          // Create texture directly from Image element
          const texture = PIXI.Texture.from(img)
          resolve(texture)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = dataUrl
    })
  }

  /**
   * Load texture from URL using Image element
   */
  private loadTextureFromUrl(url: string): Promise<PIXI.Texture> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          // Create texture directly from Image element
          const texture = PIXI.Texture.from(img)
          resolve(texture)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = url
    })
  }

  /**
   * Get event data for emitting
   * 
   * @param additional Additional event data
   * @returns Event data object
   */
  private getEventData(additional: Partial<ReferenceImageEventData> = {}): ReferenceImageEventData {
    return {
      hasImage: this.imageSprite !== null,
      imageInfo: this.imageInfo ? { ...this.imageInfo } : null,
      config: { ...this.config },
      ...additional
    }
  }

  /**
   * Add event listener
   * 
   * @param event Event type
   * @param callback Event callback
   */
  addEventListener(event: ReferenceImageEvent, callback: (data: ReferenceImageEventData) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.add(callback)
    }
  }

  /**
   * Remove event listener
   * 
   * @param event Event type
   * @param callback Event callback
   */
  removeEventListener(event: ReferenceImageEvent, callback: (data: ReferenceImageEventData) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * Emit event to all listeners
   * 
   * @param event Event type
   * @param data Event data
   */
  private emitEvent(event: ReferenceImageEvent, data: ReferenceImageEventData): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in reference image service event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Remove image
    this.removeImage()
    
    // Clear all event listeners
    this.eventListeners.forEach(listeners => listeners.clear())
    this.eventListeners.clear()
    
    // Clear container reference
    this.container = null
  }
}