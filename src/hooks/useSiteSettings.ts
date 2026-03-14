import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PublicSiteSettings = {
  id: string;
  site_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  min_deposit: number | null;
  max_deposit: number | null;
  min_withdraw: number | null;
  max_withdraw: number | null;
  maintenance_mode: boolean | null;
  deposit_banner_url: string | null;
  promo_message: string | null;
  promo_message_active: boolean | null;
};

let cachedSettings: PublicSiteSettings | null = null;
let inflightRequest: Promise<PublicSiteSettings | null> | null = null;

function applyThemeFromSettings(data: PublicSiteSettings | null) {
  if (!data) return;
  const root = document.documentElement;
  if (data.primary_color) root.style.setProperty("--primary", data.primary_color);
  if (data.secondary_color) root.style.setProperty("--secondary", data.secondary_color);
  if (data.accent_color) root.style.setProperty("--accent", data.accent_color);
  if (data.background_color) root.style.setProperty("--background", data.background_color);
}

async function loadPublicSettings(): Promise<PublicSiteSettings | null> {
  if (cachedSettings) return cachedSettings;
  if (inflightRequest) return inflightRequest;

  inflightRequest = (async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("id,site_name,logo_url,favicon_url,primary_color,secondary_color,accent_color,background_color,min_deposit,max_deposit,min_withdraw,max_withdraw,maintenance_mode,deposit_banner_url,promo_message,promo_message_active")
        .limit(1)
        .single();

      cachedSettings = (data as PublicSiteSettings | null) ?? null;
      applyThemeFromSettings(cachedSettings);
      return cachedSettings;
    } catch {
      return null;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    let active = true;

    loadPublicSettings().then((data) => {
      if (!active) return;
      setSettings(data);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function refetch() {
    cachedSettings = null;
    const data = await loadPublicSettings();
    setSettings(data);
    setLoading(false);
    return data;
  }

  return { settings, loading, refetch };
}
