/**
 * Brazilian & South American team badge URLs from TheSportsDB.
 * Used as fallback when the API doesn't return badge data.
 * Auto-matched by team name (case-insensitive, partial match).
 */
const TEAM_BADGES: Record<string, string> = {
  // Brasileirão Série A
  "Flamengo": "https://r2.thesportsdb.com/images/media/team/badge/qqvrxs1423788830.png",
  "Palmeiras": "https://r2.thesportsdb.com/images/media/team/badge/xpvyyr1423788786.png",
  "Corinthians": "https://r2.thesportsdb.com/images/media/team/badge/trxwts1423788741.png",
  "São Paulo": "https://r2.thesportsdb.com/images/media/team/badge/wwysst1423788860.png",
  "Atlético-MG": "https://r2.thesportsdb.com/images/media/team/badge/ytrxws1423788693.png",
  "Cruzeiro": "https://r2.thesportsdb.com/images/media/team/badge/qsyyqt1423788749.png",
  "Grêmio": "https://r2.thesportsdb.com/images/media/team/badge/qrvsrt1423788771.png",
  "Internacional": "https://r2.thesportsdb.com/images/media/team/badge/rqxryq1423788778.png",
  "Botafogo": "https://r2.thesportsdb.com/images/media/team/badge/wtvrqr1423788723.png",
  "Fluminense": "https://r2.thesportsdb.com/images/media/team/badge/yrpsrx1423788763.png",
  "Santos": "https://r2.thesportsdb.com/images/media/team/badge/tvwyss1423788845.png",
  "Bahia": "https://r2.thesportsdb.com/images/media/team/badge/rqvwqr1423788701.png",
  "Fortaleza": "https://r2.thesportsdb.com/images/media/team/badge/bhi4l81597830221.png",
  "Vasco da Gama": "https://r2.thesportsdb.com/images/media/team/badge/sxvrst1423788868.png",
  "Vasco": "https://r2.thesportsdb.com/images/media/team/badge/sxvrst1423788868.png",
  "Athletico-PR": "https://r2.thesportsdb.com/images/media/team/badge/z8bfar1596893903.png",
  "Coritiba": "https://r2.thesportsdb.com/images/media/team/badge/x3yuw81597830389.png",
  "Bragantino": "https://r2.thesportsdb.com/images/media/team/badge/b1m4hf1596893836.png",
  "Cuiabá": "https://r2.thesportsdb.com/images/media/team/badge/bxj7p81619713928.png",
  "Juventude": "https://r2.thesportsdb.com/images/media/team/badge/kzlmb21619714129.png",
  "América-MG": "https://r2.thesportsdb.com/images/media/team/badge/yvslxq1596893576.png",
  // Série B
  "Sport": "https://r2.thesportsdb.com/images/media/team/badge/xsxvpx1423788853.png",
  "Ceará": "https://r2.thesportsdb.com/images/media/team/badge/6f2x3r1596893699.png",
  "Guarani": "https://r2.thesportsdb.com/images/media/team/badge/rsy2ow1596893973.png",
  "Ponte Preta": "https://r2.thesportsdb.com/images/media/team/badge/xtqxpp1596894189.png",
  "Vila Nova": "https://r2.thesportsdb.com/images/media/team/badge/zyaqxw1596894390.png",
  "Goiás": "https://r2.thesportsdb.com/images/media/team/badge/usvwtv1596893943.png",
  "Avaí": "https://r2.thesportsdb.com/images/media/team/badge/yptrqr1596893628.png",
  "Chapecoense": "https://r2.thesportsdb.com/images/media/team/badge/4xg0kd1596893717.png",
  "Operário-PR": "https://r2.thesportsdb.com/images/media/team/badge/hv4ms41596894146.png",
  "CRB": "https://r2.thesportsdb.com/images/media/team/badge/i4vu8d1596893751.png",
  "Novorizontino": "https://r2.thesportsdb.com/images/media/team/badge/zyrqhm1596894121.png",
  "Mirassol": "https://r2.thesportsdb.com/images/media/team/badge/jb3fxr1596894079.png",
  // International (Copa Libertadores / Sul-Americana)
  "River Plate": "https://r2.thesportsdb.com/images/media/team/badge/xusqqs1424041091.png",
  "Boca Juniors": "https://r2.thesportsdb.com/images/media/team/badge/uyxwsu1424040706.png",
  "Peñarol": "https://r2.thesportsdb.com/images/media/team/badge/tswupx1424042573.png",
  "Nacional": "https://r2.thesportsdb.com/images/media/team/badge/rpqxwr1424042508.png",
  "Cerro Porteño": "https://r2.thesportsdb.com/images/media/team/badge/wqwyqw1468462801.png",
  "Olimpia": "https://r2.thesportsdb.com/images/media/team/badge/u2q5wq1468462902.png",
  "Independiente": "https://r2.thesportsdb.com/images/media/team/badge/wqvwvy1424040864.png",
  "LDU Quito": "https://r2.thesportsdb.com/images/media/team/badge/syqpxs1468462641.png",
  "Racing": "https://r2.thesportsdb.com/images/media/team/badge/rvvstp1424041041.png",
  "Defensa y Justicia": "https://r2.thesportsdb.com/images/media/team/badge/fcm8bj1546636698.png",
  "Talleres": "https://r2.thesportsdb.com/images/media/team/badge/vpwuvq1424041206.png",
  "Colón": "https://r2.thesportsdb.com/images/media/team/badge/yuvxqs1424040751.png",
};

/**
 * Get badge URL for a team name.
 * Tries exact match first, then partial match.
 */
export function getTeamBadge(teamName: string): string {
  if (!teamName) return "";
  // Exact match
  if (TEAM_BADGES[teamName]) return TEAM_BADGES[teamName];
  // Partial match (e.g. "Vasco da Gama" matches "Vasco")
  const lower = teamName.toLowerCase();
  for (const [key, url] of Object.entries(TEAM_BADGES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return url;
    }
  }
  return "";
}
