import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActivityItem } from "@/types/activity";

export interface ActivityStore {
  activities: ActivityItem[];
  addActivity: (item: ActivityItem) => void;
  addActivities: (items: ActivityItem[]) => void;
  setActivities: (items: ActivityItem[]) => void;
  clearActivities: () => void;
}

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
      activities: [],

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
      merge: (persistedState: any, currentState) => {
        const rawActivities = (persistedState?.activities || []) as ActivityItem[];
        // Filter out any mock/seed activities from previous sessions
        const realActivities = rawActivities.filter(
          (a) => !a.id.startsWith("seed_act_") && !a.id.startsWith("demo_")
        );
        return {
          ...currentState,
          activities: realActivities,
        };
      },
    }
  )
);
