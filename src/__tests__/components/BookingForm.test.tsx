import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingForm from '@/components/BookingForm';

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user1', email: 'test@example.com', name: 'Test User' },
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
  }),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const mockSpot = {
  id: '1',
  title: 'Test Parking Spot',
  description: 'A great parking spot',
  price: 10,
  address: '123 Test St',
  available: true,
};

const mockOnClose = jest.fn();
const mockOnBookingSuccess = jest.fn();

const defaultProps = {
  spot: mockSpot,
  onClose: mockOnClose,
  onBookingSuccess: mockOnBookingSuccess,
};

describe('BookingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders booking form with spot details', () => {
    render(<BookingForm {...defaultProps} />);
    
    expect(screen.getByText(`Book ${mockSpot.title}`)).toBeInTheDocument();
    expect(screen.getByText(`$${mockSpot.price}/hour`)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it('calculates total price correctly', async () => {
    render(<BookingForm {...defaultProps} />);
    
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    
    // Set dates for 2 hours
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    
    fireEvent.change(startDateInput, { 
      target: { value: startDate.toISOString().slice(0, 16) } 
    });
    fireEvent.change(endDateInput, { 
      target: { value: endDate.toISOString().slice(0, 16) } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/total: \$20/i)).toBeInTheDocument();
    });
  });

  it('validates date inputs', async () => {
    render(<BookingForm {...defaultProps} />);
    
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    const submitButton = screen.getByRole('button', { name: /book now/i });
    
    // Set end date before start date
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() - 60 * 60 * 1000);
    
    fireEvent.change(startDateInput, { 
      target: { value: startDate.toISOString().slice(0, 16) } 
    });
    fireEvent.change(endDateInput, { 
      target: { value: endDate.toISOString().slice(0, 16) } 
    });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<BookingForm {...defaultProps} />);
    
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    const submitButton = screen.getByRole('button', { name: /book now/i });
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    
    fireEvent.change(startDateInput, { 
      target: { value: startDate.toISOString().slice(0, 16) } 
    });
    fireEvent.change(endDateInput, { 
      target: { value: endDate.toISOString().slice(0, 16) } 
    });
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/booking/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});