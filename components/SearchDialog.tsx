"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { searchMediaAction } from "@/actions/search";
import { addMedia } from "@/actions/media";
import { MediaType, SearchResult } from "@/types";

export function SearchDialog({ category, onClose }: { category: MediaType; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Live search debounced effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchMediaAction(category, query.trim());
        setResults(data);
      } catch (error) {
        console.error("Live Search Error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, category]);

  const handleSelect = async (item: SearchResult) => {
    setIsAdding(true);
    setErrorMessage(null);
    try {
      await addMedia(item);
      onClose();
    } catch (error: any) {
      console.error("Error adding item:", error);
      setErrorMessage(error?.message || "Failed to add media item");
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-[#111112] rounded-xl shadow-2xl border border-white/5 overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="flex items-center px-6 py-4 border-b border-white/5 shrink-0">
            <Search size={20} className="text-white/30 mr-4" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${category}...`}
              className="flex-1 bg-transparent text-lg text-white placeholder-white/30 outline-none font-sans"
            />
            {isSearching ? (
              <Loader2 size={20} className="text-white/50 animate-spin mr-2" />
            ) : null}
            <button type="button" onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {errorMessage && (
            <div className="px-6 py-3 bg-red-500/10 text-red-400 text-sm font-sans border-b border-red-500/10">
              {errorMessage}
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-4">
            {results.length > 0 ? (
              <div className="grid gap-2">
                {results.map((item) => (
                  <button
                    key={item.external_id}
                    onClick={() => handleSelect(item)}
                    disabled={isAdding}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors text-left w-full group cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-12 h-16 bg-white/5 rounded overflow-hidden relative shrink-0">
                      {item.poster_url ? (
                        <Image src={item.poster_url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30">No cover</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white/90 font-medium font-sans">{item.title}</h4>
                      <p className="text-white/40 text-sm">{item.release_year}</p>
                    </div>
                    {isAdding ? (
                      <Loader2 size={20} className="text-white/50 animate-spin" />
                    ) : (
                      <Plus size={20} className="text-white/30 group-hover:text-white transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-white/30 font-heading text-lg">
                {query.trim().length > 0 && !isSearching ? (
                  <p>No results found.</p>
                ) : (
                  <p>Start typing to search {category}...</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
