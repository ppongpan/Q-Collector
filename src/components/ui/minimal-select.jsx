import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

const MinimalSelect = SelectPrimitive.Root

const MinimalSelectTrigger = React.forwardRef(
  ({ className, children, style, ...props }, ref) => {
    return (
      <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md px-3 py-2 text-sm",
          // IMPORTANT: Add visible border and background
          "border-[3px] border-gray-500",
          "bg-white/10",
          "focus:outline-none focus:ring-2 focus:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
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
        {children}
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );
  }
)
MinimalSelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const MinimalSelectContent = React.forwardRef(
  ({ className, children, position = "popper", style, ...props }, ref) => {
    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            "relative z-50 min-w-[8rem] overflow-hidden rounded-md shadow-lg",
            // IMPORTANT: Add visible border and LIGHT background for both modes
            "border-[3px] border-gray-500",
            "bg-gray-800 text-white", // Dark background with white text
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          style={{
            // Force styles with highest priority
            borderWidth: '3px !important',
            borderStyle: 'solid !important',
            borderColor: '#888888 !important',
            backgroundColor: '#3a3a3a !important',
            ...style
          }}
          position={position}
          {...props}
        >
          <SelectPrimitive.Viewport
            className={cn(
              "p-1",
              position === "popper" &&
                "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  }
)
MinimalSelectContent.displayName = SelectPrimitive.Content.displayName

const MinimalSelectItem = React.forwardRef(
  ({ className, children, style, ...props }, ref) => {
    return (
      <SelectPrimitive.Item
        ref={ref}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
          // IMPORTANT: Solid background for items
          "bg-transparent hover:bg-gray-700",
          "text-white",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        style={{
          backgroundColor: 'transparent !important',
          color: '#ffffff !important',
          ...style
        }}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <Check className="h-4 w-4" />
          </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      </SelectPrimitive.Item>
    );
  }
)
MinimalSelectItem.displayName = SelectPrimitive.Item.displayName

export {
  MinimalSelect,
  MinimalSelectTrigger,
  MinimalSelectContent,
  MinimalSelectItem,
}
