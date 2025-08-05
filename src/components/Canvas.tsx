import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface CanvasProps {
  className?: string
  onMouseMove?: (coordinates: { x: number; y: number }) => void
}

export function Canvas({ className, onMouseMove }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        setMousePosition({ x, y })
        onMouseMove?.({ x, y })
      }
    }

    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove)
      return () => canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [onMouseMove])

  return (
    <div 
      ref={canvasRef}
      className={cn(
        'flex-1 bg-white border border-border relative overflow-hidden',
        'cursor-crosshair',
        className
      )}
    >
      {/* Placeholder content - will be replaced with PixiJS in later tasks */}
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Canvas Area</div>
          <div className="text-sm">
            Mouse: {mousePosition.x}, {mousePosition.y}
          </div>
          <div className="text-xs mt-2 opacity-60">
            PixiJS integration will be implemented in task 5
          </div>
        </div>
      </div>
      
      {/* Grid pattern for visual reference */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
    </div>
  )
}