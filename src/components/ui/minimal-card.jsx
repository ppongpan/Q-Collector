// Minimal Card - Based on ShadCN UI Card
import * as React from "react"
import { cn } from "../../lib/utils"

const MinimalCard = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base styles
      "rounded-lg border bg-card text-card-foreground",
      // Shadow
      "shadow-sm",
      // Transitions
      "transition-shadow duration-200",
      // Hover
      "hover:shadow-md",
      className
    )}
    {...props}
  />
))
MinimalCard.displayName = "MinimalCard"

const MinimalCardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
MinimalCardHeader.displayName = "MinimalCardHeader"

const MinimalCardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  >
    {children}
  </h3>
))
MinimalCardTitle.displayName = "MinimalCardTitle"

const MinimalCardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
MinimalCardDescription.displayName = "MinimalCardDescription"

const MinimalCardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
MinimalCardContent.displayName = "MinimalCardContent"

const MinimalCardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
MinimalCardFooter.displayName = "MinimalCardFooter"

export {
  MinimalCard,
  MinimalCardHeader,
  MinimalCardFooter,
  MinimalCardTitle,
  MinimalCardDescription,
  MinimalCardContent,
}
