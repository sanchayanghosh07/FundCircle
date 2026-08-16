import * as React from "react";
import Link from "next/link";
import { Coins, Heart, ExternalLink, ShieldCheck } from "lucide-react";
import { CONTRACT_CONFIG, ACTIVE_NETWORK, getExplorerContractUrl } from "@/config/stellar";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 text-slate-400 py-12 mt-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-bold">
                <Coins className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">FundCircle</span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-400">
              Community micro-funding platform on Stellar. Transparent on-chain fund custody powered by Soroban smart contracts.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/campaigns" className="hover:text-teal-400 transition-colors">Explore Campaigns</Link></li>
              <li><Link href="/create" className="hover:text-teal-400 transition-colors">Start a Campaign</Link></li>
              <li><Link href="/activity" className="hover:text-teal-400 transition-colors">Live Activity Feed</Link></li>
              <li><Link href="/analytics" className="hover:text-teal-400 transition-colors">Protocol Analytics</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Soroban Contracts</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href={getExplorerContractUrl(CONTRACT_CONFIG.registryContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                >
                  Campaign Registry
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href={getExplorerContractUrl(CONTRACT_CONFIG.escrowContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                >
                  Funding Escrow
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href={getExplorerContractUrl(CONTRACT_CONFIG.nativeAssetContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                >
                  XLM SAC Contract
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Network & Security</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Zero-Client-Trust Architecture</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Connected to Stellar {ACTIVE_NETWORK.networkPassphrase.includes("Test") ? "Testnet" : "Mainnet"}.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 FundCircle Protocol. Built on Stellar & Soroban.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> for community impact
          </p>
        </div>
      </div>
    </footer>
  );
}
