'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Car, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  PlusCircle,
  Clock,
  Star
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const isHost = user.role === 'host';

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name}!
          </h1>
          <p className="mt-2 text-gray-600">
            {isHost 
              ? "Manage your parking spots and bookings" 
              : "Find and book parking spots near you"
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isHost ? (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Spots</p>
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Monthly Earnings</p>
                    <p className="text-2xl font-semibold text-gray-900">$0</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Star className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average Rating</p>
                    <p className="text-2xl font-semibold text-gray-900">5.0</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Spent</p>
                    <p className="text-2xl font-semibold text-gray-900">$0</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Favorite Spots</p>
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-4">
              {isHost ? (
                <>
                  <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <PlusCircle className="h-8 w-8 text-blue-600 mr-4" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Add New Parking Spot</p>
                      <p className="text-sm text-gray-500">List a new parking space for rent</p>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Calendar className="h-8 w-8 text-green-600 mr-4" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Manage Bookings</p>
                      <p className="text-sm text-gray-500">View and manage your bookings</p>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <DollarSign className="h-8 w-8 text-yellow-600 mr-4" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">View Earnings</p>
                      <p className="text-sm text-gray-500">Check your earnings and payouts</p>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <MapPin className="h-8 w-8 text-blue-600 mr-4" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Find Parking</p>
                      <p className="text-sm text-gray-500">Search for parking spots near you</p>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Calendar className="h-8 w-8 text-green-600 mr-4" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">My Bookings</p>
                      <p className="text-sm text-gray-500">View your current and past bookings</p>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Car className="h-8 w-8 text-purple-600 mr-4" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Manage Vehicles</p>
                      <p className="text-sm text-gray-500">Add or edit your vehicle information</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isHost 
                    ? "Your bookings and earnings will appear here" 
                    : "Your bookings and activity will appear here"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Account Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {user.role} {user.role === 'host' ? '(Parking Host)' : '(Parking User)'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date().toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}