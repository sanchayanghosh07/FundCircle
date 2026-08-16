import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tape } from "@/components/ui/hand-drawn/Tape";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#2d2d2d]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-50 w-full max-w-lg wobbly-border-md border-2 border-pencil bg-paper p-6 sm:p-7 shadow-hard-lg transition-all",
          className
        )}
      >
        <Tape rotation={-1.5} />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 wobbly-border-sm border-2 border-pencil bg-white p-1 text-pencil shadow-hard-sm hover:bg-marker-red hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        {title && (
          <div className="mb-4">
            <h2 className="font-heading text-2xl font-bold text-pencil">{title}</h2>
            {description && (
              <p className="font-body text-base text-pencil-light font-bold mt-0.5">{description}</p>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
