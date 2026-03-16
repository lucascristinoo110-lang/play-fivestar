// Deterministic odds generation for all markets
function seed(home: string, away: string): number {
  return `${home}-${away}`.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function generate1x2(home: string, away: string) {
  const s = seed(home, away);
  return {
    home: Number((1.7 + (s % 95) / 100).toFixed(2)),
    draw: Number((2.8 + (s % 55) / 100).toFixed(2)),
    away: Number((1.8 + ((s * 3) % 95) / 100).toFixed(2)),
  };
}

export function generateDoubleChance(home: string, away: string) {
  const o = generate1x2(home, away);
  return {
    home_draw: Number((1 / (1 / o.home + 1 / o.draw)).toFixed(2)),
    home_away: Number((1 / (1 / o.home + 1 / o.away)).toFixed(2)),
    draw_away: Number((1 / (1 / o.draw + 1 / o.away)).toFixed(2)),
  };
}

export function generateOverUnder(home: string, away: string) {
  const s = seed(home, away);
  return {
    over_1_5: Number((1.25 + (s % 30) / 100).toFixed(2)),
    under_1_5: Number((3.2 + (s % 40) / 100).toFixed(2)),
    over_2_5: Number((1.8 + (s % 50) / 100).toFixed(2)),
    under_2_5: Number((1.9 + (s % 45) / 100).toFixed(2)),
    over_3_5: Number((2.5 + (s % 60) / 100).toFixed(2)),
    under_3_5: Number((1.4 + (s % 25) / 100).toFixed(2)),
  };
}

export function generateBothScore(home: string, away: string) {
  const s = seed(home, away);
  return {
    both_yes: Number((1.7 + (s % 40) / 100).toFixed(2)),
    both_no: Number((2.0 + (s % 35) / 100).toFixed(2)),
  };
}

export function generateExactScores(home: string, away: string) {
  const s = seed(home, away);
  const scores = [
    "1-0", "0-1", "2-1", "1-2", "2-0", "0-2",
    "1-1", "2-2", "0-0", "3-0", "0-3", "3-1", "1-3", "3-2", "2-3",
  ];
  return scores.map((score, i) => ({
    score,
    betType: `score_${score.replace("-", "_")}`,
    odds: Number((4.5 + ((s * (i + 1)) % 250) / 10).toFixed(2)),
  }));
}

export function getAllMarkets(home: string, away: string) {
  return {
    "1x2": generate1x2(home, away),
    double_chance: generateDoubleChance(home, away),
    over_under: generateOverUnder(home, away),
    both_score: generateBothScore(home, away),
    exact_score: generateExactScores(home, away),
  };
}

export const BET_TYPE_LABELS: Record<string, string> = {
  home: "Casa", draw: "Empate", away: "Fora",
  home_draw: "1 ou Empate", home_away: "1 ou 2", draw_away: "Empate ou 2",
  over_1_5: "Mais de 1.5", under_1_5: "Menos de 1.5",
  over_2_5: "Mais de 2.5", under_2_5: "Menos de 2.5",
  over_3_5: "Mais de 3.5", under_3_5: "Menos de 3.5",
  both_yes: "Sim", both_no: "Não",
  accumulator: "Acumulada",
};

export function getBetTypeLabel(betType: string): string {
  if (betType.startsWith("score_")) {
    return betType.replace("score_", "").replace("_", "-");
  }
  return BET_TYPE_LABELS[betType] || betType;
}

export function getMarketLabel(market: string): string {
  const labels: Record<string, string> = {
    "1x2": "1x2",
    double_chance: "Dupla Chance",
    over_under: "Gols",
    both_score: "Ambas Marcam",
    exact_score: "Placar Exato",
  };
  return labels[market] || market;
}
