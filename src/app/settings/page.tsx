"use client";

import * as React from "react";
import {
  ExternalLink,
  Globe,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/walletStore";
import {
  ACTIVE_NETWORK,
  CONTRACT_CONFIG,
  getExplorerContractUrl,
} from "@/config/stellar";
import { shortenAddress } from "@/lib/utils";
import { Tape } from "@/components/ui/hand-drawn/Tape";

export default function SettingsPage() {
  const { isConnected, address, walletName } = useWalletStore();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
      <div className="pb-6 border-b-2 border-dashed border-pencil/30 mb-8">
        <div className="inline-flex items-center gap-1.5 wobbly-border-sm bg-postit-yellow border-2 border-pencil px-3 py-0.5 text-xs font-heading font-bold text-pencil shadow-hard-sm mb-2">
          <span>Configuration</span>
        </div>
        <h1 className="font-heading text-4xl font-bold text-pencil tracking-tight">
          Protocol & Network Settings
        </h1>
        <p className="font-body text-lg text-pencil-light mt-1">
          Inspect your connected Stellar wallet session, Soroban contract addresses, and network nodes.
        </p>
      </div>

      <div className="space-y-6">
        {/* Wallet Section */}
        <div className="relative wobbly-border-md border-2 border-pencil bg-white p-6 sm:p-8 space-y-4 shadow-hard">
          <Tape rotation={-1.5} />

          <h3 className="font-heading text-2xl font-bold text-pencil flex items-center gap-2">
            <Wallet className="h-5 w-5 text-pen-blue" />
            Wallet Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-body text-base">
            <div className="wobbly-border-sm bg-paper p-4 border-2 border-pencil space-y-1 shadow-hard-sm">
              <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Connection State</span>
              <p className="font-heading text-xl font-bold text-pencil">
                {isConnected ? "Connected" : "Disconnected"}
              </p>
            </div>

            <div className="wobbly-border-sm bg-paper p-4 border-2 border-pencil space-y-1 shadow-hard-sm">
              <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Wallet Provider</span>
              <p className="font-heading text-xl font-bold text-pen-blue">{walletName || "Stellar Wallets Kit"}</p>
            </div>

            <div className="wobbly-border-sm bg-paper p-4 border-2 border-pencil space-y-1 sm:col-span-2 shadow-hard-sm">
              <span className="font-heading text-xs font-bold text-pencil-muted uppercase">Connected Public Key</span>
              <p className="font-body font-bold text-pencil text-base break-all">{address || "None"}</p>
            </div>
          </div>
        </div>

        {/* Network & Soroban Contracts */}
        <div className="relative wobbly-border-md border-2 border-pencil bg-white p-6 sm:p-8 space-y-4 shadow-hard">
          <Tape rotation={1} />

          <h3 className="font-heading text-2xl font-bold text-pencil flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600" />
            Soroban Network & Contracts
          </h3>

          <div className="space-y-3 font-body text-base">
            <div className="wobbly-border-sm bg-paper p-4 border-2 border-pencil flex flex-col sm:flex-row justify-between sm:items-center shadow-hard-sm gap-1">
              <span className="text-pencil-light font-bold">Network Passphrase:</span>
              <span className="font-heading font-bold text-pencil text-sm">{ACTIVE_NETWORK.networkPassphrase}</span>
            </div>

            <div className="wobbly-border-sm bg-paper p-4 border-2 border-pencil flex flex-col sm:flex-row justify-between sm:items-center shadow-hard-sm gap-1">
              <span className="text-pencil-light font-bold">Soroban RPC URL:</span>
              <span className="font-heading font-bold text-pencil text-sm">{ACTIVE_NETWORK.rpcUrl}</span>
            </div>

            <div className="wobbly-border-sm bg-paper p-4 border-2 border-pencil flex flex-col sm:flex-row justify-between sm:items-center shadow-hard-sm gap-1">
              <span className="text-pencil-light font-bold">Campaign Registry Contract:</span>
              <a
                href={getExplorerContractUrl(CONTRACT_CONFIG.registryContractId)}
                target="_blank"
                rel="noreferrer"
                className="font-heading font-bold text-pen-blue hover:text-marker-red hover:underline decoration-wavy flex items-center gap-1 text-sm"
              >
                {shortenAddress(CONTRACT_CONFIG.registryContractId, 6)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="wobbly-border-sm bg-paper p-4 border-2 border-pencil flex flex-col sm:flex-row justify-between sm:items-center shadow-hard-sm gap-1">
              <span className="text-pencil-light font-bold">Funding Escrow Contract:</span>
              <a
                href={getExplorerContractUrl(CONTRACT_CONFIG.escrowContractId)}
                target="_blank"
                rel="noreferrer"
                className="font-heading font-bold text-pen-blue hover:text-marker-red hover:underline decoration-wavy flex items-center gap-1 text-sm"
              >
                {shortenAddress(CONTRACT_CONFIG.escrowContractId, 6)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="wobbly-border-sm bg-paper p-4 border-2 border-pencil flex flex-col sm:flex-row justify-between sm:items-center shadow-hard-sm gap-1">
              <span className="text-pencil-light font-bold">XLM Stellar Asset Contract (SAC):</span>
              <a
                href={getExplorerContractUrl(CONTRACT_CONFIG.nativeAssetContractId)}
                target="_blank"
                rel="noreferrer"
                className="font-heading font-bold text-pen-blue hover:text-marker-red hover:underline decoration-wavy flex items-center gap-1 text-sm"
              >
                {shortenAddress(CONTRACT_CONFIG.nativeAssetContractId, 6)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
