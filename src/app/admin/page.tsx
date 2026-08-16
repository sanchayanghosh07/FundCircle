"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  Filter,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useToast } from "@/components/ui/toast";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";
import { getExplorerAccountUrl, getExplorerTxUrl, CONTRACT_CONFIG } from "@/config/stellar";
import { shortenAddress } from "@/lib/utils";

export default function AdminReviewQueuePage() {
  const { isConnected, address } = useWalletStore();
  const { openModal: openTxModal, updateStatus, recordSuccess, recordFailure } =
    useTransactionStore();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processingId, setProcessingId] = React.useState<number | null>(null);
  const [filter, setFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const loadData = React.useCallback(async () => {
    try {
      const all = await registryService.getAllCampaigns();
      setCampaigns(all);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === "active" && c.status !== "active") return false;
    if (filter === "suspended" && c.status !== "review" && c.status !== "draft") return false;
    if (filter === "funded" && c.status !== "funded" && c.status !== "completed") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.metadata.title.toLowerCase().includes(q) ||
        c.metadata.category.toLowerCase().includes(q) ||
        c.id.toString().includes(q) ||
        c.creator.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleResume = async (campaign: Campaign) => {
    const adminAddr = address || CONTRACT_CONFIG.adminAddress;
    setProcessingId(campaign.id);

    openTxModal("approve_campaign", `Resume Campaign #${campaign.id}`, {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      from: adminAddr,
    });

    try {
      const txHash = await registryService.resumeCampaign(
        campaign.id,
        adminAddr,
        (status, msg) => updateStatus(status, msg)
      );
      recordSuccess(txHash, getExplorerTxUrl(txHash));
      toast({
        type: "success",
        title: "Campaign Resumed & Active!",
        description: `Campaign #${campaign.id} is now Active and open for contributions.`,
      });
      await loadData();
    } catch (err: any) {
      recordFailure(err?.message || "Failed to resume campaign.");
      toast({
        type: "error",
        title: "Resume Failed",
        description: err?.message || "Failed to resume campaign.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (campaign: Campaign) => {
    const adminAddr = address || CONTRACT_CONFIG.adminAddress;
    const reason = prompt(
      "Enter reason for suspending campaign funding:",
      "Compliance / community safety review."
    );
    if (reason === null) return;

    setProcessingId(campaign.id);

    openTxModal("reject_campaign", `Suspend Campaign #${campaign.id}`, {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      from: adminAddr,
    });

    try {
      const txHash = await registryService.suspendCampaign(
        campaign.id,
        reason || "Under administrative moderation",
        adminAddr,
        (status, msg) => updateStatus(status, msg)
      );
      recordSuccess(txHash, getExplorerTxUrl(txHash));
      toast({
        type: "info",
        title: "Campaign Suspended",
        description: `Campaign #${campaign.id} is now Suspended. Contributions are paused.`,
      });
      await loadData();
    } catch (err: any) {
      recordFailure(err?.message || "Failed to suspend campaign.");
      toast({
        type: "error",
        title: "Suspension Failed",
        description: err?.message || "Failed to suspend campaign.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/60 border border-amber-500/30 px-3 py-0.5 text-xs font-semibold text-amber-300 mb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Admin & Moderation Console</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Campaign Administration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            All campaigns are Active on creation. Use your admin wallet to suspend or resume campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            Total Campaigns: {campaigns.length}
          </Badge>
          <Badge variant="active" className="font-mono text-xs">
            Active: {campaigns.filter((c) => c.status === "active").length}
          </Badge>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "All Campaigns" },
            { id: "active", label: "Active" },
            { id: "suspended", label: "Suspended / In Review" },
            { id: "funded", label: "Funded / Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filter === tab.id
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs bg-slate-950 border-slate-800"
          />
        </div>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading campaigns...</div>
        ) : filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 backdrop-blur-sm hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      #{camp.id} — {camp.metadata.title}
                    </span>
                    <Badge
                      variant={
                        camp.status === "active"
                          ? "active"
                          : camp.status === "review" || camp.status === "draft"
                          ? "review"
                          : "funded"
                      }
                      className="capitalize"
                    >
                      {camp.status === "review" ? "Suspended" : camp.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Category: <span className="text-slate-200">{camp.metadata.category}</span> • Raised:{" "}
                    <span className="font-mono text-teal-300 font-bold">{camp.totalRaisedXlm} XLM</span> /{" "}
                    <span className="font-mono text-slate-300">{camp.targetAmountXlm} XLM</span>
                  </p>
                </div>

                {/* Admin Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {camp.status === "active" ? (
                    <Button
                      onClick={() => handleSuspend(camp)}
                      disabled={processingId === camp.id}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-amber-300 border-amber-800/40 hover:bg-amber-950/40"
                    >
                      <PauseCircle className="h-4 w-4 text-amber-400" />
                      Suspend Campaign
                    </Button>
                  ) : camp.status === "review" || camp.status === "draft" ? (
                    <Button
                      onClick={() => handleResume(camp)}
                      disabled={processingId === camp.id}
                      variant="stellar"
                      size="sm"
                      className="gap-1.5 text-xs font-bold"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Resume Campaign
                    </Button>
                  ) : null}

                  <Link href={`/campaigns/${camp.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 line-clamp-2">
                {camp.metadata.description}
              </p>

              <div className="pt-1 flex justify-between items-center text-xs text-slate-500">
                <span>
                  Creator:{" "}
                  <a
                    href={getExplorerAccountUrl(camp.creator)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-400 hover:underline font-mono"
                  >
                    {shortenAddress(camp.creator)}
                  </a>
                </span>

                <Link
                  href={`/campaigns/${camp.id}`}
                  className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold"
                >
                  View Details Page
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Campaigns Found</h4>
            <p className="text-xs text-slate-400">
              No campaigns match the selected filter or search query.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
