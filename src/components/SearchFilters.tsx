'use client';

import React, { useState } from 'react';

interface Filters {
  priceRange: [number, number];
  features: string[];
  availability: string;
}

interface SearchFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, onFiltersChange }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [priceError, setPriceError] = useState('');

  const handlePriceChange = (type: 'min' | 'max', value: number) => {
    const newPriceRange: [number, number] = [...localFilters.priceRange];
    
    if (type === 'min') {
      newPriceRange[0] = value;
    } else {
      newPriceRange[1] = value;
    }

    const updatedFilters = { ...localFilters, priceRange: newPriceRange };
    setLocalFilters(updatedFilters);

    if (newPriceRange[0] > newPriceRange[1]) {
      setPriceError('Min price cannot be higher than max price');
    } else {
      setPriceError('');
      onFiltersChange(updatedFilters);
    }
  };

  const handleFeatureToggle = (feature: string) => {
    const newFeatures = localFilters.features.includes(feature)
      ? localFilters.features.filter(f => f !== feature)
      : [...localFilters.features, feature];

    const updatedFilters = { ...localFilters, features: newFeatures };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleAvailabilityChange = (availability: string) => {
    const updatedFilters = { ...localFilters, availability };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const resetFilters = () => {
    const defaultFilters = {
      priceRange: [0, 50] as [number, number],
      features: [],
      availability: 'all',
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    setPriceError('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.features.length > 0) count += localFilters.features.length;
    if (localFilters.availability !== 'all') count += 1;
    return count;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        {getActiveFilterCount() > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {getActiveFilterCount()}
          </span>
        )}
      </div>

      {/* Price Range */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price Range
        </label>
        <div className="flex gap-2">
          <div>
            <label htmlFor="minPrice" className="block text-xs text-gray-500">Min Price</label>
            <input
              id="minPrice"
              type="number"
              value={localFilters.priceRange[0]}
              onChange={(e) => handlePriceChange('min', Number(e.target.value))}
              className="w-20 p-2 border border-gray-300 rounded text-sm"
              min="0"
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="block text-xs text-gray-500">Max Price</label>
            <input
              id="maxPrice"
              type="number"
              value={localFilters.priceRange[1]}
              onChange={(e) => handlePriceChange('max', Number(e.target.value))}
              className="w-20 p-2 border border-gray-300 rounded text-sm"
              min="0"
            />
          </div>
        </div>
        {priceError && (
          <p className="text-red-500 text-xs mt-1">{priceError}</p>
        )}
      </div>

      {/* Features */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Features
        </label>
        <div className="space-y-2">
          {['covered', 'ev-charging', 'security', 'handicap-accessible'].map((feature) => (
            <label key={feature} className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.features.includes(feature)}
                onChange={() => handleFeatureToggle(feature)}
                className="mr-2"
              />
              <span className="text-sm capitalize">
                {feature.replace('-', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="mb-4">
        <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
          Availability
        </label>
        <select
          id="availability"
          value={localFilters.availability}
          onChange={(e) => handleAvailabilityChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="all">All</option>
          <option value="available">Available Now</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <button
        onClick={resetFilters}
        className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
      >
        Reset Filters
      </button>
    </div>
  );
};

export default SearchFilters;