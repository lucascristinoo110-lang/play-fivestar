import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

let sessionId: string | null = null;

function getSessionId() {
  if (sessionId) return sessionId;
  sessionId = sessionStorage.getItem("pv_sid");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("pv_sid", sessionId);
  }
  return sessionId;
}

export function usePageView(page = "/") {
  useEffect(() => {
    const sid = getSessionId();
    supabase
      .from("page_views" as any)
      .insert({ page, session_id: sid } as any)
      .then(() => {});
  }, [page]);
}
