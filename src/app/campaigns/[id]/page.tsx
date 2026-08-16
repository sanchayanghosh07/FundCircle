"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Coins,
  Clock,
  Users,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Lock,
  RotateCcw,
  Check,
  Copy,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ContributeModal } from "@/features/contributions/ContributeModal";
import { registryService } from "@/services/stellar/registryService";
import { escrowService } from "@/services/stellar/escrowService";
import { walletKit } from "@/services/wallet/stellarWalletKit";
import { stellarRpc } from "@/services/stellar/rpc";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useToast } from "@/components/ui/toast";
import { Campaign, ContributionRecord } from "@/types/campaign";
import {
  shortenAddress,
  formatDate,
  getCountdown,
  copyToClipboard,
} from "@/lib/utils";
import {
  getExplorerAccountUrl,
  getExplorerContractUrl,
  getExplorerTxUrl,
  CONTRACT_CONFIG,
} from "@/config/stellar";

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = Number(params?.id);

  const { isConnected, address, setWallet, setBalance } = useWalletStore();
  const { openModal: openTxModal, updateStatus, recordSuccess, recordFailure } =
    useTransactionStore();
  const { toast } = useToast();

  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [contributeModalOpen, setContributeModalOpen] = React.useState(false);
  const [userContribution, setUserContribution] = React.useState<ContributionRecord | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (isNaN(campaignId)) return;
    try {
      const data = await registryService.getCampaignById(campaignId);
      setCampaign(data);

      if (address) {
        const uContrib = await escrowService.getUserContribution(campaignId, address);
        setUserContribution(uContrib);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId, address]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-r-transparent" />
        <p className="mt-3 text-xs text-slate-400">Loading campaign details from Stellar ledger...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4 max-w-md">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Campaign Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested campaign does not exist in the Campaign Registry.
        </p>
        <Link href="/campaigns">
          <Button variant="outline" size="sm">
            Back to Campaigns
          </Button>
        </Link>
      </div>
    );
  }

  const countdown = getCountdown(campaign.deadline);
  const isCreator = address ? address.toLowerCase() === campaign.creator.toLowerCase() : false;

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      await copyToClipboard(window.location.href);
      setCopied(true);
      toast({
        type: "success",
        title: "Link Copied!",
        description: "Campaign URL copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnectWallet = async () => {
    try {
      const res = await walletKit.openModal();
      if (res) {
        setWallet(res.address, res.walletId, res.name, "testnet");
        const bal = await stellarRpc.getAccountBalance(res.address);
        setBalance(bal);
        toast({
          type: "success",
          title: "Wallet Connected",
          description: `Connected ${shortenAddress(res.address)}`,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveCampaign = async () => {
    setIsProcessingAction(true);
    openTxModal("approve_campaign", "Activate Campaign for Public Funding", {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      from: address || "G...",
    });

    try {
      const txHash = await registryService.approveCampaign(campaign.id, address || "G...");
      recordSuccess(txHash, getExplorerTxUrl(txHash));
      toast({
        type: "success",
        title: "Campaign Activated!",
        description: "The campaign is now Active and open for public community contributions.",
      });
      await loadData();
    } catch (err: any) {
      recordFailure(err?.message || "Failed to activate campaign.");
      toast({
        type: "error",
        title: "Activation Error",
        description: err?.message || "Failed to activate campaign.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReleaseFunds = async () => {
    if (!address) return;
    setIsProcessingAction(true);

    openTxModal("release_funds", "Disburse Campaign Funds", {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      amount: campaign.totalRaisedXlm,
      from: address,
      to: campaign.creator,
    });

    try {
      const result = await escrowService.releaseFunds(
        campaign.id,
        address,
        (status, msg) => updateStatus(status, msg)
      );

      recordSuccess(result.txHash, getExplorerTxUrl(result.txHash));
      toast({
        type: "success",
        title: "Funds Disbursed!",
        description: `Successfully released ${campaign.totalRaisedXlm} XLM to project creator.`,
      });
      loadData();
    } catch (err: any) {
      recordFailure(err?.message || "Fund disbursement failed.");
      toast({
        type: "error",
        title: "Disbursement Error",
        description: err?.message || "Failed to disburse funds.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleClaimRefund = async () => {
    if (!address) return;
    setIsProcessingAction(true);

    openTxModal("claim_refund", "Claim Contributor Refund", {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      from: address,
    });

    try {
      const result = await escrowService.claimRefund(
        campaign.id,
        address,
        (status, msg) => updateStatus(status, msg)
      );

      recordSuccess(result.txHash, getExplorerTxUrl(result.txHash));
      toast({
        type: "success",
        title: "Refund Processed!",
        description: `Successfully refunded ${result.refundedXlm} XLM to your wallet.`,
      });
      loadData();
    } catch (err: any) {
      recordFailure(err?.message || "Refund claim failed.");
      toast({
        type: "error",
        title: "Refund Error",
        description: err?.message || "Failed to claim refund.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCancelCampaign = async () => {
    if (!address) return;
    if (!confirm("Are you sure you want to cancel this campaign? Contributors will be able to claim refunds.")) {
      return;
    }

    setIsProcessingAction(true);
    openTxModal("cancel_campaign", "Cancel Campaign", {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      from: address,
    });

    try {
      const txHash = await registryService.cancelCampaign(campaign.id, address);
      recordSuccess(txHash, getExplorerTxUrl(txHash));
      toast({
        type: "info",
        title: "Campaign Cancelled",
        description: "The campaign status has been updated to Cancelled.",
      });
      loadData();
    } catch (err: any) {
      recordFailure(err?.message || "Failed to cancel campaign.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-6xl">
      {/* Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>

        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-slate-800"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
          {copied ? "Link Copied" : "Share Campaign"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visuals & Narrative */}
        <div className="lg:col-span-2 space-y-6">
          {/* Banner Image */}
          <div className="relative h-[320px] sm:h-[420px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
            <img
              src={campaign.metadata.imageUrl || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80"}
              alt={campaign.metadata.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-teal-300 backdrop-blur-md border border-teal-500/30">
                {campaign.metadata.category}
              </span>
              <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-300 backdrop-blur-md border border-slate-700">
                ID #{campaign.id}
              </span>
              <Badge
                variant={
                  campaign.status === "active"
                    ? "active"
                    : campaign.status === "review"
                    ? "review"
                    : campaign.status === "funded" || campaign.status === "completed"
                    ? "funded"
                    : "outline"
                }
                className="capitalize backdrop-blur-md"
              >
                {campaign.status}
              </Badge>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {campaign.metadata.title}
              </h1>
            </div>
          </div>

          {/* Project Details Narrative */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">About the Project</h3>
              <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                {campaign.metadata.description}
              </p>
            </div>

            {/* Soroban On-Chain Metadata Table */}
            <div className="border-t border-slate-800 pt-6 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Blockchain Verification & Transparency
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 flex flex-col">
                  <span className="text-slate-500 text-[11px]">Funding Asset</span>
                  <span className="text-slate-200 font-semibold font-mono mt-0.5">
                    Stellar Lumens (XLM SAC)
                  </span>
                </div>

                <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 flex flex-col">
                  <span className="text-slate-500 text-[11px]">Launch Date</span>
                  <span className="text-slate-200 font-semibold font-mono mt-0.5">
                    {formatDate(campaign.createdAt)}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 flex flex-col sm:col-span-2">
                  <span className="text-slate-500 text-[11px]">Project Creator</span>
                  <a
                    href={getExplorerAccountUrl(campaign.creator)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-400 hover:text-teal-300 font-mono font-medium flex items-center gap-1 mt-0.5"
                  >
                    {campaign.creator}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Funding Panel & Actions */}
        <div className="space-y-6">
          {/* Main Funding Progress Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
            {/* Amount Status */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-white font-mono tracking-tight">
                    {campaign.totalRaisedXlm}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    XLM raised of <span className="text-slate-200 font-mono font-semibold">{campaign.targetAmountXlm} XLM</span> goal
                  </span>
                </div>
                <span className="text-xl font-bold text-teal-400 font-mono">
                  {campaign.progressPercentage}%
                </span>
              </div>

              <Progress value={campaign.progressPercentage} max={100} className="h-3" />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-400" />
                <div>
                  <p className="font-bold text-white font-mono">{campaign.contributorCount}</p>
                  <p className="text-[11px] text-slate-400">Contributors</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-400" />
                <div>
                  <p className="font-bold text-white font-mono">{countdown.formatted}</p>
                  <p className="text-[11px] text-slate-400">Time Left</p>
                </div>
              </div>
            </div>

            {/* User Previous Contribution Banner */}
            {userContribution && BigInt(userContribution.amount) > 0n && (
              <div className="rounded-xl bg-teal-950/40 border border-teal-800/50 p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-teal-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" />
                  <span>Your Total Pledge:</span>
                </div>
                <span className="font-bold text-white font-mono">{userContribution.amountXlm} XLM</span>
              </div>
            )}

            {/* Primary Action Buttons based on state */}
            <div className="space-y-3 pt-1">
              {campaign.status === "active" ? (
                isConnected ? (
                  <Button
                    onClick={() => setContributeModalOpen(true)}
                    variant="stellar"
                    size="lg"
                    className="w-full font-bold shadow-lg shadow-teal-500/20 gap-2 text-sm"
                  >
                    <Heart className="h-5 w-5 fill-current text-teal-950" />
                    Back this Project / Contribute Now
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnectWallet}
                    variant="stellar"
                    size="lg"
                    className="w-full font-bold shadow-lg shadow-teal-500/20 gap-2 text-sm"
                  >
                    <Wallet className="h-5 w-5" />
                    Connect Wallet to Contribute
                  </Button>
                )
              ) : null}

              {/* In Review / Draft quick activation */}
              {(campaign.status === "review" || campaign.status === "draft") && (
                <div className="rounded-2xl bg-amber-950/30 border border-amber-800/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Campaign is currently {campaign.status === "review" ? "Under Review" : "Draft"}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Activate this campaign to open public on-chain funding for all community members.
                  </p>
                  <Button
                    onClick={handleApproveCampaign}
                    disabled={isProcessingAction}
                    variant="stellar"
                    size="sm"
                    className="w-full font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    Activate Campaign Now
                  </Button>
                </div>
              )}

              {/* Creator Disbursement */}
              {isCreator && (campaign.status === "funded" || campaign.canDisburse) && !campaign.isFundsReleased && (
                <Button
                  onClick={handleReleaseFunds}
                  disabled={isProcessingAction}
                  variant="stellar"
                  size="lg"
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Coins className="h-5 w-5" />
                  Disburse Raised Funds ({campaign.totalRaisedXlm} XLM)
                </Button>
              )}

              {/* Contributor Refund Claim */}
              {userContribution &&
                BigInt(userContribution.amount) > 0n &&
                (campaign.status === "cancelled" || campaign.status === "refund" || campaign.canClaimRefund) && (
                  <Button
                    onClick={handleClaimRefund}
                    disabled={isProcessingAction}
                    variant="destructive"
                    size="lg"
                    className="w-full font-bold gap-2"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Claim Full Refund ({userContribution.amountXlm} XLM)
                  </Button>
                )}

              {/* Creator Cancel Option */}
              {isCreator && (campaign.status === "draft" || campaign.status === "review" || campaign.status === "active") && (
                <button
                  onClick={handleCancelCampaign}
                  disabled={isProcessingAction}
                  className="w-full text-center text-xs text-rose-400 hover:underline pt-2 font-medium"
                >
                  Cancel Campaign
                </button>
              )}
            </div>

            {/* Trust Assurance */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-950 p-3 text-[11px] text-slate-400 border border-slate-800/60">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Funds held in escrow contract{" "}
                <span className="font-mono text-slate-300">
                  {shortenAddress(CONTRACT_CONFIG.escrowContractId)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Dialog Modal */}
      <ContributeModal
        campaign={campaign}
        isOpen={contributeModalOpen}
        onClose={() => setContributeModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
