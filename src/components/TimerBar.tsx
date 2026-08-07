import { Play, Square } from 'lucide-react'
import { useEffect, useState } from 'react'

import { editEntry, newEntryId, startEntry, stopEntry } from '../lib/actions'
import { fmtClock } from '../lib/format'
import { durationMs, myRunningEntries, type EntryRecord } from '../lib/reducer'
import { useStore } from '../lib/store'
import { ProjectPicker } from './ProjectPicker'

export function TimerBar() {
  const { state, version, me } = useStore()
  void version
  const running = myRunningEntries(state, me?.id ?? null)

  return (
    <div
      className="rounded-xl shadow-sm"
      style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
    >
      {running.map((entry, i) => (
        <div
          key={entry.id}
          style={i > 0 ? { borderTopWidth: 1, borderColor: 'var(--border)' } : undefined}
        >
          <Running entry={entry} />
        </div>
      ))}
      <div
        style={running.length > 0 ? { borderTopWidth: 1, borderColor: 'var(--border)' } : undefined}
      >
        <StartRow autoFocus={running.length === 0} />
      </div>
    </div>
  )
}

function StartRow({ autoFocus }: { autoFocus: boolean }) {
  const { dispatch } = useStore()
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)

  async function start() {
    const id = newEntryId()
    await dispatch(startEntry(id, { title: title.trim(), projectId }))
    setTitle('')
    setProjectId(null)
  }

  return (
    <div className="flex flex-col items-stretch gap-2 p-2 sm:flex-row sm:items-center sm:p-2.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void start()
        }}
        placeholder="What are you working on?"
        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[15px] outline-none"
        autoFocus={autoFocus}
      />
      <div className="flex items-center gap-2">
        <ProjectPicker value={projectId} onChange={setProjectId} />
        <button
          type="button"
          onClick={() => void start()}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-transform active:scale-95"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <Play size={16} fill="currentColor" />
          Start
        </button>
      </div>
    </div>
  )
}

function Running({ entry }: { entry: EntryRecord }) {
  const { dispatch, now } = useStore()
  const [title, setTitle] = useState(entry.title)

  // Reset the local field when this row's entry changes identity.
  useEffect(() => setTitle(entry.title), [entry.id])

  function commitTitle() {
    const next = title.trim()
    if (next !== entry.title) void dispatch(editEntry(entry.id, { title: next }))
  }

  return (
    <div className="flex flex-col items-stretch gap-2 p-2 sm:flex-row sm:items-center sm:p-2.5">
      <span className="relative ml-1 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="inline-flex h-2 w-2 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      </span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        placeholder="What are you working on?"
        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[15px] outline-none"
      />
      <div className="flex items-center gap-2">
        <ProjectPicker
          value={entry.projectId}
          onChange={(id) => void dispatch(editEntry(entry.id, { projectId: id }))}
        />
        <span
          className="tnum min-w-[5.5rem] text-right text-lg font-semibold tabular-nums"
          style={{ color: 'var(--accent)' }}
        >
          {fmtClock(durationMs(entry, now))}
        </span>
        <button
          type="button"
          onClick={() => void dispatch(stopEntry(entry.id))}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
          style={{ background: '#e11d48' }}
        >
          <Square size={15} fill="currentColor" />
          Stop
        </button>
      </div>
    </div>
  )
}
