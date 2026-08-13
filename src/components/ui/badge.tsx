import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-500/20 text-primary-300 border-primary-500/40",
        secondary:
          "border-transparent bg-slate-800 text-slate-300 border-slate-700",
        success:
          "border-emerald-500/30 bg-emerald-950/60 text-emerald-300",
        warning:
          "border-amber-500/30 bg-amber-950/60 text-amber-300",
        destructive:
          "border-rose-500/30 bg-rose-950/60 text-rose-300",
        outline: "text-slate-300 border-slate-700",
        active: "border-teal-500/30 bg-teal-950/70 text-teal-300",
        review: "border-blue-500/30 bg-blue-950/70 text-blue-300",
        draft: "border-slate-600 bg-slate-800/80 text-slate-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
