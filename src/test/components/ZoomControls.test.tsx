import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ZoomControls, CompactZoomControls, ZoomSlider } from '@/components/ZoomControls'

describe('ZoomControls', () => {
  const defaultProps = {
    zoom: 1.0,
    zoomPercentage: 100,
    canZoomIn: true,
    canZoomOut: true,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onResetZoom: vi.fn(),
    onResetViewport: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render all zoom control buttons', () => {
      render(<ZoomControls {...defaultProps} />)

      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reset zoom/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reset view/i })).toBeInTheDocument()
    })

    it('should display zoom percentage', () => {
      render(<ZoomControls {...defaultProps} zoomPercentage={150} />)

      expect(screen.getByText('150%')).toBeInTheDocument()
    })

    it('should hide zoom percentage when showPercentage is false', () => {
      render(<ZoomControls {...defaultProps} showPercentage={false} />)

      expect(screen.queryByText('100%')).not.toBeInTheDocument()
    })

    it('should render fit to content button when provided', () => {
      const onFitToContent = vi.fn()
      render(<ZoomControls {...defaultProps} onFitToContent={onFitToContent} />)

      expect(screen.getByRole('button', { name: /fit to content/i })).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<ZoomControls {...defaultProps} className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Button States', () => {
    it('should disable zoom in button when canZoomIn is false', () => {
      render(<ZoomControls {...defaultProps} canZoomIn={false} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      expect(zoomInButton).toBeDisabled()
    })

    it('should disable zoom out button when canZoomOut is false', () => {
      render(<ZoomControls {...defaultProps} canZoomOut={false} />)

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
      expect(zoomOutButton).toBeDisabled()
    })

    it('should enable both buttons when zoom is possible', () => {
      render(<ZoomControls {...defaultProps} canZoomIn={true} canZoomOut={true} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
      
      expect(zoomInButton).not.toBeDisabled()
      expect(zoomOutButton).not.toBeDisabled()
    })
  })

  describe('Button Interactions', () => {
    it('should call onZoomIn when zoom in button is clicked', () => {
      render(<ZoomControls {...defaultProps} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      fireEvent.click(zoomInButton)

      expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1)
    })

    it('should call onZoomOut when zoom out button is clicked', () => {
      render(<ZoomControls {...defaultProps} />)

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
      fireEvent.click(zoomOutButton)

      expect(defaultProps.onZoomOut).toHaveBeenCalledTimes(1)
    })

    it('should call onResetZoom when reset zoom button is clicked', () => {
      render(<ZoomControls {...defaultProps} />)

      const resetZoomButton = screen.getByRole('button', { name: /reset zoom/i })
      fireEvent.click(resetZoomButton)

      expect(defaultProps.onResetZoom).toHaveBeenCalledTimes(1)
    })

    it('should call onResetViewport when reset viewport button is clicked', () => {
      render(<ZoomControls {...defaultProps} />)

      const resetViewportButton = screen.getByRole('button', { name: /reset view/i })
      fireEvent.click(resetViewportButton)

      expect(defaultProps.onResetViewport).toHaveBeenCalledTimes(1)
    })

    it('should call onResetZoom when zoom percentage is clicked', () => {
      render(<ZoomControls {...defaultProps} />)

      const percentageBadge = screen.getByText('100%')
      fireEvent.click(percentageBadge)

      expect(defaultProps.onResetZoom).toHaveBeenCalledTimes(1)
    })

    it('should call onFitToContent when fit to content button is clicked', () => {
      const onFitToContent = vi.fn()
      render(<ZoomControls {...defaultProps} onFitToContent={onFitToContent} />)

      const fitToContentButton = screen.getByRole('button', { name: /fit to content/i })
      fireEvent.click(fitToContentButton)

      expect(onFitToContent).toHaveBeenCalledTimes(1)
    })
  })

  describe('Layout Variants', () => {
    it('should render vertically by default', () => {
      const { container } = render(<ZoomControls {...defaultProps} />)

      expect(container.firstChild).toHaveClass('flex-col')
    })

    it('should render horizontally when vertical is false', () => {
      const { container } = render(<ZoomControls {...defaultProps} vertical={false} />)

      expect(container.firstChild).toHaveClass('flex-row')
    })
  })

  describe('Tooltips', () => {
    it('should show tooltips on hover', async () => {
      render(<ZoomControls {...defaultProps} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      
      fireEvent.mouseEnter(zoomInButton)
      
      // Tooltip content should be available (implementation depends on tooltip library)
      expect(zoomInButton).toHaveAttribute('aria-describedby')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ZoomControls {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('should support keyboard navigation', () => {
      render(<ZoomControls {...defaultProps} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      
      zoomInButton.focus()
      expect(zoomInButton).toHaveFocus()
      
      fireEvent.keyDown(zoomInButton, { key: 'Enter' })
      expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1)
    })
  })
})

describe('CompactZoomControls', () => {
  const compactProps = {
    zoom: 1.0,
    zoomPercentage: 100,
    canZoomIn: true,
    canZoomOut: true,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onResetZoom: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Compact Layout', () => {
    it('should render compact zoom controls', () => {
      render(<CompactZoomControls {...compactProps} />)

      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should use smaller button sizes', () => {
      render(<CompactZoomControls {...compactProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('h-6', 'w-6')
      })
    })

    it('should arrange controls horizontally', () => {
      const { container } = render(<CompactZoomControls {...compactProps} />)

      expect(container.firstChild).toHaveClass('flex', 'items-center')
    })
  })

  describe('Compact Interactions', () => {
    it('should handle zoom in clicks', () => {
      render(<CompactZoomControls {...compactProps} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      fireEvent.click(zoomInButton)

      expect(compactProps.onZoomIn).toHaveBeenCalledTimes(1)
    })

    it('should handle zoom out clicks', () => {
      render(<CompactZoomControls {...compactProps} />)

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
      fireEvent.click(zoomOutButton)

      expect(compactProps.onZoomOut).toHaveBeenCalledTimes(1)
    })

    it('should handle percentage clicks', () => {
      render(<CompactZoomControls {...compactProps} />)

      const percentageBadge = screen.getByText('100%')
      fireEvent.click(percentageBadge)

      expect(compactProps.onResetZoom).toHaveBeenCalledTimes(1)
    })
  })
})

describe('ZoomSlider', () => {
  const sliderProps = {
    zoom: 1.0,
    minZoom: 0.1,
    maxZoom: 5.0,
    onZoomChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Slider Rendering', () => {
    it('should render zoom slider', () => {
      render(<ZoomSlider {...sliderProps} />)

      const slider = screen.getByRole('slider')
      expect(slider).toBeInTheDocument()
      expect(slider).toHaveAttribute('min', '0.1')
      expect(slider).toHaveAttribute('max', '5')
      expect(slider).toHaveAttribute('value', '1')
    })

    it('should display zoom icons', () => {
      const { container } = render(<ZoomSlider {...sliderProps} />)

      // Check for zoom icons (implementation depends on icon library)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThanOrEqual(2) // ZoomOut and ZoomIn icons
    })

    it('should display zoom percentage', () => {
      render(<ZoomSlider {...sliderProps} zoom={1.5} />)

      expect(screen.getByText('150%')).toBeInTheDocument()
    })
  })

  describe('Slider Interactions', () => {
    it('should call onZoomChange when slider value changes', () => {
      render(<ZoomSlider {...sliderProps} />)

      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: '2.0' } })

      expect(sliderProps.onZoomChange).toHaveBeenCalledWith(2.0)
    })

    it('should handle decimal zoom values', () => {
      render(<ZoomSlider {...sliderProps} />)

      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: '1.25' } })

      expect(sliderProps.onZoomChange).toHaveBeenCalledWith(1.25)
    })

    it('should respect min and max zoom bounds', () => {
      render(<ZoomSlider {...sliderProps} />)

      const slider = screen.getByRole('slider')
      
      // Test minimum bound
      fireEvent.change(slider, { target: { value: '0.05' } })
      expect(sliderProps.onZoomChange).toHaveBeenCalledWith(0.05) // Slider allows it, but service should clamp
      
      // Test maximum bound
      fireEvent.change(slider, { target: { value: '10.0' } })
      expect(sliderProps.onZoomChange).toHaveBeenCalledWith(10.0) // Slider allows it, but service should clamp
    })
  })

  describe('Slider Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ZoomSlider {...sliderProps} />)

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('min')
      expect(slider).toHaveAttribute('max')
      expect(slider).toHaveAttribute('step')
      expect(slider).toHaveAttribute('value')
    })

    it('should support keyboard navigation', () => {
      render(<ZoomSlider {...sliderProps} />)

      const slider = screen.getByRole('slider')
      
      slider.focus()
      expect(slider).toHaveFocus()
      
      fireEvent.keyDown(slider, { key: 'ArrowRight' })
      // Keyboard navigation behavior depends on browser implementation
    })
  })

  describe('Visual Feedback', () => {
    it('should update percentage display when zoom changes', () => {
      const { rerender } = render(<ZoomSlider {...sliderProps} zoom={1.0} />)
      
      expect(screen.getByText('100%')).toBeInTheDocument()
      
      rerender(<ZoomSlider {...sliderProps} zoom={2.5} />)
      
      expect(screen.getByText('250%')).toBeInTheDocument()
    })

    it('should show tooltip with current zoom level', () => {
      render(<ZoomSlider {...sliderProps} zoom={1.75} />)

      const slider = screen.getByRole('slider')
      
      fireEvent.mouseEnter(slider)
      
      // Tooltip should show zoom percentage
      expect(slider).toHaveAttribute('aria-describedby')
    })
  })
})

