import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

let pixelInitialized = false;
let currentPixelId: string | null = null;

function initPixel(pixelId: string) {
  if (pixelInitialized && currentPixelId === pixelId) return;

  // Facebook Pixel base code
  const f = window;
  const b = document;
  if (f.fbq) return;

  const n: any = (f.fbq = function (...args: any[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  });

  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];

  const script = b.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = b.getElementsByTagName("script")[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);

  window.fbq("init", pixelId);
  pixelInitialized = true;
  currentPixelId = pixelId;
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (window.fbq) {
    window.fbq("track", eventName, params);
  }
}

export function useMetaPixel() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("meta_pixel_id")
        .limit(1)
        .single();

      const pixelId = (data as any)?.meta_pixel_id;
      if (pixelId) {
        initPixel(pixelId);
        window.fbq("track", "PageView");
      }
    })();
  }, []);
}
