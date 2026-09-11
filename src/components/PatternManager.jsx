import { useRef, useState } from 'react'
import { db } from '../lib/db.js'
import {
  applyPattern,
  isViable,
  requiredRootLength,
  patternArity,
  arityLabel,
} from '../lib/patterns.js'
import { parsePatternsJson } from '../lib/patternImport.js'

// A ready-to-edit template offered as a download from the import panel. Keeping
// it in sync with examples/patterns.template.json.
const TEMPLATE_JSON = `{
  "patterns": [
    {
      "name": "noun of place",
      "template": "ma12a3",
      "category": "noun",
      "notes": "maCCaC — place where the root action happens (k-t-b -> maktab)."
    },
    {
      "name": "verbal noun",
      "template": "1i2aa3",
      "category": "noun",
      "notes": "CiCaaC — abstract/verbal noun (k-t-b -> kitaab)."
    },
    {
      "name": "biconsonantal noun",
      "template": "1a2",
      "category": "noun",
      "notes": "CaC — a simple two-consonant root (arity 2)."
    }
  ]
}
`

const SAMPLE_RADICALS = ['k', 't', 'b', 'r', 'l']

function sampleRoot(arity) {
  if (!arity || arity < 1) return SAMPLE_RADICALS.slice(0, 3)
  return SAMPLE_RADICALS.slice(0, Math.min(arity, SAMPLE_RADICALS.length))
}

function preview(template) {
  try {
    const root = sampleRoot(requiredRootLength(template))
    if (!isViable(template, root)) return '—'
    return applyPattern(template, root)
  } catch {
    return '—'
  }
}

function sampleLabel(template) {
  return sampleRoot(requiredRootLength(template)).join('-')
}

const EMPTY = { name: '', template: '', category: '', notes: '' }

export default function PatternManager({ patterns, onChanged }) {
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [importText, setImportText] = useState('')
  const [importErrors, setImportErrors] = useState([])
  const [importStatus, setImportStatus] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function startEdit(p) {
    setEditingId(p.id)
    setForm({
      name: p.name ?? '',
      template: p.template ?? '',
      category: p.category ?? '',
      notes: p.notes ?? '',
    })
  }

  function cancel() {
    setEditingId(null)
    setForm(EMPTY)
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const name = form.name.trim()
    const template = form.template.trim()
    if (!name || !template) {
      setError('Name and template are required.')
      return
    }
    if (requiredRootLength(template) === 0) {
      setError('Template must reference at least one root slot (1, 2, 3 …).')
      return
    }
    const payload = {
      name,
      template,
      arity: requiredRootLength(template),
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
    }
    try {
      if (editingId) {
        await db.updatePattern(editingId, payload)
      } else {
        await db.createPattern(payload)
      }
      cancel()
      onChanged?.()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  async function remove(id) {
    try {
      await db.deletePattern(id)
      if (editingId === id) cancel()
      onChanged?.()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImportText(String(reader.result ?? ''))
    reader.onerror = () => setImportErrors(['Could not read the selected file.'])
    reader.readAsText(file)
  }

  async function runImport() {
    setImportErrors([])
    setImportStatus('')
    const { patterns: parsed, errors } = parsePatternsJson(importText)
    if (parsed.length === 0) {
      setImportErrors(errors.length ? errors : ['No valid patterns to import.'])
      return
    }
    setImporting(true)
    let created = 0
    const failures = [...errors]
    try {
      for (const p of parsed) {
        try {
          await db.createPattern(p)
          created += 1
        } catch (err) {
          failures.push(`${p.name}: ${err.message || String(err)}`)
        }
      }
      setImportStatus(
        `Imported ${created} pattern${created === 1 ? '' : 's'}.` +
          (failures.length ? ` ${failures.length} skipped.` : ''),
      )
      setImportErrors(failures)
      if (created > 0) {
        setImportText('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        onChanged?.()
      }
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_JSON], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'patterns.template.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="panel">
      <h2>Patterns (binyanim)</h2>
      <p className="hint">
        A template uses digits <code>1</code>–<code>9</code> for root consonants
        and any other character as a literal segment. Example: <code>ma12a3</code>{' '}
        applied to <code>k-t-b</code> → <strong>maktab</strong>. Repeat a digit to
        geminate (e.g. <code>1a22a3</code> → kattab). The highest slot sets the
        pattern’s <strong>arity</strong> — a biconsonantal (2), triconsonantal (3)
        or quadriconsonantal (4) template only matches a root of the same length.
      </p>

      <form onSubmit={submit}>
        <div className="row">
          <div className="field">
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. noun of place"
            />
          </div>
          <div className="field">
            <label>Template</label>
            <input
              value={form.template}
              onChange={(e) => set('template', e.target.value)}
              placeholder="e.g. ma12a3"
            />
          </div>
          <div className="field">
            <label>Category</label>
            <input
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="e.g. noun, verb…"
            />
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Usage notes, restrictions, …"
          />
        </div>
        <p className="hint">
          Preview ({sampleLabel(form.template) || 'k-t-b'}):{' '}
          <span className="surface">{preview(form.template)}</span>
          {requiredRootLength(form.template) > 0 && (
            <>
              {' · '}
              <span className="muted">
                arity {requiredRootLength(form.template)} (
                {arityLabel(requiredRootLength(form.template))})
              </span>
            </>
          )}
        </p>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">
          {editingId ? 'Save changes' : 'Add pattern'}
        </button>{' '}
        {editingId && (
          <button className="btn secondary" type="button" onClick={cancel}>
            Cancel
          </button>
        )}
      </form>

      <div className="import" style={{ marginTop: 18 }}>
        <h3>Bulk import (JSON)</h3>
        <p className="hint">
          Import a long list of vowel/conjugation patterns at once. Provide a
          JSON array of patterns, or an object with a <code>patterns</code> array.
          Each entry needs a <code>name</code> and a <code>template</code>;{' '}
          <code>category</code>, <code>notes</code> and <code>arity</code> are
          optional.{' '}
          <button
            type="button"
            className="btn secondary"
            onClick={downloadTemplate}
          >
            Download template
          </button>
        </p>
        <div className="field">
          <label>Choose a JSON file</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={onFile}
            aria-label="pattern JSON file"
          />
        </div>
        <div className="field">
          <label>…or paste JSON</label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{ "patterns": [ { "name": "noun of place", "template": "ma12a3" } ] }'
            rows={6}
            aria-label="pattern JSON"
          />
        </div>
        {importStatus && <p className="hint">{importStatus}</p>}
        {importErrors.length > 0 && (
          <ul className="error">
            {importErrors.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        )}
        <button
          className="btn"
          type="button"
          onClick={runImport}
          disabled={importing || !importText.trim()}
        >
          {importing ? 'Importing…' : 'Import patterns'}
        </button>
      </div>

      <table style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Template</th>
            <th>Arity</th>
            <th>Example</th>
            <th>Category</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {patterns.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No patterns yet. Add one above.
              </td>
            </tr>
          )}
          {patterns.map((p) => {
            const arity = patternArity(p)
            return (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <code>{p.template}</code>
                </td>
                <td className="muted">
                  {arity > 0 ? `${arity} · ${arityLabel(arity)}` : '—'}
                </td>
                <td className="surface">
                  {sampleLabel(p.template)} → {preview(p.template)}
                </td>
                <td className="muted">{p.category || '—'}</td>
                <td>
                  <button className="btn secondary" onClick={() => startEdit(p)}>
                    Edit
                  </button>{' '}
                  <button className="btn danger" onClick={() => remove(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
