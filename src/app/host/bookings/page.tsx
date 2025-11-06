'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Car, 
  DollarSign,
  User,
  CheckCircle,
  X,
  AlertCircle,
  Filter,
  ArrowLeft
} from 'lucide-react';

interface Booking {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  parkingSpot: {
    _id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    pricePerHour: number;
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
  specialInstructions?: string;
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

export default function HostBookingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    if (session.user.role !== 'host') {
      router.push('/dashboard');
      return;
    }
    
    fetchBookings();
  }, [session, selectedStatus, currentPage]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (selectedStatus) {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/bookings/host?${params}`);
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
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setUpdating(bookingId);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchBookings(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update booking');
      }
    } catch (error) {
      alert('Failed to update booking');
    } finally {
      setUpdating(null);
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

  const canConfirmBooking = (booking: Booking) => {
    return booking.status === 'pending';
  };

  const canCancelBooking = (booking: Booking) => {
    return ['pending', 'confirmed'].includes(booking.status);
  };

  if (loading && bookings.length === 0) {
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
          <Link 
            href="/host/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600 mt-2">Manage bookings for your parking spots</p>
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
                : "You don't have any bookings for your parking spots yet."
              }
            </p>
            <Link
              href="/host/spots/new"
              className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Parking Spot
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
                        <User className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">{booking.user.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({booking.user.email})</span>
                      </div>

                      <div className="text-sm text-gray-500">
                        Booking #{booking.referenceNumber}
                      </div>
                    </div>
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
                            {booking.vehicleInfo.color && ` (${booking.vehicleInfo.color})`}
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

                  {booking.specialInstructions && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Special Instructions</h4>
                      <p className="text-sm text-blue-800">{booking.specialInstructions}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Booked on {formatDate(booking.createdAt)}
                    </div>

                    <div className="flex items-center space-x-3">
                      {canConfirmBooking(booking) && (
                        <button
                          onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                          disabled={updating === booking._id}
                          className="inline-flex items-center text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
                        >
                          {updating === booking._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-1"></div>
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Confirm
                        </button>
                      )}

                      {canCancelBooking(booking) && (
                        <button
                          onClick={() => updateBookingStatus(booking._id, 'cancelled')}
                          disabled={updating === booking._id}
                          className="inline-flex items-center text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                        >
                          {updating === booking._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Cancel
                        </button>
                      )}

                      <Link
                        href={`/parking-spots/${booking.parkingSpot._id}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Spot
                      </Link>
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