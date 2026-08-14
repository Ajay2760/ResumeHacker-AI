import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-none uppercase tracking-tighter font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#DFE104] text-black border-2 border-[#DFE104] hover:scale-105 active:scale-95 shadow-none",
        destructive:
          "bg-[#EF4444] text-white border-2 border-[#EF4444] hover:scale-105 active:scale-95 shadow-none",
        outline:
          "border-2 border-[#3F3F46] bg-transparent text-[#FAFAFA] hover:bg-[#FAFAFA] hover:text-black hover:border-[#FAFAFA] active:scale-95",
        secondary:
          "border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] hover:bg-[#DFE104] hover:text-black hover:border-[#DFE104] active:scale-95",
        ghost:
          "border-2 border-transparent bg-transparent text-[#FAFAFA] hover:text-[#DFE104] active:scale-95",
        link: "text-[#DFE104] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 px-8 text-base",
        sm: "h-10 px-4 text-xs",
        lg: "h-20 px-12 text-lg md:text-xl",
        icon: "h-14 w-14 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
Button.displayName = "Button"

export { Button, buttonVariants }

