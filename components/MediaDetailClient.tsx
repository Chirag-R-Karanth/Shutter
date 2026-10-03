"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Star, Check, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { updateMediaReview, removeMedia } from "@/actions/media";
import { MediaItem } from "@/types";

export function MediaDetailClient({ item }: { item: MediaItem }) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(item.rating || 0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview] = useState(item.review || "");
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRatingClick = async (newRating: number) => {
    // Toggle off if clicking the same rating
    const targetRating = rating === newRating ? 0 : newRating;
    setRating(targetRating);
    setIsSaving(true);
    try {
      await updateMediaReview(item.id, item.category, targetRating > 0 ? targetRating : null, review.trim() || null);
      triggerSaveSuccess();
    } catch (error) {
      console.error("Error updating rating:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReview = async () => {
    setIsSaving(true);
    try {
      await updateMediaReview(item.id, item.category, rating > 0 ? rating : null, review.trim() || null);
      setIsEditingReview(false);
      triggerSaveSuccess();
    } catch (error) {
      console.error("Error updating review:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  const handleStarMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    setHoverRating(isLeftHalf ? index + 0.5 : index + 1);
  };

  const handleStarClick = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    const targetValue = isLeftHalf ? index + 0.5 : index + 1;
    handleRatingClick(targetValue);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0B0C]">
      {/* Blurred Background */}
      <motion.div
        className="absolute inset-0 z-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {item.poster_url && (
          <Image
            src={item.poster_url}
            alt=""
            fill
            className="object-cover blur-3xl scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0B0C]" />
      </motion.div>

      {/* Close & Delete Buttons */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
        <button
          onClick={async () => {
            if (window.confirm("Are you sure you want to remove this from your archive?")) {
              setIsDeleting(true);
              try {
                await removeMedia(item.id, item.category);
                router.back();
              } catch (e) {
                console.error(e);
                setIsDeleting(false);
              }
            }
          }}
          disabled={isDeleting}
          className="text-red-500/50 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Remove media"
        >
          {isDeleting ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
        </button>
        <button
          onClick={() => router.back()}
          className="text-white/50 hover:text-white transition-colors cursor-pointer"
          aria-label="Close detail view"
        >
          <X size={32} strokeWidth={1} />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-start gap-12 md:gap-24">
        {/* Poster */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-[320px] shrink-0"
        >
          <div className="relative aspect-[2/3] w-full rounded-md overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] bg-white/5">
            {item.poster_url ? (
              <Image
                src={item.poster_url}
                alt={item.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 font-sans">
                No Artwork
              </div>
            )}
          </div>
        </motion.div>

        {/* Details */}
        <div className="flex-1 flex flex-col pt-8 md:pt-12 w-full">
          {/* Title & Year */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-6xl font-heading text-white tracking-tight mb-2">
                {item.title}
              </h1>
              {saveSuccess && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full font-sans mb-2"
                >
                  <Check size={12} /> Saved
                </motion.span>
              )}
              {isSaving && (
                <Loader2 size={16} className="text-white/40 animate-spin mb-2" />
              )}
            </div>
            <p className="text-xl text-white/50 font-sans tracking-wide mb-8">
              {item.release_year}
            </p>
          </motion.div>

          {/* Letterboxd-style 5-Star Rating (with 1/2 stars) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05, ease: "easeOut" }}
            className="flex items-center gap-3 mb-10"
            onMouseLeave={() => setHoverRating(null)}
          >
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((index) => {
                const starValue = index + 1;
                const halfValue = index + 0.5;
                const isFull = activeRating >= starValue;
                const isHalf = activeRating === halfValue;

                return (
                  <div
                    key={index}
                    onMouseMove={(e) => handleStarMouseMove(e, index)}
                    onClick={(e) => handleStarClick(e, index)}
                    className="relative cursor-pointer p-1 group"
                    style={{ width: "32px", height: "32px" }}
                  >
                    {/* Background Empty Star */}
                    <Star
                      size={24}
                      className="text-white/20 transition-colors group-hover:text-white/40"
                      strokeWidth={1}
                    />

                    {/* Half Star Overlay */}
                    {isHalf && (
                      <div className="absolute inset-0 p-1 overflow-hidden w-1/2 pointer-events-none">
                        <Star
                          size={24}
                          className="text-white fill-white"
                          strokeWidth={1}
                        />
                      </div>
                    )}

                    {/* Full Star Overlay */}
                    {isFull && (
                      <div className="absolute inset-0 p-1 pointer-events-none">
                        <Star
                          size={24}
                          className="text-white fill-white scale-105 transition-transform"
                          strokeWidth={1}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {rating > 0 && (
              <span className="text-base text-white/60 font-sans font-light tracking-wide">
                {rating} / 5
              </span>
            )}
          </motion.div>

          {/* Review Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.08, ease: "easeOut" }}
            className="prose prose-invert max-w-none w-full"
          >
            {isEditingReview ? (
              <div className="flex flex-col items-start gap-4 w-full">
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Add your personal thoughts..."
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-lg text-white/90 leading-relaxed font-sans font-light outline-none focus:border-white/30 resize-none min-h-[160px] placeholder:text-white/20 transition-colors"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveReview}
                    disabled={isSaving}
                    className="px-6 py-2 bg-white text-black hover:bg-white/90 rounded-full transition-colors font-sans text-sm font-medium tracking-wide disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? "Saving..." : "Save Review"}
                  </button>
                  <button
                    onClick={() => {
                      setReview(item.review || "");
                      setIsEditingReview(false);
                    }}
                    className="px-4 py-2 text-white/40 hover:text-white transition-colors font-sans text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingReview(true)}
                className="group cursor-pointer p-4 -m-4 rounded-xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5"
              >
                {review ? (
                  <p className="text-lg text-white/80 leading-relaxed font-sans font-light group-hover:text-white transition-colors">
                    {review}
                  </p>
                ) : (
                  <p className="text-lg text-white/30 italic font-heading group-hover:text-white/50 transition-colors">
                    No thoughts yet. Click to write a review...
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
