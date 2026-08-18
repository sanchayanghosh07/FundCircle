import * as React from "react";
import Link from "next/link";
import { Clock, ArrowUpRight, Sparkles } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tape } from "@/components/ui/hand-drawn/Tape";
import { getCountdown } from "@/lib/utils";

export function CampaignCard({ campaign, rotation = 0 }: { campaign: Campaign; rotation?: number }) {
  const countdown = getCountdown(campaign.deadline);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="active">ACTIVE</Badge>;
      case "review":
        return <Badge variant="review">SUSPENDED</Badge>;
      case "funded":
        return <Badge variant="funded">GOAL MET</Badge>;
      case "completed":
        return <Badge variant="completed">COMPLETED</Badge>;
      case "cancelled":
        return <Badge variant="destructive">CANCELLED</Badge>;
      case "refund":
        return <Badge variant="warning">REFUND OPEN</Badge>;
      default:
        return <Badge variant="draft">DRAFT</Badge>;
    }
  };

  return (
    <div
      style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
      className="group relative flex flex-col justify-between wobbly-border-md border-2 border-pencil bg-white p-4 shadow-hard hover:shadow-hard-lg hover:rotate-1 transition-all duration-150"
    >
      <Tape rotation={-1.5} />

      <div>
        {/* Polaroid Snapshot Area */}
        <div className="relative h-48 w-full overflow-hidden wobbly-border-sm border-2 border-pencil bg-paper-muted mb-4">
          <img
            src={campaign.metadata.imageUrl || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80"}
            alt={campaign.metadata.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          <div className="absolute top-2.5 left-2.5">
            <span className="wobbly-border-sm border-2 border-pencil bg-white/90 px-2 py-0.5 font-heading text-xs font-bold text-pencil shadow-hard-sm">
              {campaign.metadata.category}
            </span>
          </div>

          <div className="absolute top-2.5 right-2.5">
            {getStatusBadge(campaign.status)}
          </div>
        </div>

        {/* Narrative & Details */}
        <div className="space-y-3 px-1">
          <Link href={`/campaigns/${campaign.id}`} className="block">
            <h3 className="line-clamp-1 font-heading text-xl font-bold text-pencil hover:text-marker-red transition-colors break-words [overflow-wrap:anywhere]">
              {campaign.metadata.title}
            </h3>
          </Link>
          <p className="line-clamp-2 font-body text-base text-pencil-light leading-snug break-words [overflow-wrap:anywhere]">
            {campaign.metadata.description}
          </p>

          {/* Progress Bar & Amounts */}
          <div className="space-y-2 pt-1">
            <Progress value={campaign.progressPercentage} max={100} />

            <div className="flex items-baseline justify-between font-heading text-sm">
              <div>
                <span className="text-xl font-bold text-marker-red font-mono">{campaign.totalRaisedXlm}</span>
                <span className="text-pencil font-bold ml-1 text-xs">XLM</span>
              </div>
              <div className="text-right text-xs text-pencil-muted font-bold">
                Goal: <span className="text-pencil font-mono">{campaign.targetAmountXlm} XLM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Details & Action */}
      <div className="border-t-2 border-dashed border-pencil/30 mt-4 pt-3 px-1 flex items-center justify-between font-body text-base">
        <div className="flex items-center gap-1.5 text-pencil font-bold text-sm">
          <Clock className="h-4 w-4 text-pen-blue" />
          <span>{countdown.formatted}</span>
        </div>

        <Link href={`/campaigns/${campaign.id}`}>
          <Button variant="default" size="sm" className="text-sm py-0.5 px-3 h-8">
            View Campaign
            <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
