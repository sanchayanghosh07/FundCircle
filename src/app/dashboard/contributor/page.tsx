"use client";

import * as React from "react";
import Link from "next/link";
import {
  Heart,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/walletStore";
import { escrowService } from "@/services/stellar/escrowService";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";
import { Thumbtack } from "@/components/ui/hand-drawn/Thumbtack";

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
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-dashed border-pencil/30 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
            <span>Contributor Portal</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
            My Supported Campaigns
          </h1>
          <p className="font-body text-lg text-pencil-light mt-1">
            Track your backed initiatives and claim escrow refunds for cancelled or unmet campaigns.
          </p>
        </div>

        <Link href="/campaigns">
          <Button variant="stellar" size="sm">
            Explore Campaigns
          </Button>
        </Link>
      </div>

      {/* Stats Post-Its */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="relative wobbly-border-sm border-2 border-pencil bg-postit-yellow p-5 shadow-hard space-y-1">
          <Thumbtack color="red" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Total Pledged</span>
          <p className="font-heading text-3xl font-bold text-marker-red font-mono">{totalPledged} XLM</p>
          <span className="font-body text-xs font-bold text-pencil-light">In Escrow custody</span>
        </div>

        <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-5 shadow-hard space-y-1">
          <Thumbtack color="blue" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Campaigns Backed</span>
          <p className="font-heading text-3xl font-bold text-pencil font-mono">{supportedCampaigns.length}</p>
          <span className="font-body text-xs font-bold text-pencil-light">Active initiatives</span>
        </div>

        <div className="relative wobbly-border-sm border-2 border-pencil bg-mint p-5 shadow-hard space-y-1">
          <Thumbtack color="yellow" />
          <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Refund Protection</span>
          <p className="font-heading text-3xl font-bold text-pencil font-mono">100%</p>
          <span className="font-body text-xs font-bold text-pencil-light">Guaranteed on-chain</span>
        </div>
      </div>

      {/* Backed Campaigns List */}
      <div className="space-y-4">
        <h3 className="font-heading text-2xl font-bold text-pencil tracking-tight">Backed Campaigns</h3>

        {supportedCampaigns.length > 0 ? (
          <div className="space-y-3">
            {supportedCampaigns.map(({ campaign, amountXlm }) => (
              <div
                key={campaign.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 wobbly-border-md border-2 border-pencil bg-white p-5 shadow-hard hover:shadow-hard-lg transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xl font-bold text-pencil">{campaign.metadata.title}</span>
                    <Badge variant={campaign.status === "active" ? "active" : "secondary"}>
                      {campaign.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="font-body text-base text-pencil-light font-bold">
                    Category: <span className="text-pencil">{campaign.metadata.category}</span>
                  </p>
                </div>

                <div className="flex items-center gap-6 sm:self-center self-end">
                  <div className="flex flex-col items-end">
                    <span className="font-body text-xs font-bold text-pencil-light">Your Contribution</span>
                    <span className="font-heading font-bold text-marker-red text-xl font-mono">
                      {amountXlm} XLM
                    </span>
                  </div>

                  <Link href={`/campaigns/${campaign.id}`}>
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
            <Heart className="h-10 w-10 text-pencil-muted mx-auto" />
            <h4 className="font-heading text-2xl font-bold text-pencil">No Contributions Yet</h4>
            <p className="font-body text-lg text-pencil-light">
              Discover community initiatives and make your first micro-contribution on Stellar.
            </p>
            <Link href="/campaigns">
              <Button variant="stellar" size="default" className="mt-2">
                Explore Campaigns
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
