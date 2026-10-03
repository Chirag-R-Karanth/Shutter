"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { usePathname } from "next/navigation";

import { MediaItem } from "@/types";

export function PosterCard({ item, priority = false }: { item: MediaItem; priority?: boolean }) {
  const pathname = usePathname();
  
  // Rating sentiment dot color
  let dotColor = "";
  if (item.rating !== undefined && item.rating !== null) {
    if (item.rating >= 4) dotColor = "bg-green-500";
    else if (item.rating >= 2.5) dotColor = "bg-yellow-500";
    else if (item.rating > 0) dotColor = "bg-red-500";
  }

  return (
    <Link href={`${pathname}/${item.id}`}>
      <motion.div
        className="group relative aspect-[2/3] w-full rounded-md overflow-hidden cursor-pointer"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{
          boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
        }}
      >
        {item.poster_url ? (
          <Image
            src={item.poster_url}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/30 p-4 text-center font-sans">
            No Image
          </div>
        )}

        {/* Transparent Cross Overlay for Rated Movies */}
        {item.rating !== undefined && item.rating !== null && (
          <div className="absolute inset-0 pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity duration-150">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
            </svg>
          </div>
        )}

        {/* Hover Gradient Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
            <h3 className="font-heading text-sm text-white/90 truncate mr-2 text-shadow-sm">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.is_logged && (
                <Check size={14} className="text-white/80" strokeWidth={2.5} />
              )}
              {dotColor && (
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Link>
  );
}
