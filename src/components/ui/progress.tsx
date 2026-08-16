import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-3.5 w-full overflow-hidden wobbly-border-sm border-2 border-pencil bg-paper-muted shadow-hard-sm",
          className
        )}
        {...props}
      >
        <div
          className="h-full bg-marker-red transition-all duration-300 ease-out border-r-2 border-pencil"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
