import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActivityItem } from "@/types/activity";
import { CONTRACT_CONFIG } from "@/config/stellar";

export interface ActivityStore {
  activities: ActivityItem[];
  addActivity: (item: ActivityItem) => void;
  addActivities: (items: ActivityItem[]) => void;
  setActivities: (items: ActivityItem[]) => void;
  clearActivities: () => void;
}

export const INITIAL_SEED_ACTIVITIES: ActivityItem[] = [
  {
    id: "seed_act_contrib_2",
    type: "contributed",
    campaignId: 2,
    campaignTitle: "Open Source Soroban Dev Tooling Workshop",
    actor: "GA3D5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5MZ3R11",
    amountXlm: "1,000",
    timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
    txHash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    details: "Contributed 1,000 XLM via Soroban Escrow",
  },
  {
    id: "seed_act_create_2",
    type: "campaign_created",
    campaignId: 2,
    campaignTitle: "Open Source Soroban Dev Tooling Workshop",
    actor: "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN",
    amountXlm: "4,000",
    timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
    txHash: "f0e1d2c3b4a596877869504132231405f6e7d8c9b0a123456789abcdef012345",
    details: 'Created campaign "Open Source Soroban Dev Tooling Workshop" with 4,000 XLM goal',
  },
  {
    id: "seed_act_contrib_1",
    type: "contributed",
    campaignId: 1,
    campaignTitle: "Solar-Powered Study Lamps for Rural High School",
    actor: "GDF7Y4P5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M67A",
    amountXlm: "500",
    timestamp: Date.now() - 1000 * 60 * 180, // 3 hours ago
    txHash: "8e7f6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e",
    details: "Contributed 500 XLM via Soroban Escrow",
  },
  {
    id: "seed_act_create_1",
    type: "campaign_created",
    campaignId: 1,
    campaignTitle: "Solar-Powered Study Lamps for Rural High School",
    actor: "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
    amountXlm: "2,500",
    timestamp: Date.now() - 1000 * 60 * 360, // 6 hours ago
    txHash: "3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b",
    details: 'Created campaign "Solar-Powered Study Lamps for Rural High School" with 2,500 XLM goal',
  },
  {
    id: "seed_act_reg_init",
    type: "state_changed",
    campaignId: 1,
    campaignTitle: "FundCircle Protocol Contracts",
    actor: CONTRACT_CONFIG.adminAddress || "GCPUZLCKI4NONG3ZLNUWKMTBZS3CO6SXFMHR2H2PGQHMENR4HL7HNMFD",
    timestamp: Date.now() - 1000 * 60 * 720, // 12 hours ago
    txHash: "e9a7b6c5d4e3f2a10b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a",
    details: "Soroban Smart Contracts deployed & initialized on Stellar Testnet",
  },
];

function isDuplicate(a: ActivityItem, b: ActivityItem): boolean {
  if (a.id === b.id) return true;
  if (
    a.txHash &&
    b.txHash &&
    a.txHash === b.txHash &&
    a.type === b.type &&
    a.campaignId === b.campaignId
  ) {
    return true;
  }
  return false;
}

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set) => ({
      activities: INITIAL_SEED_ACTIVITIES,

      addActivity: (item) =>
        set((state) => {
          if (state.activities.some((a) => isDuplicate(a, item))) {
            return state;
          }
          return {
            activities: [item, ...state.activities].slice(0, 100),
          };
        }),

      addActivities: (items) =>
        set((state) => {
          const newItems: ActivityItem[] = [];
          for (const item of items) {
            if (
              !state.activities.some((a) => isDuplicate(a, item)) &&
              !newItems.some((n) => isDuplicate(n, item))
            ) {
              newItems.push(item);
            }
          }
          if (newItems.length === 0) return state;
          const merged = [...newItems, ...state.activities]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100);
          return { activities: merged };
        }),

      setActivities: (items) => set({ activities: items }),

      clearActivities: () => set({ activities: [] }),
    }),
    {
      name: "fundcircle_activity_store",
    }
  )
);
