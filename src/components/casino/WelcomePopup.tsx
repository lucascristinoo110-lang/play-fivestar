import { useEffect, useState, useCallback } from "react";
import { X, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WelcomePopupProps {
  onDeposit: () => void;
}

const POPUP_SHOWN_KEY = "welcome_popup_shown";

export function WelcomePopup({ onDeposit }: WelcomePopupProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState<{
    welcome_popup_active: boolean;
    welcome_popup_title: string;
    welcome_popup_body: string;
    welcome_popup_button_text: string;
    welcome_popup_timer_minutes: number;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [hasDeposit, setHasDeposit] = useState<boolean | null>(null);

  // Load settings
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("welcome_popup_active,welcome_popup_title,welcome_popup_body,welcome_popup_button_text,welcome_popup_timer_minutes")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as any);
      });
  }, []);

  // Check if user already deposited
  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "deposit")
      .eq("status", "completed")
      .limit(1)
      .then(({ data }) => {
        setHasDeposit(!!(data && data.length > 0));
      });
  }, [user]);

  // Decide whether to show
  useEffect(() => {
    if (!user || !settings || hasDeposit === null) return;
    if (!settings.welcome_popup_active) return;
    if (hasDeposit) return;

    const shownFor = localStorage.getItem(POPUP_SHOWN_KEY);
    if (shownFor === user.id) return;

    // Show after a small delay for UX
    const t = setTimeout(() => {
      setSecondsLeft((settings.welcome_popup_timer_minutes || 10) * 60);
      setVisible(true);
      localStorage.setItem(POPUP_SHOWN_KEY, user.id);
    }, 1500);
    return () => clearTimeout(t);
  }, [user, settings, hasDeposit]);

  // Countdown
  useEffect(() => {
    if (!visible || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const close = useCallback(() => setVisible(false), []);

  const handleDeposit = useCallback(() => {
    setVisible(false);
    onDeposit();
  }, [onDeposit]);

  if (!visible || !settings) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const bodyLines = (settings.welcome_popup_body || "").split("\n");

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-auto sm:mx-4 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="relative rounded-t-3xl sm:rounded-2xl overflow-hidden border border-border/40 shadow-2xl bg-card">
          {/* Glow effect top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon header */}
          <div className="flex flex-col items-center pt-8 pb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Gift className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-4 text-center space-y-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground leading-tight">
              {settings.welcome_popup_title}
            </h2>

            <div className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
              {bodyLines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-2" />;
                const isHighlight =
                  line.includes("💰") || line.includes("✅") || line.includes("⚠️") || line.includes("👉") || line.includes("⏳");
                return (
                  <p
                    key={i}
                    className={
                      isHighlight
                        ? "text-foreground font-semibold text-sm"
                        : ""
                    }
                  >
                    {line}
                  </p>
                );
              })}
            </div>

            {/* Countdown */}
            {secondsLeft > 0 && (
              <div className="flex items-center justify-center gap-3 py-3">
                <TimerBox value={String(minutes).padStart(2, "0")} label="min" />
                <span className="text-xl font-bold text-accent animate-pulse">:</span>
                <TimerBox value={String(seconds).padStart(2, "0")} label="seg" />
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="px-6 pb-8">
            <button
              onClick={handleDeposit}
              className="w-full py-4 rounded-xl font-extrabold text-base sm:text-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {settings.welcome_popup_button_text}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimerBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-secondary rounded-lg px-4 py-2 min-w-[56px] border border-border/40">
        <span className="text-2xl font-mono font-bold text-accent tabular-nums">
          {value}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
