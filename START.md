# Ledger — Quick Start

## Requirements
- Node.js 22+ (uses the built-in `node:sqlite`)

## Run

```bash
cd ledger
npm start
```

Then open **http://localhost:3000**

## Dev mode (auto-restart on file changes)

```bash
npm run dev
```

## Notes
- The SQLite database is stored at `/tmp/ledger-data/ledger.db` (persists across restarts until `/tmp` is cleared)
- To use a custom location: `LEDGER_DB_DIR=/your/path npm start`
- All 8 modules are live immediately — no seed data required
- Import your first statement via **Statements → drag & drop CSV**
