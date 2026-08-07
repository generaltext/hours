// window.gt is injected by General Text at runtime (dev: from the public runtime
// URL via the vite plugin; prod: by the platform). This is a pragmatic subset of
// the contract documented at https://www.generaltext.org/llms.txt — the surfaces
// Hours actually uses.

export interface GtUser {
  id: string
  name: string
  image?: string
}

export interface GtFileEntry {
  path: string
  sizeBytes: number
}

export type GtMode = 'live' | 'demo'

export interface GtRuntime {
  ready: Promise<void>
  version: string
  mode: GtMode
  workspaceId: string
  connected: boolean

  atLeast(version: string): boolean
  require(version: string): void

  user(): Promise<GtUser | null>

  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  listFiles(): Promise<GtFileEntry[]>
  files(): string[]

  watch(path: string, cb: (content: string) => void): () => void
  watchFiles(cb: (paths: string[]) => void): () => void

  on(event: string, cb: (arg?: unknown) => void): void
  /** Report the app's in-app location to the shell, which mirrors it into the page
   *  URL fragment — so a refresh restores the view, any view can be linked, and
   *  browser back/forward step through the app. Replaces the current entry by
   *  default (safe to call on every keystroke); pass `{ push: true }` on a real
   *  navigation. Optional: absent on older runtimes, and a no-op standalone. */
  setLocation?(path: string, opts?: { push?: boolean }): void
  /** Shell-driven location changes: fires once at boot with the location the user
   *  opened (a deep link, or a refresh restoring the fragment) and again on every
   *  back/forward step. Returns an unsubscribe. Optional: absent on older runtimes. */
  onLocation?(cb: (path: string) => void): () => void
}

declare global {
  interface Window {
    gt: GtRuntime
    /** Opt-in runtime boot config, set before loading /__gt/runtime.js to force a
     *  local in-browser workspace — used by the standalone demo (see main.tsx).
     *  Never set inside General Text. */
    __gtConfig?: { local?: boolean }
    /** Marks the standalone "try the demo" session, so the store seeds sample data. */
    __hoursDemo?: boolean
  }
}

export {}
