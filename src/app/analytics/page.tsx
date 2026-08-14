"use client";

import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  Coins,
  Users,
  PieChart,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";
import { stroopsToXlm } from "@/lib/utils";

export default function PlatformAnalyticsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);

  React.useEffect(() => {
    registryService.getAllCampaigns().then((data) => setCampaigns(data));
  }, []);

  const totalRaisedStroops = campaigns.reduce(
    (acc, c) => acc + BigInt(c.totalRaised || "0"),
    0n
  );
  const totalRaisedXlm = stroopsToXlm(totalRaisedStroops.toString());
  const totalBackers = campaigns.reduce((acc, c) => acc + c.contributorCount, 0);
  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const fundedCount = campaigns.filter((c) => c.status === "funded" || c.status === "completed").length;

  const categoryCounts: Record<string, number> = {};
  campaigns.forEach((c) => {
    categoryCounts[c.metadata.category] = (categoryCounts[c.metadata.category] || 0) + 1;
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
      <div className="pb-6 border-b border-slate-800/80 mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 px-3 py-0.5 text-xs font-semibold text-teal-300 mb-2">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>On-Chain Metrics</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          FundCircle Protocol Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Level 4 verified aggregate protocol metrics calculated directly from Stellar ledger state.
        </p>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Total Volume Raised</span>
          <p className="text-3xl font-black text-white font-mono">{totalRaisedXlm} XLM</p>
          <span className="text-[11px] text-teal-400 font-semibold">100% on-chain custody</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Total Contributions</span>
          <p className="text-3xl font-black text-teal-400 font-mono">{totalBackers}</p>
          <span className="text-[11px] text-slate-400">Micro-funding pledges</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Active Campaigns</span>
          <p className="text-3xl font-black text-white font-mono">{activeCount}</p>
          <span className="text-[11px] text-slate-400">Receiving contributions</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Success Rate</span>
          <p className="text-3xl font-black text-emerald-400 font-mono">
            {campaigns.length > 0
              ? Math.round((fundedCount / campaigns.length) * 100)
              : 0}
            %
          </p>
          <span className="text-[11px] text-slate-400">Funded / Completed goals</span>
        </div>
      </div>

      {/* Category Breakdown & State Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <PieChart className="h-5 w-5 text-teal-400" />
            Category Distribution
          </h3>

          <div className="space-y-4">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = Math.round((count / campaigns.length) * 100);
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat}</span>
                    <span className="text-teal-400 font-mono">{count} projects ({pct}%)</span>
                  </div>
                  <Progress value={pct} max={100} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Protocol Performance Highlights
          </h3>

          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Average Contribution Size</span>
              <span className="text-white font-bold font-mono">
                {totalBackers > 0
                  ? Math.round(Number(totalRaisedXlm.replace(/,/g, "")) / totalBackers)
                  : 0}{" "}
                XLM
              </span>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Soroban Contract State Calls</span>
              <span className="text-emerald-400 font-bold font-mono">Real Inter-Contract</span>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Network Consensus Latency</span>
              <span className="text-white font-bold font-mono">&lt; 5.0 Seconds</span>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Smart Contract Storage Mode</span>
              <span className="text-teal-400 font-bold font-mono">Persistent (with TTL bumps)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
