import { useEffect, useState } from 'react'
import { db } from '../lib/db.js'

// Editable consonant + vowel inventory. Multi-character symbols (e.g. "sh")
// are supported and are used to tokenize bare root strings on the Generate tab.
export default function PhonologySettings({ settings, onChanged }) {
  const [consonants, setConsonants] = useState([])
  const [vowels, setVowels] = useState([])
  const [newConsonant, setNewConsonant] = useState('')
  const [newVowel, setNewVowel] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setConsonants(settings.consonants ?? [])
    setVowels(settings.vowels ?? [])
  }, [settings])

  function addSymbol(list, setList, value, setValue) {
    const v = value.trim()
    if (!v || list.includes(v)) {
      setValue('')
      return
    }
    setList([...list, v])
    setValue('')
    setStatus('')
  }

  function removeSymbol(list, setList, value) {
    setList(list.filter((s) => s !== value))
    setStatus('')
  }

  async function save() {
    setError('')
    try {
      await db.saveSettings({ consonants, vowels })
      setStatus('Saved.')
      onChanged?.()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <div className="panel">
      <h2>Phonology</h2>
      <p className="hint">
        Configure the consonant and vowel inventory of your language. Consonants
        can be multi-character romanizations (e.g. <code>sh</code>, <code>ṭ</code>
        ); they are used to split bare root strings into radicals.
      </p>

      <div className="field">
        <label>Consonants</label>
        <div className="chips">
          {consonants.map((c) => (
            <span className="chip" key={c}>
              {c}
              <button
                aria-label={`remove ${c}`}
                onClick={() => removeSymbol(consonants, setConsonants, c)}
              >
                ×
              </button>
            </span>
          ))}
          {consonants.length === 0 && <span className="muted">None yet.</span>}
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            addSymbol(consonants, setConsonants, newConsonant, setNewConsonant)
          }}
        >
          <div className="grow">
            <input
              value={newConsonant}
              onChange={(e) => setNewConsonant(e.target.value)}
              placeholder="Add a consonant, e.g. sh"
            />
          </div>
          <button className="btn secondary" type="submit">
            Add
          </button>
        </form>
      </div>

      <div className="field">
        <label>Vowels</label>
        <div className="chips">
          {vowels.map((v) => (
            <span className="chip" key={v}>
              {v}
              <button
                aria-label={`remove ${v}`}
                onClick={() => removeSymbol(vowels, setVowels, v)}
              >
                ×
              </button>
            </span>
          ))}
          {vowels.length === 0 && <span className="muted">None yet.</span>}
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            addSymbol(vowels, setVowels, newVowel, setNewVowel)
          }}
        >
          <div className="grow">
            <input
              value={newVowel}
              onChange={(e) => setNewVowel(e.target.value)}
              placeholder="Add a vowel, e.g. aa"
            />
          </div>
          <button className="btn secondary" type="submit">
            Add
          </button>
        </form>
      </div>

      <button className="btn" onClick={save}>
        Save phonology
      </button>{' '}
      {status && <span className="muted">{status}</span>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
