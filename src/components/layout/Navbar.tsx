"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  PlusCircle,
  Activity,
  Receipt,
  BarChart3,
  ShieldAlert,
  Wallet,
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/walletStore";
import { walletKit } from "@/services/wallet/stellarWalletKit";
import { shortenAddress, copyToClipboard } from "@/lib/utils";
import { ACTIVE_NETWORK, getExplorerAccountUrl, CONTRACT_CONFIG } from "@/config/stellar";
import { stellarRpc } from "@/services/stellar/rpc";

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, address, balanceXlm, walletName, setWallet, setBalance, disconnect } =
    useWalletStore();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);

  // Poll balance when connected
  React.useEffect(() => {
    if (!isConnected || !address) return;

    let mounted = true;
    const fetchBalance = async () => {
      try {
        const bal = await stellarRpc.getAccountBalance(address);
        if (mounted) setBalance(bal);
      } catch {
        // ignore
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isConnected, address, setBalance]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await walletKit.openModal();
      if (result) {
        setWallet(result.address, result.walletId, result.name, "testnet");
        const bal = await stellarRpc.getAccountBalance(result.address);
        setBalance(bal);
      }
    } catch (err) {
      console.error("Wallet connect error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopy = async () => {
    if (address) {
      await copyToClipboard(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isAdmin = Boolean(
    isConnected &&
    address &&
    CONTRACT_CONFIG.adminAddress &&
    address.toLowerCase() === CONTRACT_CONFIG.adminAddress.toLowerCase()
  );

  const navLinks = [
    { href: "/campaigns", label: "Explore" },
    { href: "/create", label: "Start Campaign" },
    { href: "/activity", label: "Activity" },
    { href: "/dashboard/creator", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/analytics", label: "Analytics" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-pencil bg-paper/95 backdrop-blur-md shadow-sm">
      <div className="container mx-auto flex h-18 items-center justify-between px-4 sm:px-6">
        {/* Sketched Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center wobbly-border border-2 border-pencil bg-postit-yellow text-pencil shadow-hard-sm group-hover:rotate-6 transition-transform">
            <span className="font-heading font-black text-xl">✦</span>
          </div>
          <span className="font-heading text-2xl font-bold text-pencil tracking-tight">
            FundCircle
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-body font-bold text-lg transition-all relative py-1 px-2 ${
                  isActive
                    ? "text-marker-red underline decoration-wavy decoration-2 underline-offset-4"
                    : "text-pencil hover:text-marker-red hover:underline decoration-wavy underline-offset-4"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions & Wallet */}
        <div className="hidden md:flex items-center gap-3">
          {isConnected && address ? (
            <div className="relative">
              <button
                onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                className="flex items-center gap-2.5 wobbly-border border-2 border-pencil bg-white px-3.5 py-1.5 shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                <div className="h-3 w-3 rounded-full bg-[#10b981] border border-pencil" />
                <div className="flex flex-col text-left">
                  <span className="font-body font-bold text-sm text-pencil">
                    {shortenAddress(address)}
                  </span>
                  <span className="font-heading text-xs font-bold text-pen-blue">
                    {balanceXlm} XLM
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-pencil ml-1" />
              </button>

              {walletDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 wobbly-border-md border-2 border-pencil bg-white p-3 shadow-hard z-50 animate-in fade-in-50 zoom-in-95 duration-100"
                  onClick={() => setWalletDropdownOpen(false)}
                >
                  <div className="px-2 py-1 border-b-2 border-dashed border-pencil/30 mb-2">
                    <p className="text-xs font-heading text-pencil/70">
                      Connected ({walletName || "Freighter"})
                    </p>
                    <p className="font-body text-xs text-pencil font-bold break-all mt-0.5">{address}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm font-body font-bold rounded text-pencil hover:bg-postit-yellow transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied!" : "Copy Address"}
                    </span>
                  </button>

                  <a
                    href={getExplorerAccountUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm font-body font-bold rounded text-pencil hover:bg-postit-yellow transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View on Stellar Expert
                    </span>
                  </a>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setWalletDropdownOpen(false)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm font-body font-bold rounded text-marker-red hover:bg-marker-red/10 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Admin Console
                      </span>
                    </Link>
                  )}

                  <div className="border-t-2 border-dashed border-pencil/30 mt-2 pt-2">
                    <button
                      onClick={disconnect}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm font-body font-bold rounded text-marker-red hover:bg-marker-red hover:text-white transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect Wallet
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              variant="stellar"
              size="default"
              className="gap-2"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {isConnected && (
            <span className="font-body text-xs font-bold bg-white border-2 border-pencil px-2 py-0.5 wobbly-border-sm text-pen-blue">
              {shortenAddress(address)}
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="wobbly-border-sm border-2 border-pencil bg-white p-1.5 text-pencil shadow-hard-sm"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-pencil bg-paper px-5 pt-4 pb-6 space-y-3 shadow-hard animate-in slide-in-from-top-2 duration-150">
          {isConnected && address && (
            <div className="wobbly-border-sm border-2 border-pencil bg-white p-3 space-y-2 mb-3 shadow-hard-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#10b981] border border-pencil" />
                  <span className="font-heading text-xs font-bold text-pencil">
                    {walletName || "Freighter"}
                  </span>
                </div>
                <span className="font-heading font-bold text-sm text-marker-red font-mono">
                  {balanceXlm} XLM
                </span>
              </div>
              <p className="font-body text-xs font-bold text-pencil break-all">
                {address}
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-pencil/20">
                <button
                  onClick={handleCopy}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-body font-bold text-pencil bg-paper hover:bg-postit-yellow py-1 px-2 border border-pencil wobbly-border-sm"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <a
                  href={getExplorerAccountUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-body font-bold text-pen-blue bg-paper hover:bg-postit-yellow py-1 px-2 border border-pencil wobbly-border-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Explorer
                </a>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block font-body font-bold text-xl py-1.5 px-2 rounded ${
                    isActive ? "text-marker-red underline decoration-wavy" : "text-pencil hover:bg-paper-muted"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block font-body font-bold text-xl py-1.5 px-2 text-marker-red hover:bg-marker-red/10 rounded"
              >
                Admin Console
              </Link>
            )}
          </div>

          <div className="pt-3 border-t-2 border-dashed border-pencil/40">
            {isConnected ? (
              <Button
                onClick={() => {
                  disconnect();
                  setMobileMenuOpen(false);
                }}
                variant="destructive"
                className="w-full justify-center text-base"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Disconnect Wallet
              </Button>
            ) : (
              <Button
                onClick={() => {
                  handleConnect();
                  setMobileMenuOpen(false);
                }}
                disabled={isConnecting}
                variant="stellar"
                className="w-full justify-center text-base"
              >
                <Wallet className="h-4 w-4 mr-1.5" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
