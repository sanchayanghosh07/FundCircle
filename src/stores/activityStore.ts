import { create } from "zustand";
import { ActivityItem } from "@/types/activity";

interface ActivityStore {
  activities: ActivityItem[];
  addActivity: (item: ActivityItem) => void;
  setActivities: (items: ActivityItem[]) => void;
}

const DEFAULT_INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: "act_init_1",
    type: "campaign_created",
    campaignId: 1,
    campaignTitle: "Community Solar Lanterns",
    actor: "GBZ...9X4Q",
    amountXlm: "5,000",
    timestamp: Date.now() - 1000 * 60 * 120,
    txHash: "a9c7...4f81",
    details: "Campaign drafted for rural education solar lights",
  },
  {
    id: "act_init_2",
    type: "campaign_approved",
    campaignId: 1,
    campaignTitle: "Community Solar Lanterns",
    actor: "GADM...1111",
    timestamp: Date.now() - 1000 * 60 * 90,
    txHash: "8b22...192f",
    details: "Approved by community reviewer and active for funding",
  },
  {
    id: "act_init_3",
    type: "contributed",
    campaignId: 1,
    campaignTitle: "Community Solar Lanterns",
    actor: "GC7...33KD",
    amountXlm: "250",
    timestamp: Date.now() - 1000 * 60 * 35,
    txHash: "3f91...8c4a",
    details: "Contributed 250 XLM via Stellar Escrow",
  },
];

export const useActivityStore = create<ActivityStore>((set) => ({
  activities: DEFAULT_INITIAL_ACTIVITIES,
  addActivity: (item) =>
    set((state) => {
      if (state.activities.some((a) => a.id === item.id)) {
        return state;
      }
      return {
        activities: [item, ...state.activities].slice(0, 100),
      };
    }),
  setActivities: (items) => set({ activities: items }),
}));
