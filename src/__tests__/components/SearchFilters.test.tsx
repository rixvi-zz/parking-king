import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchFilters from '@/components/SearchFilters';

const mockOnFiltersChange = jest.fn();

const defaultProps = {
  onFiltersChange: mockOnFiltersChange,
  filters: {
    priceRange: [0, 50] as [number, number],
    features: [],
    availability: 'all',
  },
};

describe('SearchFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all filter sections', () => {
    render(<SearchFilters {...defaultProps} />);
    
    expect(screen.getByText(/price range/i)).toBeInTheDocument();
    expect(screen.getByText(/features/i)).toBeInTheDocument();
    expect(screen.getByText(/availability/i)).toBeInTheDocument();
  });

  it('displays initial price range values', () => {
    render(<SearchFilters {...defaultProps} />);
    
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('updates price range when input is changed', async () => {
    render(<SearchFilters {...defaultProps} />);
    
    const minPriceInput = screen.getByDisplayValue('0');
    fireEvent.change(minPriceInput, { target: { value: '10' } });
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [10, 50],
        features: [],
        availability: 'all',
      });
    });
  });

  it('toggles feature filters', async () => {
    render(<SearchFilters {...defaultProps} />);
    
    const coveredCheckbox = screen.getByLabelText(/covered/i);
    fireEvent.click(coveredCheckbox);
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [0, 50],
        features: ['covered'],
        availability: 'all',
      });
    });
  });

  it('allows multiple feature selections', async () => {
    render(<SearchFilters {...defaultProps} />);
    
    const coveredCheckbox = screen.getByLabelText(/covered/i);
    const securityCheckbox = screen.getByLabelText(/security/i);
    
    fireEvent.click(coveredCheckbox);
    fireEvent.click(securityCheckbox);
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenLastCalledWith({
        priceRange: [0, 50],
        features: ['covered', 'security'],
        availability: 'all',
      });
    });
  });

  it('filters by availability', async () => {
    render(<SearchFilters {...defaultProps} />);
    
    const availabilitySelect = screen.getByLabelText(/availability/i);
    fireEvent.change(availabilitySelect, { target: { value: 'available' } });
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [0, 50],
        features: [],
        availability: 'available',
      });
    });
  });

  it('resets all filters when reset button is clicked', async () => {
    const initialFilters = {
      priceRange: [20, 80] as [number, number],
      features: ['covered', 'security'],
      availability: 'available',
    };
    
    render(<SearchFilters {...defaultProps} filters={initialFilters} />);
    
    const resetButton = screen.getByText(/reset filters/i);
    fireEvent.click(resetButton);
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [0, 50],
        features: [],
        availability: 'all',
      });
    });
  });

  it('shows active filter count', () => {
    const activeFilters = {
      priceRange: [20, 80] as [number, number],
      features: ['covered'],
      availability: 'available',
    };
    
    render(<SearchFilters {...defaultProps} filters={activeFilters} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('is accessible with keyboard navigation', () => {
    render(<SearchFilters {...defaultProps} />);
    
    const firstCheckbox = screen.getByLabelText(/covered/i);
    firstCheckbox.focus();
    
    expect(document.activeElement).toBe(firstCheckbox);
    
    // Test checkbox interaction
    fireEvent.click(firstCheckbox);
    expect(mockOnFiltersChange).toHaveBeenCalled();
  });
});