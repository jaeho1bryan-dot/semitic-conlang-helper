import { useCallback, useEffect, useState } from 'react'
import { db, isSupabaseConfigured } from './lib/db.js'
import PhonologySettings from './components/PhonologySettings.jsx'
import PatternManager from './components/PatternManager.jsx'
import RootGenerator from './components/RootGenerator.jsx'
import RootLookup from './components/RootLookup.jsx'

const TABS = [
  { id: 'generate', label: 'Generate & assign' },
  { id: 'lookup', label: 'Root lookup' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'phonology', label: 'Phonology' },
]

export default function App() {
  const [tab, setTab] = useState('generate')
  const [patterns, setPatterns] = useState([])
  const [entries, setEntries] = useState([])
  const [settings, setSettings] = useState({ consonants: [], vowels: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reloadPatterns = useCallback(async () => {
    setPatterns(await db.listPatterns())
  }, [])
  const reloadEntries = useCallback(async () => {
    setEntries(await db.listEntries())
  }, [])
  const reloadSettings = useCallback(async () => {
    setSettings(await db.getSettings())
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [p, e, s] = await Promise.all([
          db.listPatterns(),
          db.listEntries(),
          db.getSettings(),
        ])
        if (!active) return
        setPatterns(p)
        setEntries(e)
        setSettings(s)
      } catch (err) {
        if (active) setError(err.message || String(err))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="app">
      <header>
        <h1>Semitic Conlang Helper</h1>
        <p>
          Define vocalic patterns, generate viable root combinations, and look up
          meanings by triconsonantal root.
        </p>
        <span className={`badge ${isSupabaseConfigured ? 'online' : ''}`}>
          {isSupabaseConfigured ? 'Supabase connected' : 'Offline (localStorage)'}
        </span>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && <p className="error">Error: {error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          {tab === 'generate' && (
            <RootGenerator
              patterns={patterns}
              settings={settings}
              entries={entries}
              onEntryAdded={reloadEntries}
            />
          )}
          {tab === 'lookup' && (
            <RootLookup
              entries={entries}
              patterns={patterns}
              settings={settings}
              onChanged={reloadEntries}
            />
          )}
          {tab === 'patterns' && (
            <PatternManager patterns={patterns} onChanged={reloadPatterns} />
          )}
          {tab === 'phonology' && (
            <PhonologySettings settings={settings} onChanged={reloadSettings} />
          )}
        </>
      )}
    </div>
  )
}
