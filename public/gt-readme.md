# Hours

A clean, append-only time tracker for General Text. Start a timer in one keystroke,
classify it whenever you like, and trust that every line is real because you wrote it.

- **Start now, classify later.** One click starts a timer with nothing attached. Add a
  project, title, notes, or tags while it runs, when you stop, or days later.
- **Run several at once.** Multiple timers can run at the same time, each stopped on its
  own. A running timer is just an open entry on disk, so you can start one, close the
  browser, come back tomorrow, and it's still going. Teammates see it live.
- **Shared hours toward a project.** Every entry is stamped with who logged it, so a team
  tracks the same projects together and reports break down by person.
- **Notes when you need them.** Each entry has a short title plus an optional longer
  description in Markdown, shown when you expand the entry.
- **Yours forever, in plaintext.** Everything is stored as a plain append-only log of JSON
  lines you own: greppable, diffable, and readable by anything (including your AI) long
  after Hours is gone.

## Files it writes

Everything lives under this app's `data/` folder, versioned as `v0/`:

- `v0/entries/YYYY-MM.jsonl`: the append-only event log (one JSON object per line) of
  timers started and stopped, entries logged, edits, and archives. Sharded by month.
- `v0/projects.jsonl`: the projects you track against (name and color). Project names can
  nest with `/`, for example `Acme/Website` or `Internal/Admin`.
- `v0/config.json`: small app settings (rounding, week start, tag colors).

Corrections never rewrite history: an edit is a new line. To truly delete an entry, open
the `.jsonl` file and remove its lines. The tool itself only ever archives.
