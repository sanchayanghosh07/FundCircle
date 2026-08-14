import * as React from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  "All",
  "Education",
  "Technology",
  "Environment",
  "Emergency",
  "Community",
];

const STATUSES = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "In Review", value: "review" },
  { label: "Goal Reached", value: "funded" },
  { label: "Completed", value: "completed" },
];

export function CampaignFilters({
  search,
  setSearch,
  category,
  setCategory,
  status,
  setStatus,
}: {
  search: string;
  setSearch: (s: string) => void;
  category: string;
  setCategory: (c: string) => void;
  status: string;
  setStatus: (s: string) => void;
}) {
  return (
    <div className="space-y-4 mb-8">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search campaigns by title, keywords, or scope..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-slate-900/90 border-slate-800 focus:border-teal-500"
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-auto"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
