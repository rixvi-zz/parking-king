'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import OptimizedImage from '@/components/OptimizedImage';
import Link from 'next/link';
import {
    MapPin,
    DollarSign,
    Plus,
    Edit,
    Trash2,
    Eye,
    Calendar
} from 'lucide-react';

interface ParkingSpot {
    _id: string;
    title: string;
    description: string;
    pricePerHour: number;
    address: string;
    city: string;
    state: string;
    active: boolean;
    images: string[];
    createdAt: string;
}

export default function HostSpotsPage() {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!loading && (!isAuthenticated || user?.role !== 'host')) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, loading, user, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'host') {
            fetchMySpots();
        }
    }, [isAuthenticated, user]);

    const fetchMySpots = async () => {
        try {
            const response = await fetch('/api/parking-spots/my-spots');
            const data = await response.json();

            if (response.ok) {
                setSpots(data.spots || []);
            } else {
                setError(data.error || 'Failed to fetch parking spots');
            }
        } catch (error) {
            setError('Failed to fetch parking spots');
        } finally {
            setIsLoading(false);
        }
    };

    if (loading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'host') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Parking Spots</h1>
                        <p className="mt-2 text-gray-600">
                            Manage your parking spot listings
                        </p>
                    </div>
                    <Link
                        href="/host/spots/new"
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add New Spot</span>
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {spots.length === 0 ? (
                    <div className="text-center py-12">
                        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No parking spots yet</h3>
                        <p className="text-gray-600 mb-4">
                            Start earning by adding your first parking spot
                        </p>
                        <Link
                            href="/host/spots/new"
                            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Add Your First Spot</span>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {spots.map((spot) => (
                            <div key={spot._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                {spot.images.length > 0 && (
                                    <div className="relative w-full h-48">
                                        <OptimizedImage
                                            src={spot.images[0]}
                                            alt={spot.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                                            {spot.title}
                                        </h3>
                                        <span className={`px-2 py-1 text-xs rounded-full ${spot.active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {spot.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                        {spot.description}
                                    </p>

                                    <div className="flex items-center text-gray-500 text-sm mb-2">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        <span className="truncate">{spot.address}, {spot.city}, {spot.state}</span>
                                    </div>

                                    <div className="flex items-center text-gray-500 text-sm mb-4">
                                        <DollarSign className="h-4 w-4 mr-1" />
                                        <span>${spot.pricePerHour}/hour</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex space-x-2">
                                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-md">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-md">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-md">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800">
                                            <Calendar className="h-4 w-4" />
                                            <span>Bookings</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}