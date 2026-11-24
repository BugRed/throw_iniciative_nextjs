// Lista única dos eventos SSE da sala: o servidor publica e o cliente escuta
// (EventSource só entrega evento nomeado a quem registrou o nome).
export const TIPOS_EVENTO_SALA = [
  'member:requested',
  'member:joined',
  'member:rejected',
  'member:left',
  'member:kicked',
  'character:changed',
  'npc:added',
  'npc:removed',
  'master:transferred',
  'room:destroyed',
  'room:paused',
  'room:resumed',
  'initiative:changed',
  'notification:new',
] as const

export type TipoEventoSala = (typeof TIPOS_EVENTO_SALA)[number]
