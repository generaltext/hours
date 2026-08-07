import { BarChart3, Download } from 'lucide-react'
import { useState } from 'react'

import { Avatar, Button, EmptyState, Select } from '../components/common'
import { ProjectChip, NoProject } from '../components/ProjectChip'
import { TagChip } from '../components/TagEditor'
import {
  csvRows,
  downloadText,
  fmtDate,
  fmtDuration,
  fmtHours,
  fmtTime,
  roundMs,
} from '../lib/format'
import { ROUNDING_OPTIONS, type RoundingMinutes } from '../lib/model'
import { durationMs, entriesList } from '../lib/reducer'
import {
  aggregate,
  entriesInRange,
  rangeBounds,
  type PersonSlice,
  type RangeKey,
} from '../lib/reports'
import { useStore } from '../lib/store'

type GroupBy = 'project' | 'person' | 'tag'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: '7d', label: '7 days' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
]

export function ReportsView() {
  const { state, version, config, saveConfig, now } = useStore()
  void version
  const [rangeKey, setRangeKey] = useState<RangeKey>('week')
  const [groupBy, setGroupBy] = useState<GroupBy>('project')
  const [custom, setCustom] = useState({ from: '', to: '' })

  const range = rangeBounds(rangeKey, config.weekStart, now, custom)
  const entries = entriesInRange(entriesList(state), range)
  const agg = aggregate(entries, now, config.rounding)

  const maxMs = Math.max(
    1,
    ...(groupBy === 'project'
      ? agg.byProject.map((p) => p.ms)
      : groupBy === 'person'
        ? agg.byPerson.map((p) => p.ms)
        : agg.byTag.map((t) => t.ms)),
  )

  function exportCsv() {
    const rows: (string | number)[][] = [
      ['Date', 'Start', 'End', 'Hours', 'Project', 'Title', 'Description', 'Tags', 'Who'],
    ]
    for (const e of [...entries].sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))) {
      const ms = roundMs(durationMs(e, now), config.rounding)
      rows.push([
        fmtDate(e.startedAt),
        fmtTime(e.startedAt),
        e.endedAt ? fmtTime(e.endedAt) : '',
        fmtHours(ms),
        e.projectId ? (state.projects[e.projectId]?.name ?? '') : '',
        e.title,
        e.description,
        e.tags.join(' '),
        e.createdBy?.name ?? '',
      ])
    }
    downloadText(`hours-${range.label.toLowerCase().replace(/\s+/g, '-')}.csv`, csvRows(rows))
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-semibold">Reports</h2>
        <Button variant="ghost" onClick={exportCsv} title="Export the entries in range as CSV">
          <Download size={15} />
          Export CSV
        </Button>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGES.map((r) => (
          <Seg key={r.key} active={rangeKey === r.key} onClick={() => setRangeKey(r.key)}>
            {r.label}
          </Seg>
        ))}
      </div>

      {rangeKey === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            value={custom.from}
            onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            className="rounded-md px-2 py-1"
            style={{ borderWidth: 1, borderColor: 'var(--border)', background: 'var(--bg)' }}
          />
          <span style={{ color: 'var(--muted)' }}>to</span>
          <input
            type="date"
            value={custom.to}
            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            className="rounded-md px-2 py-1"
            style={{ borderWidth: 1, borderColor: 'var(--border)', background: 'var(--bg)' }}
          />
        </div>
      )}

      {/* Summary */}
      <div
        className="flex flex-wrap items-end justify-between gap-4 rounded-xl p-5"
        style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
      >
        <div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            {range.label}
          </div>
          <div className="tnum text-3xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
            {fmtDuration(agg.total)}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {fmtHours(agg.total)} h
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          Rounding
          <Select
            value={config.rounding}
            onChange={(e) =>
              void saveConfig({ ...config, rounding: Number(e.target.value) as RoundingMinutes })
            }
            className="w-auto"
          >
            {ROUNDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {/* Group-by selector */}
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-xs" style={{ color: 'var(--muted)' }}>
          Group by
        </span>
        {(['project', 'person', 'tag'] as GroupBy[]).map((g) => (
          <Seg key={g} active={groupBy === g} onClick={() => setGroupBy(g)}>
            {g[0]!.toUpperCase() + g.slice(1)}
          </Seg>
        ))}
      </div>

      {agg.total === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing tracked in this range"
          hint="Pick a wider range or track some time."
        />
      ) : (
        <div
          className="flex flex-col gap-1 rounded-xl p-2"
          style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
        >
          {groupBy === 'project' &&
            agg.byProject.map((slice) => {
              const project = slice.projectId ? state.projects[slice.projectId] : undefined
              return (
                <BarRow
                  key={slice.projectId ?? 'none'}
                  label={
                    project ? (
                      <ProjectChip name={project.name} color={project.color} />
                    ) : (
                      <NoProject />
                    )
                  }
                  ms={slice.ms}
                  maxMs={maxMs}
                  {...(slice.byPerson.length > 1 ? { people: slice.byPerson } : {})}
                />
              )
            })}
          {groupBy === 'person' &&
            agg.byPerson.map((p) => (
              <BarRow
                key={p.id}
                label={
                  <span className="inline-flex items-center gap-2">
                    <Avatar actor={{ id: p.id, name: p.name }} size={20} />
                    {p.name}
                  </span>
                }
                ms={p.ms}
                maxMs={maxMs}
              />
            ))}
          {groupBy === 'tag' &&
            agg.byTag.map((t) => (
              <BarRow key={t.label} label={<TagChip label={t.label} />} ms={t.ms} maxMs={maxMs} />
            ))}
        </div>
      )}
    </div>
  )
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-3 py-1 text-sm font-medium transition-colors"
      style={
        active
          ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
          : { background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }
      }
    >
      {children}
    </button>
  )
}

function BarRow({
  label,
  ms,
  maxMs,
  people,
}: {
  label: React.ReactNode
  ms: number
  maxMs: number
  people?: PersonSlice[]
}) {
  const pct = Math.max(2, Math.round((ms / maxMs) * 100))
  return (
    <div className="rounded-lg px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm">{label}</div>
        <span className="tnum shrink-0 text-sm font-semibold tabular-nums">{fmtDuration(ms)}</span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full"
        style={{ background: 'var(--hover)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'var(--accent)' }}
        />
      </div>
      {people && (
        <div className="mt-2 flex flex-col gap-1 pl-1">
          {people.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-xs"
              style={{ color: 'var(--muted)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Avatar actor={{ id: p.id, name: p.name }} size={16} />
                {p.name}
              </span>
              <span className="tnum tabular-nums">{fmtDuration(p.ms)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
