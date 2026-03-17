import { useMemo, useState } from "react";
import { CasinoSidebar } from "@/components/casino/CasinoSidebar";
import { TopBar } from "@/components/casino/TopBar";
import { HeroBanner } from "@/components/casino/HeroBanner";
import { GameGrid } from "@/components/casino/GameGrid";
import { RecentWinsCarousel } from "@/components/casino/RecentWinsCarousel";
import { DepositModal } from "@/components/casino/DepositModal";
import { AgeVerificationModal } from "@/components/casino/AgeVerificationModal";
import { AuthOverlayModal, type AuthMode } from "@/components/casino/AuthOverlayModal";
import { SportsHighlights } from "@/components/casino/SportsHighlights";
import { CasinoFooter } from "@/components/casino/CasinoFooter";
import { BottomNavBar } from "@/components/casino/BottomNavBar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  

  const forcedFilter = useMemo(() => {
    const category = searchParams.get("category");
    const filter = searchParams.get("filter");

    if (filter === "hot" || filter === "new") return filter;
    if (category === "slots" || category === "live" || category === "table" || category === "crash") return category;
    return null;
  }, [searchParams]);

  return (
    <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
      {!user && <AgeVerificationModal />}

      {!user && authMode && (
        <AuthOverlayModal
          open={!!authMode}
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthMode(null)}
        />
      )}

      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`${isMobile ? "fixed inset-y-0 left-0 z-50 transition-transform duration-200" : ""} ${isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"}`}>
        <CasinoSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onSearch={setSearchQuery}
          onDeposit={() => setDepositOpen(true)}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onOpenAuth={setAuthMode}
        />

        <main className={`flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto ${isMobile ? "pb-24" : ""}`}>
          <HeroBanner />
          <SportsHighlights />
          <RecentWinsCarousel />
          <GameGrid searchQuery={searchQuery} forcedFilter={forcedFilter} onSearch={setSearchQuery} />
          <CasinoFooter />
        </main>
      </div>

      {isMobile && <BottomNavBar onDeposit={() => setDepositOpen(true)} onOpenAuth={setAuthMode} />}

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
};

export default Index;
