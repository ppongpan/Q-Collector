import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

const GlassCheckbox = React.forwardRef(({ className, style, checked, ...props }, ref) => {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        // Base styles - ขนาดเล็กลง
        "peer shrink-0 rounded",
        // Focus states
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Transitions
        "transition-all duration-300 ease-out",
        // Custom checkbox styles - จะใช้ CSS classes แทน inline styles
        "glass-checkbox",
        className
      )}
      style={style}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-white w-full h-full")}
      >
        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
})
GlassCheckbox.displayName = "GlassCheckbox"

export { GlassCheckbox }
