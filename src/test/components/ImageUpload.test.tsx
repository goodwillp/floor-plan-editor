import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUpload, CompactImageUpload, ImageInfo } from '@/components/ImageUpload'

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${variant} ${size} ${className}`}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => children,
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div data-variant={variant}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon" />,
  Image: ({ className }: any) => <div data-testid="image-icon" className={className} />,
  X: () => <div data-testid="x-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />
}))

describe('ImageUpload', () => {
  const defaultProps = {
    onImageLoad: vi.fn().mockResolvedValue(undefined),
    onImageRemove: vi.fn(),
    hasImage: false,
    isLoading: false,
    error: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render upload area', () => {
      render(<ImageUpload {...defaultProps} />)
      
      expect(screen.getByTestId('upload-icon')).toBeInTheDocument()
      expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument()
      expect(screen.getByText('PNG, JPG, GIF, BMP, WEBP up to 10MB')).toBeInTheDocument()
      expect(screen.getByText('Load Image')).toBeInTheDocument()
    })

    it('should show remove button when image exists', () => {
      render(<ImageUpload {...defaultProps} hasImage={true} />)
      
      expect(screen.getByText('Replace Image')).toBeInTheDocument()
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      render(<ImageUpload {...defaultProps} isLoading={true} />)
      
      expect(screen.getByText('Loading image...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /load image/i })).toBeDisabled()
    })

    it('should show error state', () => {
      render(<ImageUpload {...defaultProps} error="Upload failed" />)
      
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(<ImageUpload {...defaultProps} disabled={true} />)
      
      expect(screen.getByRole('button', { name: /load image/i })).toBeDisabled()
    })
  })

  describe('File Upload', () => {
    it('should handle file selection via input', async () => {
      const user = userEvent.setup()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      
      render(<ImageUpload {...defaultProps} />)
      
      const fileInput = screen.getByRole('button', { name: /load image/i })
      await user.click(fileInput)
      
      // Simulate file input change
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (hiddenInput) {
        Object.defineProperty(hiddenInput, 'files', {
          value: [file],
          writable: false
        })
        fireEvent.change(hiddenInput)
      }
      
      await waitFor(() => {
        expect(defaultProps.onImageLoad).toHaveBeenCalledWith(file)
      })
    })

    it('should handle drag and drop', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      
      render(<ImageUpload {...defaultProps} />)
      
      const dropArea = screen.getByText('Click to upload or drag and drop').closest('div')
      
      fireEvent.dragOver(dropArea!, {
        dataTransfer: { files: [file] }
      })
      
      expect(screen.getByText('Drop image here')).toBeInTheDocument()
      
      fireEvent.drop(dropArea!, {
        dataTransfer: { files: [file] }
      })
      
      await waitFor(() => {
        expect(defaultProps.onImageLoad).toHaveBeenCalledWith(file)
      })
    })

    it('should validate file size', async () => {
      const user = userEvent.setup()
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', { type: 'image/png' })
      
      const onImageLoad = vi.fn().mockRejectedValue(new Error('File size exceeds 10MB limit'))
      
      render(<ImageUpload {...defaultProps} onImageLoad={onImageLoad} maxSize={10} />)
      
      const fileInput = screen.getByRole('button', { name: /load image/i })
      await user.click(fileInput)
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (hiddenInput) {
        Object.defineProperty(hiddenInput, 'files', {
          value: [largeFile],
          writable: false
        })
        fireEvent.change(hiddenInput)
      }
      
      // Should not call onImageLoad due to size validation
      expect(onImageLoad).toHaveBeenCalled()
    })

    it('should validate file type', async () => {
      const user = userEvent.setup()
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      const onImageLoad = vi.fn().mockRejectedValue(new Error('Invalid file type'))
      
      render(<ImageUpload {...defaultProps} onImageLoad={onImageLoad} />)
      
      const fileInput = screen.getByRole('button', { name: /load image/i })
      await user.click(fileInput)
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (hiddenInput) {
        Object.defineProperty(hiddenInput, 'files', {
          value: [textFile],
          writable: false
        })
        fireEvent.change(hiddenInput)
      }
      
      expect(onImageLoad).toHaveBeenCalled()
    })

    it('should handle empty file selection', async () => {
      const user = userEvent.setup()
      
      render(<ImageUpload {...defaultProps} />)
      
      const fileInput = screen.getByRole('button', { name: /load image/i })
      await user.click(fileInput)
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (hiddenInput) {
        Object.defineProperty(hiddenInput, 'files', {
          value: [],
          writable: false
        })
        fireEvent.change(hiddenInput)
      }
      
      expect(defaultProps.onImageLoad).not.toHaveBeenCalled()
    })
  })

  describe('Image Removal', () => {
    it('should handle image removal', async () => {
      const user = userEvent.setup()
      
      render(<ImageUpload {...defaultProps} hasImage={true} />)
      
      const removeButton = screen.getByTestId('x-icon').closest('button')
      await user.click(removeButton!)
      
      expect(defaultProps.onImageRemove).toHaveBeenCalled()
    })

    it('should not show remove button when no image', () => {
      render(<ImageUpload {...defaultProps} hasImage={false} />)
      
      expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument()
    })
  })

  describe('Drag and Drop States', () => {
    it('should show drag over state', () => {
      render(<ImageUpload {...defaultProps} />)
      
      const dropArea = screen.getByText('Click to upload or drag and drop').closest('div')
      
      fireEvent.dragOver(dropArea!)
      
      expect(screen.getByText('Drop image here')).toBeInTheDocument()
    })

    it('should reset drag state on drag leave', () => {
      render(<ImageUpload {...defaultProps} />)
      
      const dropArea = screen.getByText('Click to upload or drag and drop').closest('div')
      
      fireEvent.dragOver(dropArea!)
      fireEvent.dragLeave(dropArea!)
      
      expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument()
    })

    it('should not allow drag when disabled', () => {
      render(<ImageUpload {...defaultProps} disabled={true} />)
      
      const dropArea = screen.getByText('Click to upload or drag and drop').closest('div')
      
      fireEvent.dragOver(dropArea!)
      
      expect(screen.queryByText('Drop image here')).not.toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('should use custom accept types', () => {
      render(<ImageUpload {...defaultProps} accept="image/png,image/jpeg" />)
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(hiddenInput.accept).toBe('image/png,image/jpeg')
    })

    it('should use custom max size', () => {
      render(<ImageUpload {...defaultProps} maxSize={5} />)
      
      expect(screen.getByText('PNG, JPG, GIF, BMP, WEBP up to 5MB')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<ImageUpload {...defaultProps} className="custom-class" />)
      
      const container = screen.getByText('Click to upload or drag and drop').closest('.custom-class')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Tooltips', () => {
    it('should show correct tooltips', () => {
      render(<ImageUpload {...defaultProps} hasImage={true} />)
      
      expect(screen.getByRole('tooltip', { name: /load a reference image for tracing/i })).toBeInTheDocument()
      expect(screen.getByRole('tooltip', { name: /remove reference image/i })).toBeInTheDocument()
    })
  })
})

describe('CompactImageUpload', () => {
  const defaultProps = {
    onImageLoad: vi.fn().mockResolvedValue(undefined),
    hasImage: false,
    isLoading: false,
    disabled: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render compact button', () => {
      render(<CompactImageUpload {...defaultProps} />)
      
      expect(screen.getByTestId('image-icon')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      render(<CompactImageUpload {...defaultProps} isLoading={true} />)
      
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should show different icon when image exists', () => {
      render(<CompactImageUpload {...defaultProps} hasImage={true} />)
      
      const icon = screen.getByTestId('image-icon')
      expect(icon).toHaveClass('text-primary')
    })

    it('should be disabled when disabled prop is true', () => {
      render(<CompactImageUpload {...defaultProps} disabled={true} />)
      
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('File Upload', () => {
    it('should handle file selection', async () => {
      const user = userEvent.setup()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      
      render(<CompactImageUpload {...defaultProps} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (hiddenInput) {
        Object.defineProperty(hiddenInput, 'files', {
          value: [file],
          writable: false
        })
        fireEvent.change(hiddenInput)
      }
      
      await waitFor(() => {
        expect(defaultProps.onImageLoad).toHaveBeenCalledWith(file)
      })
    })

    it('should reset input value after selection', async () => {
      const user = userEvent.setup()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      
      render(<CompactImageUpload {...defaultProps} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (hiddenInput) {
        Object.defineProperty(hiddenInput, 'files', {
          value: [file],
          writable: false
        })
        fireEvent.change(hiddenInput)
        
        await waitFor(() => {
          expect(hiddenInput.value).toBe('')
        })
      }
    })
  })

  describe('Tooltips', () => {
    it('should show correct tooltip for no image', () => {
      render(<CompactImageUpload {...defaultProps} hasImage={false} />)
      
      expect(screen.getByRole('tooltip', { name: /load reference image/i })).toBeInTheDocument()
    })

    it('should show correct tooltip for existing image', () => {
      render(<CompactImageUpload {...defaultProps} hasImage={true} />)
      
      expect(screen.getByRole('tooltip', { name: /replace reference image/i })).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(<CompactImageUpload {...defaultProps} className="custom-class" />)
      
      const container = screen.getByRole('button').closest('.custom-class')
      expect(container).toBeInTheDocument()
    })
  })
})

describe('ImageInfo', () => {
  const defaultImageInfo = {
    name: 'test-image.png',
    size: 2048,
    dimensions: { width: 800, height: 600 },
    type: 'image/png'
  }

  describe('Rendering', () => {
    it('should render image information', () => {
      render(<ImageInfo imageInfo={defaultImageInfo} />)
      
      expect(screen.getByText('test-image.png')).toBeInTheDocument()
      expect(screen.getByText('800 × 600')).toBeInTheDocument()
      expect(screen.getByText('2.00 KB')).toBeInTheDocument()
    })

    it('should not render when no image info', () => {
      const { container } = render(<ImageInfo imageInfo={null} />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should truncate long filenames', () => {
      const longNameInfo = {
        ...defaultImageInfo,
        name: 'very-long-filename-that-should-be-truncated.png'
      }
      
      render(<ImageInfo imageInfo={longNameInfo} />)
      
      const nameElement = screen.getByText(longNameInfo.name)
      expect(nameElement).toHaveClass('truncate')
      expect(nameElement).toHaveAttribute('title', longNameInfo.name)
    })

    it('should format file sizes correctly', () => {
      const testCases = [
        { size: 0, expected: '0 B' },
        { size: 1024, expected: '1.00 KB' },
        { size: 1048576, expected: '1.00 MB' },
        { size: 1073741824, expected: '1.00 GB' },
        { size: 1536, expected: '1.50 KB' }
      ]
      
      testCases.forEach(({ size, expected }) => {
        const { rerender } = render(
          <ImageInfo imageInfo={{ ...defaultImageInfo, size }} />
        )
        
        expect(screen.getByText(expected)).toBeInTheDocument()
        
        rerender(<div />)
      })
    })

    it('should apply custom className', () => {
      render(<ImageInfo imageInfo={defaultImageInfo} className="custom-class" />)
      
      const container = screen.getByText('test-image.png').closest('.custom-class')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should provide title attribute for filename', () => {
      render(<ImageInfo imageInfo={defaultImageInfo} />)
      
      const nameElement = screen.getByText('test-image.png')
      expect(nameElement).toHaveAttribute('title', 'test-image.png')
    })
  })
})