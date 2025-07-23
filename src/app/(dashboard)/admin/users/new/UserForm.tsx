'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createUserAction, updateUserAction } from '../actions';
import { useRouter } from 'next/navigation';
import { prisma } from '@/lib/db';

type UserRole = Parameters<typeof prisma.profile.create>[0]['data']['role'];

interface Address {
  id?: string;
  name?: string | null;
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  addresses?: Address[];
}

interface UserFormProps {
  user?: User;
  isEditing?: boolean;
}

export default function UserForm({ user, isEditing = false }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAddress, setHasAddress] = useState<boolean>(!!user?.addresses?.length);
  const router = useRouter();

  const defaultAddress = user?.addresses?.length
    ? user.addresses[0]
    : {
        street: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
        isDefaultShipping: true,
        isDefaultBilling: true,
      };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);

    try {
      const action = isEditing ? updateUserAction : createUserAction;
      const result = await action(formData);
      if (result?.success) {
        router.push('/admin/users');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{isEditing ? 'Edit User' : 'Add New User'}</h1>
        <Link
          href="/admin/users"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </Link>
      </div>

      {error && <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">{error}</div>}

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {user?.id && <input type="hidden" name="id" id="id" value={user.id} />}

            <div className="col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                defaultValue={user?.email || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                defaultValue={user?.name || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                defaultValue={user?.phone || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                name="role"
                id="role"
                defaultValue={user?.role || 'CUSTOMER'}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                required
              >
                <option value="CUSTOMER">Customer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="col-span-2 mt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="hasAddress"
                  name="hasAddress"
                  checked={hasAddress}
                  onChange={e => setHasAddress(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="hasAddress"
                  className="ml-2 block text-sm font-medium text-gray-700"
                >
                  Add Address Information
                </label>
              </div>
            </div>

            {hasAddress && (
              <>
                <div className="col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                </div>

                {defaultAddress.id && (
                  <input type="hidden" name="addressId" value={defaultAddress.id} />
                )}

                <div>
                  <label htmlFor="address_name" className="block text-sm font-medium text-gray-700">
                    Address Label (optional)
                  </label>
                  <input
                    type="text"
                    name="address_name"
                    id="address_name"
                    defaultValue={defaultAddress.name || ''}
                    placeholder="Home, Work, etc."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="street"
                    id="street"
                    defaultValue={defaultAddress.street || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    required={hasAddress}
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="street2" className="block text-sm font-medium text-gray-700">
                    Apartment, Suite, etc. (optional)
                  </label>
                  <input
                    type="text"
                    name="street2"
                    id="street2"
                    defaultValue={defaultAddress.street2 || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    defaultValue={defaultAddress.city || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    required={hasAddress}
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State / Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="state"
                    defaultValue={defaultAddress.state || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    required={hasAddress}
                  />
                </div>

                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    id="postalCode"
                    defaultValue={defaultAddress.postalCode || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    required={hasAddress}
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    id="country"
                    defaultValue={defaultAddress.country || 'US'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    required={hasAddress}
                  />
                </div>

                <div>
                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      id="isDefaultShipping"
                      name="isDefaultShipping"
                      defaultChecked={defaultAddress.isDefaultShipping}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isDefaultShipping"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Default Shipping Address
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      id="isDefaultBilling"
                      name="isDefaultBilling"
                      defaultChecked={defaultAddress.isDefaultBilling}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isDefaultBilling"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Default Billing Address
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="col-span-2 flex justify-end space-x-4 mt-6">
              <Link
                href="/admin/users"
                className={`px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-disabled={isSubmitting}
                onClick={e => isSubmitting && e.preventDefault()}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : isEditing ? (
                  'Update User'
                ) : (
                  'Create User'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
