import * as React from "react"
import { IconButton } from "./icon-button"
import { cn } from "@/lib/utils"

// Temporarily disabled due to interface conflicts - will be fixed in future tasks
export interface ToggleIconButtonProps {
  icon: any
  tooltip: string
  isToggled: boolean
  onToggle: (toggled: boolean) => void
  activeTooltip?: string
  inactiveTooltip?: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
}

const ToggleIconButton = React.forwardRef<HTMLButtonElement, ToggleIconButtonProps>(
  ({ 
    isToggled,
    onToggle,
    activeTooltip,
    inactiveTooltip,
    tooltip,
    onClick,
    className,
    ...props 
  }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onToggle(!isToggled)
      onClick?.(event)
    }

    const displayTooltip = isToggled 
      ? (activeTooltip || tooltip)
      : (inactiveTooltip || tooltip)

    return (
      <IconButton
        ref={ref}
        isActive={isToggled}
        tooltip={displayTooltip}
        onClick={handleClick}
        className={cn(
          'transition-all duration-200',
          isToggled && 'shadow-sm ring-1 ring-primary/20',
          className
        )}
        {...props}
      />
    )
  }
)

ToggleIconButton.displayName = "ToggleIconButton"

export { ToggleIconButton }