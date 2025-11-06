'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { 
  Plus, 
  MapPin, 
  DollarSign, 
  Eye,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  TrendingUp
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
  active: boolean;
  amenities: string[];
  createdAt: string;
}

export default function HostDashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpots: 0,
    activeSpots: 0,
    totalEarnings: 0,
    monthlyBookings: 0
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/dashboard');
    } else if (isAuthenticated && user?.role === 'host') {
      fetchMySpots();
    }
  }, [isAuthenticated, loading, user, router]);

  const fetchMySpots = async () => {
    try {
      setSpotsLoading(true);
      const response = await fetch('/api/parking-spots/my-spots');
      const data = await response.json();

      if (response.ok) {
        setSpots(data.data);
        
        // Calculate stats
        const totalSpots = data.data.length;
        const activeSpots = data.data.filter((spot: ParkingSpot) => spot.active).length;
        
        setStats({
          totalSpots,
          activeSpots,
          totalEarnings: 0, // TODO: Calculate from bookings
          monthlyBookings: 0 // TODO: Calculate from bookings
        });
      } else {
        console.error('Failed to fetch spots:', data.error);
      }
    } catch (error) {
      console.error('Error fetching spots:', error);
    } finally {
      setSpotsLoading(false);
    }
  };

  const toggleSpotStatus = async (spotId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/parking-spots/${spotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (response.ok) {
        // Update local state
        setSpots(prev => prev.map(spot => 
          spot._id === spotId ? { ...spot, active: !currentStatus } : spot
        ));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          activeSpots: prev.activeSpots + (currentStatus ? -1 : 1)
        }));
      } else {
        console.error('Failed to update spot status');
      }
    } catch (error) {
      console.error('Error updating spot status:', error);
    }
  };

  const deleteSpot = async (spotId: string) => {
    if (!confirm('Are you sure you want to delete this parking spot?')) {
      return;
    }

    try {
      const response = await fetch(`/api/parking-spots/${spotId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setSpots(prev => prev.filter(spot => spot._id !== spotId));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalSpots: prev.totalSpots - 1,
          activeSpots: prev.activeSpots - (spots.find(s => s._id === spotId)?.active ? 1 : 0)
        }));
      } else {
        console.error('Failed to delete spot');
      }
    } catch (error) {
      console.error('Error deleting spot:', error);
    }
  };

  if (loading || spotsLoading) {
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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Manage your parking spots and track your earnings
            </p>
          </div>
          
          <Link
            href="/host/spots/new"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Spot</span>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Spots</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSpots}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ToggleRight className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Spots</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeSpots}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-semibold text-gray-900">${stats.totalEarnings}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.monthlyBookings}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}