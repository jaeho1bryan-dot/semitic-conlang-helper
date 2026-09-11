// Bulk import of vocalic/conjugation patterns from an external JSON document.
//
// This is pure, framework-agnostic logic: it parses and validates a JSON string
// into a list of pattern rows ready to be persisted via the data layer. The UI
// (PatternManager) reads a file, hands the text here, and feeds the accepted
// rows to `db.createPattern`.
//
// Accepted shapes (see examples/patterns.template.json):
//
//   { "patterns": [ { "name": …, "template": …, … }, … ] }   // preferred
//   [ { "name": …, "template": …, … }, … ]                    // bare array
//
// Each pattern object supports:
//   name      (string, required)  human-friendly label, e.g. "noun of place"
//   template  (string, required)  digits 1..9 = root slots, e.g. "ma12a3"
//   category  (string, optional)  e.g. "noun", "verb"
//   notes     (string, optional)  free-form usage notes
//   arity     (number, optional)  override the derived arity (highest slot)

import { requiredRootLength } from './patterns.js'

/**
 * Normalize and validate a single raw pattern object.
 *
 * @param {any} raw
 * @param {number} index position in the source list (for error messages)
 * @returns {{ ok: true, pattern: object } | { ok: false, error: string }}
 */
function normalizePattern(raw, index) {
  const where = `Pattern #${index + 1}`
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: `${where}: expected an object.` }
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const template = typeof raw.template === 'string' ? raw.template.trim() : ''

  if (!name) return { ok: false, error: `${where}: "name" is required.` }
  if (!template) {
    return { ok: false, error: `${where} (${name}): "template" is required.` }
  }

  const derivedArity = requiredRootLength(template)
  if (derivedArity === 0) {
    return {
      ok: false,
      error: `${where} (${name}): template "${template}" must reference at least one root slot (1–9).`,
    }
  }

  let arity = derivedArity
  if (raw.arity !== undefined && raw.arity !== null && raw.arity !== '') {
    const parsed = Number(raw.arity)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return {
        ok: false,
        error: `${where} (${name}): "arity" must be a positive integer.`,
      }
    }
    arity = parsed
  }

  const category =
    typeof raw.category === 'string' && raw.category.trim()
      ? raw.category.trim()
      : null
  const notes =
    typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null

  return { ok: true, pattern: { name, template, arity, category, notes } }
}

/**
 * Parse a JSON document into pattern rows.
 *
 * Never throws: parse/validation problems are returned in `errors`. Valid rows
 * are returned in `patterns` even when some siblings are invalid, so a caller
 * can choose to import the good ones or abort.
 *
 * @param {string} text raw JSON text
 * @returns {{ patterns: object[], errors: string[] }}
 */
export function parsePatternsJson(text) {
  const errors = []

  if (typeof text !== 'string' || !text.trim()) {
    return { patterns: [], errors: ['The file is empty.'] }
  }

  let data
  try {
    data = JSON.parse(text)
  } catch (err) {
    return { patterns: [], errors: [`Invalid JSON: ${err.message}`] }
  }

  let list
  if (Array.isArray(data)) {
    list = data
  } else if (data && typeof data === 'object' && Array.isArray(data.patterns)) {
    list = data.patterns
  } else {
    return {
      patterns: [],
      errors: [
        'Expected a JSON array of patterns or an object with a "patterns" array.',
      ],
    }
  }

  if (list.length === 0) {
    return { patterns: [], errors: ['No patterns found in the file.'] }
  }

  const patterns = []
  list.forEach((raw, index) => {
    const result = normalizePattern(raw, index)
    if (result.ok) patterns.push(result.pattern)
    else errors.push(result.error)
  })

  return { patterns, errors }
}
