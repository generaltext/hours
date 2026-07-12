# Hours

A clean, append-only time tracker for General Text. Start a timer in one keystroke,
classify it whenever you like, and trust that every line is real because you wrote it.

- **Start now, classify later.** One click starts a timer with nothing attached; add a
  project, description, or tags while it runs, when you stop, or days later.
- **Timers survive.** A running timer is just an open entry on disk, so you can start
  it, close the browser, come back tomorrow, and it's still going. Teammates see it live.
- **Shared hours toward a project.** Every entry is stamped with who logged it, so the
  team tracks the same projects together and reports break down by person.
- **Yours forever, in plaintext.** Everything is stored as a plain append-only log of
  JSON lines you own — greppable, diffable, and readable by anything (including your AI)
  long after Hours is gone.

## Files it writes

Everything lives under this app's `data/` folder, versioned as `v0/`:

- `v0/entries/YYYY-MM.jsonl` — the append-only event log (one JSON object per line):
  timers started/stopped, entries logged, edits, archives. Sharded by month.
- `v0/projects.jsonl` — the projects you track against (name, color, optional rate).
  Project names can nest with `/` (e.g. `Acme/Website`, `Internal/Admin`).
- `v0/config.json` — small app settings: rounding, week start, tag colors.

Corrections never rewrite history: an edit is a new line. To truly delete an entry,
edit the `.jsonl` file and remove its lines. The tool only ever archives.
