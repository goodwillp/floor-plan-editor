import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LucideIcon } from 'lucide-react'
import { trackRender } from '@/lib/debug-utils'

/**
 * Optimized icon button with improved sizing and responsiveness
 * Requirements: 7.5 - Fine-tune UI responsiveness and icon sizing
 */

export interface OptimizedIconButtonProps {
  icon: LucideIcon
  tooltip: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  tabIndex?: number
}

const sizeConfig = {
  xs: {
    button: 'h-6 w-6 p-1',
    icon: 12
  },
  sm: {
    button: 'h-8 w-8 p-1.5',
    icon: 14
  },
  md: {
    button: 'h-10 w-10 p-2',
    icon: 16
  },
  lg: {
    button: 'h-12 w-12 p-2.5',
    icon: 20
  },
  xl: {
    button: 'h-14 w-14 p-3',
    icon: 24
  }
}

export const OptimizedIconButton = React.memo(React.forwardRef<
  HTMLButtonElement,
  OptimizedIconButtonProps
>(({
  icon: Icon,
  tooltip,
  isActive = false,
  disabled = false,
  onClick,
  size = 'md',
  variant = 'outline',
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  tabIndex,
  ...props
}, ref) => {
  // Track renders in development - temporarily disabled
  // if (process.env.NODE_ENV === 'development') {
  //   trackRender(`OptimizedIconButton-${tooltip}`)
  // }
  
  const config = sizeConfig[size]
  
  // Stable click handler that doesn't change on every render
  const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!disabled && onClick) {
      onClick()
    }
  }, [disabled, onClick])

  // Memoize icon component to prevent re-renders
  const IconComponent = React.useMemo(() => (
    <Icon 
      size={config.icon} 
      className={cn(
        'transition-colors duration-150',
        isActive ? 'text-primary-foreground' : 'text-current'
      )}
      aria-hidden="true"
    />
  ), [Icon, config.icon, isActive])

  const buttonElement = (
    <Button
      ref={ref}
      variant={isActive ? 'default' : variant}
      size="icon"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        config.button,
        'relative transition-all duration-150 ease-in-out',
        'hover:scale-105 active:scale-95',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive && 'bg-primary text-primary-foreground shadow-sm',
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
        className
      )}
      aria-label={ariaLabel || tooltip}
      aria-describedby={ariaDescribedBy}
      aria-pressed={isActive}
      tabIndex={tabIndex}
      title={tooltip}
      {...props}
    >
      {IconComponent}
      
      {/* Active indicator */}
      {isActive && (
        <div 
          className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full"
          aria-hidden="true"
        />
      )}
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {buttonElement}
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        className="text-xs font-medium"
        sideOffset={4}
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}))

OptimizedIconButton.displayName = 'OptimizedIconButton'

/**
 * Icon button group for better organization and spacing
 */
export interface IconButtonGroupProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  'aria-label'?: string
}

export const IconButtonGroup = React.memo<IconButtonGroupProps>(({
  children,
  orientation = 'horizontal',
  spacing = 'sm',
  className,
  'aria-label': ariaLabel,
  ...props
}) => {
  const spacingClasses = {
    none: '',
    sm: orientation === 'horizontal' ? 'space-x-1' : 'space-y-1',
    md: orientation === 'horizontal' ? 'space-x-2' : 'space-y-2',
    lg: orientation === 'horizontal' ? 'space-x-3' : 'space-y-3'
  }

  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col items-start',
        spacingClasses[spacing],
        className
      )}
      role="group"
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </div>
  )
})

IconButtonGroup.displayName = 'IconButtonGroup'

/**
 * Responsive icon button that adapts to screen size
 */
export interface ResponsiveIconButtonProps extends Omit<OptimizedIconButtonProps, 'size'> {
  sizes?: {
    mobile?: OptimizedIconButtonProps['size']
    tablet?: OptimizedIconButtonProps['size']
    desktop?: OptimizedIconButtonProps['size']
  }
}

export const ResponsiveIconButton = React.memo<ResponsiveIconButtonProps>(({
  sizes = { mobile: 'sm', tablet: 'md', desktop: 'md' },
  className,
  ...props
}) => {
  return (
    <div className={cn('contents', className)}>
      {/* Mobile */}
      <div className="sm:hidden">
        <OptimizedIconButton {...props} size={sizes.mobile} />
      </div>
      
      {/* Tablet */}
      <div className="hidden sm:block lg:hidden">
        <OptimizedIconButton {...props} size={sizes.tablet} />
      </div>
      
      {/* Desktop */}
      <div className="hidden lg:block">
        <OptimizedIconButton {...props} size={sizes.desktop} />
      </div>
    </div>
  )
})

ResponsiveIconButton.displayName = 'ResponsiveIconButton'