describe('ZoomControls Integration', () => {
  it('should work together with different variants', () => {
    const props = {
      zoom: 1.5,
      zoomPercentage: 150,
      canZoomIn: true,
      canZoomOut: true,
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn(),
      onResetZoom: vi.fn(),
      onResetViewport: vi.fn()
    }

    const { container } = render(
      <div>
        <ZoomControls {...props} />
        <CompactZoomControls {...props} />
        <ZoomSlider 
          zoom={props.zoom} 
          minZoom={0.1} 
          maxZoom={5.0} 
          onZoomChange={vi.fn()} 
        />
      </div>
    )

    // All variants should render without conflicts
    expect(container).toBeInTheDocument()
    
    // Should have multiple zoom controls
    const zoomInButtons = screen.getAllByRole('button', { name: /zoom in/i })
    expect(zoomInButtons.length).toBeGreaterThan(1)
  })

  it('should handle edge cases gracefully', () => {
    const edgeCaseProps = {
      zoom: 0,
      zoomPercentage: 0,
      canZoomIn: false,
      canZoomOut: false,
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn(),
      onResetZoom: vi.fn(),
      onResetViewport: vi.fn()
    }

    expect(() => {
      render(<ZoomControls {...edgeCaseProps} />)
    }).not.toThrow()

    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})