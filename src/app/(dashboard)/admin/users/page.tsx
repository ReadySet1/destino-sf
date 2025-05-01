import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DeleteButton } from './components/DeleteButton';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { deleteUserAction } from './actions';
import { logger } from '@/utils/logger';

export const revalidate = 0; // Disable static generation
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'User Management',
  description: 'Manage your users',
  tags: ['users'],
};

type UserWithOrders = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  created_at: Date;
  updated_at: Date;
  orders: {
    id: string;
  }[];
};

type Profile = Parameters<typeof prisma.profile.create>[0]['data'] & {
  id: string;
  created_at: Date;
  updated_at: Date;
};

export default async function UsersPage() {
  // Fetch users with their orders
  const usersFromDb = await prisma.profile.findMany({
    orderBy: {
      email: 'asc',
    },
    include: {
      orders: {
        select: {
          id: true,
        },
      },
    },
  });

  // Transform the users to match our expected type
  const users = usersFromDb.map((user: UserWithOrders) => ({
    id: user.id,
    email: user.email,
    name: user.name || 'N/A',
    phone: user.phone || 'N/A',
    role: user.role,
    created_at: user.created_at,
    orderCount: user.orders.length,
  }));

  // Define the type for the user data used in the table
  type UserTableData = { 
    id: string; 
    email: string; 
    name: string; 
    phone: string; 
    role: PrismaUserRole;
    created_at: Date; 
    orderCount: number; 
  };

  // Server action to handle the form submission for deletion
  async function handleDelete(formData: FormData) {
    'use server';

    const id = formData.get('id') as string;

    if (!id) {
      logger.error('Delete button submitted without user ID.');
      return;
    }

    logger.info(`Handling delete request for user: ${id}`);

    const result = await deleteUserAction(id);

    if (result.success) {
      logger.info(`Successfully deleted user ${id}. Revalidating path /admin/users.`);
      revalidatePath('/admin/users');
    } else {
      logger.error(`Failed to delete user ${id}: ${result.error}`);
    }
  }

  async function editUser(formData: FormData) {
    'use server';

    const id = formData.get('id') as string;

    if (!id) {
      return;
    }

    try {
      // Redirect to the edit page for this user
      return redirect(`/admin/users/${id}`);
    } catch (error) {
      // Don't log redirect "errors" as they're normal
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is actually a redirect, not an error
        throw error;
      }

      console.error('Error navigating to edit user:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to navigate to edit user. An unexpected error occurred.');
      }
    }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-[3fr,1fr] gap-3 w-full items-start">
          <input
            type="text"
            placeholder="Search users..."
            className="border rounded p-2 w-full min-w-0"
          />
          <div className="flex flex-col md:flex-row gap-2 w-full">
            <Link
              href="/admin/users/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-center w-full break-words whitespace-nowrap"
            >
              Add User
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="hidden sm:table-cell w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="hidden sm:table-cell w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="hidden sm:table-cell w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user: UserTableData) => (
                <tr key={user.id}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 break-words max-w-[150px]">
                    {user.email}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {user.name}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-500">
                    {user.phone}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-500">
                    {user.orderCount}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    <form action={editUser} className="inline">
                      <input type="hidden" name="id" value={user.id} />
                      <button type="submit" className="text-indigo-600 hover:text-indigo-900 mr-2">
                        Edit
                      </button>
                    </form>
                    {user.role !== 'ADMIN' && (
                      <DeleteButton
                        id={user.id}
                        onDelete={handleDelete}
                        entityName="user"
                        warningMessage="This will permanently delete the user from authentication and the database. This cannot be undone."
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
