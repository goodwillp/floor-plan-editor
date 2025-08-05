import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
  separator?: boolean
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ 
    children, 
    orientation = 'horizontal',
    spacing = 'sm',
    separator = false,
    className,
    ...props 
  }, ref) => {
    const spacingClasses = {
      none: 'gap-0',
      sm: 'gap-1',
      md: 'gap-2',
      lg: 'gap-3'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          orientation === 'vertical' && 'flex-col',
          spacingClasses[spacing],
          separator && orientation === 'horizontal' && 'border-r border-border pr-2 mr-2',
          separator && orientation === 'vertical' && 'border-b border-border pb-2 mb-2',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ButtonGroup.displayName = "ButtonGroup"

export { ButtonGroup }