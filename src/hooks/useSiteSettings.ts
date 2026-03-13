import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from("site_settings").select("*").limit(1).single();
    setSettings(data);
    setLoading(false);

    // Apply dynamic colors
    if (data) {
      const root = document.documentElement;
      if (data.primary_color) root.style.setProperty("--primary", data.primary_color);
      if (data.secondary_color) root.style.setProperty("--secondary", data.secondary_color);
      if (data.accent_color) root.style.setProperty("--accent", data.accent_color);
      if (data.background_color) root.style.setProperty("--background", data.background_color);
    }
  }

  return { settings, loading, refetch: fetchSettings };
}
