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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignCard } from "@/features/campaigns/CampaignCard";
import { registryService } from "@/services/stellar/registryService";
import { Campaign } from "@/types/campaign";

export default function LandingPage() {
  const [featuredCampaigns, setFeaturedCampaigns] = React.useState<Campaign[]>([]);

  React.useEffect(() => {
    registryService.getAllCampaigns().then((campaigns) => {
      setFeaturedCampaigns(campaigns.slice(0, 3));
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28 border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[300px] h-[200px] bg-emerald-500/10 blur-[90px] pointer-events-none rounded-full" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/60 px-4 py-1.5 text-xs font-semibold text-teal-300 shadow-md backdrop-blur-md mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            <span>Built natively on Stellar & Soroban Smart Contracts</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Empowering Communities Through{" "}
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Transparent Micro-Funding
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            FundCircle connects grassroots community initiatives, student projects, and local creators with micro-contributions — guaranteed by automated on-chain Soroban escrow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/campaigns">
              <Button variant="stellar" size="lg" className="w-full sm:w-auto font-bold gap-2 shadow-lg shadow-teal-500/25">
                <Compass className="h-5 w-5" />
                Explore Campaigns
              </Button>
            </Link>

            <Link href="/create">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-semibold gap-2 border-slate-700 hover:bg-slate-800">
                <PlusCircle className="h-5 w-5 text-teal-400" />
                Start a Project
              </Button>
            </Link>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-10 border-t border-slate-800/80">
            <div className="flex flex-col items-center p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">17,100+</span>
              <span className="text-xs text-slate-400 mt-1 font-medium">XLM Raised</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono">100%</span>
              <span className="text-xs text-slate-400 mt-1 font-medium">On-Chain Custody</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">&lt; 5s</span>
              <span className="text-xs text-slate-400 mt-1 font-medium">Stellar Finality</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono">0.00001</span>
              <span className="text-xs text-slate-400 mt-1 font-medium">Avg Fee (XLM)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stellar Architecture Highlights */}
      <section className="py-20 bg-slate-950 border-b border-slate-800/60">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="active" className="mb-3">
              Why Stellar & Soroban
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Micro-funding designed for trust & efficiency
            </h2>
            <p className="text-sm text-slate-400 mt-3">
              Traditional crowdfunding takes 5-10% fees and holds funds in centralized bank accounts. FundCircle uses Soroban smart contracts for verifiable community fund escrow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 space-y-4 hover:border-teal-500/30 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Smart Contract Escrow</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Contributions are locked in a dedicated Soroban Funding Escrow contract. The frontend has zero access to custody funds.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 space-y-4 hover:border-teal-500/30 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Micro-Transactions at Scale</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                With Stellar transaction fees under $0.0001, community members can contribute as little as 1 XLM without losing value to middlemen.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 space-y-4 hover:border-teal-500/30 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">100% Refund Guarantee</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                If a campaign does not reach its funding goal before the deadline, contributors can claim their full refund directly from the smart contract.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects Preview */}
      <section className="py-20 bg-slate-900/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-4">
            <div>
              <Badge variant="active" className="mb-2">
                Active Initiatives
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Featured Community Campaigns
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Discover verified grassroots projects seeking micro-contributions.
              </p>
            </div>

            <Link href="/campaigns">
              <Button variant="ghost" size="sm" className="text-teal-400 hover:text-teal-300 gap-1.5">
                View all campaigns
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Stepper */}
      <section className="py-20 bg-slate-950 border-t border-slate-800/60">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How FundCircle Works
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              Four automated steps powered by Stellar consensus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
              <div className="h-8 w-8 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm border border-teal-500/40">
                1
              </div>
              <h4 className="font-bold text-white text-sm">Launch Campaign</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Stellar wallet, set your funding goal in XLM, choose a deadline, and submit for on-chain review.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
              <div className="h-8 w-8 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm border border-teal-500/40">
                2
              </div>
              <h4 className="font-bold text-white text-sm">Community Pledges</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Supporters contribute XLM via Stellar Wallets Kit. Each pledge emits verifiable Soroban contract events.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
              <div className="h-8 w-8 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm border border-teal-500/40">
                3
              </div>
              <h4 className="font-bold text-white text-sm">Escrow Custody</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Funds remain locked in the Funding Escrow contract until the target is met or the deadline expires.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
              <div className="h-8 w-8 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm border border-teal-500/40">
                4
              </div>
              <h4 className="font-bold text-white text-sm">Release or Refund</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                On goal success, creator disburses funds. On unmet target, contributors claim 100% refunds instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="py-20 bg-gradient-to-b from-slate-950 to-slate-900 border-t border-slate-800/80">
        <div className="container mx-auto px-4 sm:px-6 text-center max-w-2xl">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
            Ready to empower your community initiative?
          </h2>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            Create a campaign in under 2 minutes. Transparent, non-custodial, and protected by Soroban smart contracts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/create">
              <Button variant="stellar" size="lg" className="w-full sm:w-auto font-bold gap-2">
                <PlusCircle className="h-5 w-5" />
                Launch Your Campaign
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-700">
                Explore Projects
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
