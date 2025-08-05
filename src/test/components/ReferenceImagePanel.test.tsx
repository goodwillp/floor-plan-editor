import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReferenceImagePanel, CompactReferenceImageControls } from '@/components/ReferenceImagePanel'
import type { ReferenceImageConfig } from '@/lib/ReferenceImageService'

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, max, min, step, className, disabled }: any) => (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      max={max}
      min={min}
      step={step}
      className={className}
      disabled={disabled}
      data-testid="slider"
    />
  )
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      id={id}
      data-testid="switch"
    />
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => children,
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick} role="menuitem">{children}</div>
  )
}))

vi.mock('@/components/ImageUpload', () => ({
  ImageUpload: ({ onImageLoad, onImageRemove, hasImage, isLoading, error }: any) => (
    <div data-testid="image-upload">
      <button onClick={() => onImageLoad(new File(['test'], 'test.png', { type: 'image/png' }))}>
        Load Image
      </button>
      {hasImage && <button onClick={onImageRemove}>Remove Image</button>}
      {isLoading && <div>Loading...</div>}
      {error && <div data-testid="upload-error">{error}</div>}
    </div>
  ),
  ImageInfo: ({ imageInfo }: any) => (
    <div data-testid="image-info">
      {imageInfo && <div>{imageInfo.name}</div>}
    </div>
  )
}))

