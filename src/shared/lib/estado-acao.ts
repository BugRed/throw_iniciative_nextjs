// Contrato de estado das Server Actions do app: a action devolve erro legível
// ou ok (com id quando cria recurso). Vive em shared/ para a UI tipar sem
// importar a camada app/.

export type EstadoAcao = { erro: string } | { ok: true; id?: string }

export type AcaoFormulario = (estado: EstadoAcao | null, formData: FormData) => Promise<EstadoAcao>
