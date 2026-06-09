import { motion } from "motion/react";

interface HamburgerIconProps {
  open: boolean;
}

export function HamburgerIcon({ open }: HamburgerIconProps) {
  return (
    <div className="relative h-5 w-6">
      <motion.span
        className="absolute left-0 h-0.5 w-full bg-current"
        animate={{
          top: open ? "50%" : "0%",
          rotate: open ? 45 : 0,
          translateY: open ? "-50%" : "0%",
        }}
        transition={{ duration: 0.2 }}
      />
      <motion.span
        className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-current"
        animate={{
          opacity: open ? 0 : 1,
        }}
        transition={{ duration: 0.2 }}
      />
      <motion.span
        className="absolute bottom-0 left-0 h-0.5 w-full bg-current"
        animate={{
          bottom: open ? "50%" : "0%",
          rotate: open ? -45 : 0,
          translateY: open ? "50%" : "0%",
        }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
}
