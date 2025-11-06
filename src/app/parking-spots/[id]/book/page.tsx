'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  Car, 
  DollarSign, 
  MapPin, 
  ArrowLeft,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ParkingSpot {
  _id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerHour: number;
  images: string[];
  amenities: string[];
  availability?: {
    startTime: string;
    endTime: string;
    days: string[];
  };
}

interface BookingForm {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  specialInstructions: string;
}

export default function BookParkingSpot() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<BookingForm>({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    licensePlate: '',
    make: '',
    model: '',
    color: '',
    specialInstructions: ''
  });

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchParkingSpot();
    fetchVehicles();
  }, [session]);

  useEffect(() => {
    calculatePrice();
  }, [form.startDate, form.startTime, form.endDate, form.endTime, spot]);

  const fetchParkingSpot = async () => {
    try {
      const response = await fetch(`/api/parking-spots/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSpot(data.parkingSpot);
      } else {
        setError('Parking spot not found');
      }
    } catch (error) {
      setError('Failed to load parking spot');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles);
        
        // Auto-select default vehicle if available
        const defaultVehicle = data.vehicles.find((v: any) => v.isDefault);
        if (defaultVehicle) {
          setSelectedVehicle(defaultVehicle._id);
          setForm(prev => ({
            ...prev,
            licensePlate: defaultVehicle.number,
            make: defaultVehicle.name.split(' ')[0] || '',
            model: defaultVehicle.name.split(' ').slice(1).join(' ') || ''
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

  const calculatePrice = () => {
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime || !spot) {
      setCalculatedPrice(0);
      setDuration(0);
      return;
    }

    const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
    const endDateTime = new Date(`${form.endDate}T${form.endTime}`);

    if (endDateTime <= startDateTime) {
      setCalculatedPrice(0);
      setDuration(0);
      return;
    }

    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const price = durationHours * spot.pricePerHour;

    setDuration(durationHours);
    setCalculatedPrice(Math.round(price * 100) / 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehicleId = e.target.value;
    setSelectedVehicle(vehicleId);
    
    if (vehicleId) {
      const vehicle = vehicles.find(v => v._id === vehicleId);
      if (vehicle) {
        setForm(prev => ({
          ...prev,
          licensePlate: vehicle.number,
          make: vehicle.name.split(' ')[0] || '',
          model: vehicle.name.split(' ').slice(1).join(' ') || ''
        }));
      }
    } else {
      setForm(prev => ({
        ...prev,
        licensePlate: '',
        make: '',
        model: ''
      }));
    }
  };

  const validateForm = (): string | null => {
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      return 'Please select start and end date/time';
    }

    if (!selectedVehicle) {
      return 'Please select a vehicle';
    }

    if (!form.licensePlate.trim()) {
      return 'License plate is required';
    }

    const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
    const endDateTime = new Date(`${form.endDate}T${form.endTime}`);
    const now = new Date();

    if (startDateTime <= now) {
      return 'Start time must be in the future';
    }

    if (endDateTime <= startDateTime) {
      return 'End time must be after start time';
    }

    if (duration < 0.5) {
      return 'Minimum booking duration is 30 minutes';
    }

    if (duration > 168) {
      return 'Maximum booking duration is 7 days';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
      const endDateTime = new Date(`${form.endDate}T${form.endTime}`);

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parkingSpotId: params.id,
          vehicleId: selectedVehicle,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          vehicleInfo: {
            licensePlate: form.licensePlate.trim(),
            make: form.make.trim() || undefined,
            model: form.model.trim() || undefined,
            color: form.color.trim() || undefined
          },
          specialInstructions: form.specialInstructions.trim() || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/bookings');
        }, 2000);
      } else {
        setError(data.error || 'Failed to create booking');
      }
    } catch (error) {
      setError('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${wholeHours} hour${wholeHours > 1 ? 's' : ''}`;
    } else {
      return `${wholeHours} hour${wholeHours > 1 ? 's' : ''} ${minutes} minutes`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Parking Spot Not Found</h1>
          <Link href="/search" className="text-blue-600 hover:text-blue-800">
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your parking spot has been booked successfully. You will be redirected to your bookings page.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }  retur
n (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/parking-spots/${params.id}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Spot Details
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Book Parking Spot</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Spot Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Spot Details</h2>
            
            {spot.images.length > 0 && (
              <img
                src={spot.images[0]}
                alt={spot.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <h3 className="text-lg font-medium text-gray-900 mb-2">{spot.title}</h3>
            <p className="text-gray-600 mb-4">{spot.description}</p>

            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{spot.address}, {spot.city}, {spot.state}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <DollarSign className="h-5 w-5 mr-2" />
                <span>${spot.pricePerHour}/hour</span>
              </div>

              {spot.availability && (
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>
                    Available {spot.availability.startTime} - {spot.availability.endTime}
                    {spot.availability.days.length > 0 && (
                      <span className="block text-sm">
                        {spot.availability.days.join(', ')}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {spot.amenities.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {spot.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {amenity.replace('-', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Details</h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={form.startTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleInputChange}
                    min={form.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={form.endTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>    
          {/* Vehicle Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Car className="h-5 w-5 mr-2" />
                  Vehicle Information
                </h3>

                {/* Vehicle Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Vehicle *
                  </label>
                  {vehicles.length > 0 ? (
                    <select
                      value={selectedVehicle}
                      onChange={handleVehicleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Choose a vehicle</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle._id} value={vehicle._id}>
                          {vehicle.name} ({vehicle.number}) - {vehicle.type}
                          {vehicle.isDefault && ' (Default)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm mb-2">
                        You need to add a vehicle before booking.
                      </p>
                      <Link
                        href="/profile/vehicles"
                        className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                      >
                        Add Vehicle →
                      </Link>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Plate *
                    </label>
                    <input
                      type="text"
                      name="licensePlate"
                      value={form.licensePlate}
                      onChange={handleInputChange}
                      placeholder="ABC-1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Make (Optional)
                    </label>
                    <input
                      type="text"
                      name="make"
                      value={form.make}
                      onChange={handleInputChange}
                      placeholder="Toyota"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model (Optional)
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={form.model}
                      onChange={handleInputChange}
                      placeholder="Camry"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color (Optional)
                    </label>
                    <input
                      type="text"
                      name="color"
                      value={form.color}
                      onChange={handleInputChange}
                      placeholder="Blue"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  name="specialInstructions"
                  value={form.specialInstructions}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any special instructions for the host..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Price Summary */}
              {calculatedPrice > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Booking Summary</h3>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{formatDuration(duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate:</span>
                      <span>${spot.pricePerHour}/hour</span>
                    </div>
                    <div className="flex justify-between font-medium text-base border-t border-blue-200 pt-2">
                      <span>Total:</span>
                      <span>${calculatedPrice}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || calculatedPrice === 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Booking...
                  </div>
                ) : (
                  `Book for $${calculatedPrice}`
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}