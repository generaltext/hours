import { useState } from 'react'
import { Clock, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { entriesList, type EntryRecord } from '../lib/reducer'
import { TimerBar } from '../components/TimerBar'
import { EntryList } from '../components/EntryList'
import { EntryEditor } from '../components/EntryEditor'
import { Button, EmptyState } from '../components/common'

export function TrackView() {
  const { state, version } = useStore()
  void version
  const [editing, setEditing] = useState<EntryRecord | null>(null)
  const [adding, setAdding] = useState(false)
  const entries = entriesList(state)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5">
      <TimerBar />

      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          {entries.length > 0 ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}` : 'Entries'}
        </h2>
        <Button variant="ghost" onClick={() => setAdding(true)}>
          <Plus size={15} />
          Add time
        </Button>
      </div>

      {entries.length === 0 ? (
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
        <EntryList entries={entries} onEdit={setEditing} />
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
