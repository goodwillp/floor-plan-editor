import { useRef, useState } from 'react'
import { Upload, Image, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onImageLoad: (file: File) => Promise<void>
  onImageRemove?: () => void
  hasImage?: boolean
  isLoading?: boolean
  error?: string | null
  className?: string
  accept?: string
  maxSize?: number // in MB
  disabled?: boolean
}

/**
 * ImageUpload component provides file input functionality for reference images
 * Requirements: 13.1
 */
export function ImageUpload({
  onImageLoad,
  onImageRemove,
  hasImage = false,
  isLoading = false,
  error = null,
  className = '',
  accept = 'image/png,image/jpeg,image/jpg,image/gif,image/bmp,image/webp',
  maxSize = 10, // 10MB default
  disabled = false
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = async (file: File) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      throw new Error(`File size exceeds ${maxSize}MB limit`)
    }

    // Validate file type
    const acceptedTypes = accept.split(',').map(type => type.trim())
    if (!acceptedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`)
    }

    try {
      await onImageLoad(file)
    } catch (err) {
      throw err
    }
  }

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      await handleFileSelect(files[0])
    } catch (err) {
      console.error('Error loading image:', err)
    }

    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)

    if (disabled || isLoading) return

    const files = event.dataTransfer.files
    if (files.length === 0) return

    try {
      await handleFileSelect(files[0])
    } catch (err) {
      console.error('Error loading dropped image:', err)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!disabled && !isLoading) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
  }

  const handleUploadClick = () => {
    if (disabled || isLoading) return
    fileInputRef.current?.click()
  }

  const handleRemoveClick = () => {
    if (disabled || isLoading) return
    onImageRemove?.()
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isLoading}
      />

      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5',
          {
            'border-primary bg-primary/10': dragOver,
            'border-muted-foreground/25': !dragOver,
            'opacity-50 cursor-not-allowed': disabled || isLoading,
            'border-destructive bg-destructive/5': error
          }
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleUploadClick}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading image...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {dragOver ? 'Drop image here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF, BMP, WEBP up to {maxSize}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={disabled || isLoading}
          className="flex-1"
          title="Load a reference image for tracing"
        >
          <Image className="h-4 w-4 mr-2" />
          {hasImage ? 'Replace Image' : 'Load Image'}
        </Button>

        {hasImage && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveClick}
            disabled={disabled || isLoading}
            title="Remove reference image"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

/**
 * Compact image upload button for toolbar
 */
interface CompactImageUploadProps {
  onImageLoad: (file: File) => Promise<void>
  hasImage?: boolean
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export function CompactImageUpload({
  onImageLoad,
  hasImage = false,
  isLoading = false,
  disabled = false,
  className = ''
}: CompactImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      await onImageLoad(files[0])
    } catch (err) {
      console.error('Error loading image:', err)
    }

    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (disabled || isLoading) return
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/bmp,image/webp"
        onChange={handleFileInputChange}
        className="sr-only"
        disabled={disabled || isLoading}
        aria-label={hasImage ? 'Replace Reference Image File' : 'Load Reference Image File'}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className="h-8 w-8 p-0"
        aria-label={hasImage ? 'Replace Reference Image Button' : 'Load Reference Image Button'}
        title={hasImage ? 'Replace Reference Image' : 'Load Reference Image'}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        ) : (
          <Image className={cn('h-4 w-4', { 'text-primary': hasImage })} />
        )}
      </Button>
    </div>
  )
}

/**
 * Image info display component
 */
interface ImageInfoProps {
  imageInfo: {
    name: string
    size: number
    dimensions: { width: number; height: number }
    type: string
  } | null
  className?: string
}

export function ImageInfo({ imageInfo, className = '' }: ImageInfoProps) {
  if (!imageInfo) return null

  return (
    <div className={cn('text-xs text-muted-foreground space-y-1', className)}>
      <div className="font-medium truncate" title={imageInfo.name}>
        {imageInfo.name}
      </div>
      <div className="flex justify-between">
        <span>{imageInfo.dimensions.width} × {imageInfo.dimensions.height}</span>
        <span>{imageInfo.size} B</span>
      </div>
    </div>
  )
}