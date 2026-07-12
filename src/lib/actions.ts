// Draft builders: pure functions that produce the event `Draft`s the store
// stamps and appends. Keeping them here (not in components) makes the set of
// possible mutations legible in one place and easy to test.

import type { Draft } from './events'
import { newId } from './ids'

export function newEntryId(): string {
  return newId('ent')
}

export function newProjectId(): string {
  return newId('prj')
}

export interface EntryFields {
  projectId?: string | null
  title?: string
  description?: string
  tags?: string[]
  startedAt?: string
  endedAt?: string | null
}

/** Open a running timer. */
export function startEntry(id: string, fields: EntryFields): Draft {
  const data: Record<string, unknown> = { startedAt: fields.startedAt ?? new Date().toISOString() }
  if (fields.projectId != null) data.projectId = fields.projectId
  if (fields.title) data.title = fields.title
  if (fields.description) data.description = fields.description
  if (fields.tags && fields.tags.length) data.tags = fields.tags
  return { type: 'entry.start', subject: id, data }
}

/** Close a running entry. */
export function stopEntry(id: string, endedAt?: string): Draft {
  return { type: 'entry.stop', subject: id, data: { endedAt: endedAt ?? new Date().toISOString() } }
}

/** A complete entry in one line (manual / retroactive). */
export function logEntry(id: string, fields: EntryFields & { startedAt: string; endedAt: string }): Draft {
  const data: Record<string, unknown> = { startedAt: fields.startedAt, endedAt: fields.endedAt }
  if (fields.projectId != null) data.projectId = fields.projectId
  if (fields.title) data.title = fields.title
  if (fields.description) data.description = fields.description
  if (fields.tags && fields.tags.length) data.tags = fields.tags
  return { type: 'entry.log', subject: id, data }
}

/** A correction. Only the keys present in `patch` change (null clears a field). */
export function editEntry(id: string, patch: EntryFields): Draft {
  const data: Record<string, unknown> = {}
  if ('startedAt' in patch && patch.startedAt !== undefined) data.startedAt = patch.startedAt
  if ('endedAt' in patch) data.endedAt = patch.endedAt ?? null
  if ('projectId' in patch) data.projectId = patch.projectId ?? null
  if ('title' in patch) data.title = patch.title ?? ''
  if ('description' in patch) data.description = patch.description ?? ''
  if ('tags' in patch) data.tags = patch.tags ?? []
  return { type: 'entry.edit', subject: id, data }
}

export function archiveEntry(id: string): Draft {
  return { type: 'entry.archive', subject: id }
}

export function restoreEntry(id: string): Draft {
  return { type: 'entry.restore', subject: id }
}

export interface ProjectFields {
  name?: string
  color?: string | null
  rate?: number | null
}

export function createProject(id: string, fields: ProjectFields & { name: string }): Draft {
  const data: Record<string, unknown> = { name: fields.name }
  if (fields.color != null) data.color = fields.color
  if (fields.rate != null) data.rate = fields.rate
  return { type: 'project.create', subject: id, data }
}

export function updateProject(id: string, patch: ProjectFields): Draft {
  const data: Record<string, unknown> = {}
  if ('name' in patch && patch.name !== undefined) data.name = patch.name
  if ('color' in patch) data.color = patch.color ?? null
  if ('rate' in patch) data.rate = patch.rate ?? null
  return { type: 'project.update', subject: id, data }
}

export function archiveProject(id: string): Draft {
  return { type: 'project.archive', subject: id }
}

export function restoreProject(id: string): Draft {
  return { type: 'project.restore', subject: id }
}
