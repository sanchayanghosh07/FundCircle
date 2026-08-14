import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Users, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { shortenAddress, getCountdown } from "@/lib/utils";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const countdown = getCountdown(campaign.deadline);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="active">Active</Badge>;
      case "review":
        return <Badge variant="review">In Review</Badge>;
      case "funded":
        return <Badge variant="success">Goal Reached</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "refund":
        return <Badge variant="warning">Refund Open</Badge>;
      default:
        return <Badge variant="draft">Draft</Badge>;
    }
  };

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm transition-all duration-300 hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-950/20 hover:-translate-y-1">
      <div>
        {/* Cover Image & Category */}
        <div className="relative h-48 w-full overflow-hidden bg-slate-950">
          <img
            src={campaign.metadata.imageUrl || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80"}
            alt={campaign.metadata.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
          
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="rounded-full bg-slate-950/80 px-2.5 py-0.5 text-xs font-semibold text-teal-300 backdrop-blur-md border border-teal-500/30">
              {campaign.metadata.category}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            {getStatusBadge(campaign.status)}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3.5">
          <div className="space-y-1.5">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="group-hover:text-teal-300 transition-colors block"
            >
              <h3 className="line-clamp-1 text-base font-bold text-white tracking-tight">
                {campaign.metadata.title}
              </h3>
            </Link>
            <p className="line-clamp-2 text-xs text-slate-400 leading-relaxed">
              {campaign.metadata.description}
            </p>
          </div>

          {/* Progress Bar & Amounts */}
          <div className="space-y-2 pt-1">
            <Progress value={campaign.progressPercentage} max={100} />

            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500 font-medium">Raised</span>
                <span className="font-bold text-white font-mono">
                  {campaign.totalRaisedXlm} <span className="text-teal-400 font-normal">XLM</span>
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-slate-500 font-medium">Goal</span>
                <span className="font-bold text-slate-300 font-mono">
                  {campaign.targetAmountXlm} <span className="text-slate-500 font-normal">XLM</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="border-t border-slate-800/80 p-4 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <Clock className="h-3.5 w-3.5 text-teal-400" />
          <span>{countdown.formatted}</span>
        </div>

        <Link
          href={`/campaigns/${campaign.id}`}
          className="inline-flex items-center gap-1 text-teal-400 font-semibold hover:text-teal-300 transition-colors group-hover:translate-x-0.5"
        >
          View Details
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
