import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  // Base styles - Works with both Glass and Minimal themes
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-white/10 text-foreground border-2 border-white/20 hover:bg-white/20 hover:border-white/30",
        outline: "border-2 border-white/30 bg-transparent text-foreground hover:bg-white/10",
        ghost: "text-foreground hover:bg-white/10",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-2 border-destructive",
      },
      size: {
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-4",
        default: "h-10 px-5",
        lg: "h-11 px-6",
        xl: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const MinimalButton = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
MinimalButton.displayName = "MinimalButton"

export { MinimalButton, buttonVariants }
