"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
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
  Coins,
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
import { Tape } from "@/components/ui/hand-drawn/Tape";
import { Thumbtack } from "@/components/ui/hand-drawn/Thumbtack";
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
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-pencil border-r-transparent" />
        <p className="mt-4 font-body text-xl text-pencil-light font-bold">Loading campaign details from ledger...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4 max-w-md">
        <AlertCircle className="h-12 w-12 text-marker-red mx-auto" />
        <h2 className="font-heading text-3xl font-bold text-pencil">Campaign Not Found</h2>
        <p className="font-body text-lg text-pencil-light">
          The requested campaign does not exist in the Campaign Registry.
        </p>
        <Link href="/campaigns">
          <Button variant="outline" size="default">
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
        description: `Successfully released ${campaign.totalRaisedXlm} XLM to campaign creator.`,
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
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl">
      {/* Back Button & Share */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 font-body font-bold text-lg text-pencil hover:text-marker-red hover:underline decoration-wavy transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Explore
        </Link>

        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
          {copied ? "Link Copied" : "Share Campaign"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visuals & Narrative */}
        <div className="lg:col-span-2 space-y-6">
          {/* Polaroid Hero Card */}
          <div className="relative w-full wobbly-border-md border-2 border-pencil bg-white p-4 sm:p-5 shadow-hard">
            <Tape rotation={-1} />

            <div className="relative h-64 sm:h-[360px] w-full overflow-hidden wobbly-border-sm border-2 border-pencil bg-paper-muted mb-4">
              <img
                src={campaign.metadata.imageUrl || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80"}
                alt={campaign.metadata.title}
                className="h-full w-full object-cover"
              />
              
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="wobbly-border-sm border-2 border-pencil bg-white/95 px-3 py-1 font-heading text-xs font-bold text-pencil shadow-hard-sm">
                  {campaign.metadata.category}
                </span>
                <span className="wobbly-border-sm border-2 border-pencil bg-paper-muted px-2.5 py-1 font-heading text-xs font-bold text-pencil shadow-hard-sm">
                  #{campaign.id}
                </span>
              </div>

              <div className="absolute top-3 right-3">
                <Badge
                  variant={
                    campaign.status === "active"
                      ? "active"
                      : campaign.status === "review" || campaign.status === "draft"
                      ? "review"
                      : "funded"
                  }
                  className="text-xs"
                >
                  {campaign.status === "review" ? "SUSPENDED" : campaign.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-pencil leading-tight break-words [overflow-wrap:anywhere]">
              {campaign.metadata.title}
            </h1>
          </div>

          {/* Campaign Details Narrative */}
          <div className="relative wobbly-border-md border-2 border-pencil bg-white p-5 sm:p-8 shadow-hard space-y-6">
            <Thumbtack color="red" />

            <div className="space-y-3">
              <h3 className="font-heading text-2xl font-bold text-pencil">About the Initiative</h3>
              <p className="font-body text-lg sm:text-xl leading-relaxed text-pencil-light whitespace-pre-line break-words [overflow-wrap:anywhere]">
                {campaign.metadata.description}
              </p>
            </div>

            {/* Soroban On-Chain Metadata Table */}
            <div className="border-t-2 border-dashed border-pencil/30 pt-6 space-y-3">
              <h4 className="font-heading text-sm font-bold text-pencil uppercase tracking-wider">
                Blockchain Verification & Transparency
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="wobbly-border-sm bg-paper border-2 border-pencil p-3 flex flex-col shadow-hard-sm">
                  <span className="font-heading text-xs text-pencil-muted font-bold">Funding Asset</span>
                  <span className="font-body text-base font-bold text-pencil mt-0.5">
                    Stellar Lumens (XLM SAC)
                  </span>
                </div>

                <div className="wobbly-border-sm bg-paper border-2 border-pencil p-3 flex flex-col shadow-hard-sm">
                  <span className="font-heading text-xs text-pencil-muted font-bold">Launch Date</span>
                  <span className="font-body text-base font-bold text-pencil mt-0.5">
                    {formatDate(campaign.createdAt)}
                  </span>
                </div>

                <div className="wobbly-border-sm bg-paper border-2 border-pencil p-3 flex flex-col sm:col-span-2 shadow-hard-sm">
                  <span className="font-heading text-xs text-pencil-muted font-bold">Campaign Creator</span>
                  <a
                    href={getExplorerAccountUrl(campaign.creator)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-body font-bold text-pen-blue hover:text-marker-red hover:underline decoration-wavy flex items-center gap-1 mt-0.5 break-all text-xs sm:text-sm"
                  >
                    {campaign.creator}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Funding Panel & Actions */}
        <div className="space-y-6">
          {/* Post-It Style Funding Box */}
          <div className="relative wobbly-border-md border-2 border-pencil bg-postit-yellow p-5 sm:p-7 shadow-hard-lg space-y-6">
            <Tape rotation={2} />

            {/* Amount Status */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="flex flex-col">
                  <span className="font-heading text-3xl sm:text-4xl font-black text-pencil tracking-tight">
                    {campaign.totalRaisedXlm} <span className="text-xl">XLM</span>
                  </span>
                  <span className="font-body text-sm sm:text-base text-pencil font-bold">
                    raised of <span className="font-heading font-bold">{campaign.targetAmountXlm} XLM</span> goal
                  </span>
                </div>
                <span className="font-heading text-2xl font-bold text-marker-red">
                  {campaign.progressPercentage}%
                </span>
              </div>

              <Progress value={campaign.progressPercentage} max={100} className="h-4 bg-white" />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 py-3 border-y-2 border-dashed border-pencil/30 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pencil" />
                <div>
                  <p className="font-heading font-bold text-lg text-pencil">{campaign.contributorCount}</p>
                  <p className="font-body text-sm text-pencil-muted font-bold">Contributors</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-pencil" />
                <div>
                  <p className="font-heading font-bold text-lg text-pencil">{countdown.formatted}</p>
                  <p className="font-body text-sm text-pencil-muted font-bold">Time Left</p>
                </div>
              </div>
            </div>

            {/* User Previous Contribution Banner */}
            {userContribution && BigInt(userContribution.amount) > 0n && (
              <div className="wobbly-border-sm bg-white border-2 border-pencil p-3 flex items-center justify-between shadow-hard-sm">
                <div className="flex items-center gap-2 font-body font-bold text-pencil">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Your Pledge:</span>
                </div>
                <span className="font-heading font-bold text-pencil text-base">{userContribution.amountXlm} XLM</span>
              </div>
            )}

            {/* Suspended Alert Banner */}
            {(campaign.status === "review" || campaign.status === "draft") && (
              <div className="wobbly-border-sm bg-white border-2 border-marker-red p-3.5 space-y-1.5 shadow-hard-sm">
                <div className="flex items-center gap-2 text-marker-red font-heading font-bold text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Funding Paused / Suspended</span>
                </div>
                <p className="font-body text-sm text-pencil leading-snug">
                  This campaign is currently suspended by administration. Public contributions are paused.
                </p>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-3 pt-1">
              {campaign.status === "active" ? (
                isConnected ? (
                  <Button
                    onClick={() => setContributeModalOpen(true)}
                    variant="stellar"
                    size="lg"
                    className="w-full font-bold shadow-hard text-xl py-3.5 gap-2"
                  >
                    <Heart className="h-5 w-5 fill-current text-white" />
                    Contribute
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnectWallet}
                    variant="stellar"
                    size="lg"
                    className="w-full font-bold shadow-hard text-xl py-3.5 gap-2"
                  >
                    <Wallet className="h-5 w-5" />
                    Connect Wallet to Contribute
                  </Button>
                )
              ) : null}

              {/* Creator Disbursement */}
              {isCreator && (campaign.status === "funded" || campaign.canDisburse) && !campaign.isFundsReleased && (
                <Button
                  onClick={handleReleaseFunds}
                  disabled={isProcessingAction}
                  variant="yellow"
                  size="lg"
                  className="w-full font-bold gap-2"
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
                    Claim Refund ({userContribution.amountXlm} XLM)
                  </Button>
                )}

              {/* Creator Cancel Option */}
              {isCreator && (campaign.status === "draft" || campaign.status === "review" || campaign.status === "active") && (
                <button
                  onClick={handleCancelCampaign}
                  disabled={isProcessingAction}
                  className="w-full text-center font-body font-bold text-sm text-marker-red hover:underline pt-2"
                >
                  Cancel Campaign
                </button>
              )}
            </div>

            {/* Escrow Custody Assurance */}
            <div className="flex items-center gap-2 wobbly-border-sm bg-white p-2.5 text-xs font-body font-bold text-pencil border-2 border-pencil shadow-hard-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Escrow Custody:{" "}
                <span className="font-heading text-pen-blue">
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
