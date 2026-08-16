import * as React from "react";
import { cn } from "@/lib/utils";

export function HandDrawnArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-20 h-12 text-marker-red", className)}
    >
      <path
        d="M 10 15 Q 45 5 70 30 Q 80 40 85 45"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="6 4"
      />
      <path
        d="M 68 46 L 87 47 L 85 30"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
