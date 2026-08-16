"use client";

import * as React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { useTransactionStore } from "@/stores/transactionStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tape } from "@/components/ui/hand-drawn/Tape";
import { getExplorerTxUrl } from "@/config/stellar";
import { TransactionStatus } from "@/types/transaction";

const LIFECYCLE_STEPS: { key: TransactionStatus; label: string; description: string }[] = [
  { key: "preparing", label: "Prepare", description: "Building envelope" },
  { key: "simulating", label: "Simulate", description: "Simulating on Soroban" },
  { key: "awaiting_signature", label: "Sign", description: "Signing with wallet" },
  { key: "submitting", label: "Submit", description: "Broadcasting to ledger" },
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
        className="fixed inset-0 bg-[#2d2d2d]/60 backdrop-blur-sm transition-opacity"
        onClick={isPending ? undefined : closeModal}
      />

      <div className="relative z-50 w-full max-w-lg wobbly-border-md border-2 border-pencil bg-paper p-6 sm:p-7 shadow-hard-lg animate-in fade-in-50 zoom-in-95 duration-100">
        <Tape rotation={-1.5} />

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-dashed border-pencil/30 pb-4 mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-2xl font-bold text-pencil">
                {activeTx.title}
              </h3>
              {isComplete && <Badge variant="active">CONFIRMED</Badge>}
              {isFailed && <Badge variant="destructive">{activeTx.status === "rejected" ? "REJECTED" : "FAILED"}</Badge>}
              {isPending && (
                <Badge variant="review" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> IN PROGRESS
                </Badge>
              )}
            </div>
            {activeTx.campaignTitle && (
              <p className="font-body text-base text-pencil-light font-bold">
                Target: <span className="text-pencil">{activeTx.campaignTitle}</span>
              </p>
            )}
          </div>

          {!isPending && (
            <button
              onClick={closeModal}
              className="wobbly-border-sm border-2 border-pencil bg-white p-1 text-pencil shadow-hard-sm hover:bg-marker-red hover:text-white transition-colors"
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
                    className={`flex h-9 w-9 items-center justify-center wobbly-border-sm border-2 border-pencil text-xs font-heading font-bold transition-all ${
                      isDone
                        ? "bg-mint text-pencil shadow-hard-sm"
                        : isCurrent
                        ? "bg-postit-yellow text-pencil shadow-hard animate-pulse"
                        : "bg-paper-muted text-pencil-muted"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-pencil" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin text-pencil" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`mt-1 font-body text-xs font-bold ${
                      isDone || isCurrent ? "text-pencil" : "text-pencil-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Current Step Status Message */}
          <div className="wobbly-border-sm border-2 border-pencil bg-white p-3.5 flex items-center gap-3 shadow-hard-sm">
            {isPending && <Loader2 className="h-5 w-5 text-pencil animate-spin shrink-0" />}
            {isComplete && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
            {isFailed && <AlertCircle className="h-5 w-5 text-marker-red shrink-0" />}
            
            <p className="font-body text-base font-bold text-pencil leading-snug">
              {activeTx.statusMessage || "Executing transaction lifecycle..."}
            </p>
          </div>
        </div>

        {/* Transaction Details & Hash */}
        <div className="space-y-2 font-body text-base border-t-2 border-dashed border-pencil/30 pt-4 mb-6">
          {activeTx.amount && (
            <div className="flex justify-between py-1 border-b border-pencil/10">
              <span className="text-pencil-light font-bold">Amount:</span>
              <span className="font-heading font-bold text-marker-red text-lg font-mono">{activeTx.amount} XLM</span>
            </div>
          )}

          {activeTx.hash && (
            <div className="flex justify-between items-center py-1 border-b border-pencil/10">
              <span className="text-pencil-light font-bold">Transaction Hash:</span>
              <a
                href={getExplorerTxUrl(activeTx.hash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-body font-bold text-pen-blue hover:text-marker-red hover:underline decoration-wavy"
              >
                {activeTx.hash.slice(0, 10)}...{activeTx.hash.slice(-6)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {activeTx.errorMessage && (
            <div className="wobbly-border-sm bg-marker-red/10 border-2 border-marker-red p-3 text-marker-red space-y-1 shadow-hard-sm">
              <p className="font-heading font-bold text-sm">Error Note:</p>
              <p className="font-body text-sm leading-snug">{activeTx.errorMessage}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {isComplete && activeTx.hash && (
            <a
              href={getExplorerTxUrl(activeTx.hash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 wobbly-border-sm border-2 border-pencil bg-white px-4 py-2 font-body font-bold text-base text-pencil shadow-hard-sm hover:bg-postit-yellow transition-colors"
            >
              View on Stellar Expert
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          {!isPending && (
            <Button onClick={closeModal} variant="default" size="default">
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
