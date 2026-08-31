import * as React from "react";
import Link from "next/link";
import { Heart, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { CONTRACT_CONFIG, ACTIVE_NETWORK, getExplorerContractUrl } from "@/config/stellar";

export function Footer() {
  return (
    <footer className="border-t-2 border-dashed border-pencil/30 bg-paper-muted/40 text-pencil py-14 mt-20">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-9 w-9 items-center justify-center wobbly-border border-2 border-pencil bg-postit-yellow text-pencil shadow-hard-sm group-hover:rotate-6 transition-transform overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className="h-6 w-6">
                  <g stroke="#2d2d2d" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 64,26 C 85,25 102,42 102,64 C 102,86 85,103 63,102 C 41,101 25,84 26,62 C 27,40 44,27 66,27" strokeWidth="5" />
                    <path d="M 62,30 C 81,31 97,46 96,65 C 95,84 79,98 60,98 C 41,98 29,82 30,64 C 31,45 47,32 65,32" strokeWidth="3" strokeDasharray="85 8" />
                  </g>
                  <path d="M 40,20 Q 40,34 26,34 Q 40,34 40,48 Q 40,34 54,34 Q 40,34 40,20 Z" fill="#e11d48" stroke="#2d2d2d" strokeWidth="3" />
                  <path d="M 86,18 Q 86,28 76,28 Q 86,28 86,38 Q 86,28 96,28 Q 86,28 86,18 Z" fill="#2563eb" stroke="#2d2d2d" strokeWidth="3" />
                  <path d="M 64,44 Q 64,64 44,64 Q 64,64 64,84 Q 64,64 84,64 Q 64,64 64,44 Z" fill="#e11d48" stroke="#2d2d2d" strokeWidth="4" />
                </svg>
              </div>
              <span className="font-heading text-xl font-bold text-pencil">FundCircle</span>
            </Link>
            <p className="font-body text-base text-pencil-light leading-relaxed">
              Community micro-funding on Stellar. Non-custodial escrow custody powered by Soroban smart contracts.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-base font-bold text-pencil uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 font-body font-bold text-base">
              <li>
                <Link href="/campaigns" className="hover:text-marker-red hover:underline decoration-wavy transition-colors">
                  Explore Campaigns
                </Link>
              </li>
              <li>
                <Link href="/create" className="hover:text-marker-red hover:underline decoration-wavy transition-colors">
                  Start a Campaign
                </Link>
              </li>
              <li>
                <Link href="/activity" className="hover:text-marker-red hover:underline decoration-wavy transition-colors">
                  Live Activity Feed
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-marker-red hover:underline decoration-wavy transition-colors">
                  Protocol Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-base font-bold text-pencil uppercase tracking-wider mb-3">
              Soroban Contracts
            </h4>
            <ul className="space-y-2 font-body font-bold text-base">
              <li>
                <a
                  href={getExplorerContractUrl(CONTRACT_CONFIG.registryContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-marker-red hover:underline decoration-wavy transition-colors"
                >
                  Campaign Registry
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <a
                  href={getExplorerContractUrl(CONTRACT_CONFIG.escrowContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-marker-red hover:underline decoration-wavy transition-colors"
                >
                  Funding Escrow
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <a
                  href={getExplorerContractUrl(CONTRACT_CONFIG.nativeAssetContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-marker-red hover:underline decoration-wavy transition-colors"
                >
                  XLM SAC Contract
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-base font-bold text-pencil uppercase tracking-wider mb-3">
              Network & Escrow
            </h4>
            <div className="space-y-2 font-body text-base">
              <div className="flex items-center gap-2 text-pencil font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>On-Chain Escrow Security</span>
              </div>
              <p className="text-pencil-light text-sm">
                Connected to Stellar {ACTIVE_NETWORK.networkPassphrase.includes("Test") ? "Testnet" : "Mainnet"}.
              </p>
              <div className="pt-3 border-t border-dashed border-pencil/20">
                <span className="font-heading text-xs font-bold text-pencil uppercase tracking-wider block mb-2">
                  Community Feedback
                </span>
                <ul className="space-y-1.5 font-body font-bold text-sm">
                  <li>
                    <a
                      href="https://forms.gle/NUKMgguPe1YUcisZ9"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-marker-red hover:underline decoration-wavy transition-colors"
                    >
                      Feedback Form
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.google.com/spreadsheets/d/1QRmf3CDBBAn6fsaM6yDUQw4jP64QhczRZuk1u8vXl9M/edit?usp=sharing"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-marker-red hover:underline decoration-wavy transition-colors"
                    >
                      Feedback Responses
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-pencil/30 pt-6 flex flex-col sm:flex-row items-center justify-between font-body text-base text-pencil-light gap-4">
          <p>© 2026 FundCircle Protocol. Built for Stellar Testnet.</p>
          <p className="flex items-center gap-1.5 font-bold text-pencil">
            Handcrafted with <Heart className="h-4 w-4 text-marker-red fill-marker-red" /> for community impact
          </p>
        </div>
      </div>
    </footer>
  );
}
