// Ordem e desempate (docs/negocio/iniciativa.md): total → modificador → re-rolagem
// só entre os empatados, repetida até desempatar. Funções puras.

export type Ordenavel = {
  id: string
  rollResult: number
  initiativeMod: number
  // d20 de cada rodada de desempate, em ordem.
  tiebreakRolls: number[]
}

export type ResultadoOrdem<T extends Ordenavel> = {
  ordem: T[]
  // Quem ainda precisa rolar o desempate para a ordem ficar definitiva.
  pendentesDesempate: string[]
}

function agruparPor<T>(lista: T[], chave: (item: T) => number): T[][] {
  const grupos = new Map<number, T[]>()
  for (const item of lista) grupos.set(chave(item), [...(grupos.get(chave(item)) ?? []), item])
  return [...grupos.entries()].sort(([a], [b]) => b - a).map(([, grupo]) => grupo)
}

// Resolve um grupo empatado na rodada `rodada` (0 = primeira re-rolagem).
// Se alguém ainda não rolou essa rodada, o grupo não pode ser comparado: fica na
// ordem em que está e quem falta entra nos pendentes.
function resolverGrupo<T extends Ordenavel>(grupo: T[], rodada: number): ResultadoOrdem<T> {
  if (grupo.length < 2) return { ordem: grupo, pendentesDesempate: [] }
  const faltam = grupo.filter((p) => p.tiebreakRolls.length <= rodada)
  if (faltam.length > 0) return { ordem: grupo, pendentesDesempate: faltam.map((p) => p.id) }
  const partes = agruparPor(grupo, (p) => p.tiebreakRolls[rodada]).map((g) =>
    resolverGrupo(g, rodada + 1),
  )
  return {
    ordem: partes.flatMap((r) => r.ordem),
    pendentesDesempate: partes.flatMap((r) => r.pendentesDesempate),
  }
}

export function ordenarIniciativa<T extends Ordenavel>(participantes: T[]): ResultadoOrdem<T> {
  const partes = agruparPor(participantes, (p) => p.rollResult).flatMap((porTotal) =>
    agruparPor(porTotal, (p) => p.initiativeMod).map((g) => resolverGrupo(g, 0)),
  )
  return {
    ordem: partes.flatMap((r) => r.ordem),
    pendentesDesempate: partes.flatMap((r) => r.pendentesDesempate),
  }
}
