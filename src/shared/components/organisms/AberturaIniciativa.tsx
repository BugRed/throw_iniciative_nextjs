import { Checkbox } from '@/shared/components/atoms/Checkbox'
import { FormAcao } from '@/shared/components/molecules/FormAcao'
import type { CandidatoDados } from '@/shared/components/organisms/iniciativa-tipos'
import type { AcaoFormulario } from '@/shared/lib/estado-acao'

// Abertura: o mestre vê a lista pré-marcada (PJs ativos e NPCs) e desmarca quem
// fica de fora. Cada candidato vai junto, para o servidor saber quem foi
// desmarcado (checkbox desmarcado não aparece no formulário).

export function AberturaIniciativa({
  roomId,
  candidatos,
  acao,
}: {
  roomId: string
  candidatos: CandidatoDados[]
  acao: AcaoFormulario
}) {
  return (
    <section aria-label="Abrir iniciativa" className="flex flex-col gap-2">
      <h2 className="font-display text-xl font-bold text-ink-900">Iniciativa</h2>
      <FormAcao
        acao={acao}
        rotulo="Iniciar iniciativa"
        variante="primary"
        tamanho="md"
        campos={{ roomId }}
      >
        <fieldset className="flex w-full flex-col gap-1">
          <legend className="mb-1 font-sans text-sm text-ink-700">Quem entra no combate</legend>
          {candidatos.map((c) => (
            <span key={c.id}>
              <input type="hidden" name="candidato" value={c.id} />
              <Checkbox rotulo={c.rotulo} name="incluir" value={c.id} defaultChecked />
            </span>
          ))}
        </fieldset>
      </FormAcao>
    </section>
  )
}
