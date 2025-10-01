import * as React from "react"
import { cn } from "../../lib/utils"

const MinimalInput = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border border-input",
          "bg-input px-3 py-2 text-sm",
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Transitions
          "transition-colors duration-200",
          // Placeholder
          "placeholder:text-muted-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
MinimalInput.displayName = "MinimalInput"

export { MinimalInput }
