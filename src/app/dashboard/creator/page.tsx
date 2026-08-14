"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  PlusCircle,
  Coins,
  Users,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWalletStore } from "@/stores/walletStore";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";
import { walletKit } from "@/services/wallet/stellarWalletKit";
import { stroopsToXlm } from "@/lib/utils";

export default function CreatorDashboardPage() {
  const { isConnected, address, setWallet } = useWalletStore();
  const [myCampaigns, setMyCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    registryService.getAllCampaigns().then((all) => {
      if (address) {
        setMyCampaigns(all.filter((c) => c.creator.toLowerCase() === address.toLowerCase()));
      } else {
        setMyCampaigns(all.slice(0, 2)); // demo preview
      }
      setLoading(false);
    });
  }, [address]);

  // Aggregate metrics
  const totalRaisedStroops = myCampaigns.reduce(
    (acc, c) => acc + BigInt(c.totalRaised || "0"),
    0n
  );
  const totalRaisedXlm = stroopsToXlm(totalRaisedStroops.toString());
  const activeCount = myCampaigns.filter((c) => c.status === "active").length;
  const totalBackers = myCampaigns.reduce((acc, c) => acc + c.contributorCount, 0);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 px-3 py-0.5 text-xs font-semibold text-teal-300 mb-2">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Creator Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Creator Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your created campaigns, track funding progress, and request escrow disbursements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/contributor">
            <Button variant="outline" size="sm" className="text-xs border-slate-800">
              Contributor View
            </Button>
          </Link>
          <Link href="/create">
            <Button variant="stellar" size="sm" className="font-semibold gap-1.5">
              <PlusCircle className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Total Raised</span>
          <p className="text-2xl font-extrabold text-white font-mono">{totalRaisedXlm} XLM</p>
          <span className="text-[11px] text-teal-400 font-semibold">Across all campaigns</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Active Campaigns</span>
          <p className="text-2xl font-extrabold text-teal-400 font-mono">{activeCount}</p>
          <span className="text-[11px] text-slate-400">Open for pledges</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Total Backers</span>
          <p className="text-2xl font-extrabold text-white font-mono">{totalBackers}</p>
          <span className="text-[11px] text-slate-400">Unique pledges</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Total Projects</span>
          <p className="text-2xl font-extrabold text-white font-mono">{myCampaigns.length}</p>
          <span className="text-[11px] text-emerald-400">Registered on Soroban</span>
        </div>
      </div>

      {/* Campaigns Table / Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight">Your Campaigns</h3>

        {myCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 backdrop-blur-sm hover:border-teal-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-teal-400 font-semibold">{camp.metadata.category}</span>
                    <h4 className="text-base font-bold text-white line-clamp-1">
                      {camp.metadata.title}
                    </h4>
                  </div>
                  <Badge variant={camp.status === "active" ? "active" : "secondary"}>
                    {camp.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">
                      Raised: <span className="text-white font-mono font-bold">{camp.totalRaisedXlm} XLM</span>
                    </span>
                    <span className="text-teal-400 font-mono font-bold">{camp.progressPercentage}%</span>
                  </div>
                  <Progress value={camp.progressPercentage} max={100} />
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Goal: <span className="font-mono text-slate-200">{camp.targetAmountXlm} XLM</span>
                  </span>

                  <Link
                    href={`/campaigns/${camp.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-teal-400 hover:text-teal-300"
                  >
                    View Project
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
            <Coins className="h-10 w-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">No campaigns found for this wallet</h4>
            <p className="text-xs text-slate-400">
              Start your first community initiative and begin raising micro-contributions.
            </p>
            <Link href="/create">
              <Button variant="stellar" size="sm" className="mt-2">
                Create Campaign
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
