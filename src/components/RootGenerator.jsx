import { useMemo, useState } from 'react'
import { db } from '../lib/db.js'
import { generateForms, tokenizeRoot, rootKey } from '../lib/patterns.js'

// Enter a root's consonants; see every viable surface form produced by the
// stored patterns, then attach a meaning to any of them (the Arabic-dictionary
// workflow: k-t-b → maktab → "office").
export default function RootGenerator({ patterns, settings, entries, onEntryAdded }) {
  const [rootInput, setRootInput] = useState('')
  const [error, setError] = useState('')

  const inventory = settings.consonants ?? []
  const root = useMemo(
    () => tokenizeRoot(rootInput, inventory),
    [rootInput, inventory],
  )
  const key = useMemo(() => rootKey(root), [root])
  const forms = useMemo(
    () => generateForms(root, patterns),
    [root, patterns],
  )

  // Existing glosses for the current root, indexed by surface form.
  const existingBySurface = useMemo(() => {
    const map = new Map()
    for (const e of entries ?? []) {
      if (e.root_key !== key) continue
      if (!map.has(e.surface)) map.set(e.surface, [])
      map.get(e.surface).push(e)
    }
    return map
  }, [entries, key])

  return (
    <div className="panel">
      <h2>Generate &amp; assign meanings</h2>
      <p className="hint">
        Type the root consonants (e.g. <code>ktb</code>, or <code>k-t-b</code>, or
        <code> k t b</code>). Only patterns whose arity matches your root’s length
        are shown — a 2-consonant root shows biconsonantal patterns, 3 shows
        triconsonantal, 4 shows quadriconsonantal.
      </p>

      <div className="field">
        <label>Root consonants</label>
        <input
          value={rootInput}
          onChange={(e) => setRootInput(e.target.value)}
          placeholder="e.g. ktb"
          autoFocus
        />
        {root.length > 0 && (
          <div className="chips" style={{ marginTop: 8 }}>
            {root.map((c, i) => (
              <span className="chip" key={`${c}-${i}`}>
                {i + 1}. {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {root.length === 0 ? (
        <p className="muted">Enter a root to see combinations.</p>
      ) : patterns.length === 0 ? (
        <p className="muted">
          No patterns defined yet. Add some on the “Patterns” tab first.
        </p>
      ) : forms.length === 0 ? (
        <p className="muted">
          No pattern of arity {root.length} is defined for a {root.length}-consonant
          root. Add a matching pattern on the “Patterns” tab.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Surface</th>
              <th>Pattern</th>
              <th>Meanings</th>
              <th className="gloss-cell">Add meaning</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => (
              <FormRow
                key={`${f.patternId}-${f.surface}`}
                form={f}
                root={root}
                rootKeyValue={key}
                existing={existingBySurface.get(f.surface) ?? []}
                onError={setError}
                onEntryAdded={onEntryAdded}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function FormRow({ form, root, rootKeyValue, existing, onError, onEntryAdded }) {
  const [gloss, setGloss] = useState('')
  const [language, setLanguage] = useState('ko')
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    const value = gloss.trim()
    if (!value) return
    setSaving(true)
    onError('')
    try {
      await db.createEntry({
        root_key: rootKeyValue,
        root_tokens: root,
        surface: form.surface,
        pattern_id: form.patternId ?? null,
        pattern_name: form.name ?? null,
        gloss: value,
        language,
      })
      setGloss('')
      onEntryAdded?.()
    } catch (err) {
      onError(err.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="surface">{form.surface}</td>
      <td>
        <div>{form.name || <span className="muted">(unnamed)</span>}</div>
        <code className="muted">{form.template}</code>
      </td>
      <td>
        {existing.length === 0 ? (
          <span className="muted">—</span>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {existing.map((e) => (
              <li key={e.id}>
                {e.gloss}{' '}
                {e.language && <span className="muted">[{e.language}]</span>}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="gloss-cell">
        <form className="inline-form" onSubmit={save}>
          <div className="grow">
            <input
              value={gloss}
              onChange={(e) => setGloss(e.target.value)}
              placeholder="meaning…"
              aria-label={`meaning for ${form.surface}`}
            />
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="language"
            style={{ width: 'auto' }}
          >
            <option value="ko">KO</option>
            <option value="en">EN</option>
          </select>
          <button className="btn secondary" type="submit" disabled={saving}>
            Save
          </button>
        </form>
      </td>
    </tr>
  )
}
