import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

const MinimalCheckbox = React.forwardRef(({ className, style, ...props }, ref) => {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        // Base styles with VISIBLE border and background
        "peer h-5 w-5 shrink-0 rounded",
        // IMPORTANT: Use Tailwind classes with high specificity
        "border-[3px] border-gray-500",
        "bg-white/10",
        // Focus
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        // States
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
        // Transitions
        "transition-colors duration-200",
        className
      )}
      style={{
        // Force styles with highest priority
        borderWidth: '3px !important',
        borderStyle: 'solid !important',
        borderColor: '#888888 !important',
        backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
        ...style
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
})
MinimalCheckbox.displayName = "MinimalCheckbox"

export { MinimalCheckbox }
