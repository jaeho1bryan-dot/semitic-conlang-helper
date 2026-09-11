import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PatternManager from '../PatternManager.jsx'

import { db } from '../../lib/db.js'

beforeEach(() => {
  localStorage.clear()
})

describe('PatternManager bulk import', () => {
  it('imports patterns pasted as a JSON object', async () => {
    const onChanged = vi.fn()
    render(<PatternManager patterns={[]} onChanged={onChanged} />)

    fireEvent.change(screen.getByLabelText('pattern JSON'), {
      target: {
        value: JSON.stringify({
          patterns: [
            { name: 'noun of place', template: 'ma12a3', category: 'noun' },
            { name: 'biconsonantal', template: '1a2' },
          ],
        }),
      },
    })
    fireEvent.click(screen.getByText('Import patterns'))

    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    const rows = await db.listPatterns()
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.name).sort()).toEqual([
      'biconsonantal',
      'noun of place',
    ])
    expect(rows.find((r) => r.name === 'noun of place').arity).toBe(3)
    expect(screen.getByText(/Imported 2 patterns\./)).toBeInTheDocument()
  })

  it('reports errors for invalid entries and skips them', async () => {
    render(<PatternManager patterns={[]} onChanged={() => {}} />)

    fireEvent.change(screen.getByLabelText('pattern JSON'), {
      target: {
        value: JSON.stringify([
          { name: 'ok', template: 'ma12a3' },
          { template: 'ma12a3' },
        ]),
      },
    })
    fireEvent.click(screen.getByText('Import patterns'))

    await waitFor(() =>
      expect(screen.getByText(/Imported 1 pattern\./)).toBeInTheDocument(),
    )
    expect(screen.getByText(/"name" is required/)).toBeInTheDocument()
    const rows = await db.listPatterns()
    expect(rows).toHaveLength(1)
  })
})
