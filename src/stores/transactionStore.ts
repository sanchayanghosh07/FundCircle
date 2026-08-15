import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TransactionRecord, TransactionStatus, TransactionType } from "@/types/transaction";

interface TransactionState {
  isOpen: boolean;
  activeTx: TransactionRecord | null;
  history: TransactionRecord[];

  openModal: (
    type: TransactionType,
    title: string,
    metadata?: Partial<TransactionRecord>
  ) => void;
  closeModal: () => void;
  updateStatus: (status: TransactionStatus, statusMessage?: string) => void;
  recordSuccess: (hash: string, explorerUrl?: string) => void;
  recordFailure: (errorMessage: string) => void;
  clearHistory: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      activeTx: null,
      history: [],

      openModal: (type, title, metadata) => {
        const newTx: TransactionRecord = {
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type,
          title,
          status: "preparing",
          statusMessage: "Assembling transaction envelope...",
          timestamp: Date.now(),
          ...metadata,
        };

        set({
          isOpen: true,
          activeTx: newTx,
        });
      },

      closeModal: () => {
        set({ isOpen: false });
      },

      updateStatus: (status, statusMessage) => {
        const { activeTx } = get();
        if (!activeTx) return;

        set({
          activeTx: {
            ...activeTx,
            status,
            statusMessage: statusMessage || activeTx.statusMessage,
          },
        });
      },

      recordSuccess: (hash, explorerUrl) => {
        const { activeTx, history } = get();
        if (!activeTx) return;

        const completedTx: TransactionRecord = {
          ...activeTx,
          status: "confirmed",
          statusMessage: "Transaction confirmed on Stellar ledger.",
          hash,
          explorerUrl,
          timestamp: Date.now(),
        };

        set({
          activeTx: completedTx,
          history: [completedTx, ...history.slice(0, 49)],
        });
      },

      recordFailure: (errorMessage) => {
        const { activeTx, history } = get();
        if (!activeTx) return;

        const failedTx: TransactionRecord = {
          ...activeTx,
          status: "failed",
          statusMessage: "Transaction failed.",
          errorMessage,
          timestamp: Date.now(),
        };

        set({
          activeTx: failedTx,
          history: [failedTx, ...history.slice(0, 49)],
        });
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "fundcircle-tx-storage",
      partialize: (state) => ({ history: state.history }),
    }
  )
);
