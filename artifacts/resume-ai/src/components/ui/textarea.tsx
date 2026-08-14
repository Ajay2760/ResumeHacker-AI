import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[140px] w-full rounded-none border-2 border-[#3F3F46] bg-[#09090B] px-5 py-4 text-base md:text-lg font-bold tracking-tight text-[#FAFAFA] placeholder:text-[#3F3F46] placeholder:uppercase transition-colors duration-200 focus-visible:outline-none focus-visible:border-[#DFE104] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

