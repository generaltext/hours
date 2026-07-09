import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { type Actor, type Draft, type HoursEvent, serializeEvent } from './events'
import { applyEvent, emptyState, type State } from './reducer'
import {
  appendLine,
  CONFIG_PATH,
  foldTail,
  isLogPath,
  pathForEventType,
  PROJECTS_PATH,
  currentShardPath,
} from './log'
import { loadCache, saveCache } from './cache'
import { DEFAULT_CONFIG, type Config } from './model'
import { newId, ulid } from './ids'
import { seedDemo } from './seed'

interface StoreValue {
  ready: boolean
  connected: boolean
  me: Actor | null
  state: State
  version: number
  config: Config
  /** append one or more events; optimistic, then reconciled by the watch echo */
  dispatch: (drafts: Draft | Draft[]) => Promise<void>
  saveConfig: (next: Config) => Promise<void>
  /** a monotonically increasing wall clock (ms), bumped ~1/s for live timers */
  now: number
}

const StoreContext = createContext<StoreValue | null>(null)

async function resolveMe(): Promise<Actor> {
  try {
    const u = await window.gt.user()
    if (u) return { id: u.id, name: u.name }
  } catch {
    // fall through to a local identity
  }
  let id = localStorage.getItem('hours.actor.id')
  if (!id) {
    id = `local_${ulid()}`
    localStorage.setItem('hours.actor.id', id)
  }
  const name = localStorage.getItem('hours.actor.name') || 'You'
  return { id, name }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const stateRef = useRef<State>(emptyState())
  const consumedRef = useRef<Record<string, number>>({})
  const meRef = useRef<Actor | null>(null)
  const workspaceRef = useRef<string>('local')
  const subscribed = useRef<Set<string>>(new Set())
  const stops = useRef<Array<() => void>>([])
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve())
  const bumpScheduled = useRef(false)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [version, setVersion] = useState(0)
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(true)
  const [me, setMe] = useState<Actor | null>(null)
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [now, setNow] = useState(() => Date.now())

  function bump() {
    if (bumpScheduled.current) return
    bumpScheduled.current = true
    queueMicrotask(() => {
      bumpScheduled.current = false
      setVersion((v) => v + 1)
    })
  }

  function schedulePersist() {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      void saveCache(workspaceRef.current, stateRef.current, consumedRef.current)
    }, 1000)
  }

  function subscribeLog(path: string) {
    if (subscribed.current.has(path)) return
    subscribed.current.add(path)
    const stop = window.gt.watch(path, (content) => {
      const prev = consumedRef.current[path] ?? 0
      consumedRef.current[path] = foldTail(stateRef.current, content, prev)
      bump()
      schedulePersist()
    })
    stops.current.push(stop)
  }

  // A ~1s tick so running timers count up live. Cheap; only re-renders subtrees
  // that read `now`.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let disposed = false
    const localStops = stops.current

    async function boot() {
      await window.gt.ready
      if (disposed) return

      workspaceRef.current = window.gt.workspaceId || 'local'
      const actor = await resolveMe()
      meRef.current = actor
      setMe(actor)
      setConnected(window.gt.connected)

      const cached = await loadCache(workspaceRef.current)
      if (cached && !disposed) {
        stateRef.current = cached.state
        consumedRef.current = cached.consumed
      }

      // Config: read, or seed the default once.
      try {
        const raw = await window.gt.readFile(CONFIG_PATH)
        if (raw.trim()) setConfig({ ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Config) })
      } catch {
        void window.gt.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2))
      }
      window.gt.watch(CONFIG_PATH, (raw) => {
        if (raw.trim()) {
          try {
            setConfig({ ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Config) })
          } catch {
            /* keep last good config */
          }
        }
      })

      // Subscribe every existing log file (entry shards + projects), the current
      // month's shard, and watch for new files (a new month, or projects.jsonl
      // appearing after the first write).
      subscribeLog(PROJECTS_PATH)
      subscribeLog(currentShardPath())
      for (const p of window.gt.files()) if (isLogPath(p)) subscribeLog(p)
      window.gt.watchFiles((paths) => {
        for (const p of paths) if (isLogPath(p)) subscribeLog(p)
      })

      window.gt.on('connected', () => setConnected(true))
      window.gt.on('disconnected', () => setConnected(false))

      setReady(true)

      // Seed the live demo once, only when truly empty.
      if (window.gt.mode === 'demo') {
        const files = await window.gt.listFiles()
        if (files.length === 0 && stateRef.current.events.length === 0) {
          await seedDemo((drafts) => dispatchImpl(drafts))
        }
      }
    }

    void boot()
    return () => {
      disposed = true
      for (const stop of localStops) stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function dispatchImpl(drafts: Draft | Draft[]): Promise<void> {
    const list = Array.isArray(drafts) ? drafts : [drafts]
    if (list.length === 0) return
    const now = new Date().toISOString()
    const events: HoursEvent[] = list.map((d) => ({
      id: newId('evt'),
      ts: now,
      actor: meRef.current,
      type: d.type,
      subject: d.subject,
      ...(d.data ? { data: d.data } : {}),
    }))

    // Optimistic apply for instant UI; the watch echo re-folds idempotently.
    for (const ev of events) applyEvent(stateRef.current, ev)
    bump()

    // Group events by the file they belong to (entry shards vs projects.jsonl).
    const byPath = new Map<string, HoursEvent[]>()
    for (const ev of events) {
      const path = pathForEventType(ev.type)
      const arr = byPath.get(path)
      if (arr) arr.push(ev)
      else byPath.set(path, [ev])
    }

    // Serialize writes and always base each append on the freshest content, so
    // the runtime's diff is a pure end-insertion (never a delete of a concurrent
    // remote line).
    const run = writeQueue.current.then(async () => {
      for (const [path, evs] of byPath) {
        const exists = window.gt.files().includes(path)
        const base = exists ? await window.gt.readFile(path) : ''
        let content = base
        for (const ev of evs) content = appendLine(content, serializeEvent(ev))
        await window.gt.writeFile(path, content)
        subscribeLog(path)
      }
    })
    writeQueue.current = run.catch(() => undefined)
    await run
  }

  async function saveConfigImpl(next: Config): Promise<void> {
    setConfig(next)
    await window.gt.writeFile(CONFIG_PATH, JSON.stringify(next, null, 2))
  }

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      connected,
      me,
      state: stateRef.current,
      version,
      config,
      dispatch: dispatchImpl,
      saveConfig: saveConfigImpl,
      now,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, connected, me, version, config, now],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
