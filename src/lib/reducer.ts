// The projection: fold the event log into current-state records. Application is
// idempotent (each event id applied at most once) so re-folding a file's tail, or
// seeing our own optimistic write echoed back by the watch, is always safe.
//
// Field conflicts resolve last-writer-wins by (ts, id). Because we apply events in
// log order and appends are monotonic, later events simply overwrite earlier ones;
// on a full rebuild we sort by (ts, id) first to make that deterministic.

import type { Actor, HoursEvent } from './events'

export interface EntryRecord {
  id: string
  /** ISO-8601 UTC */
  startedAt: string
  /** ISO-8601 UTC, or null while the timer is still running */
  endedAt: string | null
  projectId: string | null
  /** the short one-liner (what you type into the timer bar) */
  title: string
  /** optional longer-form notes, rendered as Markdown on display */
  description: string
  tags: string[]
  archived: boolean
  createdBy: Actor | null
  createdAt: string
  updatedBy: Actor | null
  updatedAt: string
}

export interface ProjectRecord {
  id: string
  name: string
  color: string | null
  /** optional hourly rate for billable totals; null if unset */
  rate: number | null
  archived: boolean
  createdBy: Actor | null
  createdAt: string
  updatedBy: Actor | null
  updatedAt: string
}

export interface State {
  entries: Record<string, EntryRecord>
  projects: Record<string, ProjectRecord>
  /** every applied event, in application order, for the activity feed */
  events: HoursEvent[]
  applied: Set<string>
}

export function emptyState(): State {
  return { entries: {}, projects: {}, events: [], applied: new Set() }
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function asStringOrNull(v: unknown): string | null {
  if (v === null) return null
  return typeof v === 'string' ? v : null
}

function asTags(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean))]
}

export function applyEvent(state: State, ev: HoursEvent): void {
  if (state.applied.has(ev.id)) return
  state.applied.add(ev.id)
  state.events.push(ev)

  const dot = ev.type.indexOf('.')
  const entity = dot === -1 ? ev.type : ev.type.slice(0, dot)
  const verb = dot === -1 ? '' : ev.type.slice(dot + 1)
  const data = ev.data ?? {}

  if (entity === 'entry') applyEntry(state, ev, verb, data)
  else if (entity === 'project') applyProject(state, ev, verb, data)
  // Unknown entity from a newer build: kept in events (activity) but otherwise
  // ignored. Forward-compatible by design.
}

function touch(rec: EntryRecord | ProjectRecord, ev: HoursEvent): void {
  rec.updatedAt = ev.ts
  rec.updatedBy = ev.actor
}

function applyEntry(state: State, ev: HoursEvent, verb: string, data: Record<string, unknown>): void {
  if (verb === 'start' || verb === 'log') {
    if (state.entries[ev.subject]) return
    const startedAt = asString(data.startedAt) || ev.ts
    const endedAt = verb === 'log' ? asStringOrNull(data.endedAt) : null
    state.entries[ev.subject] = {
      id: ev.subject,
      startedAt,
      endedAt,
      projectId: asStringOrNull(data.projectId),
      title: asString(data.title),
      description: asString(data.description),
      tags: asTags(data.tags),
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }

  const rec = state.entries[ev.subject]
  if (!rec) return

  if (verb === 'stop') {
    rec.endedAt = asString(data.endedAt) || ev.ts
    touch(rec, ev)
  } else if (verb === 'edit') {
    if ('startedAt' in data && typeof data.startedAt === 'string') rec.startedAt = data.startedAt
    if ('endedAt' in data) rec.endedAt = asStringOrNull(data.endedAt)
    if ('projectId' in data) rec.projectId = asStringOrNull(data.projectId)
    if ('title' in data) rec.title = asString(data.title)
    if ('description' in data) rec.description = asString(data.description)
    if ('tags' in data) rec.tags = asTags(data.tags)
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

function applyProject(state: State, ev: HoursEvent, verb: string, data: Record<string, unknown>): void {
  if (verb === 'create') {
    if (state.projects[ev.subject]) return
    state.projects[ev.subject] = {
      id: ev.subject,
      name: asString(data.name),
      color: asStringOrNull(data.color),
      rate: typeof data.rate === 'number' ? data.rate : null,
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }

  const rec = state.projects[ev.subject]
  if (!rec) return

  if (verb === 'update') {
    if ('name' in data && typeof data.name === 'string') rec.name = data.name
    if ('color' in data) rec.color = asStringOrNull(data.color)
    if ('rate' in data) rec.rate = typeof data.rate === 'number' ? data.rate : null
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

// ── selectors ──────────────────────────────────────────────────────────────────

/** Live duration of an entry in ms; for a running entry, measured to `now`. */
export function durationMs(entry: EntryRecord, now: number): number {
  const start = Date.parse(entry.startedAt)
  if (Number.isNaN(start)) return 0
  const end = entry.endedAt ? Date.parse(entry.endedAt) : now
  return Math.max(0, end - start)
}

export function isRunning(entry: EntryRecord): boolean {
  return entry.endedAt === null && !entry.archived
}

/** Non-archived entries, newest start first. */
export function entriesList(state: State): EntryRecord[] {
  return Object.values(state.entries)
    .filter((e) => !e.archived)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : a.id < b.id ? 1 : -1))
}

export function runningEntries(state: State): EntryRecord[] {
  return entriesList(state).filter(isRunning)
}

/** The current user's running entry, if any (the timer bar's subject). */
export function runningForActor(state: State, actorId: string | null): EntryRecord | null {
  const running = runningEntries(state)
  if (actorId) {
    const mine = running.find((e) => e.createdBy?.id === actorId)
    if (mine) return mine
  }
  return running[0] ?? null
}

/** All of the current user's running timers (concurrent timers are allowed),
 *  oldest start first so the list is stable as new ones are added. */
export function myRunningEntries(state: State, actorId: string | null): EntryRecord[] {
  const running = runningEntries(state)
  const mine = actorId ? running.filter((e) => e.createdBy?.id === actorId) : running
  return mine.slice().sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))
}

export function projectsList(state: State, includeArchived = false): ProjectRecord[] {
  return Object.values(state.projects)
    .filter((p) => includeArchived || !p.archived)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function projectName(state: State, id: string | null): string | null {
  if (!id) return null
  return state.projects[id]?.name ?? null
}

export function allTags(state: State): { label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const e of Object.values(state.entries)) {
    if (e.archived) continue
    for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
