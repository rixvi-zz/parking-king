'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Car, 
  Plus, 
  Edit, 
  Trash2, 
  Star,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Vehicle {
  _id: string;
  name: string;
  number: string;
  type: 'car' | 'bike' | 'truck' | 'suv' | 'other';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VehicleForm {
  name: string;
  number: string;
  type: 'car' | 'bike' | 'truck' | 'suv' | 'other';
  isDefault: boolean;
}

export default function VehiclesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState<VehicleForm>({
    name: '',
    number: '',
    type: 'car',
    isDefault: false
  });

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchVehicles();
  }, [session]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles);
      } else {
        setError('Failed to fetch vehicles');
      }
    } catch (error) {
      setError('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      number: '',
      type: 'car',
      isDefault: false
    });
    setEditingVehicle(null);
    setError('');
    setSuccess('');
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setForm({
      name: vehicle.name,
      number: vehicle.number,
      type: vehicle.type,
      isDefault: vehicle.isDefault
    });
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.number.trim()) {
      setError('Name and number are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const url = editingVehicle ? `/api/vehicles/${editingVehicle._id}` : '/api/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingVehicle ? 'Vehicle updated successfully' : 'Vehicle added successfully');
        fetchVehicles();
        closeModal();
      } else {
        setError(data.error || 'Failed to save vehicle');
      }
    } catch (error) {
      setError('Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      setDeleting(vehicleId);
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Vehicle deleted successfully');
        fetchVehicles();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete vehicle');
      }
    } catch (error) {
      setError('Failed to delete vehicle');
    } finally {
      setDeleting(null);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'bike':
        return '🏍️';
      case 'truck':
        return '🚛';
      case 'suv':
        return '🚙';
      default:
        return '🚗';
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Vehicles</h1>
              <p className="text-gray-600 mt-2">Manage your vehicles for parking bookings</p>
            </div>
            <button
              onClick={openAddModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Vehicles List */}
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No vehicles added yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first vehicle to start booking parking spots.
            </p>
            <button
              onClick={openAddModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <div key={vehicle._id} className="bg-white rounded-lg shadow p-6 relative">
                {vehicle.isDefault && (
                  <div className="absolute top-4 right-4">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  </div>
                )}
                
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-3">
                    {getVehicleIcon(vehicle.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{vehicle.name}</h3>
                    <p className="text-sm text-gray-600">{getVehicleTypeLabel(vehicle.type)}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="bg-gray-100 rounded-lg p-3 text-center">
                    <span className="text-lg font-mono font-bold text-gray-900">
                      {vehicle.number}
                    </span>
                  </div>
                </div>

                {vehicle.isDefault && (
                  <div className="mb-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Star className="h-3 w-3 mr-1" />
                      Default Vehicle
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Added {new Date(vehicle.createdAt).toLocaleDateString()}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(vehicle)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit Vehicle"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => deleteVehicle(vehicle._id)}
                      disabled={deleting === vehicle._id}
                      className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                      title="Delete Vehicle"
                    >
                      {deleting === vehicle._id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Vehicle Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h2>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      placeholder="e.g., My Honda Civic"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      name="number"
                      value={form.number}
                      onChange={handleInputChange}
                      placeholder="e.g., ABC-1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type *
                    </label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="car">Car</option>
                      <option value="bike">Bike</option>
                      <option value="suv">SUV</option>
                      <option value="truck">Truck</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={form.isDefault}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Set as default vehicle
                    </label>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingVehicle ? 'Updating...' : 'Adding...'}
                        </div>
                      ) : (
                        editingVehicle ? 'Update Vehicle' : 'Add Vehicle'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}