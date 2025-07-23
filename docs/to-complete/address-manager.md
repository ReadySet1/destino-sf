### 1. Database Schema Updates

First, we need to extend your Prisma schema to support saved addresses:

```tsx
// Add to prisma/schema.prisma

model Address {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @db.Uuid
  label         String?  // e.g., "Home", "Work", "Mom's House"
  recipientName String
  street        String
  street2       String?
  city          String
  state         String
  postalCode    String
  country       String   @default("US")
  phone         String?
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  profile       Profile  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isDefault])
  @@map("addresses")
}

// Update Profile model to include addresses relation
model Profile {
  // ... existing fields ...
  addresses     Address[]
}
```

### 2. Type Definitions

Update your existing address types:

```tsx
// src/types/address.ts

export interface Address {
  recipientName?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface SavedAddress extends Address {
  id: string;
  userId: string;
  label?: string;
  phone?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAddressInput extends Address {
  label?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput extends Partial<CreateAddressInput> {
  id: string;
}
```

### 3. Server Actions

Create server actions for address management:

```tsx
// src/app/actions/addresses.ts

'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateAddressInput, UpdateAddressInput } from '@/types/address';
import { revalidatePath } from 'next/cache';

export async function getUserAddresses() {
  const user = await auth();
  if (!user?.id) throw new Error('Unauthorized');

  return prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createAddress(input: CreateAddressInput) {
  const user = await auth();
  if (!user?.id) throw new Error('Unauthorized');

  // If setting as default, unset other defaults
  if (input.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      ...input,
      userId: user.id,
    },
  });

  revalidatePath('/account/addresses');
  return address;
}

export async function updateAddress(input: UpdateAddressInput) {
  const user = await auth();
  if (!user?.id) throw new Error('Unauthorized');

  const { id, ...data } = input;

  // Verify ownership
  const existing = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) throw new Error('Address not found');

  // Handle default flag
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id, NOT: { id } },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id },
    data,
  });

  revalidatePath('/account/addresses');
  return address;
}

export async function deleteAddress(id: string) {
  const user = await auth();
  if (!user?.id) throw new Error('Unauthorized');

  // Verify ownership
  const existing = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) throw new Error('Address not found');

  await prisma.address.delete({ where: { id } });

  revalidatePath('/account/addresses');
}

export async function setDefaultAddress(id: string) {
  const user = await auth();
  if (!user?.id) throw new Error('Unauthorized');

  // Unset all defaults
  await prisma.address.updateMany({
    where: { userId: user.id },
    data: { isDefault: false },
  });

  // Set new default
  await prisma.address.update({
    where: { id },
    data: { isDefault: true },
  });

  revalidatePath('/account/addresses');
}
```

### 4. API Routes (Optional Alternative)

If you prefer API routes over server actions:

```tsx
// src/app/api/addresses/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await auth();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(addresses);
}

export async function POST(request: Request) {
  const user = await auth();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Validate input here...

  const address = await prisma.address.create({
    data: {
      ...body,
      userId: user.id,
    },
  });

  return NextResponse.json(address);
}
```

### 5. React Components

Create reusable address components:

