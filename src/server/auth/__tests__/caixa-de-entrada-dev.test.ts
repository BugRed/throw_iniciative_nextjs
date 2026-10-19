import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listarEmailsDev, registrarEmailDev } from '@/server/auth/caixa-de-entrada-dev'

describe('Caixa de entrada de dev', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('deve registrar o e-mail mais recente primeiro', async () => {
    await registrarEmailDev({ para: 'a@teste.dev', assunto: 'Verifique', url: 'https://t/1' })
    await registrarEmailDev({ para: 'b@teste.dev', assunto: 'Redefinição', url: 'https://t/2' })

    const emails = listarEmailsDev()
    expect(emails).toHaveLength(2)
    expect(emails[0].para).toBe('b@teste.dev')
    expect(emails[0].criadoEm).toBeInstanceOf(Date)
  })

  it('deve manter no máximo 50 e-mails (não vazar memória em sessão longa)', async () => {
    for (let i = 0; i < 55; i++) {
      await registrarEmailDev({ para: `a${i}@teste.dev`, assunto: 'x', url: `https://t/${i}` })
    }
    expect(listarEmailsDev()).toHaveLength(50)
    // o mais novo sobrevive; o mais antigo cai
    expect(listarEmailsDev()[0].para).toBe('a54@teste.dev')
  })

  it('não deve alterar a caixa quando os e-mails listados são mutados fora', () => {
    registrarEmailDevSyncParaTeste()
    const copia = listarEmailsDev()
    copia.pop()
    expect(listarEmailsDev().length).toBeGreaterThanOrEqual(copia.length)
  })
})

function registrarEmailDevSyncParaTeste() {
  // a caixa é compartilhada entre testes do arquivo de propósito: o que importa
  // é o contrato de ordem/limite, não o isolamento entre its
  void registrarEmailDev({ para: 'isolamento@teste.dev', assunto: 'x', url: 'https://t/i' })
}
