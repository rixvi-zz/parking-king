'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Car, 
  DollarSign,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Filter
} from 'lucide-react';

interface Booking {
  _id: string;
  parkingSpot: {
    _id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    pricePerHour: number;
    images: string[];
  };
  startTime: string;
  endTime: string;
  totalHours: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  vehicleInfo: {
    licensePlate: string;
    make?: string;
    model?: string;
    color?: string;
  };
  referenceNumber: string;
  formattedDuration: string;
  createdAt: string;
}

interface BookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function BookingsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [loading, isAuthenticated, selectedStatus, currentPage]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (selectedStatus) {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/bookings?${params}`);
      if (response.ok) {
        const data: BookingsResponse = await response.json();
        setBookings(data.bookings);
        setTotalPages(data.pages);
      } else {
        setError('Failed to fetch bookings');
      }
    } catch (error) {
      setError('Failed to fetch bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      setCancelling(bookingId);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBookings(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel booking');
      }
    } catch (error) {
      alert('Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canCancelBooking = (booking: Booking) => {
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return false;
    }
    
    const startTime = new Date(booking.startTime);
    const now = new Date();
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilStart >= 1; // Can cancel if more than 1 hour before start
  };

  if (isLoading && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">Manage your parking spot reservations</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Bookings</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No bookings found
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedStatus 
                ? `No ${selectedStatus} bookings found.`
                : "You haven't made any parking reservations yet."
              }
            </p>
            <Link
              href="/search"
              className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Find Parking Spots
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {booking.parkingSpot.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                          {booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          {booking.parkingSpot.address}, {booking.parkingSpot.city}, {booking.parkingSpot.state}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500">
                        Booking #{booking.referenceNumber}
                      </div>
                    </div>

                    {booking.parkingSpot.images.length > 0 && (
                      <img
                        src={booking.parkingSpot.images[0]}
                        alt={booking.parkingSpot.title}
                        className="w-20 h-20 object-cover rounded-lg ml-4"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Start</div>
                        <div>{formatDate(booking.startTime)}</div>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">End</div>
                        <div>{formatDate(booking.endTime)}</div>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Car className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Vehicle</div>
                        <div>{booking.vehicleInfo.licensePlate}</div>
                        {booking.vehicleInfo.make && booking.vehicleInfo.model && (
                          <div className="text-xs text-gray-500">
                            {booking.vehicleInfo.make} {booking.vehicleInfo.model}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Total</div>
                        <div className="text-lg font-semibold text-gray-900">
                          ${booking.totalPrice}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.formattedDuration}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Booked on {formatDate(booking.createdAt)}
                    </div>

                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/parking-spots/${booking.parkingSpot._id}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Spot
                      </Link>

                      {canCancelBooking(booking) && (
                        <button
                          onClick={() => cancelBooking(booking._id)}
                          disabled={cancelling === booking._id}
                          className="inline-flex items-center text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                        >
                          {cancelling === booking._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}