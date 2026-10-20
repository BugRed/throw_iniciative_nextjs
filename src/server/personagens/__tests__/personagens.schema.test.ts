import { describe, expect, it } from 'vitest'

import {
  ATRIBUTOS,
  custoPointBuy,
  custoTotalPointBuy,
  esquemaAtributos,
  esquemaEdicaoPersonagem,
  esquemaPersonagemNovo,
} from '@/server/personagens/personagens.schema'

// Point buy e limites especificados em docs/negocio/personagens-calculos.md.

const ATRIBUTOS_TODOS_8 = {
  forca: 8,
  destreza: 8,
  constituicao: 8,
  inteligencia: 8,
  sabedoria: 8,
  carisma: 8,
}

function atributosCom(alteracoes: Partial<Record<(typeof ATRIBUTOS)[number], number>>) {
  return { ...ATRIBUTOS_TODOS_8, ...alteracoes }
}

function entradaValida(alteracoes: Partial<Record<(typeof ATRIBUTOS)[number], number>> = {}) {
  return {
    especie: 'human',
    classe: 'fighter',
    background: 'soldier',
    atributos: atributosCom(alteracoes),
    nome: 'Bree',
  }
}

describe('custoPointBuy', () => {
  it('deve seguir a tabela oficial (8 grátis, 14 e 15 com salto)', () => {
    expect(custoPointBuy(8)).toBe(0)
    expect(custoPointBuy(9)).toBe(1)
    expect(custoPointBuy(10)).toBe(2)
    expect(custoPointBuy(11)).toBe(3)
    expect(custoPointBuy(12)).toBe(4)
    expect(custoPointBuy(13)).toBe(5)
    expect(custoPointBuy(14)).toBe(7)
    expect(custoPointBuy(15)).toBe(9)
  })

  it('deve devolver infinito para valor fora da tabela em vez de NaN', () => {
    expect(custoPointBuy(7)).toBe(Number.POSITIVE_INFINITY)
    expect(custoPointBuy(16)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('custoTotalPointBuy', () => {
  it('deve custar 0 com todos em 8', () => {
    expect(custoTotalPointBuy(ATRIBUTOS_TODOS_8)).toBe(0)
  })

  it('deve custar exatamente 27 nas distribuições clássicas', () => {
    expect(custoTotalPointBuy(atributosCom({ forca: 15, destreza: 15, constituicao: 15 }))).toBe(27)
    expect(
      custoTotalPointBuy(
        atributosCom({
          forca: 15,
          destreza: 14,
          constituicao: 13,
          sabedoria: 12,
          inteligencia: 10,
        }),
      ),
    ).toBe(27)
  })
})

describe('esquemaAtributos', () => {
  it('deve aceitar atributos entre 8 e 15', () => {
    expect(esquemaAtributos.safeParse(atributosCom({ forca: 15, destreza: 8 }))).toEqual(
      expect.objectContaining({ success: true }),
    )
  })

  it('deve rejeitar abaixo de 8 e acima de 15 com mensagem do point buy', () => {
    const baixo = esquemaAtributos.safeParse(atributosCom({ forca: 7 }))
    expect(baixo.success).toBe(false)

    const alto = esquemaAtributos.safeParse(atributosCom({ forca: 16 }))
    expect(alto.success).toBe(false)
    if (!alto.success) {
      expect(alto.error.issues[0]?.message).toBe('Máximo 15 no point buy.')
    }
  })

  it('deve rejeitar valor não inteiro', () => {
    expect(esquemaAtributos.safeParse(atributosCom({ constituicao: 10.5 })).success).toBe(false)
  })
})

describe('esquemaPersonagemNovo', () => {
  it('deve aceitar ficha válida e aplicar defaults de listas e privacidade', () => {
    const parsed = esquemaPersonagemNovo.parse(entradaValida())
    expect(parsed.pericias).toEqual([])
    expect(parsed.magias).toEqual([])
    expect(parsed.equipamento).toEqual([])
    expect(parsed.feats).toEqual([])
    expect(parsed.visivelAoMestre).toBe(true)
  })

  it('deve rejeitar custo total acima de 27 apontando para atributos', () => {
    // 15/15/15/9 = 9+9+9+1 = 28.
    const parsed = esquemaPersonagemNovo.safeParse(
      entradaValida({ forca: 15, destreza: 15, constituicao: 15, inteligencia: 9 }),
    )
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes('atributos'))).toBe(true)
    }
  })

  it('deve aceitar custo abaixo de 27 (jogador pode não gastar tudo)', () => {
    expect(esquemaPersonagemNovo.safeParse(entradaValida()).success).toBe(true)
  })

  it('deve rejeitar nome vazio e aparar espaços ao redor', () => {
    expect(esquemaPersonagemNovo.safeParse({ ...entradaValida(), nome: '' }).success).toBe(false)
    expect(esquemaPersonagemNovo.parse({ ...entradaValida(), nome: '  Bree  ' }).nome).toBe('Bree')
  })
})

describe('esquemaEdicaoPersonagem', () => {
  it('deve aceitar edição vazia (nada muda)', () => {
    expect(esquemaEdicaoPersonagem.parse({})).toEqual({})
  })

  it('deve rejeitar nível fora de 1–20', () => {
    expect(esquemaEdicaoPersonagem.safeParse({ nivel: 0 }).success).toBe(false)
    expect(esquemaEdicaoPersonagem.safeParse({ nivel: 21 }).success).toBe(false)
  })

  it('deve rejeitar nome acima de 50 caracteres', () => {
    expect(esquemaEdicaoPersonagem.safeParse({ nome: 'a'.repeat(51) }).success).toBe(false)
  })
})
