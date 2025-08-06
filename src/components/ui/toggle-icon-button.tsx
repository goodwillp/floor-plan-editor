import * as React from "react"
import { SimpleIconButton } from "./simple-icon-button"
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
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      onToggle(!isToggled)
      onClick?.(event)
    }, [onToggle, isToggled, onClick])

    const displayTooltip = React.useMemo(() => 
      isToggled 
        ? (activeTooltip || tooltip)
        : (inactiveTooltip || tooltip),
      [isToggled, activeTooltip, inactiveTooltip, tooltip]
    )

    return (
      <SimpleIconButton
        ref={ref}
        isActive={isToggled}
        onClick={handleClick}
        aria-label={displayTooltip}
        title={displayTooltip}
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