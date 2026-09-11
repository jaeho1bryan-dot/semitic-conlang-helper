import { useMemo, useState } from 'react'
import { db } from '../lib/db.js'
import { tokenizeRoot, rootKey } from '../lib/patterns.js'

// Enter just the root consonants to see every stored meaning for that root.
export default function RootLookup({ entries, patterns, settings, onChanged }) {
  const [rootInput, setRootInput] = useState('')
  const [error, setError] = useState('')

  const inventory = settings.consonants ?? []
  const query = rootInput.trim()
  const key = useMemo(
    () => rootKey(tokenizeRoot(query, inventory)),
    [query, inventory],
  )

  // Look up a pattern's notes by its id (falling back to its name) so meanings
  // can show the usage note recorded for the pattern that produced them.
  const noteFor = useMemo(() => {
    const byId = new Map()
    const byName = new Map()
    for (const p of patterns ?? []) {
      if (!p?.notes) continue
      if (p.id != null) byId.set(p.id, p.notes)
      if (p.name) byName.set(p.name, p.notes)
    }
    return (entry) =>
      (entry.pattern_id != null && byId.get(entry.pattern_id)) ||
      (entry.pattern_name && byName.get(entry.pattern_name)) ||
      null
  }, [patterns])

  const matches = useMemo(() => {
    if (!query) return entries ?? []
    return (entries ?? []).filter((e) => e.root_key === key)
  }, [entries, key, query])

  async function remove(id) {
    setError('')
    try {
      await db.deleteEntry(id)
      onChanged?.()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <div className="panel">
      <h2>Root lookup</h2>
      <p className="hint">
        Enter a root (e.g. <code>ktb</code>) to list every saved form and meaning.
        Leave blank to browse the whole dictionary.
      </p>

      <div className="field">
        <label>Root consonants</label>
        <input
          value={rootInput}
          onChange={(e) => setRootInput(e.target.value)}
          placeholder="e.g. ktb"
        />
      </div>

      {error && <p className="error">{error}</p>}

      {matches.length === 0 ? (
        <p className="muted">
          {query
            ? `No saved meanings for "${key}".`
            : 'No entries saved yet.'}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Root</th>
              <th>Surface</th>
              <th>Pattern</th>
              <th>Meaning</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((e) => {
              const note = noteFor(e)
              return (
                <tr key={e.id}>
                  <td className="muted">{e.root_key}</td>
                  <td className="surface">{e.surface}</td>
                  <td className="muted">
                    <div>{e.pattern_name || '—'}</div>
                    {note && <div className="pattern-note">{note}</div>}
                  </td>
                  <td>
                    {e.gloss}{' '}
                    {e.language && <span className="muted">[{e.language}]</span>}
                  </td>
                  <td>
                    <button className="btn danger" onClick={() => remove(e.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
