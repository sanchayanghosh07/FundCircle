"use client";

import * as React from "react";
import {
  Settings,
  ShieldCheck,
  ExternalLink,
  Globe,
  Database,
  Key,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/walletStore";
import {
  ACTIVE_NETWORK,
  CONTRACT_CONFIG,
  getExplorerContractUrl,
} from "@/config/stellar";
import { shortenAddress } from "@/lib/utils";

export default function SettingsPage() {
  const { isConnected, address, balanceXlm, walletName } = useWalletStore();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
      <div className="pb-6 border-b border-slate-800/80 mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 px-3 py-0.5 text-xs font-semibold text-teal-300 mb-2">
          <Settings className="h-3.5 w-3.5" />
          <span>Configuration</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Protocol & Network Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Inspect your connected Stellar wallet session, Soroban contract addresses, and network nodes.
        </p>
      </div>

      <div className="space-y-6">
        {/* Wallet Section */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Wallet className="h-4 w-4 text-teal-400" />
            Wallet Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 space-y-1">
              <span className="text-slate-500">Connection State</span>
              <p className="font-bold text-white">
                {isConnected ? "Connected" : "Disconnected"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 space-y-1">
              <span className="text-slate-500">Wallet Provider</span>
              <p className="font-bold text-teal-300">{walletName || "Stellar Wallets Kit"}</p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 space-y-1 sm:col-span-2">
              <span className="text-slate-500">Connected Public Key</span>
              <p className="font-mono text-slate-200 break-all">{address || "None"}</p>
            </div>
          </div>
        </div>

        {/* Network & Soroban Contracts */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-teal-400" />
            Soroban Network & Contracts
          </h3>

          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex justify-between items-center">
              <span className="text-slate-400">Network Passphrase:</span>
              <span className="font-mono text-slate-200 font-semibold">{ACTIVE_NETWORK.networkPassphrase}</span>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex justify-between items-center">
              <span className="text-slate-400">Soroban RPC URL:</span>
              <span className="font-mono text-slate-200 font-semibold">{ACTIVE_NETWORK.rpcUrl}</span>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex justify-between items-center">
              <span className="text-slate-400">Campaign Registry Contract:</span>
              <a
                href={getExplorerContractUrl(CONTRACT_CONFIG.registryContractId)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-teal-400 hover:underline flex items-center gap-1"
              >
                {shortenAddress(CONTRACT_CONFIG.registryContractId, 6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex justify-between items-center">
              <span className="text-slate-400">Funding Escrow Contract:</span>
              <a
                href={getExplorerContractUrl(CONTRACT_CONFIG.escrowContractId)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-teal-400 hover:underline flex items-center gap-1"
              >
                {shortenAddress(CONTRACT_CONFIG.escrowContractId, 6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 flex justify-between items-center">
              <span className="text-slate-400">XLM Stellar Asset Contract (SAC):</span>
              <a
                href={getExplorerContractUrl(CONTRACT_CONFIG.nativeAssetContractId)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-teal-400 hover:underline flex items-center gap-1"
              >
                {shortenAddress(CONTRACT_CONFIG.nativeAssetContractId, 6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
