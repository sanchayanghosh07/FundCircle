import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (message: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    (message: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { ...message, id };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[92vw] sm:max-w-md w-full pointer-events-none px-2 sm:px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 wobbly-border-sm border-2 p-4 shadow-hard transition-all duration-300 animate-in slide-in-from-bottom-5",
              t.type === "success" &&
                "border-emerald-600 bg-white text-pencil",
              t.type === "error" &&
                "border-marker-red bg-[#fff5f5] text-pencil",
              t.type === "warning" &&
                "border-pencil bg-postit-yellow text-pencil",
              t.type === "info" &&
                "border-pen-blue bg-[#eff6ff] text-pencil"
            )}
          >
            {t.type === "success" && (
              <div className="h-7 w-7 rounded-full bg-emerald-100 border border-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              </div>
            )}
            {t.type === "error" && (
              <div className="h-7 w-7 rounded-full bg-red-100 border border-marker-red flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4 text-marker-red" />
              </div>
            )}
            {t.type === "warning" && (
              <div className="h-7 w-7 rounded-full bg-amber-100 border border-pencil flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4 text-pencil" />
              </div>
            )}
            {t.type === "info" && (
              <div className="h-7 w-7 rounded-full bg-blue-100 border border-pen-blue flex items-center justify-center shrink-0 mt-0.5">
                <Info className="h-4 w-4 text-pen-blue" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4
                className={cn(
                  "font-heading font-bold text-base leading-tight break-words [overflow-wrap:anywhere]",
                  t.type === "success" && "text-emerald-950",
                  t.type === "error" && "text-marker-red",
                  t.type === "warning" && "text-pencil",
                  t.type === "info" && "text-pen-blue"
                )}
              >
                {t.title}
              </h4>
              {t.description && (
                <p className="mt-1 font-body font-bold text-sm text-pencil break-words [overflow-wrap:anywhere] leading-snug">
                  {t.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="wobbly-border-sm border border-pencil/30 p-1 text-pencil hover:bg-black/5 transition-colors shrink-0"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
