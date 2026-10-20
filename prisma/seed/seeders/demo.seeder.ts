import { prisma } from '../prisma'

// Elenco de demonstração para testar personagens (P5) e preparar as salas (P7):
// PJs da jogadora, NPCs completos do mestre com stats livres de monstro
// (regra de docs/negocio/personagens-calculos.md — fora do point buy por design).
// Idempotente: ficha que já existe para o dono com o mesmo nome é pulada.
// Usuários NÃO são criados aqui (conta é fluxo de auth) — o seeder avisa se
// faltar algum e segue com os que existem.

type Atributos = {
  forca: number
  destreza: number
  constituicao: number
  inteligencia: number
  sabedoria: number
  carisma: number
}

type FichaDemo = {
  donoEmail: string
  nome: string
  // NPCs de monstro não têm espécie jogável no SRD — especieSlug null.
  especieSlug: string | null
  classeSlug: string
  backgroundSlug: string
  nivel: number
  atributos: Atributos
  pericias: string[]
  magias: string[]
  equipamento: string[]
  npc: boolean
}

function mod(valor: number): number {
  return Math.floor((valor - 10) / 2)
}

function proficiencia(nivel: number): number {
  return 2 + Math.floor((Math.max(1, nivel) - 1) / 4)
}

// HP e iniciativa derivados como o service faz (nível 1 = dado + mod(CON);
// níveis seguintes pela média — um NPC de nível 1 usa o dado da classe chassis).
function stats(ficha: FichaDemo, hitDie: number) {
  const hpMax = Math.max(1, hitDie + mod(ficha.atributos.constituicao))
  return {
    hpMax,
    hpCurrent: hpMax,
    armorClass: 10 + mod(ficha.atributos.destreza),
    initiativeMod: mod(ficha.atributos.destreza),
    proficiencyBonus: proficiencia(ficha.nivel),
  }
}

const ELENCO: FichaDemo[] = [
  {
    donoEmail: 'aria-teste@dev.local',
    nome: 'Lyra',
    especieSlug: 'elf',
    classeSlug: 'wizard',
    backgroundSlug: 'sage',
    nivel: 1,
    atributos: {
      forca: 8,
      destreza: 14,
      constituicao: 12,
      inteligencia: 15,
      sabedoria: 10,
      carisma: 8,
    },
    pericias: ['arcana', 'investigation'],
    magias: ['fire-bolt', 'magic-missile', 'shield'],
    equipamento: ['quarterstaff', 'component-pouch', 'spellbook'],
    npc: false,
  },
  {
    donoEmail: 'aria-teste@dev.local',
    nome: 'Pip',
    especieSlug: 'halfling',
    classeSlug: 'rogue',
    backgroundSlug: 'criminal',
    nivel: 1,
    atributos: {
      forca: 8,
      destreza: 15,
      constituicao: 10,
      inteligencia: 12,
      sabedoria: 14,
      carisma: 8,
    },
    pericias: ['stealth', 'perception'],
    magias: [],
    equipamento: ['shortsword', 'thieves-tools', 'leather-armor'],
    npc: false,
  },
  {
    // NPCs completos: classe chassis fighter, stats de monstro (SRD 5.2)
    donoEmail: 'mestre@teste.dev',
    nome: 'Goblin',
    especieSlug: null,
    classeSlug: 'fighter',
    backgroundSlug: 'soldier',
    nivel: 1,
    atributos: {
      forca: 8,
      destreza: 14,
      constituicao: 10,
      inteligencia: 10,
      sabedoria: 8,
      carisma: 8,
    },
    pericias: ['stealth'],
    magias: [],
    equipamento: ['scimitar', 'shield'],
    npc: true,
  },
  {
    donoEmail: 'mestre@teste.dev',
    nome: 'Esqueleto',
    especieSlug: null,
    classeSlug: 'fighter',
    backgroundSlug: 'soldier',
    nivel: 1,
    atributos: {
      forca: 10,
      destreza: 14,
      constituicao: 15,
      inteligencia: 6,
      sabedoria: 8,
      carisma: 5,
    },
    pericias: [],
    magias: [],
    equipamento: ['shortsword', 'shield'],
    npc: true,
  },
  {
    donoEmail: 'mestre@teste.dev',
    nome: 'Lobo',
    especieSlug: null,
    classeSlug: 'fighter',
    backgroundSlug: 'soldier',
    nivel: 1,
    atributos: {
      forca: 12,
      destreza: 15,
      constituicao: 12,
      inteligencia: 3,
      sabedoria: 12,
      carisma: 6,
    },
    pericias: ['perception', 'stealth'],
    magias: [],
    equipamento: [],
    npc: true,
  },
]

export async function seedDemo(): Promise<void> {
  console.log('🎭 Seedando elenco de demonstração...')

  const usuarios = await prisma.user.findMany({
    where: { email: { in: [...new Set(ELENCO.map((f) => f.donoEmail))] } },
    select: { id: true, email: true },
  })
  const idPorEmail = new Map(usuarios.map((u) => [u.email, u.id]))

  const slugsClasses = [...new Set(ELENCO.map((f) => f.classeSlug))]
  const classes = await prisma.srdClass.findMany({
    where: { slug: { in: slugsClasses } },
    select: { id: true, slug: true, hitDie: true },
  })
  const classePorSlug = new Map(classes.map((c) => [c.slug, c]))

  const especies = await prisma.srdSpecies.findMany({
    where: {
      slug: {
        in: [...new Set(ELENCO.map((f) => f.especieSlug).filter((s): s is string => s !== null))],
      },
    },
    select: { id: true, slug: true },
  })
  const especiePorSlug = new Map(especies.map((e) => [e.slug, e.id]))

  const backgrounds = await prisma.srdBackground.findMany({
    where: { slug: { in: [...new Set(ELENCO.map((f) => f.backgroundSlug))] } },
    select: { id: true, slug: true },
  })
  const backgroundPorSlug = new Map(backgrounds.map((b) => [b.slug, b.id]))

  let criadas = 0
  let puladas = 0
  for (const ficha of ELENCO) {
    const donoId = idPorEmail.get(ficha.donoEmail)
    const classe = classePorSlug.get(ficha.classeSlug)
    if (!donoId || !classe) {
      console.warn(
        `⚠ ${ficha.nome}: dono ${ficha.donoEmail} ausente — pulada (registre o usuário e rode de novo)`,
      )
      continue
    }

    const existe = await prisma.character.findFirst({
      where: { ownerUserId: donoId, name: ficha.nome },
      select: { id: true },
    })
    if (existe) {
      puladas++
      continue
    }

    await prisma.character.create({
      data: {
        ownerUserId: donoId,
        name: ficha.nome,
        level: ficha.nivel,
        isNpc: ficha.npc,
        isVisibleToMaster: true,
        speciesId: ficha.especieSlug ? (especiePorSlug.get(ficha.especieSlug) ?? null) : null,
        classId: classe.id,
        backgroundId: backgroundPorSlug.get(ficha.backgroundSlug) ?? null,
        strength: ficha.atributos.forca,
        dexterity: ficha.atributos.destreza,
        constitution: ficha.atributos.constituicao,
        intelligence: ficha.atributos.inteligencia,
        wisdom: ficha.atributos.sabedoria,
        charisma: ficha.atributos.carisma,
        skillProficiencies: ficha.pericias,
        preparedSpells: ficha.magias,
        equipment: ficha.equipamento,
        feats: [],
        ...stats(ficha, classe.hitDie),
      },
    })
    criadas++
  }

  console.log(`✅ Elenco: ${criadas} ficha(s) criada(s), ${puladas} já existente(s) pulada(s).`)
}
