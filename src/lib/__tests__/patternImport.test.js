import { describe, it, expect } from 'vitest'
import { parsePatternsJson } from '../patternImport.js'

describe('parsePatternsJson', () => {
  it('parses the preferred { patterns: [...] } shape', () => {
    const { patterns, errors } = parsePatternsJson(
      JSON.stringify({
        patterns: [
          { name: 'noun of place', template: 'ma12a3', category: 'noun' },
          { name: 'verbal noun', template: '1i2aa3' },
        ],
      }),
    )
    expect(errors).toEqual([])
    expect(patterns).toEqual([
      {
        name: 'noun of place',
        template: 'ma12a3',
        arity: 3,
        category: 'noun',
        notes: null,
      },
      {
        name: 'verbal noun',
        template: '1i2aa3',
        arity: 3,
        category: null,
        notes: null,
      },
    ])
  })

  it('parses a bare top-level array', () => {
    const { patterns, errors } = parsePatternsJson(
      JSON.stringify([{ name: 'biconsonantal', template: '1a2' }]),
    )
    expect(errors).toEqual([])
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({ name: 'biconsonantal', arity: 2 })
  })

  it('derives arity from the template and honours an explicit override', () => {
    const { patterns } = parsePatternsJson(
      JSON.stringify([
        { name: 'derived', template: 'ma12a3' },
        { name: 'override', template: 'ma12a3', arity: 4 },
      ]),
    )
    expect(patterns[0].arity).toBe(3)
    expect(patterns[1].arity).toBe(4)
  })

  it('trims whitespace and normalizes optional fields to null', () => {
    const { patterns } = parsePatternsJson(
      JSON.stringify([
        { name: '  spaced  ', template: '  1a2  ', category: '  ', notes: '' },
      ]),
    )
    expect(patterns[0]).toEqual({
      name: 'spaced',
      template: '1a2',
      arity: 2,
      category: null,
      notes: null,
    })
  })

  it('collects errors for invalid rows but keeps the valid ones', () => {
    const { patterns, errors } = parsePatternsJson(
      JSON.stringify([
        { name: 'ok', template: 'ma12a3' },
        { template: 'ma12a3' }, // missing name
        { name: 'no slots', template: 'abc' }, // no root slot
        { name: 'bad arity', template: '1a2', arity: -1 },
      ]),
    )
    expect(patterns).toHaveLength(1)
    expect(patterns[0].name).toBe('ok')
    expect(errors).toHaveLength(3)
    expect(errors[0]).toMatch(/"name" is required/)
    expect(errors[1]).toMatch(/at least one root slot/)
    expect(errors[2]).toMatch(/positive integer/)
  })

  it('reports invalid JSON without throwing', () => {
    const { patterns, errors } = parsePatternsJson('{ not json')
    expect(patterns).toEqual([])
    expect(errors[0]).toMatch(/Invalid JSON/)
  })

  it('reports empty or unexpected input', () => {
    expect(parsePatternsJson('').errors).toEqual(['The file is empty.'])
    expect(parsePatternsJson('   ').errors).toEqual(['The file is empty.'])
    expect(parsePatternsJson('[]').errors).toEqual([
      'No patterns found in the file.',
    ])
    expect(parsePatternsJson('42').errors[0]).toMatch(/Expected a JSON array/)
  })
})
