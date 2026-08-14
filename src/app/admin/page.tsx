"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useToast } from "@/components/ui/toast";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";
import { getExplorerAccountUrl, getExplorerTxUrl } from "@/config/stellar";
import { shortenAddress } from "@/lib/utils";

export default function AdminReviewQueuePage() {
  const { isConnected, address } = useWalletStore();
  const { openModal: openTxModal, updateStatus, recordSuccess, recordFailure } =
    useTransactionStore();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processingId, setProcessingId] = React.useState<number | null>(null);

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

  const reviewQueue = campaigns.filter((c) => c.status === "review" || c.status === "draft");

  const handleApprove = async (campaign: Campaign) => {
    if (!address) return;
    setProcessingId(campaign.id);

    openTxModal("approve_campaign", `Approve Campaign #${campaign.id}`, {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      from: address,
    });

    try {
      const txHash = await registryService.approveCampaign(campaign.id, address);
      recordSuccess(txHash, getExplorerTxUrl(txHash));
      toast({
        type: "success",
        title: "Campaign Approved!",
        description: `Campaign #${campaign.id} is now Active for contributions.`,
      });
      loadData();
    } catch (err: any) {
      recordFailure(err?.message || "Failed to approve campaign.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (campaign: Campaign) => {
    if (!address) return;
    const reason = prompt("Enter rejection reason for creator revision:", "Please add more detailed budget breakdown.");
    if (!reason) return;

    setProcessingId(campaign.id);

    openTxModal("reject_campaign", `Reject Campaign #${campaign.id}`, {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      from: address,
    });

    try {
      const txHash = await registryService.rejectCampaign(campaign.id, reason, address);
      recordSuccess(txHash, getExplorerTxUrl(txHash));
      toast({
        type: "info",
        title: "Campaign Returned to Draft",
        description: `Campaign #${campaign.id} has been returned to creator for revisions.`,
      });
      loadData();
    } catch (err: any) {
      recordFailure(err?.message || "Failed to reject campaign.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/60 border border-amber-500/30 px-3 py-0.5 text-xs font-semibold text-amber-300 mb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Moderation Authority</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Reviewer / Admin Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review submitted campaigns, verify community impact, and advance state transitions on Soroban.
          </p>
        </div>

        <Badge variant="outline" className="font-mono text-xs">
          Pending Review: {reviewQueue.length}
        </Badge>
      </div>

      <div className="space-y-4">
        {reviewQueue.length > 0 ? (
          reviewQueue.map((camp) => (
            <div
              key={camp.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 backdrop-blur-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      #{camp.id} — {camp.metadata.title}
                    </span>
                    <Badge variant={camp.status === "review" ? "review" : "draft"}>
                      {camp.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Category: <span className="text-slate-200">{camp.metadata.category}</span> • Goal:{" "}
                    <span className="font-mono text-teal-300 font-bold">{camp.targetAmountXlm} XLM</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    onClick={() => handleApprove(camp)}
                    disabled={processingId === camp.id}
                    variant="stellar"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve to Active
                  </Button>

                  <Button
                    onClick={() => handleReject(camp)}
                    disabled={processingId === camp.id}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs text-rose-400 border-rose-900/40 hover:bg-rose-950/40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                {camp.metadata.description}
              </p>

              <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
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
            <h4 className="text-sm font-bold text-white">Review Queue is Clear</h4>
            <p className="text-xs text-slate-400">
              All submitted campaigns have been moderated and processed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
