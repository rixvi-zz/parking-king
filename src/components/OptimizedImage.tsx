'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  sizes,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Generate a simple blur placeholder
  const generateBlurDataURL = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, w, h);
    }
    return canvas.toDataURL();
  };

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <ImageIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${fill ? '' : 'inline-block'}`}>
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10 ${className}`}>
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        className={className}
        sizes={sizes}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || (width && height ? generateBlurDataURL(width, height) : undefined)}
        onLoad={handleLoad}
        onError={handleError}
        quality={75}
      />
    </div>
  );
};

export default OptimizedImage;