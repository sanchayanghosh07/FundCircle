"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Sparkles,
  Coins,
  Calendar,
  Image as ImageIcon,
  Tag,
  FileText,
  AlertCircle,
  Wallet,
  Loader2,
  CheckCircle2,
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
      setError("Please describe your project scope and objectives (min 20 characters).");
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
        description: `Your campaign ID #${result.campaignId} is submitted and in review.`,
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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 px-3 py-0.5 text-xs font-semibold text-teal-300 mb-2">
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Launch on Stellar</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Create a Micro-Funding Campaign
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Raise funds with verifiable Soroban smart contract escrow custody and transparent milestone releases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 space-y-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm"
        >
          {error && (
            <div className="rounded-xl bg-rose-950/40 border border-rose-900/50 p-4 flex items-center gap-3 text-xs text-rose-200">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Campaign Title <span className="text-teal-400">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Solar Study Lights for Community School"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 bg-slate-950 border-slate-800"
              required
            />
          </div>

          {/* Category & Goal Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">
                Category <span className="text-teal-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">
                Funding Target (XLM) <span className="text-teal-400">*</span>
              </label>
              <div className="relative">
                <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-400" />
                <Input
                  type="number"
                  min="10"
                  step="any"
                  placeholder="e.g. 5000"
                  value={targetAmountXlm}
                  onChange={(e) => setTargetAmountXlm(e.target.value)}
                  className="pl-10 h-11 font-mono font-bold bg-slate-950 border-slate-800"
                  required
                />
              </div>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Campaign Duration (Days) <span className="text-teal-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[7, 14, 30, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeadlineDays(d)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    deadlineDays === d
                      ? "bg-teal-500 text-slate-950 ring-2 ring-teal-400 font-bold"
                      : "bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {/* Image Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Cover Image URL <span className="text-teal-400">*</span>
            </label>
            <Input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="h-11 bg-slate-950 border-slate-800 text-xs font-mono"
            />
            <div className="flex items-center gap-2 pt-1 overflow-x-auto">
              <span className="text-[11px] text-slate-500 shrink-0">Quick presets:</span>
              {SAMPLE_IMAGES.map((img) => (
                <button
                  key={img.label}
                  type="button"
                  onClick={() => setImageUrl(img.url)}
                  className="text-[11px] rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-slate-400 hover:text-teal-300 shrink-0"
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Project Description & Milestones <span className="text-teal-400">*</span>
            </label>
            <Textarea
              rows={5}
              placeholder="Describe what your community project is about, who it benefits, and how funds will be used..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs leading-relaxed"
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="stellar"
            size="lg"
            className="w-full font-bold shadow-lg shadow-teal-500/20 gap-2"
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
                Submit Campaign for Review
              </>
            )}
          </Button>
        </form>

        {/* Live Preview Card */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Live Preview Card
          </h3>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="relative h-44 w-full bg-slate-950">
              <img
                src={imageUrl || SAMPLE_IMAGES[0].url}
                alt="Preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <Badge variant="active">{category}</Badge>
              </div>
              <div className="absolute top-3 right-3">
                <Badge variant="review">In Review</Badge>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <h4 className="text-sm font-bold text-white line-clamp-1">
                {title || "Your Campaign Title"}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2">
                {description || "Project description will appear here as you type."}
              </p>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Target Goal:</span>
                <span className="text-teal-300 font-bold font-mono">
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
