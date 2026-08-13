"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coins,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/stores/walletStore";
import { walletKit } from "@/services/wallet/stellarWalletKit";
import { shortenAddress, copyToClipboard } from "@/lib/utils";
import { ACTIVE_NETWORK, getExplorerAccountUrl } from "@/config/stellar";
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

  const navLinks = [
    { href: "/campaigns", label: "Explore", icon: Compass },
    { href: "/create", label: "Start Campaign", icon: PlusCircle },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/dashboard/creator", label: "Dashboard", icon: BarChart3 },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-bold shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Coins className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              FundCircle
              <Badge variant="active" className="text-[10px] py-0 px-1.5 font-mono uppercase">
                Testnet
              </Badge>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary-400 bg-primary-500/10 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="h-4 w-4" />
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
                className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-1.5 text-sm text-slate-200 hover:border-teal-500/50 hover:bg-slate-800 transition-all shadow-sm"
              >
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="flex flex-col text-left">
                  <span className="font-mono text-xs font-semibold text-white">
                    {shortenAddress(address)}
                  </span>
                  <span className="text-[11px] text-teal-400 font-medium">
                    {balanceXlm} XLM
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
              </button>

              {walletDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150"
                  onClick={() => setWalletDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Connected Wallet ({walletName || "Freighter"})
                    </p>
                    <p className="text-xs font-mono text-slate-200 break-all mt-0.5">{address}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied to clipboard" : "Copy Address"}
                    </span>
                  </button>

                  <a
                    href={getExplorerAccountUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View on Stellar Expert
                    </span>
                  </a>

                  <Link
                    href="/admin"
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-amber-300/90 hover:bg-amber-950/40 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                      Reviewer / Admin Panel
                    </span>
                  </Link>

                  <div className="border-t border-slate-800 mt-1 pt-1">
                    <button
                      onClick={disconnect}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
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
              size="sm"
              className="gap-2 font-semibold shadow-md shadow-teal-500/10"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {isConnected && (
            <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-teal-400">
              {shortenAddress(address)}
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? "bg-primary-500/10 text-primary-400 font-semibold" : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}

          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-300 hover:bg-slate-900"
          >
            <ShieldAlert className="h-4 w-4" />
            Reviewer Queue
          </Link>

          <div className="pt-3 border-t border-slate-800">
            {isConnected ? (
              <Button
                onClick={() => {
                  disconnect();
                  setMobileMenuOpen(false);
                }}
                variant="destructive"
                className="w-full justify-center"
              >
                Disconnect ({shortenAddress(address)})
              </Button>
            ) : (
              <Button
                onClick={() => {
                  handleConnect();
                  setMobileMenuOpen(false);
                }}
                variant="stellar"
                className="w-full justify-center"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
