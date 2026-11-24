import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { refresh, hook } = vi.hoisted(() => ({ refresh: vi.fn(), hook: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/shared/lib/use-room-events', () => ({ useRoomEvents: hook }))

import { AtualizadorSala } from '@/shared/components/molecules/AtualizadorSala'

describe('AtualizadorSala', () => {
  it('deve escutar a sala certa e pedir a página de novo a cada aviso', () => {
    const { container } = render(<AtualizadorSala roomId="r-1" />)

    expect(hook).toHaveBeenCalledWith('r-1', expect.any(Function))
    hook.mock.calls[0][1]('npc:added')

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(container).toBeEmptyDOMElement()
  })
})
