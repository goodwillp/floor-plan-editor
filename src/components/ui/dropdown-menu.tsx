import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const menuRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const handleClickOutside = (_event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(_event.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
      <div ref={menuRef} className={cn("relative", className)} {...props}>
        <div onClick={() => setIsOpen(!isOpen)}>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                className: cn((child.props as any).className, "cursor-pointer")
              } as any)
            }
            return child
          })}
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[8rem]">
            {React.Children.map(children, child => {
              if (React.isValidElement(child) && child.type === 'ul') {
                return React.cloneElement(child, {
                  className: cn((child.props as any).className, "py-1")
                } as any)
              }
              return null
            })}
          </div>
        )}
      </div>
    )
  }
)