# Hours

A clean, append-only time tracker, built as a [General Text](https://www.generaltext.org) app.

Start a timer in one keystroke, classify it whenever you like, and trust that every
line is real because you wrote it. Run several timers at once, track shared hours
toward a project with your team, and keep the whole record as plaintext you own.

> This is the **developer** README (architecture, dev loop, data format). The
> user-facing gallery description lives in [`public/gt-readme.md`](public/gt-readme.md).

## What it is

Hours is a static web frontend with **no backend of its own**. General Text provides
auth, storage, and real-time sync; the app reads and writes the user's files through
the injected `window.gt` runtime. Everything Hours stores is plaintext in the user's
workspace, syncs live across devices and collaborators, works offline, and cannot leave
the workspace (the app runs under a no-egress CSP). See the app contract at
<https://www.generaltext.org/llms.txt> (local source:
`../../generaltext/content/docs/building-apps.md`).

## Develop

```bash
pnpm install
pnpm dev         # Vite dev server; a dev-only plugin injects the runtime so the app
                 # runs standalone against a LOCAL in-browser workspace (IndexedDB +
                 # cross-tab sync). Open two tabs to watch edits merge.
pnpm build       # tsc --noEmit && vite build  → dist/
pnpm preview     # serve the production build
pnpm typecheck   # tsc --noEmit
```

Open the deployed build's own URL (not localhost) and it shows a splash with a "try the
demo" button that boots a throwaway local workspace (`window.__gtConfig = { local: true }`).

To exercise the real sandbox, CSP, install, and multi-user sync: `pnpm preview`, then in
a running General Text workspace, **Settings → Apps → Install by URL** and paste the
preview URL. (`public/_headers` sends `Access-Control-Allow-Origin: *` so the browser
install fetch succeeds.)

## Architecture: event-sourced, materialize the state

The source of truth is an **append-only log of events**; the UI is a **materialized
projection** rebuilt by folding that log. This is the design General Text rewards:
character-level CRDT merges are safe for appends (two people appending different lines
never corrupt each other), whereas a large mutable JSON blob can merge into invalid JSON.

- **`lib/events.ts`**: the event envelope `{ id, ts, actor, type, subject, data }`, one
  JSON object per line, immutable once written.
- **`lib/reducer.ts`**: folds events into current-state records (`entries`, `projects`).
  Idempotent (each event id applied once), so re-folding a file's tail or seeing your own
  optimistic write echoed back is always safe. Field conflicts resolve last-writer-wins.
- **`lib/log.ts`**: file layout, month-shard paths, and the pure `foldTail` / `appendLine`
  helpers. Routes each event to its file by type prefix.
- **`lib/store.tsx`**: the one stateful hub. Boots the runtime, hydrates the IndexedDB
  cache, subscribes the log files via `gt.watch`, and exposes `dispatch`. A dispatch is
  applied **optimistically** for instant UI, then the write is queued (always appended to
  the freshest content, so the runtime's diff is a pure end-insertion) and reconciled by
  the watch echo.
- **`lib/cache.ts`**: a disposable IndexedDB projection cache with per-file cursors, so a
  returning session hydrates instantly and only re-parses the new tail. Nuke it and a full
  replay rebuilds identical state.
- **`lib/actions.ts`**: pure draft builders (`startEntry`, `stopEntry`, `editEntry`, …),
  the complete set of possible mutations in one place.
- **`lib/reports.ts`**, **`lib/format.ts`**, **`lib/markdown.tsx`**, **`lib/model.ts`**:
  report aggregation, duration/time/CSV formatting, a tiny dependency-free Markdown
  renderer for entry notes, and config + project-name helpers.

`components/` holds the UI (timer bar, entry rows/list, editor, project picker, tag editor,
command bar); `views/` holds the three routes (`TrackView`, `ReportsView`, `ProjectsView`).

## The file format (the contract)

Everything is written under the app's own `data/` folder, versioned as `v0/`:

```
v0/
  entries/2026-07.jsonl   # append-only event log, sharded by month (UTC)
  entries/2026-08.jsonl
  projects.jsonl          # project events (same event log, its own file)
  config.json             # small settings: rounding, weekStart, tag colors
```

Representative events (`"<entity>.<verb>"`):

```jsonc
{"id":"evt_…","ts":"2026-07-12T18:03:11.482Z","actor":{"id":"usr_…","name":"Travis"},
 "type":"entry.start","subject":"ent_…","data":{"startedAt":"…Z","projectId":"prj_…","title":"Nav refactor","tags":["dev"]}}
{"type":"entry.stop","subject":"ent_…","data":{"endedAt":"…Z"}}          // closes a running timer
{"type":"entry.log","subject":"ent_…","data":{"startedAt":"…Z","endedAt":"…Z", …}}  // a complete entry in one line
{"type":"entry.edit","subject":"ent_…","data":{ …changed fields only… }} // corrections, never rewrites
{"type":"entry.archive","subject":"ent_…"}                               // hide (not delete)
{"type":"project.create","subject":"prj_…","data":{"name":"Acme/Website","color":"teal"}}
```

A materialized **entry** has: `title` (short one-liner), `description` (longer-form
Markdown), `startedAt`, `endedAt` (**`null` while the timer is running**), `projectId`,
`tags[]`, `archived`, and `createdBy`/`createdAt` from the events.

Rules that make this work:

- **Append-only. Never rewrite or edit an existing line.** Corrections are new
  `entry.edit` events (last-writer-wins on replay). This keeps concurrent merges clean and
  the cache trivially correct.
- **Timestamps are UTC** (ISO-8601 `Z`); the UI renders them in local time.
- **Projects nest by name with `/`** (`Acme/Website`, `Internal/Admin`). Grouping and
  filtering are string operations on the name; there is no separate client or folder entity.
- **A running timer is a durable open interval** (`endedAt: null`), so it survives closing
  the browser and is visible to collaborators. Concurrent timers are allowed.
- **Archive, don't delete.** The app only ever archives; a true hard delete is the user
  removing lines from the `.jsonl` by hand.
- **Paths are relative** to the app's data folder, never hardcoded to `_gtApps/hours/…`.

Because the store is plain JSONL, anyone can `grep` it, diff it in git, or hand it to an
LLM without Hours in the loop. The file is the contract, not the app.

## Conventions

- **Stack:** React 19 + TypeScript (strict) + Vite + Tailwind v4, one package, no monorepo.
- **Theme:** defer to the shell. Paint with the platform tokens (`--gt-bg`, `--gt-fg`,
  `--gt-accent`, …) via the semantic vars in `global.css`, with neutral fallbacks for
  standalone; dark mode follows the `.dark` class the shell sets, never `prefers-color-scheme`.
- **No backend, no network egress, no `localStorage` as a source of truth.** All persistence
  goes through `window.gt`. `localStorage` holds only a local identity fallback.
