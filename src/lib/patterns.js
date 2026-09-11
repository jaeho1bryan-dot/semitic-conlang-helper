// Core, framework-agnostic logic for the Semitic conlang helper.
//
// A "root" is an ordered list of consonant tokens (e.g. ["k", "t", "b"]).
// A "pattern" (binyan / template) is a string where the digits 1..9 are
// placeholders for the 1st..9th root consonant and every other character is a
// literal segment (a fixed vowel, affix, or consonant). For example the
// template "ma12a3" applied to the root k-t-b yields "maktab".

/**
 * Tokenize a raw root string into consonant tokens.
 *
 * If the string contains explicit separators (space, hyphen, dot, slash) it is
 * split on them. Otherwise, known multi-character consonants from the supplied
 * inventory are matched greedily (longest first) before falling back to single
 * characters. This lets romanizations such as "sh", "th" or "kh" be treated as
 * a single consonant when they are part of the inventory.
 *
 * @param {string} raw
 * @param {string[]} [inventory] list of consonant symbols
 * @returns {string[]}
 */
export function tokenizeRoot(raw, inventory = []) {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return []

  if (/[\s\-.\/]/.test(trimmed)) {
    return trimmed
      .split(/[\s\-.\/]+/)
      .map((t) => t.trim())
      .filter(Boolean)
  }

  const multi = inventory
    .filter((c) => c && c.length > 1)
    .sort((a, b) => b.length - a.length)

  const tokens = []
  let i = 0
  while (i < trimmed.length) {
    const match = multi.find((c) => trimmed.startsWith(c, i))
    if (match) {
      tokens.push(match)
      i += match.length
    } else {
      tokens.push(trimmed[i])
      i += 1
    }
  }
  return tokens
}

/**
 * The highest root-consonant index (1-based) referenced by a template.
 * Returns 0 when the template uses no root slots.
 *
 * @param {string} template
 * @returns {number}
 */
export function requiredRootLength(template) {
  let max = 0
  for (const ch of template ?? '') {
    if (ch >= '1' && ch <= '9') {
      max = Math.max(max, Number(ch))
    }
  }
  return max
}

/**
 * Whether a template can be realized by a root of the given length.
 *
 * @param {string} template
 * @param {string[]} root
 * @returns {boolean}
 */
export function isViable(template, root) {
  const need = requiredRootLength(template)
  if (need === 0) return false
  return Array.isArray(root) && root.length >= need
}

/**
 * Apply a template to a root, producing the surface form.
 * Throws when the root is too short for the template.
 *
 * @param {string} template
 * @param {string[]} root
 * @returns {string}
 */
export function applyPattern(template, root) {
  if (!isViable(template, root)) {
    throw new Error(
      `Root [${(root || []).join(', ')}] is too short for template "${template}"`,
    )
  }
  let out = ''
  for (const ch of template) {
    if (ch >= '1' && ch <= '9') {
      out += root[Number(ch) - 1]
    } else {
      out += ch
    }
  }
  return out
}

/**
 * Generate every viable surface form for a root across the given patterns.
 *
 * @param {string[]} root
 * @param {Array<{id?: string|number, template: string, name?: string}>} patterns
 * @returns {Array<{patternId: string|number|undefined, name: string|undefined, template: string, surface: string}>}
 */
export function generateForms(root, patterns) {
  const results = []
  for (const pattern of patterns ?? []) {
    if (!pattern || typeof pattern.template !== 'string') continue
    if (!isViable(pattern.template, root)) continue
    results.push({
      patternId: pattern.id,
      name: pattern.name,
      template: pattern.template,
      surface: applyPattern(pattern.template, root),
    })
  }
  return results
}

/**
 * Normalize a root (array or raw string) into a canonical key used for lookups.
 * The key is the lowercased tokens joined by a hyphen, e.g. "k-t-b".
 *
 * @param {string|string[]} root
 * @param {string[]} [inventory]
 * @returns {string}
 */
export function rootKey(root, inventory = []) {
  const tokens = Array.isArray(root) ? root : tokenizeRoot(root, inventory)
  return tokens.map((t) => String(t).toLowerCase()).join('-')
}
