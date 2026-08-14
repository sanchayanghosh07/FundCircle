"use client";

import * as React from "react";
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTransactionStore } from "@/stores/transactionStore";
import { formatDateTime, shortenAddress } from "@/lib/utils";
import { getExplorerTxUrl } from "@/config/stellar";

export default function TransactionCenterPage() {
  const { history, clearHistory } = useTransactionStore();
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filteredHistory = history.filter((tx) => {
    if (statusFilter === "all") return true;
    return tx.status === statusFilter;
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 px-3 py-0.5 text-xs font-semibold text-teal-300 mb-2">
            <Receipt className="h-3.5 w-3.5" />
            <span>Transaction Center</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Transaction History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track and verify your Soroban smart contract operations and Stellar transactions.
          </p>
        </div>

        {history.length > 0 && (
          <Button
            onClick={clearHistory}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear History
          </Button>
        )}
      </div>

      {filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm hover:border-teal-500/30 transition-all"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800">
                  {tx.status === "confirmed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : tx.status === "failed" || tx.status === "rejected" ? (
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-400" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{tx.title}</h3>
                    {tx.status === "confirmed" && <Badge variant="success">Confirmed</Badge>}
                    {tx.status === "failed" && <Badge variant="destructive">Failed</Badge>}
                    {tx.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                    {tx.status === "pending" && <Badge variant="warning">Pending</Badge>}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {tx.campaignTitle && (
                      <span>
                        Target: <span className="text-slate-200">{tx.campaignTitle}</span>
                      </span>
                    )}
                    <span>•</span>
                    <span>{formatDateTime(tx.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5 self-end sm:self-auto text-xs">
                {tx.amount && (
                  <span className="font-mono font-bold text-teal-300 text-sm">
                    {tx.amount} XLM
                  </span>
                )}

                {tx.hash && (
                  <a
                    href={getExplorerTxUrl(tx.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-teal-400 hover:text-teal-300 underline"
                  >
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3 max-w-md mx-auto my-8">
          <Receipt className="h-10 w-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No transactions recorded yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Transactions submitted from this browser session will appear here with live explorer links.
          </p>
        </div>
      )}
    </div>
  );
}
