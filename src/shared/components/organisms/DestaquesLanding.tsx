import { Card } from '@/shared/components/atoms/Card'

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

export function DestaquesLanding() {
  return (
    <section className="mx-auto grid max-w-4xl gap-6 px-6 pb-20 sm:grid-cols-3">
      {destaques.map((destaque) => (
        <Card key={destaque.titulo} titulo={destaque.titulo}>
          <p className="font-serif text-sm text-ink-500">{destaque.descricao}</p>
        </Card>
      ))}
    </section>
  )
}
