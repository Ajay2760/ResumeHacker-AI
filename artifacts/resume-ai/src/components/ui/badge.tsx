import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-none border-2 px-3 py-1 text-xs uppercase font-bold tracking-wider transition-all duration-200 select-none",
  {
    variants: {
      variant: {
        default:
          "border-[#DFE104] bg-[#DFE104] text-black",
        secondary:
          "border-[#3F3F46] bg-[#27272A] text-[#FAFAFA]",
        destructive:
          "border-[#EF4444] bg-[#EF4444] text-white",
        outline: "text-[#FAFAFA] border-[#3F3F46] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

