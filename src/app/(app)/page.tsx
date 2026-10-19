import { getSession } from '@/server/auth/session'
import { Button } from '@/shared/components/atoms/Button'
import { Card } from '@/shared/components/atoms/Card'
import { OrnamentDivider } from '@/shared/components/molecules/OrnamentDivider'

const destaques = [
  {
    titulo: 'Fila em tempo real',
    descricao:
      'Mestre e jogadores veem a mesma ordem de iniciativa ao mesmo tempo, atualizada no instante em que a vez passa.',
  },
  {
    titulo: 'Dado d20 do servidor',
    descricao:
      'Toda rolagem acontece no servidor com carrego criptográfico e registro de auditoria — nada de dado viciado no navegador.',
  },
  {
    titulo: 'Timer com passe automático',
    descricao:
      'Cada turno tem seu tempo; se o jogador demorar, a vez passa sozinha e o próximo é avisado com som e aviso visual.',
  },
]

export default async function HomePage() {
  const sessao = await getSession()

  return (
    <main className="flex-1">
      <header className="border-b-2 border-leather-600 bg-gradient-to-b from-leather-700 to-leather-800">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center">
          <p className="font-display text-xs tracking-[0.35em] text-gold-500">
            D&amp;D 5.5E · RASTREADOR DE INICIATIVA
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-gold-300 sm:text-5xl">
            Throw Iniciative
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-serif text-lg text-paper-200">
            Fila em tempo real, d20 rolado no servidor e timer que passa a vez sozinho.
          </p>
        </div>
      </header>
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-14 text-center">
        <div className="flex flex-wrap justify-center gap-4">
          {sessao ? (
            <Button href="/dashboard" size="lg">
              Ir para o painel
            </Button>
          ) : (
            <>
              <Button href="/login" size="lg">
                Entrar
              </Button>
              <Button href="/register" variant="secondary" size="lg">
                Criar conta
              </Button>
            </>
          )}
        </div>
        <OrnamentDivider className="w-full max-w-md" />
        <p className="max-w-2xl font-serif text-ink-700">
          Mestre e jogadores veem a mesma ordem de iniciativa ao mesmo tempo, com desempate pela
          regra oficial e avisos de &ldquo;é a sua vez&rdquo; em som e cor.
        </p>
      </section>
      <section className="mx-auto grid max-w-4xl gap-6 px-6 pb-20 sm:grid-cols-3">
        {destaques.map((destaque) => (
          <Card key={destaque.titulo} titulo={destaque.titulo}>
            <p className="font-serif text-sm text-ink-500">{destaque.descricao}</p>
          </Card>
        ))}
      </section>
    </main>
  )
}
