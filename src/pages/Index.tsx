import { useState } from "react";
import { CasinoSidebar } from "@/components/casino/CasinoSidebar";
import { TopBar } from "@/components/casino/TopBar";
import { HeroBanner } from "@/components/casino/HeroBanner";
import { GameGrid } from "@/components/casino/GameGrid";
import { RecentWinsCarousel } from "@/components/casino/RecentWinsCarousel";
import { LiveCasinoSection } from "@/components/casino/LiveCasinoSection";
import { DepositModal } from "@/components/casino/DepositModal";
import { AgeVerificationModal } from "@/components/casino/AgeVerificationModal";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Age verification for non-logged users */}
      {!user && <AgeVerificationModal />}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 transition-transform duration-200' : ''}
        ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <CasinoSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onSearch={setSearchQuery}
          onDeposit={() => setDepositOpen(true)}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          <HeroBanner />
          <RecentWinsCarousel />
          <GameGrid searchQuery={searchQuery} />
          <LiveCasinoSection />
        </main>
      </div>
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
};

export default Index;
