/**
 * Brazilian & South American team badge URLs.
 * Uses Wikipedia/Wikimedia Commons logos (reliable CDN).
 */
const TEAM_BADGES: Record<string, string> = {
  // Brasileirão Série A - Using Wikipedia logos (stable CDN)
  "Flamengo": "https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg",
  "Palmeiras": "https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg",
  "Corinthians": "https://upload.wikimedia.org/wikipedia/pt/b/b4/Corinthians_simbolo.png",
  "São Paulo": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg",
  "Atlético-MG": "https://upload.wikimedia.org/wikipedia/commons/3/3f/Atletico_mineiro_galo.png",
  "Atlético Mineiro": "https://upload.wikimedia.org/wikipedia/commons/3/3f/Atletico_mineiro_galo.png",
  "Cruzeiro": "https://upload.wikimedia.org/wikipedia/commons/9/90/Cruzeiro_Esporte_Clube_%28logo%29.svg",
  "Grêmio": "https://upload.wikimedia.org/wikipedia/commons/8/83/Gremio_logo.svg",
  "Internacional": "https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg",
  "Botafogo": "https://upload.wikimedia.org/wikipedia/commons/c/c1/Botafogo_de_Futebol_e_Regatas_logo.svg",
  "Fluminense": "https://upload.wikimedia.org/wikipedia/commons/2/2b/Fluminense_fc_logo.svg",
  "Santos": "https://upload.wikimedia.org/wikipedia/commons/1/15/Santos_Logo.png",
  "Bahia": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Esporte_Clube_Bahia_logo.svg",
  "Fortaleza": "https://upload.wikimedia.org/wikipedia/commons/5/55/Fortaleza_Esporte_Clube_logo.svg",
  "Vasco da Gama": "https://upload.wikimedia.org/wikipedia/commons/1/14/Vasco_da_Gama_logo.svg",
  "Vasco": "https://upload.wikimedia.org/wikipedia/commons/1/14/Vasco_da_Gama_logo.svg",
  "Athletico-PR": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Club_Athletico_Paranaense_2019.svg",
  "Athletico Paranaense": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Club_Athletico_Paranaense_2019.svg",
  "Bragantino": "https://upload.wikimedia.org/wikipedia/commons/0/09/Red_Bull_Bragantino_logo.svg",
  "Cuiabá": "https://upload.wikimedia.org/wikipedia/pt/5/5b/Cuiab%C3%A1_Esporte_Clube.png",
  "Juventude": "https://upload.wikimedia.org/wikipedia/commons/0/05/EC_Juventude_logo.svg",
  // Série B
  "Sport": "https://upload.wikimedia.org/wikipedia/commons/3/34/Sport_Club_do_Recife.png",
  "Ceará": "https://upload.wikimedia.org/wikipedia/commons/a/a8/Ceara_Sporting_Club_logo.svg",
  "Guarani": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Guarani_FC_logo.svg",
  "Ponte Preta": "https://upload.wikimedia.org/wikipedia/commons/4/41/AA_Ponte_Preta.svg",
  "Vila Nova": "https://upload.wikimedia.org/wikipedia/commons/7/73/Vila_Nova_FC_logo.svg",
  "Goiás": "https://upload.wikimedia.org/wikipedia/commons/5/59/Goias_Esporte_Clube_logo.svg",
  "Avaí": "https://upload.wikimedia.org/wikipedia/commons/e/e0/Avai_FC_%28SC%29_logo.svg",
  "Chapecoense": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Chapecoense_logo.svg",
  "Operário-PR": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Operar%CC%81io_Ferroviario_Esporte_Clube.png",
  "CRB": "https://upload.wikimedia.org/wikipedia/commons/5/5c/CRB_logo.svg",
  "Novorizontino": "https://upload.wikimedia.org/wikipedia/commons/6/6b/Gr%C3%AAmio_Novorizontino_logo.svg",
  "Mirassol": "https://upload.wikimedia.org/wikipedia/commons/1/14/Mirassol_Futebol_Clube_logo.svg",
  "Coritiba": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Coritiba_FBC_2011_-_Logo.svg",
  // International (Libertadores / Sul-Americana)
  "River Plate": "https://upload.wikimedia.org/wikipedia/commons/a/ac/Escudo_del_C_A_River_Plate.svg",
  "Boca Juniors": "https://upload.wikimedia.org/wikipedia/commons/4/41/Club_atl%C3%A9tico_boca_juniors_logo.svg",
  "Peñarol": "https://upload.wikimedia.org/wikipedia/commons/6/63/Escudo_del_Club_Atl%C3%A9tico_Pe%C3%B1arol.svg",
  "Nacional": "https://upload.wikimedia.org/wikipedia/commons/5/5d/Club_Nacional_de_Football_logo.svg",
  "Cerro Porteño": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Cerro_Porte%C3%B1o_emblem.svg",
  "Olimpia": "https://upload.wikimedia.org/wikipedia/commons/f/f6/Olimpia_escudo.svg",
  "Independiente": "https://upload.wikimedia.org/wikipedia/commons/c/c8/Independiente_Rivadavia_logo.svg",
  "LDU Quito": "https://upload.wikimedia.org/wikipedia/commons/8/86/LDU_Quito_logo.svg",
  "Racing": "https://upload.wikimedia.org/wikipedia/commons/5/56/Racing_Club_logo.svg",
  "Defensa y Justicia": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Defensa_y_Justicia_logo.svg",
  "Talleres": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Talleres_de_C%C3%B3rdoba_2022_logo.svg",
  "Colón": "https://upload.wikimedia.org/wikipedia/commons/5/52/Colon_santa_fe_logo.svg",
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
