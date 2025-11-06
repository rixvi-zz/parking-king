'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Map from '@/components/Map';
import OptimizedImage from '@/components/OptimizedImage';
import PlaceholderImage from '@/components/PlaceholderImage';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Filter,
  Grid,
  Map as MapIcon,
  Star,
  Clock,
  Shield
} from 'lucide-react';

interface ParkingSpot {
  _id: string;
  title: string;
  description: string;
  pricePerHour: number;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  city: string;
  state: string;
  zipCode: string;
  amenities: string[];
  owner: {
    name: string;
    email: string;
  };
  images: string[];
}

const AMENITY_LABELS: { [key: string]: string } = {
  'covered': 'Covered',
  'security-camera': 'Security Camera',
  'ev-charging': 'EV Charging',
  'handicap-accessible': 'Handicap Accessible',
  'valet-service': 'Valet Service',
  '24-7-access': '24/7 Access',
  'lighting': 'Well Lit',
  'gated': 'Gated',
  'attendant': 'Attendant'
};

export default function SearchPage() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [selectedSpot, setSelectedSpot] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    state: '',
    minPrice: '',
    maxPrice: '',
    amenities: [] as string[]
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]);

  useEffect(() => {
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.state) queryParams.append('state', filters.state);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
      if (filters.amenities.length > 0) queryParams.append('amenities', filters.amenities.join(','));

      const response = await fetch(`/api/parking-spots?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setSpots(data.data);
        
        // Update map center to first spot if available
        if (data.data.length > 0) {
          const firstSpot = data.data[0];
          setMapCenter([firstSpot.location.lat, firstSpot.location.lng]);
        }
      } else {
        console.error('Failed to fetch spots:', data.error);
      }
    } catch (error) {
      console.error('Error fetching spots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSearch = () => {
    fetchSpots();
  };

  const handleSpotClick = (spot: ParkingSpot) => {
    setSelectedSpot(spot._id);
    if (viewMode === 'grid') {
      setViewMode('map');
    }
    setMapCenter([spot.location.lat, spot.location.lng]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Parking Spots</h1>
          <p className="mt-2 text-gray-600">
            Discover available parking spots in your area
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by title, description, or location..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="City"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="State"
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range ($/hour)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Amenities */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amenities
                  </label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(AMENITY_LABELS).map(([key, label]) => (
                      <label key={key} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.amenities.includes(key)}
                          onChange={() => handleAmenityToggle(key)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div> 
       {/* View Toggle */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${spots.length} parking spots found`}
          </p>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="h-4 w-4" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              <span>Map</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spots.map((spot) => (
              <div
                key={spot._id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSpotClick(spot)}
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                  {spot.images.length > 0 ? (
                    <OptimizedImage
                      src={spot.images[0]}
                      alt={spot.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <PlaceholderImage 
                      type="parking" 
                      className="w-full h-48" 
                      size="lg" 
                    />
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {spot.title}
                    </h3>
                    <div className="flex items-center space-x-1 text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm text-gray-600">4.8</span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {spot.description}
                  </p>

                  <div className="flex items-center text-gray-500 text-sm mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="truncate">
                      {spot.address}, {spot.city}, {spot.state}
                    </span>
                  </div>

                  {/* Amenities */}
                  {spot.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {spot.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {AMENITY_LABELS[amenity] || amenity}
                        </span>
                      ))}
                      {spot.amenities.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{spot.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-bold text-green-600">
                        {spot.pricePerHour}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">/hour</span>
                    </div>
                    
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Map View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Spot List */}
            <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto">
              {spots.map((spot) => (
                <div
                  key={spot._id}
                  className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all ${
                    selectedSpot === spot._id ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:shadow-md'
                  }`}
                  onClick={() => handleSpotClick(spot)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {spot.title}
                    </h3>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-green-600">
                        {spot.pricePerHour}
                      </span>
                      <span className="text-gray-500 text-sm">/hr</span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {spot.description}
                  </p>

                  <div className="flex items-center text-gray-500 text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="truncate">
                      {spot.city}, {spot.state}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="lg:col-span-2">
              <Map
                spots={spots}
                center={mapCenter}
                zoom={13}
                height="600px"
                onSpotClick={handleSpotClick}
                selectedSpot={selectedSpot}
              />
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && spots.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No parking spots found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or browse all available spots.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}