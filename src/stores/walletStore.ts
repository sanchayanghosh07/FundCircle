import { create } from "zustand";
import { WalletState } from "@/types/wallet";

interface WalletStore extends WalletState {
  setConnecting: (isConnecting: boolean) => void;
  setWallet: (address: string, walletId: string, walletName: string, network: string) => void;
  setBalance: (balanceXlm: string) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;
}

const STORAGE_KEY = "fundcircle_wallet";

function getInitialState(): Partial<WalletState> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        isConnected: true,
        address: parsed.address,
        walletId: parsed.walletId,
        walletName: parsed.walletName,
        network: parsed.network || "testnet",
      };
    }
  } catch {
    // Ignore storage parse error
  }
  return {};
}

export const useWalletStore = create<WalletStore>((set) => ({
  isConnected: false,
  isConnecting: false,
  address: null,
  walletId: null,
  walletName: null,
  balanceXlm: "0",
  network: "testnet",
  error: null,
  ...getInitialState(),

  setConnecting: (isConnecting) => set({ isConnecting }),

  setWallet: (address, walletId, walletName, network) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ address, walletId, walletName, network })
      );
    } catch {
      // ignore
    }
    set({
      isConnected: true,
      isConnecting: false,
      address,
      walletId,
      walletName,
      network,
      error: null,
    });
  },

  setBalance: (balanceXlm) => set({ balanceXlm }),

  setError: (error) => set({ error, isConnecting: false }),

  disconnect: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({
      isConnected: false,
      isConnecting: false,
      address: null,
      walletId: null,
      walletName: null,
      balanceXlm: "0",
      error: null,
    });
  },
}));
