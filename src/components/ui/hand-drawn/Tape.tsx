import * as React from "react";
import { cn } from "@/lib/utils";

interface TapeProps {
  className?: string;
  rotation?: number; // e.g. -3, 2
}

export function Tape({ className, rotation = -2 }: TapeProps) {
  return (
    <div
      style={{ transform: `rotate(${rotation}deg)` }}
      className={cn(
        "absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-400/25 border-t border-b border-white/40 shadow-sm backdrop-blur-[1px] z-20 pointer-events-none",
        className
      )}
    />
  );
}
