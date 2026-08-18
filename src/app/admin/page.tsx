"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  ArrowUpRight,
  Search,
  Lock,
  Wallet,
  LogOut,
  ArrowLeft,
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
import { Tape } from "@/components/ui/hand-drawn/Tape";
import { walletKit } from "@/services/wallet/stellarWalletKit";
import { stellarRpc } from "@/services/stellar/rpc";

export default function AdminReviewQueuePage() {
  const { isConnected, address, setWallet, setBalance, disconnect } = useWalletStore();
  const { openModal: openTxModal, updateStatus, recordSuccess, recordFailure } =
    useTransactionStore();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processingId, setProcessingId] = React.useState<number | null>(null);
  const [filter, setFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const isAdmin = Boolean(
    isConnected &&
    address &&
    CONTRACT_CONFIG.adminAddress &&
    address.toLowerCase() === CONTRACT_CONFIG.adminAddress.toLowerCase()
  );

  const handleConnectAdmin = async () => {
    try {
      const res = await walletKit.openModal();
      if (res) {
        setWallet(res.address, res.walletId, res.name, "testnet");
        const bal = await stellarRpc.getAccountBalance(res.address);
        setBalance(bal);
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  const loadData = React.useCallback(async () => {
    if (!isAdmin) return;
    try {
      const all = await registryService.getAllCampaigns();
      setCampaigns(all);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  React.useEffect(() => {
    if (isAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadData]);

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
      "Compliance / community safety moderation check."
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

  // 1. Gated: Not Connected
  if (!isConnected || !address) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-xl">
        <div className="relative w-full wobbly-border-md border-2 border-pencil bg-white p-8 sm:p-10 shadow-hard text-center space-y-6">
          <Tape rotation={-1} />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper border-2 border-pencil mx-auto shadow-hard-sm">
            <Lock className="h-8 w-8 text-marker-red" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil">
              <span>Admin Authentication Required</span>
            </div>
            <h2 className="font-heading text-3xl font-bold text-pencil">Admin Console Restricted</h2>
            <p className="font-body text-base text-pencil-light leading-relaxed">
              This console is restricted to the authorized protocol administrator. Connect your admin wallet to continue.
            </p>
            <div className="wobbly-border-sm bg-paper border-2 border-pencil p-3 text-xs font-mono font-bold text-pencil break-all">
              Configured Admin: {CONTRACT_CONFIG.adminAddress}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleConnectAdmin}
              variant="stellar"
              size="lg"
              className="w-full sm:w-auto font-bold gap-2"
            >
              <Wallet className="h-5 w-5" />
              Connect Admin Wallet
            </Button>
            <Link href="/campaigns">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back to Explore
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Gated: Connected but Not Admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-xl">
        <div className="relative w-full wobbly-border-md border-2 border-marker-red bg-white p-8 sm:p-10 shadow-hard text-center space-y-6">
          <Tape rotation={1} />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-marker-red/10 border-2 border-marker-red mx-auto shadow-hard-sm">
            <ShieldAlert className="h-8 w-8 text-marker-red" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-marker-red text-white border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold">
              <span>403 Access Denied</span>
            </div>
            <h2 className="font-heading text-3xl font-bold text-pencil">Unauthorized Wallet</h2>
            <p className="font-body text-base text-pencil-light leading-relaxed">
              Your connected account does not have administrative permissions on the Soroban Campaign Registry contract.
            </p>
          </div>

          <div className="space-y-2 text-left text-xs font-body font-bold">
            <div className="wobbly-border-sm bg-paper-muted border-2 border-pencil p-2.5 space-y-1">
              <span className="text-pencil-muted">Connected Wallet:</span>
              <p className="font-mono text-pencil break-all">{address}</p>
            </div>
            <div className="wobbly-border-sm bg-paper border-2 border-pencil p-2.5 space-y-1">
              <span className="text-pencil-muted">Required Admin Authority:</span>
              <p className="font-mono text-pen-blue break-all">{CONTRACT_CONFIG.adminAddress}</p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                disconnect();
                handleConnectAdmin();
              }}
              variant="destructive"
              size="lg"
              className="w-full sm:w-auto font-bold gap-2"
            >
              <LogOut className="h-4 w-4" />
              Switch Wallet
            </Button>
            <Link href="/campaigns">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back to Explore
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized Admin Console
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-dashed border-pencil/30 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
            <ShieldAlert className="h-4 w-4 text-marker-red" />
            <span>Admin & Moderation Console</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
            Campaign Administration
          </h1>
          <p className="font-body text-lg text-pencil-light mt-1">
            All campaigns are Active on creation. Use your admin wallet to suspend or resume campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Total: {campaigns.length}
          </Badge>
          <Badge variant="active" className="text-sm">
            Active: {campaigns.filter((c) => c.status === "active").length}
          </Badge>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "All Campaigns" },
            { id: "active", label: "Active" },
            { id: "suspended", label: "Suspended / In Review" },
            { id: "funded", label: "Funded / Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`wobbly-border-sm border-2 border-pencil px-3.5 py-1 text-sm font-body font-bold whitespace-nowrap transition-all ${
                filter === tab.id
                  ? "bg-postit-yellow text-pencil shadow-hard-sm -translate-y-0.5"
                  : "bg-white text-pencil hover:bg-paper-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pencil/50" />
          <Input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 font-body text-base"
          />
        </div>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center font-body text-lg text-pencil-light">Loading campaigns...</div>
        ) : filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="relative wobbly-border-md border-2 border-pencil bg-white p-5 space-y-4 shadow-hard hover:shadow-hard-lg transition-all"
            >
              <Tape rotation={-1} />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading text-xl font-bold text-pencil break-words [overflow-wrap:anywhere]">
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
                    >
                      {camp.status === "review" ? "SUSPENDED" : camp.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="font-body text-base text-pencil-light font-bold">
                    Category: <span className="text-pencil">{camp.metadata.category}</span> • Raised:{" "}
                    <span className="font-heading text-marker-red font-bold font-mono">{camp.totalRaisedXlm} XLM</span> /{" "}
                    <span className="font-heading text-pencil font-mono">{camp.targetAmountXlm} XLM</span>
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
                      className="gap-1.5 font-bold text-marker-red hover:bg-marker-red hover:text-white"
                    >
                      <PauseCircle className="h-4 w-4" />
                      Suspend Campaign
                    </Button>
                  ) : camp.status === "review" || camp.status === "draft" ? (
                    <Button
                      onClick={() => handleResume(camp)}
                      disabled={processingId === camp.id}
                      variant="default"
                      size="sm"
                      className="gap-1.5 font-bold"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Resume Campaign
                    </Button>
                  ) : null}

                  <Link href={`/campaigns/${camp.id}`}>
                    <Button variant="ghost" size="sm" className="text-pencil hover:text-marker-red">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <p className="font-body text-base text-pencil-light leading-snug line-clamp-2">
                {camp.metadata.description}
              </p>

              <div className="pt-2 border-t-2 border-dashed border-pencil/20 flex justify-between items-center font-body text-sm text-pencil-light font-bold">
                <span>
                  Creator:{" "}
                  <a
                    href={getExplorerAccountUrl(camp.creator)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-pen-blue hover:text-marker-red hover:underline decoration-wavy"
                  >
                    {shortenAddress(camp.creator)}
                  </a>
                </span>

                <Link
                  href={`/campaigns/${camp.id}`}
                  className="inline-flex items-center gap-1 text-pencil hover:text-marker-red font-bold hover:underline decoration-wavy"
                >
                  View Details Page
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="wobbly-border-md border-2 border-pencil bg-white p-12 text-center space-y-3 shadow-hard">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <h4 className="font-heading text-2xl font-bold text-pencil">No Campaigns Found</h4>
            <p className="font-body text-lg text-pencil-light">
              No campaigns match the selected filter or search query.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
