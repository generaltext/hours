import { NavLink, Route, Routes } from 'react-router-dom'
import { useStore } from './lib/store'
import { CommandBar } from './components/CommandBar'
import { TrackView } from './views/TrackView'
import { ReportsView } from './views/ReportsView'
import { ProjectsView } from './views/ProjectsView'

function Mark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="var(--accent)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.5 2" />
    </svg>
  )
}

function Nav() {
  const { connected } = useStore()
  const isDemo = typeof window !== 'undefined' && window.gt?.mode === 'demo'
  const tabs = [
    { to: '/', label: 'Track', end: true },
    { to: '/reports', label: 'Reports', end: false },
    { to: '/projects', label: 'Projects', end: false },
  ]
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur"
      style={{
        background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
        borderBottomWidth: 1,
        borderColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">Hours</span>
          {isDemo && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              Demo
            </span>
          )}
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              style={({ isActive }) =>
                isActive
                  ? { background: 'var(--hover)', color: 'var(--fg)' }
                  : { color: 'var(--muted)' }
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <kbd
            className="hidden items-center gap-1 rounded px-1.5 py-0.5 text-[11px] sm:inline-flex"
            style={{ borderWidth: 1, borderColor: 'var(--border)', color: 'var(--muted)' }}
            title="Command bar"
          >
            ⌘K
          </kbd>
          <span
            title={connected ? 'Synced' : 'Offline'}
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: connected ? '#16a34a' : 'var(--faint)' }}
          />
        </div>
      </div>
    </header>
  )
}

export function App() {
  // No full-screen gate: the shell renders immediately (the platform's own app
  // splash covers the brief handshake), and entries stream into TrackView as the
  // store finishes booting — so there's never a second "loading" screen.
  return (
    <div className="min-h-full">
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<TrackView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/projects" element={<ProjectsView />} />
          <Route path="*" element={<TrackView />} />
        </Routes>
      </main>
      <CommandBar />
    </div>
  )
}
