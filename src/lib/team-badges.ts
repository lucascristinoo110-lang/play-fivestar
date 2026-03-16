/**
 * Brazilian & South American team badge URLs.
 * Uses local files stored in public/badges/ for reliability.
 */
const TEAM_BADGES: Record<string, string> = {
  // Brasileirão Série A
  "Flamengo": "/badges/flamengo.png",
  "Palmeiras": "/badges/palmeiras.png",
  "Corinthians": "/badges/corinthians.png",
  "São Paulo": "/badges/sao-paulo.png",
  "Atlético-MG": "/badges/atletico-mg.png",
  "Atlético Mineiro": "/badges/atletico-mg.png",
  "Cruzeiro": "/badges/cruzeiro.png",
  "Grêmio": "/badges/gremio.png",
  "Internacional": "/badges/internacional.png",
  "Botafogo": "/badges/botafogo.png",
  "Fluminense": "/badges/fluminense.png",
  "Santos": "/badges/santos.png",
  "Bahia": "/badges/bahia.png",
  "Fortaleza": "/badges/fortaleza.png",
  "Vasco da Gama": "/badges/vasco.png",
  "Vasco": "/badges/vasco.png",
  "Athletico-PR": "/badges/athletico-pr.png",
  "Athletico Paranaense": "/badges/athletico-pr.png",
  "Bragantino": "/badges/bragantino.png",
  "Cuiabá": "/badges/cuiaba.png",
  "Juventude": "/badges/juventude.png",
  // Série B
  "Sport": "/badges/sport.png",
  "Ceará": "/badges/ceara.png",
  // International (Libertadores / Sul-Americana)
  "River Plate": "/badges/river-plate.png",
  "Boca Juniors": "/badges/boca-juniors.png",
};

/**
 * Get badge URL for a team name.
 * Tries exact match first, then partial match.
 */
export function getTeamBadge(teamName: string): string {
  if (!teamName) return "";
  if (TEAM_BADGES[teamName]) return TEAM_BADGES[teamName];
  const lower = teamName.toLowerCase();
  for (const [key, url] of Object.entries(TEAM_BADGES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return url;
    }
  }
  return "";
}
