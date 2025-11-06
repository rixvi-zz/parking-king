'use client';

import React from 'react';
import { MapPin, Car, ImageIcon } from 'lucide-react';

interface PlaceholderImageProps {
  type?: 'parking' | 'car' | 'general';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PlaceholderImage: React.FC<PlaceholderImageProps> = ({
  type = 'general',
  className = '',
  size = 'md',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'parking':
        return MapPin;
      case 'car':
        return Car;
      default:
        return ImageIcon;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6';
      case 'lg':
        return 'h-16 w-16';
      default:
        return 'h-12 w-12';
    }
  };

  const Icon = getIcon();

  return (
    <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
      <Icon className={`text-gray-400 ${getIconSize()}`} />
    </div>
  );
};

export default PlaceholderImage;