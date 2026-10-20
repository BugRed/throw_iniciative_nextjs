// Fórmulas da ficha — implementação de docs/negocio/personagens-calculos.md.
// Funções puras: sem Prisma, sem sessão, testadas direto.

export function modificadorDeAtributo(pontuacao: number): number {
  return Math.floor((pontuacao - 10) / 2)
}

export function proficienciaPorNivel(nivel: number): number {
  return 2 + Math.floor((Math.max(1, nivel) - 1) / 4)
}

// HP máximo por nível: nível 1 é hit_die + mod(CON); cada nível seguinte soma a
// média do dado de vida (⌊hitDie/2⌋ + 1) + mod(CON) — progressão padrão por média.
export function hpMaximo(hitDie: number, constituicao: number, nivel: number): number {
  const modCon = modificadorDeAtributo(constituicao)
  const mediaPorNivel = Math.floor(hitDie / 2) + 1 + modCon
  return Math.max(1, hitDie + modCon + (Math.max(1, nivel) - 1) * mediaPorNivel)
}

export function classeDeArmadura(destreza: number): number {
  return 10 + modificadorDeAtributo(destreza)
}

// Alert (SRD 5.2, "Initiative Proficiency"): soma o bônus de proficiência.
export function modificadorDeIniciativa(
  destreza: number,
  temFeatAlert: boolean,
  nivel: number,
): number {
  const bonusAlert = temFeatAlert ? proficienciaPorNivel(nivel) : 0
  return modificadorDeAtributo(destreza) + bonusAlert
}
