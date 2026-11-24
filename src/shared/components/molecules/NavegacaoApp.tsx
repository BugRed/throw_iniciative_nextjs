'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Navegação do app autenticado. Só rotas que existem — salas entram aqui
// quando a P7 entregar a tela.

const ITENS = [
  { href: '/dashboard', rotulo: 'Início' },
  { href: '/characters', rotulo: 'Personagens' },
  { href: '/npcs', rotulo: 'NPCs' },
]

export function NavegacaoApp() {
  const caminho = usePathname()

  return (
    <nav aria-label="Navegação principal" className="flex items-center gap-1">
      {ITENS.map(({ href, rotulo }) => {
        const ativo = caminho.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 font-sans text-sm transition-colors ${
              ativo
                ? 'bg-gold-400/20 font-semibold text-gold-300'
                : 'text-paper-200 hover:bg-paper-200/10 hover:text-gold-300'
            }`}
          >
            {rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
