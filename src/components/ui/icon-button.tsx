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
      <Tooltip delayDuration={tooltipDelay}>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
)

IconButton.displayName = "IconButton"

export { IconButton }