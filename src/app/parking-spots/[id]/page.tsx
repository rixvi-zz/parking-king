'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  MapPin, 
  DollarSign, 
  Clock, 
  Star, 
  ArrowLeft,
  Car,
  Shield,
  Zap,
  Eye,
  Users,
  Lock,
  Sun,
  Camera
} from 'lucide-react';

// Dynamic import for Map component (client-side only)
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface ParkingSpot {
  _id: string;
  title: string;
  description: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  pricePerHour: number;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  city: string;
  state: string;
  zipCode: string;
  active: boolean;
  images: string[];
  amenities: string[];
  availability?: {
    startTime: string;
    endTime: string;
    days: string[];
  };
  createdAt: string;
  updatedAt: string;
}

const amenityIcons: Record<string, any> = {
  'covered-parking': Car,
  'security-camera': Camera,
  'ev-charging': Zap,
  'handicap-accessible': Users,
  'valet-service': Users,
  '24-7-access': Clock,
  'well-lit': Sun,
  'gated-access': Lock,
  'attendant-on-site': Users
};

export default function ParkingSpotDetails() {
  const params = useParams();
  const { data: session } = useSession();
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    fetchParkingSpot();
  }, [params.id]);

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

  const formatAmenityName = (amenity: string) => {
    return amenity.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Parking Spot Not Found'}
          </h1>
          <Link href="/search" className="text-blue-600 hover:text-blue-800">
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = session?.user?.id === spot.owner._id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/search"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {spot.images.length > 0 ? (
                <div>
                  <img
                    src={spot.images[selectedImage]}
                    alt={spot.title}
                    className="w-full h-96 object-cover"
                  />
                  {spot.images.length > 1 && (
                    <div className="p-4">
                      <div className="flex space-x-2 overflow-x-auto">
                        {spot.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                              selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`${spot.title} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                  <Car className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{spot.title}</h1>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{spot.address}, {spot.city}, {spot.state} {spot.zipCode}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{spot.description}</p>
              </div>

              {/* Pricing */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="h-6 w-6 text-green-600 mr-2" />
                    <span className="text-2xl font-bold text-gray-900">
                      ${spot.pricePerHour}
                    </span>
                    <span className="text-gray-600 ml-1">/hour</span>
                  </div>
                  
                  {session?.user && !isOwner && (
                    <Link
                      href={`/parking-spots/${spot._id}/book`}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Book Now
                    </Link>
                  )}
                </div>
              </div>

              {/* Availability */}
              {spot.availability && (
                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Availability</h3>
                  <div className="flex items-center text-gray-600 mb-2">
                    <Clock className="h-5 w-5 mr-2" />
                    <span>
                      {spot.availability.startTime} - {spot.availability.endTime}
                    </span>
                  </div>
                  {spot.availability.days.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {spot.availability.days.map((day) => (
                        <span
                          key={day}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Amenities */}
              {spot.amenities.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Amenities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {spot.amenities.map((amenity) => {
                      const IconComponent = amenityIcons[amenity] || Shield;
                      return (
                        <div key={amenity} className="flex items-center">
                          <IconComponent className="h-5 w-5 text-blue-600 mr-3" />
                          <span className="text-gray-700">{formatAmenityName(amenity)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
              <div className="h-64 rounded-lg overflow-hidden">
                <Map
                  center={[spot.location.lat, spot.location.lng]}
                  zoom={15}
                  spots={[spot]}
                  selectedSpot={spot._id}
                  onSpotClick={() => {}}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Host Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Host Information</h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-lg">
                    {spot.owner.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{spot.owner.name}</p>
                  <p className="text-sm text-gray-600">Host</p>
                </div>
              </div>
              
              {isOwner && (
                <div className="space-y-2">
                  <Link
                    href={`/host/spots/${spot._id}/edit`}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-center block hover:bg-blue-700 transition-colors"
                  >
                    Edit Spot
                  </Link>
                  <Link
                    href="/host/dashboard"
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-center block hover:bg-gray-200 transition-colors"
                  >
                    Manage Bookings
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Spot Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    spot.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {spot.active ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Listed</span>
                  <span className="text-gray-900">
                    {new Date(spot.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-gray-900">
                    {new Date(spot.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Safety Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Safety First</h4>
                  <p className="text-sm text-blue-800">
                    Always verify parking spot details and follow local parking regulations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}