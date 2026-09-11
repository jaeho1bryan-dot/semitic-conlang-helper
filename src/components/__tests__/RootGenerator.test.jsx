import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RootGenerator from '../RootGenerator.jsx'

// Use the localStorage-backed db (no Supabase env in tests).
import { db } from '../../lib/db.js'

const patterns = [
  { id: 'p1', name: 'noun of place', template: 'ma12a3' },
  { id: 'p2', name: 'verbal noun', template: '1i2aa3' },
  { id: 'p3', name: 'biconsonantal', template: '1a2' },
  { id: 'p4', name: 'quadriliteral', template: '1a2a3a4' },
]
const settings = { consonants: ['k', 't', 'b', 'r'], vowels: ['a', 'i'] }

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

  it('only shows patterns whose arity matches the root length', () => {
    render(
      <RootGenerator
        patterns={patterns}
        settings={settings}
        entries={[]}
        onEntryAdded={() => {}}
      />,
    )
    // A 3-consonant root: triconsonantal patterns only.
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'ktb' },
    })
    expect(screen.getByText('maktab')).toBeInTheDocument()
    // Biconsonantal (kt) and quadriliteral (ktbr) forms must not appear.
    expect(screen.queryByText('kat')).not.toBeInTheDocument()
    expect(screen.queryByText('katab')).not.toBeInTheDocument()

    // A 2-consonant root: biconsonantal patterns only.
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'kt' },
    })
    expect(screen.getByText('kat')).toBeInTheDocument()
    expect(screen.queryByText('maktab')).not.toBeInTheDocument()

    // A 4-consonant root: quadriconsonantal patterns only.
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'ktbr' },
    })
    expect(screen.getByText('katabar')).toBeInTheDocument()
    expect(screen.queryByText('maktab')).not.toBeInTheDocument()
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

  it('shows a pattern note next to a generated form', () => {
    const withNotes = [
      { id: 'p1', name: 'noun of place', template: 'ma12a3', notes: 'place where the action happens' },
    ]
    render(
      <RootGenerator
        patterns={withNotes}
        settings={settings}
        entries={[]}
        onEntryAdded={() => {}}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'ktb' },
    })
    expect(
      screen.getByText('place where the action happens'),
    ).toBeInTheDocument()
  })

  it('edits a previously saved meaning', async () => {
    const onEntryAdded = vi.fn()
    const existing = {
      id: 'e1',
      root_key: 'k-t-b',
      surface: 'maktab',
      pattern_id: 'p1',
      pattern_name: 'noun of place',
      gloss: '사무실',
      language: 'ko',
    }
    render(
      <RootGenerator
        patterns={patterns}
        settings={settings}
        entries={[existing]}
        onEntryAdded={onEntryAdded}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'ktb' },
    })
    fireEvent.click(screen.getByLabelText('edit 사무실'))
    fireEvent.change(screen.getByLabelText('edit meaning 사무실'), {
      target: { value: '도서관' },
    })
    fireEvent.click(screen.getAllByText('Save')[0])
    await waitFor(() => expect(onEntryAdded).toHaveBeenCalled())
  })

  it('deletes a previously saved meaning', async () => {
    const onEntryAdded = vi.fn()
    await db.createEntry({
      root_key: 'k-t-b',
      surface: 'maktab',
      pattern_id: 'p1',
      pattern_name: 'noun of place',
      gloss: '사무실',
      language: 'ko',
    })
    const [existing] = await db.listEntries()
    render(
      <RootGenerator
        patterns={patterns}
        settings={settings}
        entries={[existing]}
        onEntryAdded={onEntryAdded}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('e.g. ktb'), {
      target: { value: 'ktb' },
    })
    fireEvent.click(screen.getByLabelText('delete 사무실'))
    await waitFor(() => expect(onEntryAdded).toHaveBeenCalled())
    expect(await db.listEntries()).toHaveLength(0)
  })
})
