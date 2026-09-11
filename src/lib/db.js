// Data-access layer. Exposes a single async API used by the UI. When Supabase
// is configured (see supabaseClient.js) it talks to the backend; otherwise it
// persists to localStorage so the app is fully usable offline.

import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const DEFAULT_SETTINGS = {
  // A compact default Semitic-style romanized inventory. Fully editable in-app.
  consonants: [
    'ʔ', 'b', 'g', 'd', 'h', 'w', 'z', 'ḥ', 'ṭ', 'y', 'k', 'l',
    'm', 'n', 's', 'ʕ', 'p', 'ṣ', 'q', 'r', 'š', 't',
  ],
  vowels: ['a', 'i', 'u', 'aa', 'ii', 'uu'],
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// ---------------------------------------------------------------------------
// localStorage backend
// ---------------------------------------------------------------------------

const LS_KEYS = {
  patterns: 'sch.patterns',
  entries: 'sch.entries',
  settings: 'sch.settings',
}

function lsRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function lsWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

const localBackend = {
  async listPatterns() {
    return lsRead(LS_KEYS.patterns, []).sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || ''),
    )
  },
  async createPattern(input) {
    const rows = lsRead(LS_KEYS.patterns, [])
    const row = { id: uid(), created_at: new Date().toISOString(), ...input }
    rows.push(row)
    lsWrite(LS_KEYS.patterns, rows)
    return row
  },
  async updatePattern(id, patch) {
    const rows = lsRead(LS_KEYS.patterns, [])
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) return null
    rows[idx] = { ...rows[idx], ...patch }
    lsWrite(LS_KEYS.patterns, rows)
    return rows[idx]
  },
  async deletePattern(id) {
    lsWrite(
      LS_KEYS.patterns,
      lsRead(LS_KEYS.patterns, []).filter((r) => r.id !== id),
    )
  },

  async listEntries() {
    return lsRead(LS_KEYS.entries, []).sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || ''),
    )
  },
  async createEntry(input) {
    const rows = lsRead(LS_KEYS.entries, [])
    const row = { id: uid(), created_at: new Date().toISOString(), ...input }
    rows.push(row)
    lsWrite(LS_KEYS.entries, rows)
    return row
  },
  async deleteEntry(id) {
    lsWrite(
      LS_KEYS.entries,
      lsRead(LS_KEYS.entries, []).filter((r) => r.id !== id),
    )
  },

  async getSettings() {
    return lsRead(LS_KEYS.settings, DEFAULT_SETTINGS)
  },
  async saveSettings(settings) {
    lsWrite(LS_KEYS.settings, settings)
    return settings
  },
}

// ---------------------------------------------------------------------------
// Supabase backend
// ---------------------------------------------------------------------------

function throwOnError(error) {
  if (error) throw new Error(error.message || String(error))
}

const supabaseBackend = {
  async listPatterns() {
    const { data, error } = await supabase
      .from('patterns')
      .select('*')
      .order('created_at', { ascending: true })
    throwOnError(error)
    return data ?? []
  },
  async createPattern(input) {
    const { data, error } = await supabase
      .from('patterns')
      .insert(input)
      .select()
      .single()
    throwOnError(error)
    return data
  },
  async updatePattern(id, patch) {
    const { data, error } = await supabase
      .from('patterns')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    throwOnError(error)
    return data
  },
  async deletePattern(id) {
    const { error } = await supabase.from('patterns').delete().eq('id', id)
    throwOnError(error)
  },

  async listEntries() {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })
    throwOnError(error)
    return data ?? []
  },
  async createEntry(input) {
    const { data, error } = await supabase
      .from('entries')
      .insert(input)
      .select()
      .single()
    throwOnError(error)
    return data
  },
  async deleteEntry(id) {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    throwOnError(error)
  },

  async getSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'phonology')
      .maybeSingle()
    throwOnError(error)
    return data?.value ?? DEFAULT_SETTINGS
  },
  async saveSettings(settings) {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'phonology', value: settings, updated_at: new Date().toISOString() })
    throwOnError(error)
    return settings
  },
}

export const db = isSupabaseConfigured ? supabaseBackend : localBackend
export { DEFAULT_SETTINGS, isSupabaseConfigured }
