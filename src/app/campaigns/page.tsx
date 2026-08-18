"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, AlertCircle, Sparkles } from "lucide-react";
import { CampaignCard } from "@/features/campaigns/CampaignCard";
import { CampaignFilters } from "@/features/campaigns/CampaignFilters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";

export default function CampaignsDiscoveryPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("All");
  const [status, setStatus] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"newest" | "funded" | "goal">("newest");
  const [loading, setLoading] = React.useState(true);

  const fetchCampaigns = React.useCallback(async () => {
    try {
      const data = await registryService.getAllCampaigns();
      setCampaigns(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filter and Sort logic
  const filteredCampaigns = React.useMemo(() => {
    return campaigns
      .filter((c) => {
        const matchesSearch =
          search === "" ||
          c.metadata.title.toLowerCase().includes(search.toLowerCase()) ||
          c.metadata.description.toLowerCase().includes(search.toLowerCase());

        const matchesCategory =
          category === "All" ||
          c.metadata.category.toLowerCase() === category.toLowerCase();

        const matchesStatus =
          status === "all" || c.status.toLowerCase() === status.toLowerCase();

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "funded") {
          return b.progressPercentage - a.progressPercentage;
        }
        if (sortBy === "goal") {
          return Number(b.targetAmount) - Number(a.targetAmount);
        }
        return b.createdAt - a.createdAt;
      });
  }, [campaigns, search, category, status, sortBy]);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b-2 border-dashed border-pencil/30 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
            <span>Explore Community Initiatives</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
            Discover Active Campaigns
          </h1>
          <p className="font-body text-lg text-pencil-light mt-1">
            Contribute to community campaigns directly on Stellar with non-custodial Soroban escrow custody.
          </p>
        </div>

        <Link href="/create">
          <Button variant="stellar" size="default" className="gap-2">
            <PlusCircle className="h-5 w-5" />
            Start a Campaign
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <CampaignFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        status={status}
        setStatus={setStatus}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6 font-body font-bold text-base text-pencil-light">
        <span>
          Showing <span className="text-pencil font-bold text-lg">{filteredCampaigns.length}</span>{" "}
          campaigns
        </span>

        <div className="flex items-center gap-2 font-body text-base">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="wobbly-border-sm border-2 border-pencil bg-white px-2.5 py-1 text-sm font-body font-bold text-pencil shadow-hard-sm cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="funded">Most Funded (%)</option>
            <option value="goal">Goal Amount</option>
          </select>
        </div>
      </div>

      {/* Campaign Grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCampaigns.map((campaign, idx) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              rotation={idx % 3 === 0 ? -1 : idx % 3 === 1 ? 1 : 0}
            />
          ))}
        </div>
      ) : (
        <div className="wobbly-border-md border-2 border-pencil bg-white p-12 text-center space-y-4 max-w-lg mx-auto my-12 shadow-hard">
          <AlertCircle className="h-10 w-10 text-marker-red mx-auto" />
          <h3 className="font-heading text-2xl font-bold text-pencil">No Campaigns Found</h3>
          <p className="font-body text-lg text-pencil-light leading-relaxed">
            No campaigns matched your search criteria. Try adjusting your filters or search terms.
          </p>
          <Button
            onClick={() => {
              setSearch("");
              setCategory("All");
              setStatus("all");
            }}
            variant="outline"
            size="sm"
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
