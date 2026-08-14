"use client";

import * as React from "react";
import Link from "next/link";
import {
  Heart,
  Coins,
  ArrowUpRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/walletStore";
import { escrowService } from "@/services/stellar/escrowService";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";

export default function ContributorDashboardPage() {
  const { isConnected, address } = useWalletStore();
  const [supportedCampaigns, setSupportedCampaigns] = React.useState<
    { campaign: Campaign; amountXlm: string; timestamp: number }[]
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      if (!address) {
        // demo sample
        const all = await registryService.getAllCampaigns();
        if (all.length > 0) {
          setSupportedCampaigns([
            {
              campaign: all[0],
              amountXlm: "250",
              timestamp: Date.now() - 1000 * 60 * 35,
            },
          ]);
        }
        setLoading(false);
        return;
      }

      const list = await escrowService.getUserSupportedCampaigns(address);
      const enriched = await Promise.all(
        list.map(async (item) => {
          const camp = await registryService.getCampaignById(item.campaignId);
          return camp ? { campaign: camp, amountXlm: item.amountXlm, timestamp: item.timestamp } : null;
        })
      );

      setSupportedCampaigns(enriched.filter(Boolean) as any);
      setLoading(false);
    };

    load();
  }, [address]);

  const totalPledged = supportedCampaigns.reduce(
    (acc, s) => acc + Number(s.amountXlm || 0),
    0
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 px-3 py-0.5 text-xs font-semibold text-teal-300 mb-2">
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>Contributor Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            My Supported Projects
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your backed initiatives and claim escrow refunds for cancelled or unmet campaigns.
          </p>
        </div>

        <Link href="/campaigns">
          <Button variant="stellar" size="sm" className="font-semibold">
            Explore More Projects
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Total Pledged</span>
          <p className="text-2xl font-extrabold text-teal-400 font-mono">{totalPledged} XLM</p>
          <span className="text-[11px] text-slate-400">In Soroban Escrow custody</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Campaigns Backed</span>
          <p className="text-2xl font-extrabold text-white font-mono">{supportedCampaigns.length}</p>
          <span className="text-[11px] text-slate-400">Active community projects</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Refund Protection</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">100%</p>
          <span className="text-[11px] text-slate-400">Guaranteed by smart contract</span>
        </div>
      </div>

      {/* Backed Projects List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight">Backed Initiatives</h3>

        {supportedCampaigns.length > 0 ? (
          <div className="space-y-3">
            {supportedCampaigns.map(({ campaign, amountXlm }) => (
              <div
                key={campaign.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm hover:border-teal-500/30 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{campaign.metadata.title}</span>
                    <Badge variant={campaign.status === "active" ? "active" : "secondary"}>
                      {campaign.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Category: <span className="text-slate-200">{campaign.metadata.category}</span>
                  </p>
                </div>

                <div className="flex items-center gap-6 sm:self-center self-end text-xs">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-slate-500 font-medium">Your Contribution</span>
                    <span className="font-mono font-bold text-teal-300 text-sm">
                      {amountXlm} XLM
                    </span>
                  </div>

                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-teal-400 hover:text-teal-300"
                  >
                    View Campaign
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
            <Heart className="h-10 w-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">You haven&apos;t contributed to any projects yet</h4>
            <p className="text-xs text-slate-400">
              Discover community initiatives and make your first micro-contribution on Stellar.
            </p>
            <Link href="/campaigns">
              <Button variant="stellar" size="sm" className="mt-2">
                Explore Campaigns
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
