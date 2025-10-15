// Responsive Users Table Component
// This component uses the new responsive table system for better mobile experience

'use client';

import { formatDistance } from 'date-fns';
import { UserRole } from '@prisma/client';
import { ResponsiveTable, TableColumn } from '@/components/ui/responsive-table';
import { Edit2, Send, User, Users, Shield, Phone, Mail, Calendar } from 'lucide-react';
import { UserTableData } from './UserTableWrapper';
import { DeleteButton } from './DeleteButton';

interface ResponsiveUsersTableProps {
  users: UserTableData[];
  currentUserId?: string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onDelete: (formData: FormData) => Promise<void>;
  onEdit: (formData: FormData) => Promise<void>;
  onSendInvite: (formData: FormData) => Promise<void>;
}

function getRoleColor(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800';
    case 'CUSTOMER':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getRoleIcon(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return <Shield className="h-3 w-3" />;
    case 'CUSTOMER':
      return <User className="h-3 w-3" />;
    default:
      return <Users className="h-3 w-3" />;
  }
}

export default function ResponsiveUsersTable({
  users,
  currentUserId,
  onSort,
  sortKey,
  sortDirection = 'asc',
  onDelete,
  onEdit,
  onSendInvite,
}: ResponsiveUsersTableProps) {
  // Define table columns using the correct TableColumn interface
  const columns: TableColumn<UserTableData>[] = [
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      accessor: user => (
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
            {user.name && <p className="text-sm text-gray-600 truncate mt-1">{user.name}</p>}
          </div>
        </div>
      ),
    },

    {
      key: 'name',
      header: 'Name',
      sortable: true,
      className: 'hidden sm:table-cell',
      accessor: user => (
        <div className="text-sm text-gray-900">
          {user.name || <span className="text-gray-400 italic">No name set</span>}
        </div>
      ),
    },

    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      className: 'hidden lg:table-cell',
      accessor: user => (
        <div className="flex items-center text-sm text-gray-900">
          {user.phone ? (
            <>
              <Phone className="h-4 w-4 text-gray-500 mr-2.5" />
              <span className="font-medium">{user.phone}</span>
            </>
          ) : (
            <span className="text-gray-400 italic">No phone set</span>
          )}
        </div>
      ),
    },

    {
      key: 'role',
      header: 'Role',
      sortable: true,
      accessor: user => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}
        >
          {getRoleIcon(user.role)}
          {user.role}
        </span>
      ),
    },

    {
      key: 'orderCount',
      header: 'Orders',
      sortable: true,
      className: 'hidden sm:table-cell',
      accessor: user => (
        <div className="text-sm">
          <span className="font-semibold text-gray-900">{user.orderCount}</span>
          {user.orderCount > 0 && (
            <span className="text-gray-600 ml-1.5">order{user.orderCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      ),
    },

    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      className: 'hidden md:table-cell',
      accessor: user => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="h-4 w-4 mr-3 text-gray-400" />
          <div className="space-y-1">
            <div className="text-gray-900 font-medium">
              {formatDistance(new Date(user.created_at), new Date(), { addSuffix: true })}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(user.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ),
    },

    {
      key: 'actions',
      header: 'Actions',
      accessor: user => (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          {/* Edit Button */}
          <form action={onEdit} className="inline-block">
            <input type="hidden" name="id" value={user.id} />
            <button
              type="submit"
              className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </button>
          </form>

          {/* Send Invite Button */}
          <form action={onSendInvite} className="inline-block">
            <input type="hidden" name="id" value={user.id} />
            <button
              type="submit"
              className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
              title="Send password setup invitation"
            >
              <Send className="h-3 w-3 mr-1" />
              Invite
            </button>
          </form>

          {/* Delete Button - Show for all users except current user (prevent self-deletion) */}
          {user.id !== currentUserId ? (
            <DeleteButton
              id={user.id}
              onDelete={onDelete}
              entityName="user"
              warningMessage={`This will permanently delete ${user.email} from authentication and the database. This cannot be undone.`}
            />
          ) : (
            <span className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-1.5 text-xs font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed">
              <User className="h-3 w-3 mr-1" />
              You
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <ResponsiveTable
      data={users}
      columns={columns}
      onSort={onSort}
      sortKey={sortKey}
      sortDirection={sortDirection}
      emptyMessage="No users found. Get started by adding your first user."
      className="bg-white rounded-xl border border-gray-200/70 overflow-hidden shadow-sm"
    />
  );
}
