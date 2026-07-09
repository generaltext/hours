import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, FolderOpen, Play, Clock, Square } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../lib/store'
import { myRunningEntries, projectsList } from '../lib/reducer'
import { newEntryId, startEntry, stopEntry } from '../lib/actions'
import { ProjectChip } from './ProjectChip'

interface Command {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  node?: React.ReactNode
  run: () => void
}

export function CommandBar() {
  const { state, version, me, dispatch } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  void version

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const running = myRunningEntries(state, me?.id ?? null)

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = []
    list.push({
      id: 'start',
      label: 'Start a timer',
      icon: Play,
      run: () => void dispatch(startEntry(newEntryId(), {})),
    })
    for (const r of running) {
      const label = r.title || (r.projectId ? (state.projects[r.projectId]?.name ?? 'timer') : 'timer')
      list.push({
        id: `stop-${r.id}`,
        label: `Stop: ${label}`,
        icon: Square,
        run: () => void dispatch(stopEntry(r.id)),
      })
    }
    if (running.length > 1) {
      list.push({
        id: 'stop-all',
        label: 'Stop all timers',
        icon: Square,
        run: () => void dispatch(running.map((r) => stopEntry(r.id))),
      })
    }
    list.push(
      { id: 'go-track', label: 'Go to Track', icon: Clock, run: () => navigate('/') },
      { id: 'go-reports', label: 'Go to Reports', icon: BarChart3, run: () => navigate('/reports') },
      { id: 'go-projects', label: 'Go to Projects', icon: FolderOpen, run: () => navigate('/projects') },
    )
    for (const p of projectsList(state)) {
      list.push({
        id: `start-${p.id}`,
        label: `Start timer: ${p.name}`,
        hint: 'project',
        icon: Play,
        node: (
          <span className="inline-flex items-center gap-2">
            <Play size={14} style={{ color: 'var(--muted)' }} />
            <span style={{ color: 'var(--muted)' }}>Start</span>
            <ProjectChip name={p.name} color={p.color} />
          </span>
        ),
        run: () => void dispatch(startEntry(newEntryId(), { projectId: p.id })),
      })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, me?.id])

  const q = query.trim().toLowerCase()
  const filtered = q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands
  const clamped = Math.min(active, Math.max(0, filtered.length - 1))

  function exec(c: Command | undefined) {
    if (!c) return
    c.run()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
      style={{ background: 'color-mix(in srgb, black 45%, transparent)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl shadow-2xl"
        style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              exec(filtered[clamped])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder="Type a command…"
          className="w-full bg-transparent px-4 py-3.5 text-[15px] outline-none"
          style={{ borderBottomWidth: 1, borderColor: 'var(--border)' }}
        />
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
              No matching command.
            </div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => exec(c)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm"
              style={i === clamped ? { background: 'var(--hover)' } : undefined}
            >
              {c.node ?? (
                <>
                  <c.icon size={15} style={{ color: 'var(--muted)' }} />
                  <span>{c.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
