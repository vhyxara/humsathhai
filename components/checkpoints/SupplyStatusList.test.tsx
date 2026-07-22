// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SupplyStatusList } from './SupplyStatusList'

describe('SupplyStatusList', () => {
  it('renders each item with its status', () => {
    render(
      <SupplyStatusList
        items={[
          { id: '1', item: 'Food', status: 'urgent', updated_at: new Date() },
          { id: '2', item: 'Water', status: 'enough', updated_at: new Date() },
          { id: '3', item: 'Masks', status: 'low', updated_at: new Date() },
        ]}
      />
    )

    expect(screen.getByText('Food')).toBeDefined()
    expect(screen.getByText('Water')).toBeDefined()
    expect(screen.getByText('Masks')).toBeDefined()
    expect(screen.getByText('Urgent')).toBeDefined()
    expect(screen.getByText('Enough')).toBeDefined()
    expect(screen.getByText('Low')).toBeDefined()
  })

  it('renders an empty state when there are no items', () => {
    render(<SupplyStatusList items={[]} />)

    expect(screen.getByText('No supply status has been reported for this checkpoint yet.')).toBeDefined()
  })
})
