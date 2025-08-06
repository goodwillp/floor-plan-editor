import * as React from "react"
import { Button, type ButtonProps } from "./button"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export interface SimpleIconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon
  isActive?: boolean
  iconSize?: number
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
    ...props 
  }, ref) => {
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
        {...props}
      >
        <Icon size={iconSize} />
      </Button>
    )
  }
))

SimpleIconButton.displayName = "SimpleIconButton"

export { SimpleIconButton }