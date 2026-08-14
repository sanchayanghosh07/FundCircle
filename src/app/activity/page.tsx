"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Coins,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActivityStore } from "@/stores/activityStore";
import { eventIngestion } from "@/services/stellar/events";
import { shortenAddress, formatDateTime } from "@/lib/utils";
import { getExplorerTxUrl } from "@/config/stellar";
import { ActivityType } from "@/types/activity";

const FILTER_TYPES: { label: string; value: string }[] = [
  { label: "All Events", value: "all" },
  { label: "Contributions", value: "contributed" },
  { label: "Campaigns Created", value: "campaign_created" },
  { label: "Funds Released", value: "funds_released" },
  { label: "Refunds", value: "refund_claimed" },
];

export default function ActivityFeedPage() {
  const { activities, addActivity } = useActivityStore();
  const [filter, setFilter] = React.useState("all");

  // Fetch real on-chain events on mount
  React.useEffect(() => {
    eventIngestion.fetchLatestEvents().then((events) => {
      events.forEach((e) => addActivity(e));
    });
  }, [addActivity]);

  const filtered = activities.filter((a) => {
    if (filter === "all") return true;
    return a.type === filter;
  });

  const getEventIcon = (type: ActivityType) => {
    switch (type) {
      case "contributed":
        return <Coins className="h-4 w-4 text-teal-400" />;
      case "campaign_created":
        return <PlusCircle className="h-4 w-4 text-cyan-400" />;
      case "campaign_approved":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "funds_released":
        return <Sparkles className="h-4 w-4 text-amber-400" />;
      case "refund_claimed":
        return <RotateCcw className="h-4 w-4 text-rose-400" />;
      default:
        return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 px-3 py-0.5 text-xs font-semibold text-teal-300 mb-2">
            <Activity className="h-3.5 w-3.5" />
            <span>Real-Time Ledger Events</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Protocol Activity Feed
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time on-chain events emitted by Soroban Campaign Registry and Funding Escrow contracts.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {FILTER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === t.value
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm hover:border-teal-500/30 transition-all"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800">
                {getEventIcon(item.type)}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">
                    {item.details || item.type}
                  </span>
                  {item.amountXlm && (
                    <span className="text-xs font-mono font-bold text-teal-400">
                      +{item.amountXlm} XLM
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>
                    Actor: <span className="font-mono text-slate-300">{shortenAddress(item.actor)}</span>
                  </span>
                  <span>•</span>
                  <span>{formatDateTime(item.timestamp)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:self-center self-end text-xs">
              <Link
                href={`/campaigns/${item.campaignId}`}
                className="flex items-center gap-1 text-slate-300 hover:text-teal-300 font-medium"
              >
                Campaign #{item.campaignId}
                <ArrowUpRight className="h-3 w-3" />
              </Link>

              {item.txHash && (
                <a
                  href={getExplorerTxUrl(item.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-mono text-teal-400 hover:text-teal-300"
                >
                  Tx: {item.txHash.slice(0, 6)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
