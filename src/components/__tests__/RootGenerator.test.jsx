import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RootGenerator from '../RootGenerator.jsx'

// Use the localStorage-backed db (no Supabase env in tests).
import { db } from '../../lib/db.js'

const patterns = [
  { id: 'p1', name: 'noun of place', template: 'ma12a3' },
  { id: 'p2', name: 'verbal noun', template: '1i2aa3' },
]
const settings = { consonants: ['k', 't', 'b'], vowels: ['a', 'i'] }

beforeEach(() => {
  localStorage.clear()
})

describe('RootGenerator', () => {
  it('shows viable surface forms for an entered root', () => {
    render(
      <RootGenerator
        patterns={patterns}
        settings={settings}
        entries={[]}
        onEntryAdded={() => {}}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'ktb' },
    })
    expect(screen.getByText('maktab')).toBeInTheDocument()
    expect(screen.getByText('kitaab')).toBeInTheDocument()
  })

  it('saves a meaning for a generated form', async () => {
    const onEntryAdded = vi.fn()
    render(
      <RootGenerator
        patterns={patterns}
        settings={settings}
        entries={[]}
        onEntryAdded={onEntryAdded}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'ktb' },
    })
    fireEvent.change(screen.getByLabelText('meaning for maktab'), {
      target: { value: '사무실' },
    })
    fireEvent.click(screen.getAllByText('Save')[0])

    await waitFor(() => expect(onEntryAdded).toHaveBeenCalled())
    const entries = await db.listEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      root_key: 'k-t-b',
      surface: 'maktab',
      gloss: '사무실',
    })
  })
})
