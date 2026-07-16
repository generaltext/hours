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
 * Fold a file's content into state, applying complete lines from `start`
 * onward. Returns the char length actually consumed (always at a newline
 * boundary) so the caller can remember exactly the prefix it folded.
 *
 * `start` MUST sit on a line boundary the caller has verified is still intact.
 * It is NOT safe to persist as a cross-session cursor: the file is a CRDT
 * Y.Text, so a merge with a concurrent writer can insert content *before* a
 * previously-recorded offset, which would make a naive tail-slice skip real
 * events. The store only trusts `start` when the new content still begins with
 * the exact prefix it last folded; otherwise it passes 0 and refolds whole.
 * A full refold is always correct because applyEvent dedupes by event id.
 */
export function foldFrom(state: State, content: string, start: number): number {
  const from = start > 0 && start <= content.length ? start : 0
  const slice = content.slice(from)
  const lastNl = slice.lastIndexOf('\n')
  if (lastNl === -1) return from // no complete new line yet
  const complete = slice.slice(0, lastNl)
  for (const line of complete.split('\n')) {
    const ev = parseEvent(line)
    if (ev) applyEvent(state, ev)
  }
  return from + lastNl + 1
}
