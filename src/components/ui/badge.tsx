import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center wobbly-border-sm border-2 px-2.5 py-0.5 text-xs font-heading font-bold shadow-hard-sm transition-all",
  {
    variants: {
      variant: {
        default: "border-pencil bg-white text-pencil",
        active: "border-pencil bg-mint text-pencil",
        review: "border-pencil bg-postit-yellow text-pencil",
        draft: "border-pencil bg-paper-muted text-pencil",
        funded: "border-pencil bg-mint text-pencil",
        completed: "border-pencil bg-pen-blue text-white",
        destructive: "border-pencil bg-marker-red text-white",
        outline: "border-pencil bg-paper text-pencil",
        secondary: "border-pencil bg-paper-muted text-pencil",
        success: "border-pencil bg-mint text-pencil",
        warning: "border-pencil bg-postit-yellow text-pencil",
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
