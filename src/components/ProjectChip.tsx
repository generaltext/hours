import { projectColor, projectGroup, projectLeaf } from '../lib/model'

export function ProjectDot({
  name,
  color,
  size = 8,
}: {
  name: string
  color?: string | null
  size?: number
}) {
  const c = projectColor(name, color ?? undefined)
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `var(--dot)`,
        ['--dot' as string]: dotColor(c),
      }}
    />
  )
}

const HEX: Record<string, string> = {
  teal: '#0d9488',
  blue: '#2563eb',
  green: '#16a34a',
  violet: '#7c3aed',
  rose: '#e11d48',
  amber: '#d97706',
  orange: '#ea580c',
  cyan: '#0891b2',
}
function dotColor(key: string): string {
  return HEX[key] ?? '#78716c'
}

/**
 * A project label: colored dot + name, with the `/`-group shown faintly so
 * "Acme/Website" reads as a muted "Acme /" and a solid "Website".
 */
export function ProjectChip({
  name,
  color,
  className = '',
}: {
  name: string
  color?: string | null
  className?: string
}) {
  const group = projectGroup(name)
  const leaf = projectLeaf(name)
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <ProjectDot name={name} color={color ?? null} />
      <span className="min-w-0 truncate">
        {group && <span style={{ color: 'var(--faint)' }}>{group} / </span>}
        <span>{leaf}</span>
      </span>
    </span>
  )
}

export function NoProject() {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--faint)' }}>
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ border: '1px dashed var(--border-strong)' }}
      />
      <span className="italic">No project</span>
    </span>
  )
}
