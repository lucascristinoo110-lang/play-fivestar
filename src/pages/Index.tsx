import { useState } from "react";
import { CasinoSidebar } from "@/components/casino/CasinoSidebar";
import { TopBar } from "@/components/casino/TopBar";
import { HeroBanner } from "@/components/casino/HeroBanner";
import { GameGrid } from "@/components/casino/GameGrid";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <CasinoSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onSearch={setSearchQuery} />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <HeroBanner />
          <GameGrid searchQuery={searchQuery} />
        </main>
      </div>
    </div>
  );
};

export default Index;
