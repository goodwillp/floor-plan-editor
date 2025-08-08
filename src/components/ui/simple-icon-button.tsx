import * as React from "react"
import { Button, type ButtonProps } from "./button"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export interface SimpleIconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon
  isActive?: boolean
  iconSize?: number
  title?: string
}

/**
 * Simple icon button without tooltip to avoid ref composition issues
 */
const SimpleIconButton = React.memo(React.forwardRef<HTMLButtonElement, SimpleIconButtonProps>(
  ({ 
    icon: Icon, 
    isActive = false,
    iconSize = 16,
    className,
    variant = 'ghost',
    size = 'sm',
    title,
    ...props 
  }, ref) => {
    // Prefer explicit title, fallback to aria-label from props for native tooltip
    const ariaLabel = (props as any)['aria-label'] as string | undefined
    const effectiveTitle = title ?? ariaLabel
    return (
      <Button
        ref={ref}
        variant={isActive ? 'default' : variant}
        size={size}
        className={cn(
          'aspect-square transition-colors',
          isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
          className
        )}
        aria-label={ariaLabel || effectiveTitle}
        title={effectiveTitle}
        {...props}
      >
        <Icon size={iconSize} />
      </Button>
    )
  }
))

SimpleIconButton.displayName = "SimpleIconButton"

export { SimpleIconButton }