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
  (`1a22a3` → *kattab*).
- **Generate & assign** — type a root's consonants (`ktb`, `k-t-b`, or `k t b`)
  and every viable combination pops out like an Arabic dictionary. Attach a
  meaning (Korean or English) to any surface form — e.g. `maktab` → "사무실 / office".
- **Look up by root** — later, enter just the root consonants to see every saved
  form and its meaning(s).

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
    db.js              # data layer: Supabase or localStorage backend
    supabaseClient.js  # Supabase client + config detection
  components/
    PhonologySettings.jsx
    PatternManager.jsx
    RootGenerator.jsx  # enter root → viable forms → assign meanings
    RootLookup.jsx     # enter root → saved meanings
  App.jsx
supabase/migrations/0001_init.sql
```
