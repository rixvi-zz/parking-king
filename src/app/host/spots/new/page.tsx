'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  DollarSign, 
  Clock, 
  Camera, 
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Navigation
} from 'lucide-react';

// Dynamically import Map component to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>
});

const AMENITIES = [
  { id: 'covered-parking', label: 'Covered Parking' },
  { id: 'security-camera', label: 'Security Camera' },
  { id: 'ev-charging', label: 'EV Charging' },
  { id: 'handicap-accessible', label: 'Handicap Accessible' },
  { id: 'valet-service', label: 'Valet Service' },
  { id: '24-7-access', label: '24/7 Access' },
  { id: 'well-lit', label: 'Well Lit' },
  { id: 'gated', label: 'Gated Access' },
  { id: 'attendant', label: 'Attendant on Site' }
];

const DAYS = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' }
];

export default function AddParkingSpotPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pricePerHour: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    location: {
      lat: '',
      lng: ''
    },
    images: [''],
    amenities: [] as string[],
    availability: {
      startTime: '00:00',
      endTime: '23:59',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'host') {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAmenityToggle = (amenityId: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const handleDayToggle = (dayId: string) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        days: prev.availability.days.includes(dayId)
          ? prev.availability.days.filter(id => id !== dayId)
          : [...prev.availability.days, dayId]
      }
    }));
  };

  const handleImageChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? value : img)
    }));
  };

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const removeImageField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Update coordinates immediately
          setFormData(prev => ({
            ...prev,
            location: {
              lat: latitude.toString(),
              lng: longitude.toString()
            }
          }));

          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.address;
            
            setFormData(prev => ({
              ...prev,
              address: `${address.house_number || ''} ${address.road || ''}`.trim(),
              city: address.city || address.town || address.village || '',
              state: address.state || '',
              zipCode: address.postcode || '',
              location: {
                lat: latitude.toString(),
                lng: longitude.toString()
              }
            }));

            toast.success('Location detected successfully!');
          } else {
            toast.success('Coordinates detected, please fill in address manually');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          toast.success('Coordinates detected, please fill in address manually');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setError(errorMessage);
        toast.error(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.pricePerHour || 
          !formData.address || !formData.city || !formData.state || !formData.zipCode ||
          !formData.location.lat || !formData.location.lng) {
        throw new Error('Please fill in all required fields');
      }

      // Filter out empty images
      const images = formData.images.filter(img => img.trim() !== '');

      const response = await fetch('/api/parking-spots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          images,
          pricePerHour: parseFloat(formData.pricePerHour),
          location: {
            lat: parseFloat(formData.location.lat),
            lng: parseFloat(formData.location.lng)
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create parking spot');
      }

      toast.success('Parking spot created successfully!');
      setSuccess(true);
      setTimeout(() => {
        router.push('/host/spots');
      }, 2000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create parking spot';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Parking Spot Created Successfully!
            </h2>
            <p className="text-gray-600 mb-4">
              Your parking spot has been added and is now available for booking.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Parking Spot</h1>
          <p className="mt-2 text-gray-600">
            Create a new parking spot listing for other users to book.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Downtown Garage Spot"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your parking spot, access instructions, etc."
                />
              </div>

              <div>
                <label htmlFor="pricePerHour" className="block text-sm font-medium text-gray-700">
                  Price per Hour ($) *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="pricePerHour"
                    name="pricePerHour"
                    required
                    min="0"
                    step="0.01"
                    value={formData.pricePerHour}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>          
{/* Location Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Location</h3>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Navigation className={`h-4 w-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
                <span>{isGettingLocation ? 'Getting Location...' : 'Use Current Location'}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Street Address *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="New York"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State *
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="NY"
                />
              </div>

              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                  Zip Code *
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  required
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10001"
                />
              </div>

              <div>
                <label htmlFor="location.lat" className="block text-sm font-medium text-gray-700">
                  Latitude *
                </label>
                <input
                  type="number"
                  id="location.lat"
                  name="location.lat"
                  required
                  step="any"
                  value={formData.location.lat}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="40.7128"
                />
              </div>

              <div>
                <label htmlFor="location.lng" className="block text-sm font-medium text-gray-700">
                  Longitude *
                </label>
                <input
                  type="number"
                  id="location.lng"
                  name="location.lng"
                  required
                  step="any"
                  value={formData.location.lng}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="-74.0060"
                />
              </div>
            </div>

            {/* Map Preview */}
            {formData.location.lat && formData.location.lng && !isNaN(parseFloat(formData.location.lat)) && !isNaN(parseFloat(formData.location.lng)) && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Preview
                </label>
                <div className="h-64 rounded-lg overflow-hidden border border-gray-300">
                  <Map
                    center={[parseFloat(formData.location.lat), parseFloat(formData.location.lng)]}
                    zoom={15}
                    height="256px"
                    markers={[{
                      position: [parseFloat(formData.location.lat), parseFloat(formData.location.lng)],
                      popup: formData.title || 'Parking Spot Location'
                    }]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Images</h3>
            
            <div className="space-y-3">
              {formData.images.map((image, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Camera className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="url"
                      value={image}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageField(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addImageField}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-5 w-5" />
                <span>Add Another Image</span>
              </button>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Amenities</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AMENITIES.map((amenity) => (
                <label key={amenity.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity.id)}
                    onChange={() => handleAmenityToggle(amenity.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{amenity.label}</span>
                </label>
              ))}
            </div>
          </div>     
     {/* Availability */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Availability</h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="availability.startTime" className="block text-sm font-medium text-gray-700">
                    Available From
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      id="availability.startTime"
                      name="availability.startTime"
                      value={formData.availability.startTime}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="availability.endTime" className="block text-sm font-medium text-gray-700">
                    Available Until
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      id="availability.endTime"
                      name="availability.endTime"
                      value={formData.availability.endTime}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Available Days
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {DAYS.map((day) => (
                    <label key={day.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.availability.days.includes(day.id)}
                        onChange={() => handleDayToggle(day.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Parking Spot'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}