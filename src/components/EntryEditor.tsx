import { useState } from 'react'
import { useStore } from '../lib/store'
import type { EntryRecord } from '../lib/reducer'
import { editEntry, logEntry, newEntryId } from '../lib/actions'
import { fmtDuration, fromLocalInput, toLocalInput } from '../lib/format'
import { Button, Field, Modal, TextInput } from './common'
import { ProjectPicker } from './ProjectPicker'
import { TagEditor } from './TagEditor'

function defaultStart(): string {
  return toLocalInput(new Date(Date.now() - 3600000).toISOString())
}
function defaultEnd(): string {
  return toLocalInput(new Date().toISOString())
}

export function EntryEditor({ entry, onClose }: { entry?: EntryRecord; onClose: () => void }) {
  const { dispatch } = useStore()
  const editing = !!entry
  const running = editing && entry.endedAt === null

  const [start, setStart] = useState(entry ? toLocalInput(entry.startedAt) : defaultStart())
  const [end, setEnd] = useState(entry?.endedAt ? toLocalInput(entry.endedAt) : editing ? '' : defaultEnd())
  const [projectId, setProjectId] = useState<string | null>(entry?.projectId ?? null)
  const [title, setTitle] = useState(entry?.title ?? '')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [tags, setTags] = useState<string[]>(entry?.tags ?? [])

  const startIso = fromLocalInput(start)
  const endIso = fromLocalInput(end)
  const spanMs = startIso && endIso ? Date.parse(endIso) - Date.parse(startIso) : null
  const endBeforeStart = spanMs !== null && spanMs < 0
  // On create an end is required; on edit an empty end means "leave running".
  const missingEnd = !editing && !endIso
  const valid = !!startIso && !endBeforeStart && !missingEnd

  async function save() {
    if (!valid || !startIso) return
    if (editing) {
      await dispatch(
        editEntry(entry.id, {
          startedAt: startIso,
          endedAt: endIso,
          projectId,
          title: title.trim(),
          description: description.trim(),
          tags,
        }),
      )
    } else {
      if (!endIso) return
      await dispatch(
        logEntry(newEntryId(), {
          startedAt: startIso,
          endedAt: endIso,
          projectId,
          title: title.trim(),
          description: description.trim(),
          tags,
        }),
      )
    }
    onClose()
  }

  return (
    <Modal
      title={editing ? 'Edit entry' : 'Add time'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={!valid}>
            {editing ? 'Save' : 'Add entry'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Title">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What did you work on?"
            autoFocus
          />
        </Field>

        <Field label="Project">
          <div>
            <ProjectPicker value={projectId} onChange={setProjectId} />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <TextInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={running ? 'End (leave blank to keep running)' : 'End'}>
            <TextInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>

        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
          <span>
            {endBeforeStart
              ? 'End is before start.'
              : missingEnd
                ? 'Set an end time.'
                : spanMs !== null
                  ? `Duration: ${fmtDuration(spanMs)}`
                  : running
                    ? 'Running'
                    : ''}
          </span>
        </div>

        <Field label="Tags">
          <TagEditor tags={tags} onChange={setTags} />
        </Field>

        <Field label="Description (Markdown, optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Longer notes — supports **bold**, lists, links…"
            className="w-full resize-y rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-[var(--accent)]"
            style={{ borderWidth: 1, borderColor: 'var(--border)', background: 'var(--bg)' }}
          />
        </Field>
      </div>
    </Modal>
  )
}
