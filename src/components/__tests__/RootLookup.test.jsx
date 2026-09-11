import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RootLookup from '../RootLookup.jsx'

const settings = { consonants: ['k', 't', 'b'], vowels: ['a', 'i'] }
const patterns = [
  {
    id: 'p1',
    name: 'noun of place',
    template: 'ma12a3',
    notes: 'place where the action happens',
  },
]
const entries = [
  {
    id: 'e1',
    root_key: 'k-t-b',
    surface: 'maktab',
    pattern_id: 'p1',
    pattern_name: 'noun of place',
    gloss: '사무실',
    language: 'ko',
  },
]

beforeEach(() => {
  localStorage.clear()
})

describe('RootLookup', () => {
  it('shows the pattern note for a saved meaning', () => {
    render(
      <RootLookup
        entries={entries}
        patterns={patterns}
        settings={settings}
        onChanged={() => {}}
      />,
    )
    expect(
      screen.getByText('place where the action happens'),
    ).toBeInTheDocument()
  })

  it('resolves the pattern note by name when no id matches', () => {
    const orphan = [{ ...entries[0], pattern_id: null }]
    render(
      <RootLookup
        entries={orphan}
        patterns={patterns}
        settings={settings}
        onChanged={() => {}}
      />,
    )
    expect(
      screen.getByText('place where the action happens'),
    ).toBeInTheDocument()
  })

  it('filters entries by root', () => {
    render(
      <RootLookup
        entries={entries}
        patterns={patterns}
        settings={settings}
        onChanged={() => {}}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'xyz' },
    })
    expect(screen.getByText(/No saved meanings/)).toBeInTheDocument()
  })
})
