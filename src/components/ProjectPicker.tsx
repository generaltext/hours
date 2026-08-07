import { Check, ChevronDown, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { createProject, newProjectId } from '../lib/actions'
import { normalizeProjectName } from '../lib/model'
import { projectsList } from '../lib/reducer'
import { useStore } from '../lib/store'
import { ProjectChip, NoProject, ProjectDot } from './ProjectChip'

export function ProjectPicker({
  value,
  onChange,
  size = 'md',
}: {
  value: string | null
  onChange: (id: string | null) => void
  size?: 'sm' | 'md'
}) {
  const { state, version, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  void version
  const projects = projectsList(state)
  const current = value ? state.projects[value] : undefined

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const filtered = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects
  const normalized = normalizeProjectName(query)
  const exists = projects.some((p) => p.name.toLowerCase() === normalized.toLowerCase())
  const canCreate = normalized.length > 0 && !exists

  function pick(id: string | null) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  async function create() {
    if (!canCreate) return
    const id = newProjectId()
    await dispatch(createProject(id, { name: normalized }))
    pick(id)
  }

  const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm'

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-md ${pad} transition-colors hover:bg-[var(--hover)]`}
        style={{ borderWidth: 1, borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        {current ? <ProjectChip name={current.name} color={current.color} /> : <NoProject />}
        <ChevronDown size={14} style={{ color: 'var(--muted)' }} />
      </button>

      {open && (
        <div
          className="absolute left-0 z-40 mt-1 w-72 rounded-lg py-1 shadow-xl"
          style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2 px-2.5 pt-1 pb-1.5">
            <Search size={14} style={{ color: 'var(--muted)' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) {
                  e.preventDefault()
                  void create()
                }
              }}
              placeholder="Find or create a project…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div
            className="max-h-64 overflow-y-auto pt-1"
            style={{ borderTopWidth: 1, borderColor: 'var(--border)' }}
          >
            <Row selected={value === null} onClick={() => pick(null)}>
              <NoProject />
            </Row>
            {filtered.map((p) => (
              <Row key={p.id} selected={value === p.id} onClick={() => pick(p.id)}>
                <ProjectChip name={p.name} color={p.color} />
              </Row>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={() => void create()}
                className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[var(--hover)]"
                style={{ color: 'var(--accent)' }}
              >
                <Plus size={14} />
                Create “{normalized}”
              </button>
            )}
            {filtered.length === 0 && !canCreate && (
              <div className="px-2.5 py-2 text-xs" style={{ color: 'var(--muted)' }}>
                No projects yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[var(--hover)]"
    >
      <span className="min-w-0 truncate">{children}</span>
      {selected && <Check size={14} style={{ color: 'var(--accent)' }} />}
    </button>
  )
}

// Re-export for convenience in dense rows.
export { ProjectDot }
