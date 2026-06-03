export type Team = { f: string; n: string; c: string };

export const TEAMS: Team[] = [
  { f: "🇺🇸", n: "Estados Unidos", c: "CONCACAF" },
  { f: "🇨🇦", n: "Canadá", c: "CONCACAF" },
  { f: "🇲🇽", n: "México", c: "CONCACAF" },
  { f: "🇨🇷", n: "Costa Rica", c: "CONCACAF" },
  { f: "🇵🇦", n: "Panamá", c: "CONCACAF" },
  { f: "🇯🇲", n: "Jamaica", c: "CONCACAF" },
  { f: "🇧🇷", n: "Brasil", c: "CONMEBOL" },
  { f: "🇦🇷", n: "Argentina", c: "CONMEBOL" },
  { f: "🇺🇾", n: "Uruguai", c: "CONMEBOL" },
  { f: "🇨🇴", n: "Colômbia", c: "CONMEBOL" },
  { f: "🇪🇨", n: "Equador", c: "CONMEBOL" },
  { f: "🇵🇾", n: "Paraguai", c: "CONMEBOL" },
  { f: "🇵🇪", n: "Peru", c: "CONMEBOL" },
  { f: "🇪🇸", n: "Espanha", c: "UEFA" },
  { f: "🇫🇷", n: "França", c: "UEFA" },
  { f: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", n: "Inglaterra", c: "UEFA" },
  { f: "🇵🇹", n: "Portugal", c: "UEFA" },
  { f: "🇩🇪", n: "Alemanha", c: "UEFA" },
  { f: "🇮🇹", n: "Itália", c: "UEFA" },
  { f: "🇳🇱", n: "Holanda", c: "UEFA" },
  { f: "🇧🇪", n: "Bélgica", c: "UEFA" },
  { f: "🇭🇷", n: "Croácia", c: "UEFA" },
  { f: "🇩🇰", n: "Dinamarca", c: "UEFA" },
  { f: "🇨🇭", n: "Suíça", c: "UEFA" },
  { f: "🇦🇹", n: "Áustria", c: "UEFA" },
  { f: "🇵🇱", n: "Polônia", c: "UEFA" },
  { f: "🇷🇸", n: "Sérvia", c: "UEFA" },
  { f: "🇹🇷", n: "Turquia", c: "UEFA" },
  { f: "🇳🇴", n: "Noruega", c: "UEFA" },
  { f: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", n: "País de Gales", c: "UEFA" },
  { f: "🇲🇦", n: "Marrocos", c: "CAF" },
  { f: "🇸🇳", n: "Senegal", c: "CAF" },
  { f: "🇳🇬", n: "Nigéria", c: "CAF" },
  { f: "🇪🇬", n: "Egito", c: "CAF" },
  { f: "🇬🇭", n: "Gana", c: "CAF" },
  { f: "🇨🇲", n: "Camarões", c: "CAF" },
  { f: "🇩🇿", n: "Argélia", c: "CAF" },
  { f: "🇨🇮", n: "Costa do Marfim", c: "CAF" },
  { f: "🇹🇳", n: "Tunísia", c: "CAF" },
  { f: "🇯🇵", n: "Japão", c: "AFC" },
  { f: "🇰🇷", n: "Coreia do Sul", c: "AFC" },
  { f: "🇮🇷", n: "Irã", c: "AFC" },
  { f: "🇦🇺", n: "Austrália", c: "AFC" },
  { f: "🇸🇦", n: "Arábia Saudita", c: "AFC" },
  { f: "🇶🇦", n: "Catar", c: "AFC" },
  { f: "🇮🇶", n: "Iraque", c: "AFC" },
  { f: "🇺🇿", n: "Uzbequistão", c: "AFC" },
  { f: "🇳🇿", n: "Nova Zelândia", c: "OFC" },
];

export function rndTeam(): Team {
  return TEAMS[Math.floor(Math.random() * TEAMS.length)];
}

export function buildReelSeq(landingTeam: Team, length = 26): Team[] {
  const seq: Team[] = [];
  for (let i = 0; i < length; i++) seq.push(rndTeam());
  seq[length - 2] = landingTeam;
  return seq;
}
