import { describe, it, expect } from 'vitest'
import {
  tokenizeRoot,
  requiredRootLength,
  isViable,
  applyPattern,
  generateForms,
  rootKey,
} from '../patterns.js'

describe('tokenizeRoot', () => {
  it('splits a bare triliteral string into single consonants', () => {
    expect(tokenizeRoot('ktb')).toEqual(['k', 't', 'b'])
  })

  it('splits on separators', () => {
    expect(tokenizeRoot('k-t-b')).toEqual(['k', 't', 'b'])
    expect(tokenizeRoot('q s d')).toEqual(['q', 's', 'd'])
  })

  it('greedily matches multi-character consonants from the inventory', () => {
    expect(tokenizeRoot('shkr', ['sh', 'k', 'r'])).toEqual(['sh', 'k', 'r'])
  })

  it('falls back to single chars when no multi-char match', () => {
    expect(tokenizeRoot('shk', [])).toEqual(['s', 'h', 'k'])
  })

  it('returns an empty array for blank input', () => {
    expect(tokenizeRoot('   ')).toEqual([])
    expect(tokenizeRoot(undefined)).toEqual([])
  })
})

describe('requiredRootLength', () => {
  it('reports the highest slot index used', () => {
    expect(requiredRootLength('ma12a3')).toBe(3)
    expect(requiredRootLength('1a2i3')).toBe(3)
    expect(requiredRootLength('1a2')).toBe(2)
    expect(requiredRootLength('prefix')).toBe(0)
  })
})

describe('isViable', () => {
  it('is true when the root is long enough', () => {
    expect(isViable('ma12a3', ['k', 't', 'b'])).toBe(true)
    expect(isViable('1a2', ['k', 't', 'b'])).toBe(true)
  })

  it('is false when the root is too short', () => {
    expect(isViable('ma12a3', ['k', 't'])).toBe(false)
  })

  it('is false when the template references no root slots', () => {
    expect(isViable('abc', ['k', 't', 'b'])).toBe(false)
  })
})

describe('applyPattern', () => {
  it('produces maktab from ma12a3 + k,t,b', () => {
    expect(applyPattern('ma12a3', ['k', 't', 'b'])).toBe('maktab')
  })

  it('produces kaataba (gemination via repeated slot) correctly', () => {
    // 1a22a3 doubles the middle radical: k a t t a b -> kattab
    expect(applyPattern('1a22a3', ['k', 't', 'b'])).toBe('kattab')
  })

  it('supports multi-character root tokens', () => {
    expect(applyPattern('ma12a3', ['sh', 'k', 'r'])).toBe('mashkar')
  })

  it('throws when the root is too short', () => {
    expect(() => applyPattern('ma12a3', ['k', 't'])).toThrow()
  })
})

describe('generateForms', () => {
  const patterns = [
    { id: 1, name: 'noun of place', template: 'ma12a3' },
    { id: 2, name: 'verbal noun', template: '1i2aa3' },
    { id: 3, name: 'quadriliteral', template: '1a2a3a4' },
  ]

  it('returns only viable forms for a triliteral root', () => {
    const forms = generateForms(['k', 't', 'b'], patterns)
    expect(forms.map((f) => f.surface)).toEqual(['maktab', 'kitaab'])
    expect(forms).toHaveLength(2)
  })

  it('carries pattern metadata through', () => {
    const [first] = generateForms(['k', 't', 'b'], patterns)
    expect(first).toMatchObject({
      patternId: 1,
      name: 'noun of place',
      template: 'ma12a3',
      surface: 'maktab',
    })
  })

  it('handles empty inputs gracefully', () => {
    expect(generateForms([], patterns)).toEqual([])
    expect(generateForms(['k', 't', 'b'], [])).toEqual([])
    expect(generateForms(['k', 't', 'b'], undefined)).toEqual([])
  })
})

describe('rootKey', () => {
  it('normalizes arrays and strings to the same key', () => {
    expect(rootKey(['K', 'T', 'B'])).toBe('k-t-b')
    expect(rootKey('ktb')).toBe('k-t-b')
    expect(rootKey('k-t-b')).toBe('k-t-b')
  })
})
