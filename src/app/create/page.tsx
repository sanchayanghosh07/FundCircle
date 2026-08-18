"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Coins,
  AlertCircle,
  Wallet,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useActivityStore } from "@/stores/activityStore";
import { useToast } from "@/components/ui/toast";
import { registryService } from "@/services/stellar/registryService";
import { walletKit } from "@/services/wallet/stellarWalletKit";
import { getExplorerTxUrl, CONTRACT_CONFIG } from "@/config/stellar";
import { Tape } from "@/components/ui/hand-drawn/Tape";
import { Thumbtack } from "@/components/ui/hand-drawn/Thumbtack";

const CATEGORIES = [
  "Education",
  "Technology",
  "Environment",
  "Emergency",
  "Community",
  "Social",
  "Creator",
];

const SAMPLE_IMAGES = [
  {
    label: "Education",
    url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Technology",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Environment",
    url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Community",
    url: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80",
  },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const { isConnected, address, setWallet } = useWalletStore();
  const { openModal: openTxModal, updateStatus, recordSuccess, recordFailure } =
    useTransactionStore();
  const { addActivity } = useActivityStore();
  const { toast } = useToast();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("Education");
  const [targetAmountXlm, setTargetAmountXlm] = React.useState("1000");
  const [deadlineDays, setDeadlineDays] = React.useState(30);
  const [imageUrl, setImageUrl] = React.useState(SAMPLE_IMAGES[0].url);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      try {
        const result = await walletKit.openModal();
        if (result) {
          setWallet(result.address, result.walletId, result.name, "testnet");
        }
      } catch {
        return;
      }
      return;
    }

    if (!title.trim() || title.length < 5) {
      setError("Please provide a title with at least 5 characters.");
      return;
    }

    if (!description.trim() || description.length < 20) {
      setError("Please describe your campaign scope and objectives (min 20 characters).");
      return;
    }

    const numGoal = Number(targetAmountXlm);
    if (isNaN(numGoal) || numGoal <= 0) {
      setError("Please provide a valid funding goal in XLM.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    openTxModal("create_campaign", "Create Micro-Funding Campaign", {
      campaignTitle: title,
      amount: targetAmountXlm,
      assetSymbol: "XLM",
      from: address,
    });

    try {
      const result = await registryService.createCampaign(
        {
          title: title.trim(),
          description: description.trim(),
          category,
          imageUrl: imageUrl.trim(),
          targetAmountXlm: targetAmountXlm.trim(),
          asset: CONTRACT_CONFIG.nativeAssetContractId,
          deadlineDays,
        },
        address,
        (status, msg) => updateStatus(status, msg)
      );

      recordSuccess(result.txHash, getExplorerTxUrl(result.txHash));

      // Record activity event
      addActivity({
        id: `act_${Date.now()}`,
        type: "campaign_created",
        campaignId: result.campaignId,
        campaignTitle: title,
        actor: address,
        amountXlm: targetAmountXlm,
        timestamp: Date.now(),
        txHash: result.txHash,
        details: `Created campaign "${title}" with ${targetAmountXlm} XLM goal`,
      });

      toast({
        type: "success",
        title: "Campaign Created Successfully!",
        description: `Your campaign ID #${result.campaignId} is active and open for contributions.`,
      });

      setTimeout(() => {
        router.push(`/campaigns/${result.campaignId}`);
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || "Failed to create campaign on Soroban Registry.";
      recordFailure(msg);
      toast({
        type: "error",
        title: "Campaign Creation Failed",
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
          <span>Start a Campaign</span>
        </div>
        <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
          Launch a Micro-Funding Campaign
        </h1>
        <p className="font-body text-lg text-pencil-light mt-1">
          Raise funds with verifiable Soroban smart contract escrow custody and transparent milestone releases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="relative lg:col-span-2 space-y-6 wobbly-border-md border-2 border-pencil bg-white p-6 sm:p-8 shadow-hard"
        >
          <Tape rotation={-1} />

          {error && (
            <div className="wobbly-border-sm bg-marker-red/10 border-2 border-marker-red p-4 flex items-center gap-3 font-body font-bold text-sm text-marker-red shadow-hard-sm">
              <AlertCircle className="h-5 w-5 text-marker-red shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label className="font-heading font-bold text-sm text-pencil">
              Campaign Title <span className="text-marker-red">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Solar Study Lights for Community School"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 text-base font-body font-bold"
              required
            />
          </div>

          {/* Category & Goal Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-heading font-bold text-sm text-pencil">
                Category <span className="text-marker-red">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full wobbly-border-sm border-2 border-pencil bg-white px-3 font-body font-bold text-base text-pencil shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-pen-blue/20 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-heading font-bold text-sm text-pencil">
                Funding Target (XLM) <span className="text-marker-red">*</span>
              </label>
              <div className="relative">
                <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-pencil" />
                <Input
                  type="number"
                  min="10"
                  step="any"
                  placeholder="e.g. 5000"
                  value={targetAmountXlm}
                  onChange={(e) => setTargetAmountXlm(e.target.value)}
                  className="pl-11 h-11 font-heading font-bold text-base"
                  required
                />
              </div>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="font-heading font-bold text-sm text-pencil">
              Campaign Duration (Days) <span className="text-marker-red">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[7, 14, 30, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeadlineDays(d)}
                  className={`py-2 wobbly-border-sm border-2 border-pencil font-body font-bold text-base transition-all ${
                    deadlineDays === d
                      ? "bg-postit-yellow text-pencil shadow-hard-sm -translate-y-0.5 font-black"
                      : "bg-paper text-pencil hover:bg-paper-muted"
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {/* Image Selection */}
          <div className="space-y-2">
            <label className="font-heading font-bold text-sm text-pencil">
              Cover Image URL <span className="text-marker-red">*</span>
            </label>
            <Input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="h-11 font-body text-sm"
            />
            <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar pb-1">
              <span className="font-body text-xs font-bold text-pencil-light shrink-0">Quick presets:</span>
              {SAMPLE_IMAGES.map((img) => (
                <button
                  key={img.label}
                  type="button"
                  onClick={() => setImageUrl(img.url)}
                  className="font-body font-bold text-xs wobbly-border-sm border-2 border-pencil bg-paper px-2.5 py-0.5 text-pencil hover:bg-postit-yellow shrink-0 shadow-hard-sm"
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="font-heading font-bold text-sm text-pencil">
              Campaign Description & Objectives <span className="text-marker-red">*</span>
            </label>
            <Textarea
              rows={4}
              placeholder="Describe what your community campaign is about, who it benefits, and how funds will be used..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="font-body text-base leading-snug"
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="stellar"
            size="lg"
            className="w-full font-bold shadow-hard text-xl py-3.5 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting to Soroban Registry...
              </>
            ) : !isConnected ? (
              <>
                <Wallet className="h-5 w-5" />
                Connect Wallet to Create
              </>
            ) : (
              <>
                <PlusCircle className="h-5 w-5" />
                Launch Campaign on Stellar
              </>
            )}
          </Button>
        </form>

        {/* Live Polaroid Preview Card */}
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-sm text-pencil uppercase tracking-wider">
            Live Preview
          </h3>
          <div className="relative w-full wobbly-border-md border-2 border-pencil bg-white p-4 shadow-hard">
            <Thumbtack color="yellow" />

            <div className="relative h-44 w-full overflow-hidden wobbly-border-sm border-2 border-pencil bg-paper-muted mb-3">
              <img
                src={imageUrl || SAMPLE_IMAGES[0].url}
                alt="Preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-2.5 left-2.5">
                <span className="wobbly-border-sm border-2 border-pencil bg-white/95 px-2 py-0.5 font-heading text-xs font-bold text-pencil">
                  {category}
                </span>
              </div>
              <div className="absolute top-2.5 right-2.5">
                <Badge variant="active">ACTIVE</Badge>
              </div>
            </div>

            <div className="space-y-2 px-1">
              <h4 className="font-heading text-lg font-bold text-pencil line-clamp-1 break-words [overflow-wrap:anywhere]">
                {title || "Your Campaign Title"}
              </h4>
              <p className="font-body text-sm text-pencil-light line-clamp-2 break-words [overflow-wrap:anywhere]">
                {description || "Campaign description will appear here as you type."}
              </p>

              <div className="pt-2 border-t-2 border-dashed border-pencil/30 flex justify-between items-center font-body font-bold text-sm">
                <span className="text-pencil-light">Target Goal:</span>
                <span className="font-heading text-base font-bold text-marker-red font-mono">
                  {targetAmountXlm || "0"} XLM
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
