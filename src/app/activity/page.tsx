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
        return <Coins className="h-5 w-5 text-marker-red" />;
      case "campaign_created":
        return <PlusCircle className="h-5 w-5 text-pen-blue" />;
      case "campaign_approved":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "funds_released":
        return <Sparkles className="h-5 w-5 text-[#f59e0b]" />;
      case "refund_claimed":
        return <RotateCcw className="h-5 w-5 text-marker-red" />;
      default:
        return <Activity className="h-5 w-5 text-pencil" />;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-dashed border-pencil/30 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
            <span>On-Chain Ledger Stream</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
            Protocol Activity Feed
          </h1>
          <p className="font-body text-lg text-pencil-light mt-1">
            Real-time on-chain events emitted by Soroban Campaign Registry and Funding Escrow contracts.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {FILTER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`wobbly-border-sm border-2 border-pencil px-3.5 py-1 text-sm font-body font-bold whitespace-nowrap transition-all ${
                filter === t.value
                  ? "bg-postit-yellow text-pencil shadow-hard-sm -translate-y-0.5"
                  : "bg-white text-pencil hover:bg-paper-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 wobbly-border-md border-2 border-pencil bg-white p-4 sm:p-5 shadow-hard hover:shadow-hard-lg transition-all"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center wobbly-border-sm border-2 border-pencil bg-paper">
                {getEventIcon(item.type)}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading text-base font-bold text-pencil">
                    {item.details || item.type}
                  </span>
                  {item.amountXlm && (
                    <span className="font-heading text-sm font-bold text-marker-red font-mono">
                      +{item.amountXlm} XLM
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-body text-sm font-bold text-pencil-light">
                  <span>
                    Actor: <span className="text-pencil font-body">{shortenAddress(item.actor)}</span>
                  </span>
                  <span>•</span>
                  <span>{formatDateTime(item.timestamp)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:self-center self-end font-body text-base">
              <Link
                href={`/campaigns/${item.campaignId}`}
                className="flex items-center gap-1 text-pencil font-bold hover:text-marker-red hover:underline decoration-wavy"
              >
                Campaign #{item.campaignId}
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              {item.txHash && (
                <a
                  href={getExplorerTxUrl(item.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-body font-bold text-pen-blue hover:text-marker-red hover:underline decoration-wavy text-sm"
                >
                  Tx: {item.txHash.slice(0, 6)}...
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
