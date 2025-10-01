import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "../../lib/utils"

const GlassLabel = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium text-foreground/90",
      "leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      "transition-colors duration-200",
      "hover:text-foreground",
      "flex items-center", // จัดให้อยู่กึ่งกลางแนวดิ่ง
      className
    )}
    {...props}
  />
))
GlassLabel.displayName = "GlassLabel"

export { GlassLabel }
