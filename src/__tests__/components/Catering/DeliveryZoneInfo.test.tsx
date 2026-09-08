/**
 * The public delivery-zone panel must render whatever zones it is given
 * (DB-backed, passed down from a server component), not an in-code table.
 * QA round 4 (D2): the panel advertised East Bay at +$75 while the DB row
 * charged $65.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeliveryZoneInfo } from '@/components/Catering/DeliveryZoneInfo';
import { DeliveryZone, type ZoneMinimumConfig } from '@/types/catering';

const zones: ZoneMinimumConfig[] = [
  {
    zone: DeliveryZone.EAST_BAY,
    name: 'East Bay',
    minimumAmount: 400,
    deliveryFee: 65,
    estimatedDeliveryTime: '2-3 hours',
    active: true,
  },
  {
    zone: DeliveryZone.SAN_FRANCISCO,
    name: 'San Francisco',
    minimumAmount: 250,
    deliveryFee: 50,
    active: true,
  },
];

describe('DeliveryZoneInfo', () => {
  it('renders the zones it is given, with their minimums and fees', () => {
    render(<DeliveryZoneInfo zones={zones} />);

    expect(screen.getByText('East Bay')).toBeInTheDocument();
    expect(screen.getByText(/\$400\.00 minimum/)).toBeInTheDocument();
    expect(screen.getByText(/\+\$65\.00 delivery fee/)).toBeInTheDocument();
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
    expect(screen.queryByText(/\+\$75\.00/)).not.toBeInTheDocument();
  });

  it('renders the compact variant from the same data', () => {
    render(<DeliveryZoneInfo zones={zones} compact />);

    expect(screen.getByText('East Bay:')).toBeInTheDocument();
    expect(screen.getByText(/\+\$65\.00 delivery/)).toBeInTheDocument();
  });

  it('renders nothing zone-specific when given no zones', () => {
    render(<DeliveryZoneInfo zones={[]} />);

    expect(screen.queryByText(/\$\d+\.\d\d minimum/)).not.toBeInTheDocument();
  });
});
