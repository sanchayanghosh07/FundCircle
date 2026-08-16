import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-body font-bold text-base transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen-blue/40 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-white text-pencil border-2 border-pencil shadow-hard hover:bg-marker-red hover:text-white hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        stellar:
          "bg-white text-pencil border-[3px] border-pencil shadow-hard hover:bg-marker-red hover:text-white hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        secondary:
          "bg-paper-muted text-pencil border-2 border-pencil shadow-hard hover:bg-pen-blue hover:text-white hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        outline:
          "bg-paper text-pencil border-2 border-pencil shadow-hard hover:bg-postit-yellow hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        destructive:
          "bg-marker-red text-white border-2 border-pencil shadow-hard hover:bg-marker-red-dark hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        yellow:
          "bg-postit-yellow text-pencil border-2 border-pencil shadow-hard hover:bg-postit-yellow-dark hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        ghost:
          "text-pencil hover:bg-paper-muted/80 rounded-lg",
        link: "text-pen-blue underline-offset-4 hover:underline hover:text-marker-red",
      },
      size: {
        default: "h-11 px-5 py-2 wobbly-border",
        sm: "h-9 px-3.5 py-1 text-sm wobbly-border",
        lg: "h-13 px-8 py-3 text-lg wobbly-border",
        icon: "h-11 w-11 p-0 wobbly-border",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
