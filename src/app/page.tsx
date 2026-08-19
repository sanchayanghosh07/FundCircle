"use client";

import * as React from "react";
import Link from "next/link";
import {
  Coins,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  Compass,
  PlusCircle,
  BarChart3,
  CheckCircle2,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignCard } from "@/features/campaigns/CampaignCard";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";
import { Tape } from "@/components/ui/hand-drawn/Tape";
import { Thumbtack } from "@/components/ui/hand-drawn/Thumbtack";
import { HandDrawnArrow } from "@/components/ui/hand-drawn/HandDrawnArrow";
import { SquigglyLine } from "@/components/ui/hand-drawn/SquigglyLine";
import { stroopsToXlm } from "@/lib/utils";

export default function LandingPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    registryService.getAllCampaigns().then((data) => {
      setCampaigns(data);
      setLoading(false);
    });
  }, []);

  const featuredCampaigns = campaigns.filter((c) => c.status === "active").slice(0, 3);
  const totalRaisedStroops = campaigns.reduce(
    (acc, c) => acc + BigInt(c.totalRaised || "0"),
    0n
  );
  const totalRaisedXlm = stroopsToXlm(totalRaisedStroops.toString());
  const activeCount = campaigns.filter((c) => c.status === "active").length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-28 border-b-2 border-dashed border-pencil/30">
        <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center max-w-4xl">
          {/* Stamped Badge */}
          <div className="inline-flex items-center gap-2 wobbly-border-sm border-2 border-pencil bg-postit-yellow px-4 py-1 text-sm font-heading font-bold text-pencil shadow-hard-sm mb-6 -rotate-1">
            <span className="text-marker-red">✦</span>
            <span>Built natively on Stellar & Soroban Smart Contracts</span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-bold text-pencil leading-tight mb-6 tracking-tight">
            Empowering Communities Through{" "}
            <span className="relative inline-block text-marker-red underline decoration-wavy decoration-3 underline-offset-8">
              Transparent Micro-Funding
            </span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-xl sm:text-2xl text-pencil-light max-w-2xl mx-auto mb-10 leading-relaxed font-bold">
            FundCircle connects grassroots initiatives, student campaigns, and local creators with community micro-contributions — guaranteed by automated on-chain Soroban escrow.
          </p>

          {/* Action CTAs with Hand-Drawn Arrow */}
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="relative">
              <Link href="/create">
                <Button variant="stellar" size="lg" className="w-full sm:w-auto text-xl py-3.5 px-8 gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Start a Campaign
                </Button>
              </Link>
              {/* Hand Drawn Arrow pointing to CTA */}
              <div className="hidden md:block absolute -top-10 -right-20 pointer-events-none">
                <HandDrawnArrow />
              </div>
            </div>

            <Link href="/campaigns">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-xl py-3.5 px-8 gap-2">
                <Compass className="h-5 w-5" />
                Explore Campaigns
              </Button>
            </Link>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-16 pt-10 border-t-2 border-dashed border-pencil/30">
            <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-4 shadow-hard flex flex-col items-center">
              <span className="font-heading text-3xl sm:text-4xl font-bold text-pencil font-mono">
                {totalRaisedXlm} XLM
              </span>
              <span className="font-body text-base text-pencil-light mt-0.5 font-bold">Total XLM Raised</span>
            </div>
            <div className="relative wobbly-border-sm border-2 border-pencil bg-mint p-4 shadow-hard flex flex-col items-center">
              <span className="font-heading text-3xl sm:text-4xl font-bold text-pencil font-mono">
                {activeCount}
              </span>
              <span className="font-body text-base text-pencil-light mt-0.5 font-bold">Active Campaigns</span>
            </div>
            <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-4 shadow-hard flex flex-col items-center">
              <span className="font-heading text-3xl sm:text-4xl font-bold text-pencil font-mono">100%</span>
              <span className="font-body text-base text-pencil-light mt-0.5 font-bold">Escrow Custody</span>
            </div>
            <div className="relative wobbly-border-sm border-2 border-pencil bg-postit-yellow p-4 shadow-hard flex flex-col items-center">
              <span className="font-heading text-3xl sm:text-4xl font-bold text-pencil font-mono">&lt; 5s</span>
              <span className="font-body text-base text-pencil-light mt-0.5 font-bold">Stellar Finality</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stellar Architecture Highlights */}
      <section className="py-20 border-b-2 border-dashed border-pencil/30 bg-paper-muted/30">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1 wobbly-border-sm border-2 border-pencil bg-white px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-3">
              <span>Why Stellar & Soroban</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-pencil tracking-tight">
              Micro-funding designed for trust & efficiency
            </h2>
            <p className="font-body text-xl text-pencil-light mt-3 font-bold leading-relaxed">
              Traditional platforms charge 5-10% fees and hold funds in black-box bank accounts. FundCircle uses Soroban smart contracts for transparent on-chain custody.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative wobbly-border-md border-2 border-pencil bg-white p-7 space-y-3 shadow-hard hover:shadow-hard-lg hover:-rotate-1 transition-all">
              <Tape rotation={-2} />
              <div className="flex h-12 w-12 items-center justify-center wobbly-border-sm border-2 border-pencil bg-postit-yellow text-pencil shadow-hard-sm">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-pencil">Smart Contract Escrow</h3>
              <p className="font-body text-base text-pencil-light font-bold leading-snug">
                Contributions are locked in a dedicated Soroban Funding Escrow contract. The frontend has zero access to custody funds.
              </p>
            </div>

            <div className="relative wobbly-border-md border-2 border-pencil bg-white p-7 space-y-3 shadow-hard hover:shadow-hard-lg hover:rotate-1 transition-all">
              <Tape rotation={1.5} />
              <div className="flex h-12 w-12 items-center justify-center wobbly-border-sm border-2 border-pencil bg-mint text-pencil shadow-hard-sm">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-pencil">Micro-Pledges at Scale</h3>
              <p className="font-body text-base text-pencil-light font-bold leading-snug">
                With Stellar transaction fees under $0.0001, community members can contribute as little as 1 XLM without losing value to intermediaries.
              </p>
            </div>

            <div className="relative wobbly-border-md border-2 border-pencil bg-white p-7 space-y-3 shadow-hard hover:shadow-hard-lg hover:-rotate-1 transition-all">
              <Tape rotation={-1} />
              <div className="flex h-12 w-12 items-center justify-center wobbly-border-sm border-2 border-pencil bg-paper text-pencil shadow-hard-sm">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-pencil">100% Refund Guarantee</h3>
              <p className="font-body text-base text-pencil-light font-bold leading-snug">
                If a campaign does not reach its funding target before the deadline, contributors can claim their full refund directly on-chain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Campaigns Preview */}
      <section className="py-20 border-b-2 border-dashed border-pencil/30">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-1 wobbly-border-sm border-2 border-pencil bg-postit-yellow px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
                <span>Active Initiatives</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-pencil tracking-tight">
                Featured Community Campaigns
              </h2>
              <p className="font-body text-lg text-pencil-light font-bold mt-1">
                Discover verified grassroots campaigns seeking micro-contributions.
              </p>
            </div>

            <Link href="/campaigns">
              <Button variant="outline" size="sm" className="gap-1.5">
                View All Campaigns
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {featuredCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredCampaigns.map((campaign, idx) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  rotation={idx === 0 ? -1 : idx === 1 ? 1 : -1}
                />
              ))}
            </div>
          ) : (
            <div className="relative wobbly-border-md border-2 border-pencil bg-white p-10 shadow-hard text-center max-w-xl mx-auto space-y-4">
              <Tape rotation={-1} />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper border-2 border-pencil mx-auto shadow-hard-sm">
                <Compass className="h-7 w-7 text-pencil-light" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-pencil">No Active Campaigns Yet</h3>
              <p className="font-body text-base text-pencil-light font-bold">
                Be the first creator to launch an on-chain community initiative on Stellar!
              </p>
              <Link href="/create">
                <Button variant="stellar" size="default" className="gap-2 mt-2">
                  <PlusCircle className="h-4 w-4" />
                  Start the First Campaign
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it Works Stepper */}
      <section className="py-20 border-b-2 border-dashed border-pencil/30 bg-paper-muted/20">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-pencil tracking-tight">
              How FundCircle Works
            </h2>
            <p className="font-body text-xl text-pencil-light font-bold mt-2">
              Four simple steps powered by Stellar consensus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-6 space-y-2 shadow-hard">
              <Thumbtack color="red" />
              <div className="font-heading text-xl font-bold text-marker-red">Step 1</div>
              <h4 className="font-heading text-xl font-bold text-pencil">Launch Campaign</h4>
              <p className="font-body text-base text-pencil-light font-bold leading-snug">
                Connect your Stellar wallet, set your funding goal in XLM, choose a deadline, and create on-chain.
              </p>
            </div>

            <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-6 space-y-2 shadow-hard">
              <Thumbtack color="blue" />
              <div className="font-heading text-xl font-bold text-pen-blue">Step 2</div>
              <h4 className="font-heading text-xl font-bold text-pencil">Community Pledges</h4>
              <p className="font-body text-base text-pencil-light font-bold leading-snug">
                Supporters contribute XLM. Each pledge emits verifiable Soroban contract events.
              </p>
            </div>

            <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-6 space-y-2 shadow-hard">
              <Thumbtack color="yellow" />
              <div className="font-heading text-xl font-bold text-[#f59e0b]">Step 3</div>
              <h4 className="font-heading text-xl font-bold text-pencil">Escrow Custody</h4>
              <p className="font-body text-base text-pencil-light font-bold leading-snug">
                Funds remain locked in the Funding Escrow contract until the target is met or deadline expires.
              </p>
            </div>

            <div className="relative wobbly-border-sm border-2 border-pencil bg-white p-6 space-y-2 shadow-hard">
              <Thumbtack color="red" />
              <div className="font-heading text-xl font-bold text-emerald-600">Step 4</div>
              <h4 className="font-heading text-xl font-bold text-pencil">Release or Refund</h4>
              <p className="font-body text-base text-pencil-light font-bold leading-snug">
                On goal success, creator disburses funds. On unmet target, contributors claim 100% refunds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action Sticky Note */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <div className="relative wobbly-border-md border-2 border-pencil bg-postit-yellow p-8 sm:p-12 shadow-hard-lg space-y-6">
            <Tape rotation={-2} />

            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-pencil tracking-tight">
              Ready to launch your community campaign?
            </h2>
            <p className="font-body text-xl text-pencil-light font-bold max-w-xl mx-auto leading-relaxed">
              Create a campaign in under 2 minutes. Transparent, non-custodial, and protected by Soroban smart contracts.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/create">
                <Button variant="stellar" size="lg" className="w-full sm:w-auto text-xl py-3 px-8 gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Launch Your Campaign
                </Button>
              </Link>
              <Link href="/campaigns">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-xl py-3 px-8 bg-white">
                  Explore Campaigns
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
