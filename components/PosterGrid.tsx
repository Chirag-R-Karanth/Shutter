"use client";

import { useState } from "react";
import { PosterCard } from "./PosterCard";
import { Search } from "lucide-react";
import { MediaItem } from "@/types";

export function PosterGrid({ items }: { items: MediaItem[] }) {
  const [query, setQuery] = useState("");

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase())
  );

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
      {/* Search Bar */}
      <div className="relative w-full max-w-sm mx-auto mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your archive..."
          className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors font-sans"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex h-full min-h-[40vh] items-center justify-center">
          <p className="text-muted-foreground font-heading text-xl italic">
            No matches found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-12">
          {filteredItems.map((item) => (
            <PosterCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
