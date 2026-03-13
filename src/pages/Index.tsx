import { useState } from "react";
import { CasinoSidebar } from "@/components/casino/CasinoSidebar";
import { TopBar } from "@/components/casino/TopBar";
import { HeroBanner } from "@/components/casino/HeroBanner";
import { GameGrid } from "@/components/casino/GameGrid";
import { RecentWinsCarousel } from "@/components/casino/RecentWinsCarousel";
import { DepositModal } from "@/components/casino/DepositModal";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <CasinoSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onSearch={setSearchQuery} onDeposit={() => setDepositOpen(true)} />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <HeroBanner />
          <RecentWinsCarousel />
          <GameGrid searchQuery={searchQuery} />
        </main>
      </div>
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
};

export default Index;
