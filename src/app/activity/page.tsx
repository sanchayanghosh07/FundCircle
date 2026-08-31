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
  RefreshCw,
  Clock,
  AlertCircle,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActivityStore } from "@/stores/activityStore";
import { eventIngestion } from "@/services/stellar/events";
import { shortenAddress, formatDateTime } from "@/lib/utils";
import { getExplorerTxUrl, getExplorerAccountUrl } from "@/config/stellar";
import { ActivityType } from "@/types/activity";

const FILTER_TYPES: { label: string; value: string }[] = [
  { label: "All Events", value: "all" },
  { label: "Contributions", value: "contributed" },
  { label: "Campaigns Created", value: "campaign_created" },
  { label: "State Milestones", value: "state_changed" },
  { label: "Approvals & Reviews", value: "approvals" },
  { label: "Funds Released", value: "funds_released" },
  { label: "Refunds", value: "refund_claimed" },
];

export default function ActivityFeedPage() {
  const { activities } = useActivityStore();
  const [filter, setFilter] = React.useState("all");
  const [mounted, setMounted] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastSynced, setLastSynced] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setLastSynced(new Date());

    // Initial fetch
    eventIngestion.fetchLatestEvents().then(() => {
      setLastSynced(new Date());
    });

    // Real-time polling every 8s
    const stopPolling = eventIngestion.startPolling(() => {
      setLastSynced(new Date());
    }, 8000);

    return () => stopPolling();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await eventIngestion.fetchLatestEvents();
      setLastSynced(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const filtered = (mounted ? activities : []).filter((a) => {
    if (filter === "all") return true;
    if (filter === "approvals") {
      return (
        a.type === "campaign_approved" ||
        a.type === "campaign_submitted" ||
        a.type === "campaign_rejected" ||
        a.type === "campaign_cancelled"
      );
    }
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
      case "campaign_submitted":
        return <Clock className="h-5 w-5 text-pen-blue" />;
      case "campaign_rejected":
      case "campaign_cancelled":
        return <AlertCircle className="h-5 w-5 text-marker-red" />;
      case "funds_released":
        return <Sparkles className="h-5 w-5 text-[#f59e0b]" />;
      case "refund_claimed":
        return <RotateCcw className="h-5 w-5 text-marker-red" />;
      case "state_changed":
        return <Sparkles className="h-5 w-5 text-emerald-600" />;
      default:
        return <Activity className="h-5 w-5 text-pencil" />;
    }
  };

  const getBadgeVariant = (type: ActivityType): "default" | "active" | "funded" | "completed" | "cancelled" | "review" => {
    switch (type) {
      case "contributed":
        return "default";
      case "campaign_created":
        return "active";
      case "campaign_approved":
        return "active";
      case "state_changed":
        return "funded";
      case "funds_released":
        return "completed";
      case "refund_claimed":
      case "campaign_rejected":
      case "campaign_cancelled":
        return "cancelled";
      default:
        return "review";
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-dashed border-pencil/30 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>Live Soroban Ledger Stream</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
            Protocol Activity Feed
          </h1>
          <p className="font-body text-lg text-pencil-light mt-1">
            Real-time on-chain events emitted by Soroban Campaign Registry and Funding Escrow smart contracts.
          </p>
        </div>

        {/* Refresh button & Sync Status */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {lastSynced && (
            <span className="text-xs font-body font-bold text-pencil-muted hidden md:inline">
              Updated {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="gap-1.5 font-bold"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
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

      {/* Activity List */}
      <div className="space-y-4">
        {mounted && filtered.length > 0 ? (
          filtered.map((item) => (
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
                    <span className="font-heading text-base font-bold text-pencil break-words [overflow-wrap:anywhere]">
                      {item.details || item.type}
                    </span>
                    {item.amountXlm && (
                      <span className="font-heading text-sm font-bold text-marker-red font-mono bg-paper px-2 py-0.5 wobbly-border-sm border border-pencil">
                        {item.type === "refund_claimed" ? `-${item.amountXlm}` : `+${item.amountXlm}`} XLM
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-body text-sm font-bold text-pencil-light flex-wrap">
                    <span>
                      Actor:{" "}
                      {item.actor.startsWith("G") || item.actor.startsWith("C") ? (
                        <a
                          href={getExplorerAccountUrl(item.actor)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pencil font-body hover:text-marker-red hover:underline"
                        >
                          {shortenAddress(item.actor)}
                        </a>
                      ) : (
                        <span className="text-pencil font-body">{item.actor}</span>
                      )}
                    </span>
                    <span>•</span>
                    <span>{formatDateTime(item.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:self-center self-end font-body text-base shrink-0">
                {item.campaignId > 0 && (
                  <Link
                    href={`/campaigns/${item.campaignId}`}
                    className="flex items-center gap-1 text-pencil font-bold hover:text-marker-red hover:underline decoration-wavy text-sm bg-paper-muted px-2.5 py-1 wobbly-border-sm border border-pencil"
                  >
                    Campaign #{item.campaignId}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}

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
          ))
        ) : mounted ? (
          <div className="wobbly-border-md border-2 border-pencil bg-white p-12 text-center space-y-3 shadow-hard">
            <Activity className="h-10 w-10 text-pencil-muted mx-auto" />
            <h4 className="font-heading text-2xl font-bold text-pencil">No Matching Activity</h4>
            <p className="font-body text-lg text-pencil-light">
              No events found matching the selected filter. Switch filters or submit transactions on testnet.
            </p>
          </div>
        ) : (
          <div className="wobbly-border-md border-2 border-pencil bg-white p-12 text-center space-y-3 shadow-hard">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-pencil border-r-transparent" />
            <p className="font-body text-lg text-pencil-light font-bold">
              Connecting to Stellar ledger stream...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

