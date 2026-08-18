"use client";

import * as React from "react";
import Link from "next/link";
import {
  PlusCircle,
  Coins,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWalletStore } from "@/stores/walletStore";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";
import { Tape } from "@/components/ui/hand-drawn/Tape";
import { Thumbtack } from "@/components/ui/hand-drawn/Thumbtack";
import { stroopsToXlm } from "@/lib/utils";

export default function CreatorDashboardPage() {
  const { isConnected, address } = useWalletStore();
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
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-dashed border-pencil/30 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
            <span>Creator Portal</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
            Creator Dashboard
          </h1>
          <p className="font-body text-lg text-pencil-light mt-1">
            Manage your created campaigns, track funding progress, and request escrow disbursements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/contributor">
            <Button variant="outline" size="sm">
              Contributor View
            </Button>
          </Link>
          <Link href="/create">
            <Button variant="stellar" size="sm" className="gap-1.5">
              <PlusCircle className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Post-It Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="relative wobbly-border-sm border-2 border-pencil bg-postit-yellow p-5 shadow-hard space-y-1">
          <Thumbtack color="red" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Total Raised</span>
          <p className="font-heading text-3xl font-bold text-pencil font-mono">{totalRaisedXlm} XLM</p>
          <span className="font-body text-xs font-bold text-pencil-light">Across all campaigns</span>
        </div>

        <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-5 shadow-hard space-y-1">
          <Thumbtack color="blue" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Active Campaigns</span>
          <p className="font-heading text-3xl font-bold text-marker-red font-mono">{activeCount}</p>
          <span className="font-body text-xs font-bold text-pencil-light">Open for pledges</span>
        </div>

        <div className="relative wobbly-border-sm border-2 border-pencil bg-paper p-5 shadow-hard space-y-1">
          <Thumbtack color="yellow" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Total Backers</span>
          <p className="font-heading text-3xl font-bold text-pencil font-mono">{totalBackers}</p>
          <span className="font-body text-xs font-bold text-pencil-light">Unique pledges</span>
        </div>

        <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-5 shadow-hard space-y-1">
          <Thumbtack color="red" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Total Campaigns</span>
          <p className="font-heading text-3xl font-bold text-pencil font-mono">{myCampaigns.length}</p>
          <span className="font-body text-xs font-bold text-pencil-light">On Soroban</span>
        </div>
      </div>

      {/* Campaigns Table / Cards */}
      <div className="space-y-4">
        <h3 className="font-heading text-2xl font-bold text-pencil tracking-tight">Your Campaigns</h3>

        {myCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="relative wobbly-border-md border-2 border-pencil bg-white p-6 space-y-4 shadow-hard hover:shadow-hard-lg transition-all"
              >
                <Tape rotation={-1} />

                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="font-heading text-xs font-bold text-pen-blue">{camp.metadata.category}</span>
                    <h4 className="font-heading text-xl font-bold text-pencil line-clamp-1 break-words [overflow-wrap:anywhere]">
                      {camp.metadata.title}
                    </h4>
                  </div>
                  <Badge variant={camp.status === "active" ? "active" : "secondary"}>
                    {camp.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-heading text-sm">
                    <span className="text-pencil-light">
                      Raised: <span className="text-marker-red font-bold font-mono">{camp.totalRaisedXlm} XLM</span>
                    </span>
                    <span className="text-pencil font-bold font-mono">{camp.progressPercentage}%</span>
                  </div>
                  <Progress value={camp.progressPercentage} max={100} />
                </div>

                <div className="pt-3 border-t-2 border-dashed border-pencil/30 flex items-center justify-between font-body font-bold text-base">
                  <span className="text-pencil-light">
                    Goal: <span className="font-heading font-bold text-pencil">{camp.targetAmountXlm} XLM</span>
                  </span>

                  <Link href={`/campaigns/${camp.id}`}>
                    <Button variant="default" size="sm">
                      View Campaign
                      <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="wobbly-border-md border-2 border-pencil bg-white p-12 text-center space-y-3 shadow-hard">
            <Coins className="h-10 w-10 text-pencil-muted mx-auto" />
            <h4 className="font-heading text-2xl font-bold text-pencil">No Campaigns Created Yet</h4>
            <p className="font-body text-lg text-pencil-light">
              Start your first community initiative and begin raising micro-contributions.
            </p>
            <Link href="/create">
              <Button variant="stellar" size="default" className="mt-2">
                Create Campaign
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
