// Formatting helpers. Storage is always UTC (ISO-8601 with a `Z`); everything
// here renders in the viewer's local timezone.

import type { RoundingMinutes } from './model'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** A ticking clock for a running timer: "1:04:09" (or "4:09" under an hour). */
export function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** A settled duration: "1h 30m", "45m", "0m". */
export function fmtDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

/** Decimal hours, for reports and CSV: "1.50". */
export function fmtHours(ms: number): string {
  return (ms / 3600000).toFixed(2)
}

/** Round a duration to the nearest N minutes (0 = exact). */
export function roundMs(ms: number, minutes: RoundingMinutes): number {
  if (!minutes) return ms
  const step = minutes * 60000
  return Math.round(ms / step) * step
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "9:00 AM – 10:30 AM" (an em-dash-free range); end omitted while running. */
export function fmtTimeRange(startIso: string, endIso: string | null): string {
  const start = fmtTime(startIso)
  return endIso ? `${start} – ${fmtTime(endIso)}` : `${start} – now`
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Local YYYY-MM-DD key for grouping entries by day. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayKey(): string {
  return dayKey(new Date().toISOString())
}

/** "Today", "Yesterday", or "Mon, Jul 7" for a day heading. */
export function fmtDayHeading(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return key
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// ── datetime-local <input> conversions (local wall-clock ⇄ UTC ISO) ────────────

export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value) // a datetime-local string is parsed as local time
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/** Quote a CSV cell (RFC 4180-ish). */
export function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function csvRows(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

/** Trigger a client-side file download of some text. */
export function downloadText(filename: string, text: string, mime = 'text/csv'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
