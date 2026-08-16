import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[90px] w-full wobbly-border-sm border-2 border-pencil bg-white px-3.5 py-2 font-body text-base text-pencil shadow-hard-sm placeholder:text-pencil/40 transition-colors focus:border-pen-blue focus:outline-none focus:ring-2 focus:ring-pen-blue/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
