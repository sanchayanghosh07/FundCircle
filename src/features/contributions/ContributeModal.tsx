"use client";

import * as React from "react";
import { Coins, Heart, Loader2, Sparkles, Wallet, AlertCircle } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useActivityStore } from "@/stores/activityStore";
import { useToast } from "@/components/ui/toast";
import { escrowService } from "@/services/stellar/escrowService";
import { walletKit } from "@/services/wallet/stellarWalletKit";
import { getExplorerTxUrl } from "@/config/stellar";

const PRESET_AMOUNTS = ["25", "50", "100", "250", "500"];

export function ContributeModal({
  campaign,
  isOpen,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { isConnected, address, balanceXlm, setWallet } = useWalletStore();
  const { openModal: openTxModal, updateStatus, recordSuccess, recordFailure } =
    useTransactionStore();
  const { addActivity } = useActivityStore();
  const { toast } = useToast();

  const [amount, setAmount] = React.useState("50");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const numAmount = Number(amount) || 0;
  const numBalance = Number(balanceXlm) || 0;
  const hasInsufficientBalance = isConnected && numAmount > numBalance;

  const handlePreset = (val: string) => {
    setAmount(val);
    setError(null);
  };

  const handleContribute = async () => {
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

    if (numAmount <= 0) {
      setError("Please enter a valid contribution amount.");
      return;
    }

    if (hasInsufficientBalance) {
      setError(`Insufficient XLM balance. You have ${balanceXlm} XLM available.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    onClose();

    openTxModal("contribute", `Contribute ${amount} XLM`, {
      campaignId: campaign.id,
      campaignTitle: campaign.metadata.title,
      amount,
      assetSymbol: "XLM",
      from: address,
    });

    try {
      const result = await escrowService.contribute(
        campaign.id,
        amount,
        address,
        (status, msg) => updateStatus(status, msg)
      );

      recordSuccess(result.txHash, getExplorerTxUrl(result.txHash));

      // Record activity event
      addActivity({
        id: `act_${Date.now()}`,
        type: "contributed",
        campaignId: campaign.id,
        campaignTitle: campaign.metadata.title,
        actor: address,
        amountXlm: amount,
        timestamp: Date.now(),
        txHash: result.txHash,
        details: `Pledged ${amount} XLM to ${campaign.metadata.title}`,
      });

      toast({
        type: "success",
        title: "Contribution Successful!",
        description: `Successfully contributed ${amount} XLM to ${campaign.metadata.title}.`,
      });

      onSuccess?.();
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to execute contribution on Soroban escrow.";
      recordFailure(errorMsg);
      toast({
        type: "error",
        title: "Contribution Failed",
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Contribute to Project"
      description={`Support "${campaign.metadata.title}" with Stellar lumens.`}
    >
      <div className="space-y-5 pt-2">
        {/* Preset Amount Chips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Select Preset Amount
          </label>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map((val) => {
              const isSelected = amount === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handlePreset(val)}
                  className={`rounded-xl py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 ring-2 ring-teal-400"
                      : "bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {val} XLM
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-300">Custom Amount (XLM)</label>
            {isConnected && (
              <span className="text-slate-400">
                Available: <span className="text-teal-400 font-mono font-medium">{balanceXlm} XLM</span>
              </span>
            )}
          </div>

          <div className="relative">
            <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-400" />
            <Input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 50"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              className="pl-10 h-12 text-lg font-bold font-mono bg-slate-950 border-slate-800"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              XLM
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-rose-950/40 border border-rose-900/50 p-3 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Escrow Custody Assurance Note */}
        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            Soroban Escrow Protected
          </p>
          <p className="text-[11px] leading-relaxed">
            Funds are locked safely in the Funding Escrow smart contract. If the project does not reach its target by the deadline, you are entitled to a 100% on-chain refund.
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleContribute}
          disabled={isSubmitting}
          variant="stellar"
          size="lg"
          className="w-full font-bold shadow-lg shadow-teal-500/20 gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing Escrow Pledge...
            </>
          ) : !isConnected ? (
            <>
              <Wallet className="h-5 w-5" />
              Connect Wallet & Contribute
            </>
          ) : (
            <>
              <Heart className="h-5 w-5 fill-current" />
              Confirm Contribution ({amount || 0} XLM)
            </>
          )}
        </Button>
      </div>
    </Dialog>
  );
}
