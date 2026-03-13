import game1 from "@/assets/game-1.jpg";
import game2 from "@/assets/game-2.jpg";
import game3 from "@/assets/game-3.jpg";
import game4 from "@/assets/game-4.jpg";
import game5 from "@/assets/game-5.jpg";
import game6 from "@/assets/game-6.jpg";
import game7 from "@/assets/game-7.jpg";
import game8 from "@/assets/game-8.jpg";

export type Game = {
  id: string;
  name: string;
  provider: "playfiver" | "igamewin";
  category: "slots" | "live" | "table" | "crash";
  image: string;
  isHot?: boolean;
  isNew?: boolean;
};

export const games: Game[] = [
  { id: "1", name: "Fruit Bonanza", provider: "playfiver", category: "slots", image: game1, isHot: true },
  { id: "2", name: "Royal Roulette", provider: "igamewin", category: "table", image: game2 },
  { id: "3", name: "Poker Masters", provider: "playfiver", category: "table", image: game3, isNew: true },
  { id: "4", name: "Blackjack Pro", provider: "igamewin", category: "table", image: game4 },
  { id: "5", name: "Rocket Crash", provider: "playfiver", category: "crash", image: game5, isHot: true },
  { id: "6", name: "Dice Inferno", provider: "igamewin", category: "crash", image: game6 },
  { id: "7", name: "Live Casino VIP", provider: "igamewin", category: "live", image: game7, isNew: true },
  { id: "8", name: "Treasure Hunt", provider: "playfiver", category: "slots", image: game8 },
  { id: "9", name: "Fruit Bonanza 2", provider: "igamewin", category: "slots", image: game1 },
  { id: "10", name: "Roulette Deluxe", provider: "playfiver", category: "table", image: game2, isHot: true },
  { id: "11", name: "Poker Night", provider: "igamewin", category: "table", image: game3 },
  { id: "12", name: "Blackjack VIP", provider: "playfiver", category: "table", image: game4, isNew: true },
  { id: "13", name: "Space Crash", provider: "igamewin", category: "crash", image: game5 },
  { id: "14", name: "Lucky Dice", provider: "playfiver", category: "crash", image: game6, isHot: true },
  { id: "15", name: "Live Baccarat", provider: "playfiver", category: "live", image: game7 },
  { id: "16", name: "Gold Rush", provider: "igamewin", category: "slots", image: game8, isNew: true },
];
