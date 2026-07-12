// The append-only log. Two kinds of file, both plain JSONL folded by the same
// reducer:
//   v0/entries/YYYY-MM.jsonl  — the time entries (timers, logs, edits), sharded
//                               by month so any one file stays small and only the
//                               current shard is write-hot.
//   v0/projects.jsonl         — the projects you track against.
// Helpers here are pure; the store owns the window.gt reads/writes and the
// freshest-content bookkeeping that makes appends safe.

import { applyEvent, type State } from './reducer'
import { parseEvent } from './events'

export const DATA_VERSION = 'v0'
export const ENTRIES_DIR = `${DATA_VERSION}/entries`
export const PROJECTS_PATH = `${DATA_VERSION}/projects.jsonl`
export const CONFIG_PATH = `${DATA_VERSION}/config.json`

const SHARD_RE = new RegExp(`^${DATA_VERSION}/entries/\\d{4}-\\d{2}\\.jsonl$`)

/** Month shard for a date, keyed in UTC so it's the same file on every machine. */
export function shardForDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${ENTRIES_DIR}/${y}-${m}.jsonl`
}

export function currentShardPath(): string {
  return shardForDate(new Date())
}

export function isEntryShardPath(path: string): boolean {
  return SHARD_RE.test(path)
}

export function isLogPath(path: string): boolean {
  return path === PROJECTS_PATH || isEntryShardPath(path)
}

/** Which file an event's line is appended to (by its "<entity>." prefix). */
export function pathForEventType(type: string): string {
  return type.startsWith('project.') ? PROJECTS_PATH : currentShardPath()
}

/** Append a serialized event line onto a file's current content. */
export function appendLine(current: string, line: string): string {
  const base = current.length === 0 || current.endsWith('\n') ? current : current + '\n'
  return base + line + '\n'
}

/**
 * Fold the not-yet-consumed tail of a file into state. Returns the new consumed
 * length (always at a newline boundary). Only complete lines are applied, so a
 * half-synced trailing write is left for the next change.
 */
export function foldTail(state: State, content: string, prevLen: number): number {
  let start = prevLen
  if (content.length < start) start = 0 // file unexpectedly shrank → refold (dedupe keeps it safe)
  const slice = content.slice(start)
  const lastNl = slice.lastIndexOf('\n')
  if (lastNl === -1) return start // no complete new line yet
  const complete = slice.slice(0, lastNl)
  for (const line of complete.split('\n')) {
    const ev = parseEvent(line)
    if (ev) applyEvent(state, ev)
  }
  return start + lastNl + 1
}
