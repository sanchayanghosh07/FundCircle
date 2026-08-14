"use client";

import * as React from "react";
import Link from "next/link";
import { Compass, PlusCircle, Sparkles, Filter, AlertCircle } from "lucide-react";
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
    <div className="container mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-slate-800/80 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 px-3 py-0.5 text-xs font-semibold text-teal-300 mb-2">
            <Compass className="h-3.5 w-3.5" />
            <span>Discover Initiatives</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Explore Community Campaigns
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Support verified local projects with transparent on-chain Soroban escrow funding.
          </p>
        </div>

        <Link href="/create">
          <Button variant="stellar" size="sm" className="font-semibold gap-1.5">
            <PlusCircle className="h-4 w-4" />
            Start Campaign
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
      <div className="flex items-center justify-between mb-6 text-xs text-slate-400">
        <span>
          Showing <span className="text-white font-semibold">{filteredCampaigns.length}</span>{" "}
          campaigns
        </span>

        <div className="flex items-center gap-2">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="newest">Newest First</option>
            <option value="funded">Most Funded (%)</option>
            <option value="goal">Goal Amount</option>
          </select>
        </div>
      </div>

      {/* Campaign Grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto my-12">
          <AlertCircle className="h-10 w-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No campaigns found</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            No projects matched your search criteria. Try adjusting your filters or search terms.
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
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
