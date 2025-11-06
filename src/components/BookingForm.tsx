'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ParkingSpot {
  id: string;
  title: string;
  price: number;
  description: string;
  address: string;
  available: boolean;
}

interface BookingFormProps {
  spot: ParkingSpot;
  onClose: () => void;
  onBookingSuccess: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ spot, onClose, onBookingSuccess }) => {
  const { user } = useAuth();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateTotal = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    return hours * spot.price;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startTime || !endTime) {
      setError('Please select both start and end times');
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotId: spot.id,
          startTime,
          endTime,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onBookingSuccess();
      } else {
        setError(data.error || 'Failed to create booking');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <p>Please log in to book this parking spot.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Book {spot.title}</h2>
      <p className="text-gray-600 mb-4">${spot.price}/hour</p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
            Start Date & Time
          </label>
          <input
            type="datetime-local"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
            End Date & Time
          </label>
          <input
            type="datetime-local"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        {startTime && endTime && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <p className="font-medium">Total: ${calculateTotal()}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Booking...' : 'Book Now'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;