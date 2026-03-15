import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function SportsHeroBanner() {
  const [banners, setBanners] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase
      .from("promo_banners")
      .select("*")
      .eq("is_active", true)
      .eq("placement", "sports")
      .order("sort_order")
      .then(({ data }) => setBanners(data || []));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const iv = setInterval(() => setCurrent(p => (p + 1) % banners.length), 5000);
    return () => clearInterval(iv);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const b = banners[current];

  return (
    <div className="relative rounded-xl overflow-hidden">
      <a href={b.link_url || "#"} className="block">
        <div className="aspect-[5/2] w-full">
          <img
            src={b.image_url}
            alt={b.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
      </a>
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(p => (p - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/80"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrent(p => (p + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/80"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-primary w-4" : "bg-foreground/30"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
