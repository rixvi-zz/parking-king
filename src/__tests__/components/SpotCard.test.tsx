/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotCard from '@/components/SpotCard';
import { renderWithProviders, mockParkingSpots } from '../test-utils';

describe('SpotCard Component', () => {
  const mockSpot = mockParkingSpots[0];
  const defaultProps = {
    spot: mockSpot,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders spot information correctly', () => {
    renderWithProviders(<SpotCard {...defaultProps} />);
    
    expect(screen.getByText(mockSpot.title)).toBeInTheDocument();
    expect(screen.getByText(mockSpot.description)).toBeInTheDocument();
    expect(screen.getByText(`$${mockSpot.price}/hour`)).toBeInTheDocument();
    expect(screen.getByText(mockSpot.address)).toBeInTheDocument();
  });

  it('displays availability status', () => {
    renderWithProviders(<SpotCard {...defaultProps} />);
    
    if (mockSpot.available) {
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    } else {
      expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    }
  });

  it('shows spot features', () => {
    const spotWithFeatures = {
      ...mockSpot,
      features: ['Covered', 'EV Charging', 'Security Camera'],
    };
    
    renderWithProviders(<SpotCard {...defaultProps} spot={spotWithFeatures} />);
    
    expect(screen.getByText('Covered')).toBeInTheDocument();
    expect(screen.getByText('EV Charging')).toBeInTheDocument();
    expect(screen.getByText('Security Camera')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    
    renderWithProviders(<SpotCard {...defaultProps} onClick={onClick} />);
    
    const card = screen.getByRole('button');
    await user.click(card);
    
    expect(onClick).toHaveBeenCalledWith(mockSpot);
  });

  it('displays rating if available', () => {
    const spotWithRating = {
      ...mockSpot,
      rating: 4.5,
      reviewCount: 23,
    };
    
    renderWithProviders(<SpotCard {...defaultProps} spot={spotWithRating} />);
    
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(23 reviews)')).toBeInTheDocument();
  });

  it('shows distance if provided', () => {
    const spotWithDistance = {
      ...mockSpot,
      distance: 0.3,
    };
    
    renderWithProviders(<SpotCard {...defaultProps} spot={spotWithDistance} />);
    
    expect(screen.getByText('0.3 mi away')).toBeInTheDocument();
  });

  it('applies disabled styling when spot is unavailable', () => {
    const unavailableSpot = {
      ...mockSpot,
      available: false,
    };
    
    renderWithProviders(<SpotCard {...defaultProps} spot={unavailableSpot} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('opacity-50');
  });

  it('shows spot image if available', () => {
    const spotWithImage = {
      ...mockSpot,
      imageUrl: 'https://example.com/spot-image.jpg',
    };
    
    renderWithProviders(<SpotCard {...defaultProps} spot={spotWithImage} />);
    
    const image = screen.getByRole('img');
    // Next.js Image component transforms the src URL for optimization
    expect(image).toHaveAttribute('src', expect.stringContaining('spot-image.jpg'));
    expect(image).toHaveAttribute('alt', `${spotWithImage.title} parking spot`);
  });
});