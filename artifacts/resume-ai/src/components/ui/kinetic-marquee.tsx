import { motion } from "framer-motion";
import { ReactNode } from "react";

interface KineticMarqueeProps {
  children: ReactNode;
  speed?: number; // duration in seconds
  reverse?: boolean;
  className?: string;
  bgColor?: string;
}

export function KineticMarquee({
  children,
  speed = 25,
  reverse = false,
  className = "",
  bgColor = "bg-[#09090B]",
}: KineticMarqueeProps) {
  const direction = reverse ? [0, "-50%"] : ["-50%", 0];

  return (
    <div
      className={`relative w-full overflow-hidden border-y-2 border-[#3F3F46] py-3 ${bgColor} ${className}`}
      data-testid="kinetic-marquee"
    >
      <motion.div
        className="flex w-max items-center gap-8 whitespace-nowrap"
        animate={{ x: direction }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: speed,
        }}
      >
        {/* Render content twice to allow smooth seamless looping */}
        <div className="flex items-center gap-8 font-mono text-sm uppercase tracking-wider font-bold">
          {children}
        </div>
        <div className="flex items-center gap-8 font-mono text-sm uppercase tracking-wider font-bold" aria-hidden="true">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
