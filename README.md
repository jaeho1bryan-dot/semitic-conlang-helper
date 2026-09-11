# semitic-conlang-helper

A Semitic-style conlang helper: define vocalic patterns (binyanim), generate viable
root+pattern combinations, and assign & look up meanings by triconsonantal root.
Built with **React** (Vite) + **Supabase**.

## What it does

Natural Semitic languages build words by slotting a (usually fixed) consonantal
root into vocalic **patterns/templates** (binyanim). This tool lets you:

- **Configure your phonology** — edit the consonant and vowel inventory. Multi-
  character romanizations (e.g. `sh`, `ṭ`) are supported and used to split bare
  root strings into radicals.
- **Define patterns** — a template uses digits `1`–`9` for the 1st–9th root
  consonant and any other character as a literal segment. Example: `ma12a3`
  applied to the root `k-t-b` → **maktab**. Repeat a digit to geminate
  (`1a22a3` → *kattab*). The highest slot a template uses is its **arity**, so
  a biconsonantal (2), triconsonantal (3) or quadriconsonantal (4) template is
  tagged accordingly. A long list of patterns can also be **imported in bulk
  from JSON** — see [Importing patterns](#importing-patterns).
- **Generate & assign** — type a root's consonants (`ktb`, `k-t-b`, or `k t b`)
  and every viable combination pops out like an Arabic dictionary. Only patterns
  whose arity matches the root's length are offered, so a 2-letter root shows
  biconsonantal patterns, a 3-letter root triconsonantal, and a 4-letter root
  quadriconsonantal. Attach a meaning (Korean or English) to any surface form —
  e.g. `maktab` → "사무실 / office".
- **Look up by root** — later, enter just the root consonants to see every saved
  form and its meaning(s).

## Importing patterns

Rather than adding patterns one at a time, you can import a long list at once
from a **JSON** file on the **Patterns** tab (the *Bulk import (JSON)* panel).
Either choose a `.json` file or paste JSON directly, then click **Import
patterns**. Click **Download template** to grab a starter file, or copy
[`examples/patterns.template.json`](examples/patterns.template.json).

The document is either a bare array of patterns or an object with a `patterns`
array:

```json
{
  "patterns": [
    { "name": "noun of place", "template": "ma12a3", "category": "noun", "notes": "k-t-b -> maktab" },
    { "name": "verbal noun", "template": "1i2aa3" },
    { "name": "biconsonantal noun", "template": "1a2" }
  ]
}
```

Each entry supports:

| Field      | Required | Description                                                        |
| ---------- | -------- | ------------------------------------------------------------------ |
| `name`     | yes      | Human-friendly label, e.g. `noun of place`.                        |
| `template` | yes      | Digits `1`–`9` are root slots; any other character is a literal.   |
| `category` | no       | e.g. `noun`, `verb`.                                               |
| `notes`    | no       | Free-form usage notes.                                             |
| `arity`    | no       | Overrides the arity derived from the template (the highest slot).  |

Rows that are missing a name/template or reference no root slot are skipped and
reported; the remaining valid rows are still imported.

## Data storage

- With **Supabase configured** (see below), data is stored in Postgres and shared
  across devices.
- Without it, the app runs fully offline and persists to the browser's
  `localStorage`. A badge in the header shows the current mode.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm test           # run the unit/component tests
npm run build      # production build
```

### Connecting Supabase (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the schema in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   using the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

4. Restart the dev server. The header badge will read "Supabase connected".

> The default row-level-security policies allow full read/write with the anon key
> (convenient for a single-user tool). Tighten them before exposing the project
> publicly.

## Project layout

```
src/
  lib/
    patterns.js        # pure root/pattern generation logic (tested)
    patternImport.js   # pure JSON bulk-import parser/validator (tested)
    db.js              # data layer: Supabase or localStorage backend
    supabaseClient.js  # Supabase client + config detection
  components/
    PhonologySettings.jsx
    PatternManager.jsx # add/edit patterns + bulk import from JSON
    RootGenerator.jsx  # enter root → viable forms → assign meanings
    RootLookup.jsx     # enter root → saved meanings
  App.jsx
examples/patterns.template.json   # starter file for bulk import
supabase/migrations/0001_init.sql
supabase/migrations/0002_pattern_arity.sql
```
