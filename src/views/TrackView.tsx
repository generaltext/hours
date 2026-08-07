import { Clock, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button, EmptyState } from '../components/common'
import { EntryEditor } from '../components/EntryEditor'
import { EntryList } from '../components/EntryList'
import { TimerBar } from '../components/TimerBar'
import { entriesList, type EntryRecord } from '../lib/reducer'
import { useStore } from '../lib/store'

export function TrackView() {
  const { state, version, ready } = useStore()
  void version
  const [editing, setEditing] = useState<EntryRecord | null>(null)
  const [adding, setAdding] = useState(false)
  const entries = entriesList(state)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5">
      <TimerBar />

      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          {entries.length > 0
            ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
            : 'Entries'}
        </h2>
        <Button variant="ghost" onClick={() => setAdding(true)}>
          <Plus size={15} />
          Add time
        </Button>
      </div>

      {entries.length > 0 ? (
        <EntryList entries={entries} onEdit={setEditing} />
      ) : ready ? (
        <EmptyState
          icon={Clock}
          title="No time tracked yet"
          hint="Start the timer above, or add a past entry manually. Every entry is a plain line you own."
          action={
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus size={15} />
              Add time
            </Button>
          }
        />
      ) : (
        <Skeleton />
      )}

      {(editing || adding) && (
        <EntryEditor
          {...(editing ? { entry: editing } : {})}
          onClose={() => {
            setEditing(null)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

// A calm placeholder shown only during the brief first boot when nothing is
// cached yet — so the list area doesn't flash the "no entries" empty state.
function Skeleton() {
  return (
    <div
      className="rounded-xl"
      style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-3.5"
          style={i > 0 ? { borderTopWidth: 1, borderColor: 'var(--border)' } : undefined}
        >
          <div className="flex-1">
            <div
              className="h-3.5 w-1/3 animate-pulse rounded"
              style={{ background: 'var(--hover)' }}
            />
            <div
              className="mt-2 h-2.5 w-1/5 animate-pulse rounded"
              style={{ background: 'var(--hover)' }}
            />
          </div>
          <div
            className="h-3.5 w-12 animate-pulse rounded"
            style={{ background: 'var(--hover)' }}
          />
        </div>
      ))}
    </div>
  )
}
