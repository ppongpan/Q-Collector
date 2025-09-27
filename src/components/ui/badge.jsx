import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80 shadow-[0_0_0_1px_rgba(var(--primary),0.2)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_0_0_1px_rgba(148,163,184,0.2)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-[0_0_0_1px_rgba(var(--destructive),0.2)]",
        outline:
          "text-foreground bg-background/50 backdrop-blur-sm shadow-[0_0_0_1px_rgba(148,163,184,0.3)] hover:shadow-[0_0_0_1px_rgba(148,163,184,0.5)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
