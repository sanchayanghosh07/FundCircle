import { create } from "zustand";
import { TransactionRecord, TxStatus, TxType } from "@/types/transaction";

interface TransactionStore {
  isOpen: boolean;
  activeTx: TransactionRecord | null;
  currentStepMessage: string;
  history: TransactionRecord[];
  
  openModal: (type: TxType, title: string, metadata?: Partial<TransactionRecord>) => void;
  closeModal: () => void;
  updateStatus: (status: TxStatus, message?: string, extra?: Partial<TransactionRecord>) => void;
  recordSuccess: (hash: string, explorerUrl?: string) => void;
  recordFailure: (errorMessage: string, technicalDetails?: string) => void;
  clearHistory: () => void;
}

const HISTORY_STORAGE_KEY = "fundcircle_tx_history";

function loadHistory(): TransactionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(HISTORY_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function persistHistory(history: TransactionRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  } catch {
    // ignore
  }
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  isOpen: false,
  activeTx: null,
  currentStepMessage: "",
  history: loadHistory(),

  openModal: (type, title, metadata) => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTx: TransactionRecord = {
      id,
      type,
      title,
      status: "preparing",
      timestamp: Date.now(),
      ...metadata,
    };
    set({
      isOpen: true,
      activeTx: newTx,
      currentStepMessage: "Preparing transaction envelope...",
    });
  },

  closeModal: () => {
    set({ isOpen: false });
  },

  updateStatus: (status, message, extra) => {
    const { activeTx, history } = get();
    if (!activeTx) return;

    const updatedTx: TransactionRecord = {
      ...activeTx,
      status,
      ...extra,
    };

    let newHistory = history;
    if (status === "confirmed" || status === "failed" || status === "rejected") {
      newHistory = [updatedTx, ...history.filter((tx) => tx.id !== updatedTx.id)];
      persistHistory(newHistory);
    }

    set({
      activeTx: updatedTx,
      currentStepMessage: message || getStepMessage(status),
      history: newHistory,
    });
  },

  recordSuccess: (hash, explorerUrl) => {
    const { updateStatus } = get();
    updateStatus("confirmed", "Transaction confirmed successfully on Stellar!", {
      hash,
      explorerUrl,
    });
  },

  recordFailure: (errorMessage, technicalDetails) => {
    const { updateStatus } = get();
    updateStatus("failed", errorMessage, {
      errorMessage,
      technicalDetails,
    });
  },

  clearHistory: () => {
    persistHistory([]);
    set({ history: [] });
  },
}));

function getStepMessage(status: TxStatus): string {
  switch (status) {
    case "preparing":
      return "Building transaction parameters...";
    case "simulating":
      return "Simulating execution on Soroban RPC...";
    case "awaiting_signature":
      return "Please sign the transaction in your Stellar wallet...";
    case "submitting":
      return "Submitting signed transaction to Stellar network...";
    case "pending":
      return "Waiting for consensus validation on ledger...";
    case "confirmed":
      return "Transaction confirmed on Stellar ledger!";
    case "failed":
      return "Transaction failed during execution.";
    case "rejected":
      return "Signature request was rejected in wallet.";
    default:
      return "";
  }
}
