import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PromoBanner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

export function HeroBanner() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase
      .from("promo_banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) setBanners(data);
      });
  }, []);

  const next = useCallback(() => setCurrent(i => (i + 1) % (banners.length || 1)), [banners.length]);
  const prev = useCallback(() => setCurrent(i => (i - 1 + (banners.length || 1)) % (banners.length || 1)), [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next, banners.length]);

  if (banners.length === 0) return null;

  const b = banners[current];

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={b.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full aspect-[16/5]"
      >
        <img
          src={b.image_url}
          alt={b.title}
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="relative rounded-xl overflow-hidden card-shadow">
      {b.link_url ? (
        <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block">
          {content}
        </a>
      ) : (
        content
      )}

      {banners.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition">
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button onClick={next} className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition">
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>

          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${i === current ? "bg-primary w-4 sm:w-6" : "bg-foreground/30"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