describe('ReferenceImagePanel', () => {
  const defaultConfig: ReferenceImageConfig = {
    opacity: 0.7,
    scale: 1.0,
    x: 0,
    y: 0,
    locked: true,
    visible: true,
    rotation: 0,
    fitMode: 'none'
  }

  const defaultProps = {
    hasImage: false,
    imageInfo: null,
    config: defaultConfig,
    isLoading: false,
    error: null,
    onImageLoad: vi.fn(),
    onImageRemove: vi.fn(),
    onConfigUpdate: vi.fn(),
    onReset: vi.fn(),
    onToggleLock: vi.fn(),
    onToggleVisibility: vi.fn(),
    onFitToCanvas: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render without image', () => {
      render(<ReferenceImagePanel {...defaultProps} />)
      
      expect(screen.getByText('Reference Image')).toBeInTheDocument()
      expect(screen.getByTestId('image-upload')).toBeInTheDocument()
      expect(screen.queryByText('Lock Position')).not.toBeInTheDocument()
    })

    it('should render with image', () => {
      const imageInfo = {
        name: 'test.png',
        size: 1024,
        dimensions: { width: 800, height: 600 },
        type: 'image/png'
      }

      render(
        <ReferenceImagePanel 
          {...defaultProps} 
          hasImage={true} 
          imageInfo={imageInfo}
        />
      )
      
      expect(screen.getByTestId('image-info')).toBeInTheDocument()
      expect(screen.getByText('test.png')).toBeInTheDocument()
      expect(screen.getByText('Lock Position')).toBeInTheDocument()
      expect(screen.getByText('Visibility')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      render(<ReferenceImagePanel {...defaultProps} isLoading={true} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show error state', () => {
      render(<ReferenceImagePanel {...defaultProps} error="Load failed" />)
      
      expect(screen.getByTestId('upload-error')).toBeInTheDocument()
      expect(screen.getByText('Load failed')).toBeInTheDocument()
    })

    it('should display correct badges', () => {
      render(
        <ReferenceImagePanel 
          {...defaultProps} 
          hasImage={true}
          config={{ ...defaultConfig, locked: true, visible: true }}
        />
      )
      
      expect(screen.getByText('Locked')).toBeInTheDocument()
      expect(screen.getByText('Visible')).toBeInTheDocument()
    })

    it('should display unlocked and hidden badges', () => {
      render(
        <ReferenceImagePanel 
          {...defaultProps} 
          hasImage={true}
          config={{ ...defaultConfig, locked: false, visible: false }}
        />
      )
      
      expect(screen.getByText('Unlocked')).toBeInTheDocument()
      expect(screen.getByText('Hidden')).toBeInTheDocument()
    })
  })

  describe('Image Upload', () => {
    it('should handle image load', async () => {
      const user = userEvent.setup()
      
      render(<ReferenceImagePanel {...defaultProps} />)
      
      await user.click(screen.getByText('Load Image'))
      
      expect(defaultProps.onImageLoad).toHaveBeenCalledWith(
        expect.any(File)
      )
    })

    it('should handle image remove', async () => {
      const user = userEvent.setup()
      
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      await user.click(screen.getByText('Remove Image'))
      
      expect(defaultProps.onImageRemove).toHaveBeenCalled()
    })
  })

  describe('Lock and Visibility Controls', () => {
    it('should toggle lock', async () => {
      const user = userEvent.setup()
      
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      const lockSwitch = screen.getAllByTestId('switch')[0]
      await user.click(lockSwitch)
      
      expect(defaultProps.onToggleLock).toHaveBeenCalled()
    })

    it('should toggle visibility', async () => {
      const user = userEvent.setup()
      
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      const visibilitySwitch = screen.getAllByTestId('switch')[1]
      await user.click(visibilitySwitch)
      
      expect(defaultProps.onToggleVisibility).toHaveBeenCalled()
    })
  })

  describe('Transform Controls', () => {
    it('should update opacity', async () => {
      const user = userEvent.setup()
      
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      const opacitySlider = screen.getAllByTestId('slider')[0]
      fireEvent.change(opacitySlider, { target: { value: '0.5' } })
      
      expect(defaultProps.onConfigUpdate).toHaveBeenCalledWith({ opacity: 0.5 })
    })

    it('should update scale', async () => {
      const user = userEvent.setup()
      
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      const scaleSlider = screen.getAllByTestId('slider')[1]
      fireEvent.change(scaleSlider, { target: { value: '2' } })
      
      expect(defaultProps.onConfigUpdate).toHaveBeenCalledWith({ scale: 2 })
    })

    it('should update position X', async () => {
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      const positionXSlider = screen.getAllByTestId('slider')[2]
      fireEvent.change(positionXSlider, { target: { value: '100' } })
      
      expect(defaultProps.onConfigUpdate).toHaveBeenCalledWith({ x: 100 })
    })

    it('should update position Y', async () => {
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      const positionYSlider = screen.getAllByTestId('slider')[3]
      fireEvent.change(positionYSlider, { target: { value: '200' } })
      
      expect(defaultProps.onConfigUpdate).toHaveBeenCalledWith({ y: 200 })
    })

    it('should update rotation', async () => {
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      const rotationSlider = screen.getAllByTestId('slider')[4]
      fireEvent.change(rotationSlider, { target: { value: '45' } })
      
      // Should convert degrees to radians
      expect(defaultProps.onConfigUpdate).toHaveBeenCalledWith({ 
        rotation: (45 * Math.PI) / 180 
      })
    })

    it('should disable controls when locked', () => {
      render(
        <ReferenceImagePanel 
          {...defaultProps} 
          hasImage={true}
          config={{ ...defaultConfig, locked: true }}
        />
      )
      
      const sliders = screen.getAllByTestId('slider')
      // Scale, Position X, Position Y, Rotation should be disabled (not opacity)
      expect(sliders[1]).toBeDisabled() // Scale
      expect(sliders[2]).toBeDisabled() // Position X
      expect(sliders[3]).toBeDisabled() // Position Y
      expect(sliders[4]).toBeDisabled() // Rotation
    })
  })

  describe('Action Buttons', () => {
    it('should handle reset', async () => {
      const user = userEvent.setup()
      
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      // Find reset button (RotateCcw icon button)
      const resetButton = screen.getByRole('button', { name: /reset/i })
      await user.click(resetButton)
      
      expect(defaultProps.onReset).toHaveBeenCalled()
    })

    it('should handle fit to canvas options', async () => {
      const user = userEvent.setup()
      
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      // Click on dropdown menu items
      const fitToCanvasItem = screen.getByRole('menuitem', { name: /fit to canvas/i })
      await user.click(fitToCanvasItem)
      
      expect(defaultProps.onFitToCanvas).toHaveBeenCalledWith('contain')
    })
  })

  describe('Display Values', () => {
    it('should display correct percentage values', () => {
      render(
        <ReferenceImagePanel 
          {...defaultProps} 
          hasImage={true}
          config={{ ...defaultConfig, opacity: 0.75, scale: 1.5 }}
        />
      )
      
      expect(screen.getByText('75%')).toBeInTheDocument() // Opacity
      expect(screen.getByText('150%')).toBeInTheDocument() // Scale
    })

    it('should display correct position values', () => {
      render(
        <ReferenceImagePanel 
          {...defaultProps} 
          hasImage={true}
          config={{ ...defaultConfig, x: 123, y: 456 }}
        />
      )
      
      expect(screen.getByText('123')).toBeInTheDocument() // X position
      expect(screen.getByText('456')).toBeInTheDocument() // Y position
    })

    it('should display correct rotation value', () => {
      render(
        <ReferenceImagePanel 
          {...defaultProps} 
          hasImage={true}
          config={{ ...defaultConfig, rotation: Math.PI / 4 }}
        />
      )
      
      expect(screen.getByText('45°')).toBeInTheDocument() // 45 degrees
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels', () => {
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      expect(screen.getByText('Lock Position')).toBeInTheDocument()
      expect(screen.getByText('Visibility')).toBeInTheDocument()
      expect(screen.getByText('Transform')).toBeInTheDocument()
      expect(screen.getByText('Opacity')).toBeInTheDocument()
      expect(screen.getByText('Scale')).toBeInTheDocument()
      expect(screen.getByText('Position')).toBeInTheDocument()
      expect(screen.getByText('Rotation')).toBeInTheDocument()
    })

    it('should have tooltips for buttons', () => {
      render(<ReferenceImagePanel {...defaultProps} hasImage={true} />)
      
      expect(screen.getByRole('tooltip', { name: /reset to default/i })).toBeInTheDocument()
    })
  })
})

