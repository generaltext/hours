import { describe, expect, it } from 'vitest'

import { serializeEvent, type HoursEvent } from './events'
import { foldFrom } from './log'
import { applyEvent, emptyState, type State } from './reducer'

let seq = 0
function ev(type: string, subject: string, data?: Record<string, unknown>): HoursEvent {
  seq += 1
  return {
    id: `evt_${String(seq).padStart(6, '0')}`,
    ts: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(),
    actor: { id: 'u1', name: 'Ada' },
    type,
    subject,
    ...(data ? { data } : {}),
  }
}

describe('file fold cursor', () => {
  const line = (e: HoursEvent) => serializeEvent(e) + '\n'
  const projects = (s: State) => Object.keys(s.projects).sort()

  it('folds only the appended tail when content is a pure extension', () => {
    const a = ev('project.create', 'prj_a', { name: 'A' })
    const b = ev('project.create', 'prj_b', { name: 'B' })
    const s = emptyState()

    const first = line(a)
    const consumed = foldFrom(s, first, 0)
    expect(consumed).toBe(first.length)
    expect(projects(s)).toEqual(['prj_a'])

    // append b; caller resumes from the remembered prefix length
    const full = first + line(b)
    const consumed2 = foldFrom(s, full, consumed)
    expect(consumed2).toBe(full.length)
    expect(projects(s)).toEqual(['prj_a', 'prj_b'])
  })

  it('leaves a half-synced trailing line for the next fold', () => {
    const a = ev('project.create', 'prj_a', { name: 'A' })
    const b = ev('project.create', 'prj_b', { name: 'B' })
    const s = emptyState()
    const partial = line(a) + serializeEvent(b) // no trailing newline yet
    const consumed = foldFrom(s, partial, 0)
    expect(consumed).toBe(line(a).length) // only the complete line
    expect(projects(s)).toEqual(['prj_a'])
    // the newline arrives → b now folds
    foldFrom(s, partial + '\n', consumed)
    expect(projects(s)).toEqual(['prj_a', 'prj_b'])
  })

  it('a full refold picks up events a CRDT merge inserted before the old offset', () => {
    // Regression: a concurrent writer's events can land *before* a previously
    // recorded char offset. A naive tail-slice from that offset skips them; the
    // store guards this by only trusting the offset when the content still
    // starts with the exact prefix it folded, else refolding from 0.
    const local = ev('project.create', 'prj_local', { name: 'Local' })
    const remote = ev('project.create', 'prj_remote', { name: 'Remote' })
    const s = emptyState()

    // we fold our own line and remember the prefix + offset
    const mine = line(local)
    const offset = foldFrom(s, mine, 0)
    expect(projects(s)).toEqual(['prj_local'])

    // merge reorders: the remote event is now ordered *before* ours
    const merged = line(remote) + line(local)
    // the store's guard: mine is no longer a prefix of merged → refold from 0
    expect(merged.startsWith(mine)).toBe(false)
    foldFrom(s, merged, 0)
    expect(projects(s)).toEqual(['prj_local', 'prj_remote'])

    // and a naive tail-slice from the stale offset would indeed have missed it
    const naive = emptyState()
    applyEvent(naive, local)
    foldFrom(naive, merged, offset)
    expect(naive.projects['prj_remote']).toBeUndefined()
  })
})
