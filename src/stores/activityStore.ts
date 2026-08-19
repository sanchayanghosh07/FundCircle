import { create } from "zustand";
import { ActivityItem } from "@/types/activity";

interface ActivityStore {
  activities: ActivityItem[];
  addActivity: (item: ActivityItem) => void;
  setActivities: (items: ActivityItem[]) => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  activities: [],
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
