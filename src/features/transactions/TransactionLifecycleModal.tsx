"use client";

import * as React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  X,
  FileCode2,
} from "lucide-react";
import { useTransactionStore } from "@/stores/transactionStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getExplorerTxUrl } from "@/config/stellar";
import { TransactionStatus } from "@/types/transaction";

const LIFECYCLE_STEPS: { key: TransactionStatus; label: string; description: string }[] = [
  { key: "preparing", label: "Prepare", description: "Building transaction envelope" },
  { key: "simulating", label: "Simulate", description: "Verifying authorization & state on Soroban" },
  { key: "awaiting_signature", label: "Sign", description: "Awaiting wallet authorization" },
  { key: "submitting", label: "Submit", description: "Broadcasting to Stellar consensus" },
  { key: "confirmed", label: "Confirmed", description: "Finalized on ledger" },
];

export function TransactionLifecycleModal() {
  const { isOpen, activeTx, closeModal } = useTransactionStore();

  if (!isOpen || !activeTx) return null;

  const isComplete = activeTx.status === "confirmed";
  const isFailed = activeTx.status === "failed" || activeTx.status === "rejected";
  const isPending = !isComplete && !isFailed;

  const currentStepIndex = getCurrentStepIndex(activeTx.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={isPending ? undefined : closeModal}
      />

      <div className="relative z-50 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {activeTx.title}
              </h3>
              {isComplete && <Badge variant="success">Confirmed</Badge>}
              {isFailed && <Badge variant="destructive">{activeTx.status === "rejected" ? "Rejected" : "Failed"}</Badge>}
              {isPending && (
                <Badge variant="active" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> In Progress
                </Badge>
              )}
            </div>
            {activeTx.campaignTitle && (
              <p className="text-xs text-slate-400">
                Target: <span className="text-slate-200 font-medium">{activeTx.campaignTitle}</span>
              </p>
            )}
          </div>

          {!isPending && (
            <button
              onClick={closeModal}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Step Progress Stepper */}
        <div className="mb-6">
          <div className="grid grid-cols-5 gap-1 text-center mb-3">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex && isPending;
              const isDone = (idx === currentStepIndex && isComplete) || isPast;

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isDone
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : isCurrent
                        ? "bg-teal-500 text-white ring-4 ring-teal-500/20 animate-pulse"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] font-medium ${
                      isDone || isCurrent ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Current Step Status Message */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex items-center gap-3">
            {isPending && <Loader2 className="h-5 w-5 text-teal-400 animate-spin shrink-0" />}
            {isComplete && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            {isFailed && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
            
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {activeTx.statusMessage || "Executing transaction lifecycle..."}
            </p>
          </div>
        </div>

        {/* Transaction Details & Hash */}
        <div className="space-y-2.5 text-xs border-t border-slate-800 pt-4 mb-6">
          {activeTx.amount && (
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Amount:</span>
              <span className="text-teal-300 font-semibold font-mono">{activeTx.amount} XLM</span>
            </div>
          )}

          {activeTx.hash && (
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Transaction Hash:</span>
              <a
                href={getExplorerTxUrl(activeTx.hash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-teal-400 hover:text-teal-300 underline"
              >
                {activeTx.hash.slice(0, 10)}...{activeTx.hash.slice(-6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {activeTx.errorMessage && (
            <div className="rounded-lg bg-rose-950/40 border border-rose-900/50 p-3 text-rose-300 space-y-1">
              <p className="font-semibold text-xs">Error Description:</p>
              <p className="text-[11px] leading-relaxed opacity-90">{activeTx.errorMessage}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          {isComplete && activeTx.hash && (
            <a
              href={getExplorerTxUrl(activeTx.hash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              View on Stellar Expert
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {!isPending && (
            <Button onClick={closeModal} variant="default" size="sm" className="font-semibold">
              {isComplete ? "Done" : "Dismiss"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getCurrentStepIndex(status: TransactionStatus): number {
  switch (status) {
    case "preparing":
      return 0;
    case "simulating":
      return 1;
    case "awaiting_signature":
      return 2;
    case "submitting":
    case "pending":
      return 3;
    case "confirmed":
      return 4;
    default:
      return 0;
  }
}
