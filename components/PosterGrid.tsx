"use client";

import { useState } from "react";
import { PosterCard } from "./PosterCard";
import { Search } from "lucide-react";
import { MediaItem } from "@/types";
import { cn } from "@/lib/utils";

type WatchFilter = "all" | "watched" | "unwatched";

const watchFilters: { id: WatchFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "watched", label: "Watched" },
  { id: "unwatched", label: "Unwatched" },
];

export function PosterGrid({ items }: { items: MediaItem[] }) {
  const [query, setQuery] = useState("");
  const [watchFilter, setWatchFilter] = useState<WatchFilter>("all");

  const filteredItems = items.filter((item) => {
    const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;

    const isWatched = item.rating != null && item.rating > 0;
    if (watchFilter === "watched") return isWatched;
    if (watchFilter === "unwatched") return !isWatched;
    return true;
  });

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground font-heading text-xl italic">
          No entries yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Search + Watch Filters */}
      <div className="flex flex-col items-center gap-5 w-full">
        <div className="relative w-full max-w-sm">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your archive..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors font-sans"
          />
        </div>

        <div className="flex items-center gap-6">
          {watchFilters.map((filter) => {
            const isActive = watchFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setWatchFilter(filter.id)}
                className={cn(
                  "text-sm font-heading tracking-wide transition-colors duration-200 cursor-pointer",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex h-full min-h-[40vh] items-center justify-center">
          <p className="text-muted-foreground font-heading text-xl italic">
            No matches found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-12">
          {filteredItems.map((item, index) => (
            <PosterCard key={item.id} item={item} priority={index < 6} />
          ))}
        </div>
      )}
    </div>
  );
}
