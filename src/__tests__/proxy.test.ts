import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { proxy } from '@/proxy'

function requisicaoPara(caminho: string, comCookieSessao: boolean): NextRequest {
  const req = new NextRequest(`http://localhost:3000${caminho}`)
  if (comCookieSessao) {
    req.cookies.set('better-auth.session_token', 'token-teste')
  }
  return req
}

describe('Proxy de borda (proteção de área logada)', () => {
  describe('quando não há cookie de sessão', () => {
    it('deve redirecionar /dashboard para o login', async () => {
      const resposta = await proxy(requisicaoPara('/dashboard', false))
      expect(resposta.status).toBe(307)
      expect(resposta.headers.get('location')).toBe('http://localhost:3000/login')
    })

    it('deve redirecionar rotas internas de rooms/characters/settings', async () => {
      const resposta = await proxy(requisicaoPara('/rooms/abc/settings', false))
      expect(resposta.status).toBe(307)
    })

    it('não deve redirecionar páginas públicas', async () => {
      const resposta = await proxy(requisicaoPara('/login', false))
      expect(resposta.status).toBe(200)
    })
  })

  describe('quando há cookie de sessão', () => {
    it('deve deixar a área logada passar (validação real é no servidor)', async () => {
      const resposta = await proxy(requisicaoPara('/dashboard', true))
      expect(resposta.status).toBe(200)
      expect(resposta.headers.get('location')).toBeNull()
    })
  })
})
