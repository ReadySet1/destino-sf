'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { UserRole } from '@prisma/client';
import ResponsiveUsersTable from './ResponsiveUsersTable';

// Define our user type for the table
export interface UserTableData {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: Date;
  orderCount: number;
}

interface UserTableWrapperProps {
  users: UserTableData[];
  currentUserId?: string;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  onDelete: (formData: FormData) => Promise<void>;
  onEdit: (formData: FormData) => Promise<void>;
  onSendInvite: (formData: FormData) => Promise<void>;
}

export default function UserTableWrapper({
  users,
  currentUserId,
  sortKey,
  sortDirection,
  onDelete,
  onEdit,
  onSendInvite,
}: UserTableWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', key);
    params.set('direction', direction);
    router.push(`?${params.toString()}`);
  };

  return (
    <ResponsiveUsersTable
      users={users}
      currentUserId={currentUserId}
      onSort={handleSort}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onDelete={onDelete}
      onEdit={onEdit}
      onSendInvite={onSendInvite}
    />
  );
}
