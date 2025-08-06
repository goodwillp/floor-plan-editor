import * as React from "react"
import { Button, type ButtonProps } from "./button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon
  tooltip: string
  isActive?: boolean
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
  tooltipDelay?: number
  iconSize?: number
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    icon: Icon, 
    tooltip, 
    isActive = false,
    tooltipSide = 'bottom',
    tooltipDelay = 700,
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
        aria-label={tooltip}
        title={tooltip}
        {...props}
      >
        <Icon size={iconSize} />
      </Button>
    )
  }
)

IconButton.displayName = "IconButton"

export { IconButton }