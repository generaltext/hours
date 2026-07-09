import { useStore } from '../lib/store'
import { durationMs, type EntryRecord } from '../lib/reducer'
import { dayKey, fmtDayHeading, fmtDuration } from '../lib/format'
import { EntryRow } from './EntryRow'

interface DayGroup {
  key: string
  entries: EntryRecord[]
  total: number
}

function groupByDay(entries: EntryRecord[], now: number): DayGroup[] {
  const map = new Map<string, EntryRecord[]>()
  for (const e of entries) {
    const k = dayKey(e.startedAt)
    const arr = map.get(k)
    if (arr) arr.push(e)
    else map.set(k, [e])
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, es]) => ({
      key,
      entries: es,
      total: es.reduce((sum, e) => sum + durationMs(e, now), 0),
    }))
}

export function EntryList({
  entries,
  onEdit,
}: {
  entries: EntryRecord[]
  onEdit: (e: EntryRecord) => void
}) {
  const { now } = useStore()
  const groups = groupByDay(entries, now)

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-1 flex items-baseline justify-between px-3">
            <h3 className="text-sm font-semibold">{fmtDayHeading(g.key)}</h3>
            <span className="tnum text-xs font-medium tabular-nums" style={{ color: 'var(--muted)' }}>
              {fmtDuration(g.total)}
            </span>
          </div>
          <div
            className="rounded-xl"
            style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
          >
            {g.entries.map((e, i) => (
              <div
                key={e.id}
                style={i > 0 ? { borderTopWidth: 1, borderColor: 'var(--border)' } : undefined}
              >
                <EntryRow entry={e} onEdit={onEdit} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
