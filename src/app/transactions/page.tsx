"use client";

import * as React from "react";
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTransactionStore } from "@/stores/transactionStore";
import { formatDateTime } from "@/lib/utils";
import { getExplorerTxUrl } from "@/config/stellar";

export default function TransactionCenterPage() {
  const { history, clearHistory } = useTransactionStore();
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filteredHistory = history.filter((tx) => {
    if (statusFilter === "all") return true;
    return tx.status === statusFilter;
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-dashed border-pencil/30 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
            <span>Transaction Center</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
            Transaction Receipts
          </h1>
          <p className="font-body text-lg text-pencil-light mt-1">
            Track and verify your Soroban smart contract operations and Stellar transactions.
          </p>
        </div>

        {history.length > 0 && (
          <Button
            onClick={clearHistory}
            variant="outline"
            size="sm"
            className="gap-1.5 text-marker-red hover:bg-marker-red hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
            Clear Receipts
          </Button>
        )}
      </div>

      {filteredHistory.length > 0 ? (
        <div className="space-y-4">
          {filteredHistory.map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 wobbly-border-md border-2 border-pencil bg-white p-5 shadow-hard hover:shadow-hard-lg transition-all"
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center wobbly-border-sm border-2 border-pencil bg-paper">
                  {tx.status === "confirmed" ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : tx.status === "failed" || tx.status === "rejected" ? (
                    <AlertCircle className="h-6 w-6 text-marker-red" />
                  ) : (
                    <Clock className="h-6 w-6 text-pen-blue" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-xl font-bold text-pencil">{tx.title}</h3>
                    {tx.status === "confirmed" && <Badge variant="active">CONFIRMED</Badge>}
                    {tx.status === "failed" && <Badge variant="destructive">FAILED</Badge>}
                    {tx.status === "rejected" && <Badge variant="destructive">REJECTED</Badge>}
                    {tx.status === "pending" && <Badge variant="review">PENDING</Badge>}
                  </div>

                  <div className="flex items-center gap-2 font-body text-sm font-bold text-pencil-light">
                    {tx.campaignTitle && (
                      <span>
                        Target: <span className="text-pencil">{tx.campaignTitle}</span>
                      </span>
                    )}
                    <span>•</span>
                    <span>{formatDateTime(tx.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5 self-end sm:self-auto font-body text-base">
                {tx.amount && (
                  <span className="font-heading font-bold text-marker-red text-xl font-mono">
                    {tx.amount} XLM
                  </span>
                )}

                {tx.hash && (
                  <a
                    href={getExplorerTxUrl(tx.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-body font-bold text-pen-blue hover:text-marker-red hover:underline decoration-wavy text-sm"
                  >
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="wobbly-border-md border-2 border-pencil bg-white p-12 text-center space-y-3 max-w-md mx-auto my-8 shadow-hard">
          <Receipt className="h-12 w-12 text-pencil-muted mx-auto" />
          <h3 className="font-heading text-2xl font-bold text-pencil">No Receipts Yet</h3>
          <p className="font-body text-lg text-pencil-light leading-relaxed">
            Transactions executed during this session will appear here with live Stellar Expert explorer links.
          </p>
        </div>
      )}
    </div>
  );
}
