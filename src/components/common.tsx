import { useEffect, type CSSProperties, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import type { Actor } from '../lib/events'
import { initials } from '../lib/format'

const AVATAR_COLORS = ['#0d9488', '#2563eb', '#16a34a', '#7c3aed', '#e11d48', '#ea580c', '#0891b2']

function colorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]!
}

export function Avatar({ actor, size = 22 }: { actor: Actor | null; size?: number }) {
  const name = actor?.name ?? '?'
  const bg = colorFor(actor?.id ?? name)
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${bg} 18%, transparent)`,
        color: bg,
        fontSize: size * 0.42,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
    >
      {initials(name)}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'default',
  type = 'button',
  title,
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  title?: string
  disabled?: boolean
  className?: string
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const inline: CSSProperties =
    variant === 'primary'
      ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
      : variant === 'default'
        ? { borderWidth: 1, borderColor: 'var(--border)', background: 'var(--panel)' }
        : variant === 'danger'
          ? { borderWidth: 1, borderColor: 'color-mix(in srgb, #e11d48 40%, transparent)', color: '#e11d48' }
          : {}
  const hover = variant === 'ghost' ? 'hover:bg-[var(--hover)]' : ''
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${base} ${hover} ${className}`}
      style={inline}
    >
      {children}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  onClick,
  title,
  size = 16,
  danger,
}: {
  icon: LucideIcon
  onClick?: () => void
  title?: string
  size?: number
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--hover)]"
      style={danger ? { color: '#e11d48' } : { color: 'var(--muted)' }}
    >
      <Icon size={size} />
    </button>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'var(--hover)', color: 'var(--muted)' }}
      >
        <Icon size={22} />
      </div>
      <div className="text-base font-medium">{title}</div>
      {hint && (
        <div className="max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
          {hint}
        </div>
      )}
      {action}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]"
      style={{ background: 'color-mix(in srgb, black 45%, transparent)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-xl"
        style={{ background: 'var(--panel)', borderWidth: 1, borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottomWidth: 1, borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-semibold">{title}</h2>
          <IconButton icon={X} onClick={onClose} title="Close" />
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div
            className="flex justify-end gap-2 px-5 py-3.5"
            style={{ borderTopWidth: 1, borderColor: 'var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      {children}
    </label>
  )
}

const inputBase =
  'w-full rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-[var(--accent)]'
const inputStyle: CSSProperties = { borderWidth: 1, borderColor: 'var(--border)', background: 'var(--bg)' }

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input {...rest} className={`${inputBase} ${className}`} style={{ ...inputStyle, ...props.style }} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props
  return (
    <select {...rest} className={`${inputBase} ${className}`} style={{ ...inputStyle, ...props.style }}>
      {children}
    </select>
  )
}
