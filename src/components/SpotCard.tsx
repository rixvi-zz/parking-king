'use client';

import React from 'react';
import OptimizedImage from './OptimizedImage';

interface ParkingSpot {
  id: string;
  title: string;
  description: string;
  price: number;
  address: string;
  available: boolean;
  features?: string[];
  rating?: number;
  reviewCount?: number;
  distance?: number;
  imageUrl?: string;
}

interface SpotCardProps {
  spot: ParkingSpot;
  onClick: (spot: ParkingSpot) => void;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, onClick }) => {
  return (
    <button
      onClick={() => onClick(spot)}
      className={`w-full p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow text-left ${
        !spot.available ? 'opacity-50' : ''
      }`}
    >
      {spot.imageUrl && (
        <div className="relative w-full h-32 mb-3 overflow-hidden rounded-md">
          <OptimizedImage
            src={spot.imageUrl}
            alt={`${spot.title} parking spot`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      
      <h3 className="text-lg font-semibold mb-2">{spot.title}</h3>
      <p className="text-gray-600 text-sm mb-2">{spot.description}</p>
      <p className="text-gray-500 text-sm mb-2">{spot.address}</p>
      
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-bold text-blue-600">${spot.price}/hour</span>
        <span className={`px-2 py-1 rounded text-xs ${
          spot.available 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {spot.available ? 'Available' : 'Unavailable'}
        </span>
      </div>

      {spot.rating && (
        <div className="flex items-center mb-2">
          <span className="text-yellow-500">★</span>
          <span className="ml-1 text-sm">{spot.rating}</span>
          {spot.reviewCount && (
            <span className="ml-1 text-gray-500 text-sm">({spot.reviewCount} reviews)</span>
          )}
        </div>
      )}

      {spot.distance && (
        <p className="text-gray-500 text-sm mb-2">{spot.distance} mi away</p>
      )}

      {spot.features && spot.features.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {spot.features.map((feature, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
            >
              {feature}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};

export default SpotCard;