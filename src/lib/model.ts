// App-level model bits that aren't the event log itself: the small shared config
// file, the tag color palette, and helpers for the `/`-nested project names.

// ── Config (v0/config.json) ───────────────────────────────────────────────────
// Small, mostly single-writer settings. Kept out of the event log because it's
// low-write and genuinely mutable; we accept last-writer-wins on it.

/** Rounding applied to each entry's duration in reports. 0 = off (exact). */
export type RoundingMinutes = 0 | 5 | 6 | 10 | 15 | 30 | 60

export interface Config {
  /** minutes to round each entry to in reports (0 = exact) */
  rounding: RoundingMinutes
  /** 0 = Sunday, 1 = Monday — first day of the week in the timesheet */
  weekStart: 0 | 1
  /** tag label → palette color key */
  tagColors: Record<string, string>
}

export const DEFAULT_CONFIG: Config = {
  rounding: 0,
  weekStart: 1,
  tagColors: {},
}

export const ROUNDING_OPTIONS: { value: RoundingMinutes; label: string }[] = [
  { value: 0, label: 'Exact' },
  { value: 5, label: '5 min' },
  { value: 6, label: '6 min (0.1h)' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
]

// ── Tag colors ────────────────────────────────────────────────────────────────

export const TAG_PALETTE = [
  'teal',
  'blue',
  'green',
  'violet',
  'rose',
  'amber',
  'orange',
  'cyan',
] as const
export type TagColor = (typeof TAG_PALETTE)[number]

export function tagColor(label: string, config: Config): TagColor {
  const explicit = config.tagColors[label]
  if (explicit && (TAG_PALETTE as readonly string[]).includes(explicit)) return explicit as TagColor
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length]!
}

// ── Project name helpers ──────────────────────────────────────────────────────
// Projects nest by convention: a `/` in the name is a group boundary, so
// "Acme/Website" is the "Website" project under the "Acme" group. This gives
// arbitrary-depth grouping with zero data-model complexity — grouping and
// filtering are just string operations on the name.

/** The leading group of a name ("Acme/Website" → "Acme"); null if ungrouped. */
export function projectGroup(name: string): string | null {
  const i = name.indexOf('/')
  return i === -1 ? null : name.slice(0, i).trim()
}

/** The leaf label ("Acme/Website" → "Website"; "Admin" → "Admin"). */
export function projectLeaf(name: string): string {
  const i = name.lastIndexOf('/')
  return (i === -1 ? name : name.slice(i + 1)).trim()
}

/** Normalize a typed name: trim each `/`-segment, drop empties. */
export function normalizeProjectName(name: string): string {
  return name
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/')
}

// Curated project colors (same palette as tags; a project without an explicit
// color gets a stable one from its name).
export function projectColor(name: string, explicit?: string): TagColor {
  if (explicit && (TAG_PALETTE as readonly string[]).includes(explicit)) return explicit as TagColor
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length]!
}