```tsx
// src/components/Address/AddressCard.tsx

import { SavedAddress } from '@/types/address';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Star } from 'lucide-react';

interface AddressCardProps {
  address: SavedAddress;
  onEdit: (address: SavedAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function AddressCard({ address, onEdit, onDelete, onSetDefault }: AddressCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {address.label && <h3 className="font-semibold mb-1">{address.label}</h3>}
            {address.isDefault && <Badge className="mb-2">Default</Badge>}
            <p className="text-sm text-muted-foreground">
              {address.recipientName}
              <br />
              {address.street}
              <br />
              {address.street2 && (
                <>
                  {address.street2}
                  <br />
                </>
              )}
              {address.city}, {address.state} {address.postalCode}
            </p>
            {address.phone && <p className="text-sm text-muted-foreground mt-1">{address.phone}</p>}
          </div>
          <div className="flex gap-2">
            {!address.isDefault && (
              <Button variant="ghost" size="icon" onClick={() => onSetDefault(address.id)}>
                <Star className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onEdit(address)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(address.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
// src/components/Address/AddressForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateAddressInput, SavedAddress } from '@/types/address';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { US_STATES } from '@/lib/constants';

const addressSchema = z.object({
  label: z.string().optional(),
  recipientName: z.string().min(2, 'Name is required'),
  street: z.string().min(5, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().regex(/^\\d{5}(-\\d{4})?$/, 'Invalid ZIP code'),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

interface AddressFormProps {
  address?: SavedAddress;
  onSubmit: (data: CreateAddressInput) => Promise<void>;
  onCancel: () => void;
}

export function AddressForm({ address, onSubmit, onCancel }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CreateAddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: address || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="label">Address Label (optional)</Label>
        <Input id="label" placeholder="e.g., Home, Work" {...register('label')} />
      </div>

      <div>
        <Label htmlFor="recipientName">Recipient Name</Label>
        <Input
          id="recipientName"
          {...register('recipientName')}
          className={errors.recipientName ? 'border-red-500' : ''}
        />
        {errors.recipientName && (
          <p className="text-sm text-red-500">{errors.recipientName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="street">Street Address</Label>
        <Input
          id="street"
          {...register('street')}
          className={errors.street ? 'border-red-500' : ''}
        />
        {errors.street && <p className="text-sm text-red-500">{errors.street.message}</p>}
      </div>

      <div>
        <Label htmlFor="street2">Apartment, Suite, etc. (optional)</Label>
        <Input id="street2" {...register('street2')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register('city')} className={errors.city ? 'border-red-500' : ''} />
          {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <Select value={watch('state')} onValueChange={value => setValue('state', value)}>
            <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(state => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && <p className="text-sm text-red-500">{errors.state.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="postalCode">ZIP Code</Label>
        <Input
          id="postalCode"
          {...register('postalCode')}
          className={errors.postalCode ? 'border-red-500' : ''}
        />
        {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode.message}</p>}
      </div>

      <div>
        <Label htmlFor="phone">Phone Number (optional)</Label>
        <Input id="phone" type="tel" {...register('phone')} />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={watch('isDefault')}
          onCheckedChange={checked => setValue('isDefault', checked as boolean)}
        />
        <Label htmlFor="isDefault">Set as default address</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {address ? 'Update' : 'Add'} Address
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

### 6. Address Manager Page

Create the main address management page:

```tsx
// src/app/(store)/account/addresses/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@/app/actions/addresses';
import { SavedAddress, CreateAddressInput } from '@/types/address';
import { AddressCard } from '@/components/Address/AddressCard';
import { AddressForm } from '@/components/Address/AddressForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function AddressesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | undefined>();
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: getUserAddresses,
  });

  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setIsFormOpen(false);
      toast.success('Address added successfully');
    },
    onError: () => {
      toast.error('Failed to add address');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setEditingAddress(undefined);
      toast.success('Address updated successfully');
    },
    onError: () => {
      toast.error('Failed to update address');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete address');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
    },
    onError: () => {
      toast.error('Failed to update default address');
    },
  });

  const handleSubmit = async (data: CreateAddressInput) => {
    if (editingAddress) {
      await updateMutation.mutateAsync({
        id: editingAddress.id,
        ...data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = async () => {
    if (deletingAddressId) {
      await deleteMutation.mutateAsync(deletingAddressId);
      setDeletingAddressId(null);
    }
  };

  if (isLoading) {
    return <div>Loading addresses...</div>;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Addresses</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">You haven't saved any addresses yet.</p>
          <Button onClick={() => setIsFormOpen(true)}>Add Your First Address</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map(address => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={setEditingAddress}
              onDelete={setDeletingAddressId}
              onSetDefault={setDefaultMutation.mutate}
            />
          ))}
        </div>
      )}

      <Dialog
        open={isFormOpen || !!editingAddress}
        onOpenChange={open => {
          if (!open) {
            setIsFormOpen(false);
            setEditingAddress(undefined);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <AddressForm
            address={editingAddress}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingAddress(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingAddressId}
        onOpenChange={open => !open && setDeletingAddressId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### 7. Address Selector Component

For use in checkout forms:

```tsx
// src/components/Address/AddressSelector.tsx

import { useState } from 'react';
import { SavedAddress } from '@/types/address';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AddressSelectorProps {
  addresses: SavedAddress[];
  selectedId?: string;
  onSelect: (address: SavedAddress) => void;
  onAddNew: () => void;
}

export function AddressSelector({
  addresses,
  selectedId,
  onSelect,
  onAddNew,
}: AddressSelectorProps) {
  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedId}
        onValueChange={id => {
          const address = addresses.find(a => a.id === id);
          if (address) onSelect(address);
        }}
      >
        {addresses.map(address => (
          <div key={address.id} className="flex items-start space-x-2">
            <RadioGroupItem value={address.id} id={address.id} />
            <Label htmlFor={address.id} className="flex-1 cursor-pointer">
              <div>
                {address.label && <span className="font-semibold">{address.label}: </span>}
                {address.recipientName}, {address.street}, {address.city}, {address.state}{' '}
                {address.postalCode}
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <Button variant="outline" onClick={onAddNew} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Use a different address
      </Button>
    </div>
  );
}
```

### 8. Integration with Checkout

Update your checkout form to use saved addresses:

```tsx
// Update CheckoutForm.tsx to include address selection

import { AddressSelector } from '@/components/Address/AddressSelector';
import { getUserAddresses } from '@/app/actions/addresses';

// In your checkout component:
const { data: savedAddresses = [] } = useQuery({
  queryKey: ['addresses'],
  queryFn: getUserAddresses,
  enabled: !!user?.id // Only fetch if user is logged in
});

// Add state for showing address selector
const [useNewAddress, setUseNewAddress] = useState(false);

// In the form render:
{fulfillmentMethod === 'nationwide_shipping' && user?.id && savedAddresses.length > 0 && !useNewAddress ? (
  <AddressSelector
    addresses={savedAddresses}
    selectedId={selectedAddressId}
    onSelect={(address) => {
      setValue('shippingAddress', {
        street: address.street,
        street2: address.street2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
      });
      setSelectedAddressId(address.id);
    }}
    onAddNew={() => setUseNewAddress(true)}
  />
) : (
  // Existing address form fields
)}
```

### 9. Navigation Updates

Add address management to account navigation:

```tsx
// src/components/Account/AccountNav.tsx

import { MapPin } from 'lucide-react';

const accountLinks = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin }, // Add this
  { href: '/account/settings', label: 'Settings' },
];
```

### 10. Migration Script

Create a migration to add the addresses table:

```sql
-- prisma/migrations/[timestamp]_add_addresses/migration.sql

CREATE TABLE "addresses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "label" TEXT,
  "recipientName" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "street2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'US',
  "phone" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");
CREATE INDEX "addresses_isDefault_idx" ON "addresses"("isDefault");

ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Additional Considerations:

1. **Validation**: Add address validation using Google Maps API or similar service
2. **Auto-complete**: Implement address auto-complete for better UX
3. **Import from order**: Allow users to save addresses from previous orders
4. **Guest checkout**: Handle address storage for guest users
5. **Mobile optimization**: Ensure the address manager works well on mobile devices
6. **Testing**: Add comprehensive tests for all address operations
