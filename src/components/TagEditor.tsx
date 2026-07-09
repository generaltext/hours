import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../lib/store'
import { allTags } from '../lib/reducer'
import { tagColor } from '../lib/model'

export function TagChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  const { config } = useStore()
  return (
    <span className={`tag tag-${tagColor(label, config)}`}>
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="-mr-1 inline-flex items-center opacity-70 hover:opacity-100"
        >
          <X size={11} />
        </button>
      )}
    </span>
  )
}

export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <TagChip key={t} label={t} />
      ))}
    </span>
  )
}

export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const { state, version } = useStore()
  const [draft, setDraft] = useState('')
  void version
  const suggestions = allTags(state)
    .map((t) => t.label)
    .filter((l) => !tags.includes(l))

  function add(raw: string) {
    const label = raw.trim().replace(/,+$/, '').trim()
    if (label && !tags.includes(label)) onChange([...tags, label])
    setDraft('')
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5"
      style={{ borderWidth: 1, borderColor: 'var(--border)', background: 'var(--bg)' }}
    >
      {tags.map((t) => (
        <TagChip key={t} label={t} onRemove={() => onChange(tags.filter((x) => x !== t))} />
      ))}
      <input
        value={draft}
        list="hours-tag-suggestions"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
          } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={tags.length === 0 ? 'Add tags…' : ''}
        className="min-w-[6rem] flex-1 bg-transparent text-sm outline-none"
      />
      <datalist id="hours-tag-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
