import * as React from "react";
import { cn } from "@/lib/utils";

export function SquigglyLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-4 text-pencil/30", className)}
      preserveAspectRatio="none"
    >
      <path
        d="M 0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
    </svg>
  );
}
