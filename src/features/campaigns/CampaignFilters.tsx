import * as React from "react";
import { Search } from "lucide-react";
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
  { label: "All Campaigns", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "review" },
  { label: "Goal Met", value: "funded" },
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
    <div className="space-y-4 mb-10">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pencil/50" />
          <Input
            type="text"
            placeholder="Search campaigns by keyword, category, creator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 wobbly-border-sm border-2 border-pencil bg-white px-4 py-2 font-body font-bold text-base text-pencil shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-pen-blue/20 w-full sm:w-auto cursor-pointer"
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
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`wobbly-border-sm border-2 border-pencil px-4 py-1 font-body font-bold text-base whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-postit-yellow text-pencil shadow-hard-sm -translate-y-0.5"
                  : "bg-white text-pencil/80 hover:bg-paper-muted hover:text-pencil"
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
