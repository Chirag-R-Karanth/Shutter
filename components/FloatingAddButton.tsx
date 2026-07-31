"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SearchDialog } from "./SearchDialog";
import { MediaType } from "@/types";

export function FloatingAddButton({ category }: { category: MediaType }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-12 right-12 w-14 h-14 bg-foreground text-background rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-50 transition-colors hover:bg-white"
        aria-label={`Add to ${category}`}
      >
        <Plus size={24} strokeWidth={2} />
      </motion.button>
      
      {isOpen && <SearchDialog category={category} onClose={() => setIsOpen(false)} />}
    </>
  );
}
