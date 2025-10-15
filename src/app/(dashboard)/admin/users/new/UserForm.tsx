'use client';

import { useState } from 'react';
import { createUserAction, updateUserAction } from '../actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { US_STATES } from '@/lib/constants/us-states';
import { FormContainer } from '@/components/ui/form/FormContainer';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormField } from '@/components/ui/form/FormField';
import { FormInput } from '@/components/ui/form/FormInput';
import { FormSelect } from '@/components/ui/form/FormSelect';
import { FormCheckbox } from '@/components/ui/form/FormCheckbox';
import { FormGrid } from '@/components/ui/form/FormGrid';
import { FormStack } from '@/components/ui/form/FormStack';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';

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
    <FormContainer>
      <FormHeader
        title={isEditing ? 'Edit User' : 'Add New User'}
        description={
          isEditing ? 'Update user information and settings' : 'Create a new user account'
        }
        backUrl="/admin/users"
        backLabel="Back to Users"
      />

      {error && (
        <div className="mb-6 p-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormStack spacing={10}>
          {/* Basic Information */}
          <FormSection
            title="Basic Information"
            description="Essential user account details"
            icon={FormIcons.user}
          >
            {user?.id && <input type="hidden" name="id" value={user.id} />}

            <FormStack spacing={6}>
              <FormField label="Email" required>
                <FormInput
                  type="email"
                  name="email"
                  placeholder="user@example.com"
                  defaultValue={user?.email || ''}
                  required
                />
              </FormField>

              <FormGrid cols={2}>
                <FormField label="Name">
                  <FormInput name="name" placeholder="John Doe" defaultValue={user?.name || ''} />
                </FormField>
                <FormField label="Phone">
                  <FormInput
                    type="tel"
                    name="phone"
                    placeholder="(555) 123-4567"
                    defaultValue={user?.phone || ''}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Role" required>
                <FormSelect name="role" defaultValue={user?.role || 'CUSTOMER'} required>
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Admin</option>
                </FormSelect>
              </FormField>
            </FormStack>
          </FormSection>

          {/* Address Information Toggle */}
          <FormSection
            title="Address Information"
            description="Optional address details for the user"
            icon={FormIcons.home}
            variant="blue"
          >
            <FormStack spacing={6}>
              <FormCheckbox
                name="hasAddress"
                label="Add Address Information"
                description="Include shipping and billing address for this user"
                checked={hasAddress}
                onChange={e => setHasAddress(e.target.checked)}
              />

              {hasAddress && (
                <>
                  {defaultAddress.id && (
                    <input type="hidden" name="addressId" value={defaultAddress.id} />
                  )}

                  <FormField label="Address Label" helpText="Optional label for this address">
                    <FormInput
                      name="address_name"
                      placeholder="Home, Work, etc."
                      defaultValue={defaultAddress.name || ''}
                    />
                  </FormField>

                  <FormField label="Street Address" required={hasAddress}>
                    <FormInput
                      name="street"
                      placeholder="123 Main Street"
                      defaultValue={defaultAddress.street || ''}
                      required={hasAddress}
                    />
                  </FormField>

                  <FormField label="Apartment, Suite, etc." helpText="Optional">
                    <FormInput
                      name="street2"
                      placeholder="Apt 4B, Suite 200, etc."
                      defaultValue={defaultAddress.street2 || ''}
                    />
                  </FormField>

                  <FormGrid cols={3}>
                    <FormField label="City" required={hasAddress}>
                      <FormInput
                        name="city"
                        placeholder="San Francisco"
                        defaultValue={defaultAddress.city || ''}
                        required={hasAddress}
                      />
                    </FormField>
                    <FormField label="State" required={hasAddress}>
                      <FormSelect
                        name="state"
                        placeholder="Select state"
                        defaultValue={defaultAddress.state || ''}
                        required={hasAddress}
                      >
                        <option value="">Select state</option>
                        {US_STATES.map(state => (
                          <option key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>
                    <FormField label="Postal Code" required={hasAddress}>
                      <FormInput
                        name="postalCode"
                        placeholder="94102"
                        defaultValue={defaultAddress.postalCode || ''}
                        required={hasAddress}
                      />
                    </FormField>
                  </FormGrid>

                  <FormField label="Country" required={hasAddress}>
                    <FormInput
                      name="country"
                      placeholder="United States"
                      defaultValue={defaultAddress.country || 'US'}
                      required={hasAddress}
                    />
                  </FormField>

                  <FormGrid cols={2}>
                    <FormCheckbox
                      name="isDefaultShipping"
                      label="Default Shipping Address"
                      description="Use this as the default shipping address"
                      defaultChecked={defaultAddress.isDefaultShipping}
                    />
                    <FormCheckbox
                      name="isDefaultBilling"
                      label="Default Billing Address"
                      description="Use this as the default billing address"
                      defaultChecked={defaultAddress.isDefaultBilling}
                    />
                  </FormGrid>
                </>
              )}
            </FormStack>
          </FormSection>

          {/* Form Actions */}
          <FormActions>
            <FormButton variant="secondary" href="/admin/users">
              Cancel
            </FormButton>
            <FormButton
              type="submit"
              disabled={isSubmitting}
              leftIcon={isSubmitting ? undefined : FormIcons.save}
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
            </FormButton>
          </FormActions>
        </FormStack>
      </form>
    </FormContainer>
  );
}
