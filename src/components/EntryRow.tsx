import { useState } from 'react'
import { Archive, ChevronDown, ChevronRight, Pencil, Play, Square } from 'lucide-react'
import { useStore } from '../lib/store'
import { durationMs, isRunning, type EntryRecord } from '../lib/reducer'
import { archiveEntry, newEntryId, startEntry, stopEntry } from '../lib/actions'
import { fmtClock, fmtDuration, fmtTimeRange } from '../lib/format'
import { Markdown } from '../lib/markdown'
import { Avatar, IconButton } from './common'
import { ProjectChip, NoProject } from './ProjectChip'
import { TagList } from './TagEditor'

export function EntryRow({ entry, onEdit }: { entry: EntryRecord; onEdit: (e: EntryRecord) => void }) {
  const { state, dispatch, now } = useStore()
  const [expanded, setExpanded] = useState(false)
  const running = isRunning(entry)
  const project = entry.projectId ? state.projects[entry.projectId] : undefined
  const dur = durationMs(entry, now)
  const hasNotes = entry.description.trim().length > 0

  function resume() {
    // Start a fresh timer from this entry. Concurrent timers are allowed, so
    // this never stops another running timer.
    void dispatch(
      startEntry(newEntryId(), {
        projectId: entry.projectId,
        title: entry.title,
        description: entry.description,
        tags: entry.tags,
      }),
    )
  }

  return (
    <div
      className="group rounded-lg transition-colors hover:bg-[var(--hover)]"
      style={running ? { background: 'color-mix(in srgb, var(--accent) 7%, transparent)' } : undefined}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {running && (
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: 'var(--accent)' }}
                />
                <span className="inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
              </span>
            )}
            <span className="truncate text-[15px]">
              {entry.title || <span style={{ color: 'var(--faint)' }}>Untitled</span>}
            </span>
            {hasNotes && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? 'Hide notes' : 'Show notes'}
                className="inline-flex shrink-0 items-center rounded p-0.5 transition-colors hover:bg-[var(--hover)]"
                style={{ color: 'var(--muted)' }}
              >
                {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            {project ? (
              <ProjectChip name={project.name} color={project.color} className="text-[13px]" />
            ) : (
              <span className="text-[13px]">
                <NoProject />
              </span>
            )}
            <TagList tags={entry.tags} />
          </div>
        </div>

        <div className="hidden text-right text-xs sm:block" style={{ color: 'var(--muted)' }}>
          {fmtTimeRange(entry.startedAt, entry.endedAt)}
        </div>

        <div
          className="tnum w-20 shrink-0 text-right text-[15px] font-semibold tabular-nums"
          style={running ? { color: 'var(--accent)' } : undefined}
        >
          {running ? fmtClock(dur) : fmtDuration(dur)}
        </div>

        <div className="hidden sm:block">
          <Avatar actor={entry.createdBy} size={22} />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {running ? (
            <IconButton icon={Square} title="Stop" onClick={() => void dispatch(stopEntry(entry.id))} />
          ) : (
            <IconButton icon={Play} title="Resume" onClick={resume} />
          )}
          <IconButton icon={Pencil} title="Edit" onClick={() => onEdit(entry)} />
          <IconButton icon={Archive} title="Archive" onClick={() => void dispatch(archiveEntry(entry.id))} />
        </div>
      </div>

      {expanded && hasNotes && (
        <div
          className="mx-3 mb-2.5 rounded-md px-3 py-2"
          style={{ background: 'var(--bg)', borderWidth: 1, borderColor: 'var(--border)', color: 'var(--fg2)' }}
        >
          <Markdown source={entry.description} />
        </div>
      )}
    </div>
  )
}
