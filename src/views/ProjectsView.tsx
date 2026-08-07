import { Archive, ArchiveRestore, FolderOpen, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button, EmptyState, Field, IconButton, Modal, TextInput } from '../components/common'
import { ProjectChip, ProjectDot } from '../components/ProjectChip'
import {
  archiveProject,
  createProject,
  newProjectId,
  restoreProject,
  updateProject,
} from '../lib/actions'
import { fmtDuration } from '../lib/format'
import { normalizeProjectName, TAG_PALETTE } from '../lib/model'
import { durationMs, projectsList, type ProjectRecord } from '../lib/reducer'
import { useStore } from '../lib/store'

export function ProjectsView() {
  const { state, version, now, dispatch } = useStore()
  void version
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<ProjectRecord | null>(null)
  const [creating, setCreating] = useState(false)

  const projects = projectsList(state, showArchived)

  const totals = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of Object.values(state.entries)) {
      if (e.archived || !e.projectId) continue
      m.set(e.projectId, (m.get(e.projectId) ?? 0) + durationMs(e, now))
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, now])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold">Projects</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? 'Hide archived' : 'Show archived'}
          </Button>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={15} />
            New project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          hint="Create a project to assign time to. Nest with a slash — “Acme/Website” groups under “Acme”."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={15} />
              New project
            </Button>
          }
        />
      ) : (
        <div
          className="rounded-xl"
          style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
        >
          {projects.map((p, i) => (
            <div
              key={p.id}
              className="group flex items-center gap-3 px-4 py-3"
              style={{
                ...(i > 0 ? { borderTopWidth: 1, borderColor: 'var(--border)' } : {}),
                ...(p.archived ? { opacity: 0.55 } : {}),
              }}
            >
              <div className="min-w-0 flex-1">
                <ProjectChip name={p.name} color={p.color} />
              </div>
              <span className="tnum w-20 text-right text-sm font-medium tabular-nums">
                {fmtDuration(totals.get(p.id) ?? 0)}
              </span>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <IconButton icon={Pencil} title="Edit" onClick={() => setEditing(p)} />
                {p.archived ? (
                  <IconButton
                    icon={ArchiveRestore}
                    title="Restore"
                    onClick={() => void dispatch(restoreProject(p.id))}
                  />
                ) : (
                  <IconButton
                    icon={Archive}
                    title="Archive"
                    onClick={() => void dispatch(archiveProject(p.id))}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ProjectEditor
          {...(editing ? { project: editing } : {})}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function ProjectEditor({ project, onClose }: { project?: ProjectRecord; onClose: () => void }) {
  const { dispatch } = useStore()
  const editing = !!project
  const [name, setName] = useState(project?.name ?? '')
  const [color, setColor] = useState<string | null>(project?.color ?? null)

  const normalized = normalizeProjectName(name)
  const valid = normalized.length > 0

  async function save() {
    if (!valid) return
    if (editing) {
      await dispatch(updateProject(project.id, { name: normalized, color }))
    } else {
      await dispatch(createProject(newProjectId(), { name: normalized, color }))
    }
    onClose()
  }

  return (
    <Modal
      title={editing ? 'Edit project' : 'New project'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={!valid}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Name (use / to nest, e.g. Acme/Website)">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
            }}
          />
        </Field>

        <Field label="Color">
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {TAG_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={
                  color === c ? { outline: '2px solid var(--accent)', outlineOffset: 2 } : undefined
                }
              >
                <ProjectDot name={c} color={c} size={18} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setColor(null)}
              className="ml-1 text-xs"
              style={{ color: 'var(--muted)' }}
            >
              Auto
            </button>
          </div>
        </Field>
      </div>
    </Modal>
  )
}
