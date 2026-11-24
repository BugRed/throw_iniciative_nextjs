import { Badge } from '@/shared/components/atoms/Badge'
import { FormAcao } from '@/shared/components/molecules/FormAcao'
import type { AcoesLobby, MembroLobbyDados } from '@/shared/components/organisms/lobby-tipos'

function AcoesDoMestre({
  roomId,
  membro,
  acoes,
}: {
  roomId: string
  membro: MembroLobbyDados
  acoes: Pick<AcoesLobby, 'expulsar' | 'passarCargo'>
}) {
  const campos = { roomId, usuarioId: membro.userId }
  return (
    <div className="flex gap-2">
      <FormAcao
        acao={acoes.passarCargo}
        rotulo="Passar o cargo"
        campos={campos}
        confirmar={`Passar o cargo de mestre para ${membro.nome}?`}
      />
      <FormAcao
        acao={acoes.expulsar}
        rotulo="Expulsar"
        variante="danger"
        campos={campos}
        confirmar={`Expulsar ${membro.nome}? Ele não poderá voltar a esta sala.`}
      />
    </div>
  )
}

export function MembrosSala({
  roomId,
  membros,
  ehMestre,
  acoes,
}: {
  roomId: string
  membros: MembroLobbyDados[]
  ehMestre: boolean
  acoes: Pick<AcoesLobby, 'expulsar' | 'passarCargo'>
}) {
  return (
    <section aria-label="Membros" className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-ink-900">Mesa</h2>
      <ul className="flex flex-col gap-2">
        {membros.map((membro) => (
          <li
            key={membro.userId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-paper-300 px-4 py-2"
          >
            <div className="flex flex-col">
              <span className="font-serif text-ink-900">
                {membro.nome} {membro.papel === 'master' && <Badge variante="gold">Mestre</Badge>}
              </span>
              {membro.papel === 'player' && (
                <span className="font-sans text-sm text-ink-500">
                  {membro.pj
                    ? `${membro.pj.nome} · ${membro.pj.classe} nível ${membro.pj.nivel}`
                    : 'Sem personagem'}
                </span>
              )}
            </div>
            {ehMestre && membro.papel === 'player' && (
              <AcoesDoMestre roomId={roomId} membro={membro} acoes={acoes} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
