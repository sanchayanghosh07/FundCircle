import * as React from "react";
import { cn } from "@/lib/utils";

interface ThumbtackProps {
  className?: string;
  color?: "red" | "yellow" | "blue";
}

export function Thumbtack({ className, color = "red" }: ThumbtackProps) {
  const colorClass =
    color === "red"
      ? "bg-marker-red border-pencil"
      : color === "yellow"
      ? "bg-[#f59e0b] border-pencil"
      : "bg-pen-blue border-pencil";

  return (
    <div
      className={cn(
        "absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 shadow-hard-sm z-20 pointer-events-none flex items-center justify-center",
        colorClass,
        className
      )}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-inner" />
    </div>
  );
}
