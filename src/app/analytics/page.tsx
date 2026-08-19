"use client";

import * as React from "react";
import {
  TrendingUp,
  PieChart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";
import { Thumbtack } from "@/components/ui/hand-drawn/Thumbtack";
import { Tape } from "@/components/ui/hand-drawn/Tape";
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
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      <div className="pb-6 border-b-2 border-dashed border-pencil/30 mb-8">
        <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
          <span>Protocol Analytics</span>
        </div>
        <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
          FundCircle Protocol Analytics
        </h1>
        <p className="font-body text-lg text-pencil-light mt-1">
          Verified aggregate protocol metrics calculated directly from Stellar ledger state.
        </p>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="relative wobbly-border-sm border-2 border-pencil bg-postit-yellow p-5 shadow-hard space-y-1">
          <Thumbtack color="red" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Total Raised</span>
          <p className="font-heading text-3xl font-bold text-pencil font-mono">{totalRaisedXlm} XLM</p>
          <span className="font-body text-xs font-bold text-pencil-light">100% Escrow custody</span>
        </div>

        <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-5 shadow-hard space-y-1">
          <Thumbtack color="blue" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Contributions</span>
          <p className="font-heading text-3xl font-bold text-marker-red font-mono">{totalBackers}</p>
          <span className="font-body text-xs font-bold text-pencil-light">Micro-pledges</span>
        </div>

        <div className="relative wobbly-border-sm border-2 border-pencil bg-paper p-5 shadow-hard space-y-1">
          <Thumbtack color="yellow" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Active Initiatives</span>
          <p className="font-heading text-3xl font-bold text-pencil font-mono">{activeCount}</p>
          <span className="font-body text-xs font-bold text-pencil-light">Open for funding</span>
        </div>

        <div className="relative wobbly-border-sm border-2 border-pencil bg-mint p-5 shadow-hard space-y-1">
          <Thumbtack color="red" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Success Rate</span>
          <p className="font-heading text-3xl font-bold text-pencil font-mono">
            {campaigns.length > 0
              ? Math.round((fundedCount / campaigns.length) * 100)
              : 0}
            %
          </p>
          <span className="font-body text-xs font-bold text-pencil-light">Goal Met Ratio</span>
        </div>
      </div>

      {/* Category Breakdown & State Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative wobbly-border-md border-2 border-pencil bg-white p-6 sm:p-7 shadow-hard space-y-5">
          <Tape rotation={-1.5} />

          <h3 className="font-heading text-2xl font-bold text-pencil flex items-center gap-2">
            <PieChart className="h-6 w-6 text-pen-blue" />
            Category Distribution
          </h3>

          <div className="space-y-4">
            {Object.keys(categoryCounts).length > 0 ? (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / campaigns.length) * 100);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between font-body font-bold text-base">
                      <span className="text-pencil">{cat}</span>
                      <span className="text-marker-red font-mono">{count} campaigns ({pct}%)</span>
                    </div>
                    <Progress value={pct} max={100} />
                  </div>
                );
              })
            ) : (
              <p className="font-body text-base text-pencil-light font-bold text-center py-6">
                No campaign data recorded yet.
              </p>
            )}
          </div>
        </div>

        <div className="relative wobbly-border-md border-2 border-pencil bg-white p-6 sm:p-7 shadow-hard space-y-5">
          <Tape rotation={2} />

          <h3 className="font-heading text-2xl font-bold text-pencil flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            Protocol Performance
          </h3>

          <div className="space-y-3 font-body text-base">
            <div className="wobbly-border-sm bg-paper p-3.5 border-2 border-pencil flex items-center justify-between shadow-hard-sm">
              <span className="text-pencil-light font-bold">Avg. Contribution Size</span>
              <span className="font-heading font-bold text-pencil text-lg font-mono">
                {totalBackers > 0
                  ? Math.round(Number(totalRaisedXlm.replace(/,/g, "")) / totalBackers)
                  : 0}{" "}
                XLM
              </span>
            </div>

            <div className="wobbly-border-sm bg-paper p-3.5 border-2 border-pencil flex items-center justify-between shadow-hard-sm">
              <span className="text-pencil-light font-bold">Soroban State Calls</span>
              <span className="font-heading font-bold text-pen-blue text-base">Live Inter-Contract</span>
            </div>

            <div className="wobbly-border-sm bg-paper p-3.5 border-2 border-pencil flex items-center justify-between shadow-hard-sm">
              <span className="text-pencil-light font-bold">Consensus Latency</span>
              <span className="font-heading font-bold text-pencil text-base">&lt; 5.0 Seconds</span>
            </div>

            <div className="wobbly-border-sm bg-paper p-3.5 border-2 border-pencil flex items-center justify-between shadow-hard-sm">
              <span className="text-pencil-light font-bold">Smart Contract Storage</span>
              <span className="font-heading font-bold text-pencil text-base">Persistent + TTL Bumps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