describe('CompactReferenceImageControls', () => {
  const defaultProps = {
    hasImage: true,
    isLocked: true,
    isVisible: true,
    onToggleLock: vi.fn(),
    onToggleVisibility: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when no image', () => {
      const { container } = render(
        <CompactReferenceImageControls {...defaultProps} hasImage={false} />
      )
      
      expect(container.firstChild).toBeNull()
    })

    it('should render when image exists', () => {
      render(<CompactReferenceImageControls {...defaultProps} />)
      
      expect(screen.getAllByRole('button')).toHaveLength(2)
    })

    it('should show correct button states', () => {
      render(
        <CompactReferenceImageControls 
          {...defaultProps} 
          isLocked={true}
          isVisible={true}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveClass('bg-primary') // Locked button should be active
      expect(buttons[1]).toHaveClass('bg-primary') // Visible button should be active
    })

    it('should show unlocked and hidden states', () => {
      render(
        <CompactReferenceImageControls 
          {...defaultProps} 
          isLocked={false}
          isVisible={false}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).not.toHaveClass('bg-primary') // Unlocked button should not be active
      expect(buttons[1]).not.toHaveClass('bg-primary') // Hidden button should not be active
    })
  })

  describe('Interactions', () => {
    it('should handle lock toggle', async () => {
      const user = userEvent.setup()
      
      render(<CompactReferenceImageControls {...defaultProps} />)
      
      const lockButton = screen.getAllByRole('button')[0]
      await user.click(lockButton)
      
      expect(defaultProps.onToggleLock).toHaveBeenCalled()
    })

    it('should handle visibility toggle', async () => {
      const user = userEvent.setup()
      
      render(<CompactReferenceImageControls {...defaultProps} />)
      
      const visibilityButton = screen.getAllByRole('button')[1]
      await user.click(visibilityButton)
      
      expect(defaultProps.onToggleVisibility).toHaveBeenCalled()
    })
  })

  describe('Tooltips', () => {
    it('should show correct tooltips for locked state', () => {
      render(
        <CompactReferenceImageControls 
          {...defaultProps} 
          isLocked={true}
          isVisible={true}
        />
      )
      
      expect(screen.getByRole('tooltip', { name: /unlock image movement/i })).toBeInTheDocument()
      expect(screen.getByRole('tooltip', { name: /hide reference image/i })).toBeInTheDocument()
    })

    it('should show correct tooltips for unlocked state', () => {
      render(
        <CompactReferenceImageControls 
          {...defaultProps} 
          isLocked={false}
          isVisible={false}
        />
      )
      
      expect(screen.getByRole('tooltip', { name: /lock image position/i })).toBeInTheDocument()
      expect(screen.getByRole('tooltip', { name: /show reference image/i })).toBeInTheDocument()
    })
  })
})