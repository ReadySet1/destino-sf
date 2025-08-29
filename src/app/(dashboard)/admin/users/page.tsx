import { prisma, withConnectionManagement } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { deleteUserAction, resendPasswordSetupAction } from './actions';
import { logger } from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';

import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import UserFilters from './components/UserFilters';
import UserTableWrapper, { UserTableData } from './components/UserTableWrapper';
import Pagination from '@/components/ui/pagination';
import ErrorDisplay from '@/components/ui/ErrorDisplay';

export const revalidate = 0; // Disable static generation
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'User Management',
  description: 'Manage your users',
  tags: ['users'],
};

// Define page props type
type UserPageProps = {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    role?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }>;
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

export default async function UsersPage({ params, searchParams }: UserPageProps) {
  await params; // We're not using the params, but we need to await the promise

  // Await the searchParams promise
  const searchParamsResolved = await searchParams;
  // Parse search params with proper validation
  const currentPage = Math.max(1, Number(searchParamsResolved?.page || 1) || 1);
  const searchQuery = (searchParamsResolved?.search || '').trim();
  const roleFilter = searchParamsResolved?.role || 'all';
  const sortField = searchParamsResolved?.sort || 'email';
  const sortDirection = (searchParamsResolved?.direction === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const itemsPerPage = 20;
  const skip = Math.max(0, (currentPage - 1) * itemsPerPage);

  try {
    // Get current user for self-deletion prevention
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    const currentUserId = currentUser?.id;

    // Build where conditions for users
    const userWhere: any = {};

    if (searchQuery) {
      userWhere.OR = [
        { email: { contains: searchQuery, mode: 'insensitive' } },
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    if (roleFilter && roleFilter !== 'all') {
      userWhere.role = roleFilter;
    }

    // Determine order by clause
    let orderBy: any;
    switch (sortField) {
      case 'name':
        orderBy = { name: sortDirection };
        break;
      case 'role':
        orderBy = { role: sortDirection };
        break;
      case 'created_at':
        orderBy = { created_at: sortDirection };
        break;
      case 'email':
      default:
        orderBy = { email: sortDirection };
        break;
    }

    // For order count sorting, we need to handle it specially
    if (sortField === 'orderCount') {
      // We'll sort in memory after fetching
      orderBy = { email: 'asc' }; // Default sort for DB query
    }

    // Fetch users with their orders using robust connection management
    const usersFromDb = await withConnectionManagement(
      () => prisma.profile.findMany({
        where: userWhere,
        orderBy,
        skip,
        take: itemsPerPage,
        include: {
          orders: {
            select: {
              id: true,
            },
          },
        },
      }),
      'Fetch users with orders',
      15000 // 15 second timeout
    );

    // Get total count for pagination
    const totalCount = await withConnectionManagement(
      () => prisma.profile.count({ where: userWhere }),
      'Count total users',
      10000 // 10 second timeout
    );

    // Transform the users to match our expected type
    let users: UserTableData[] = usersFromDb.map((user: UserWithOrders) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      orderCount: user.orders.length,
    }));

    // Handle order count sorting in memory if needed
    if (sortField === 'orderCount') {
      users.sort((a, b) => {
        const diff = a.orderCount - b.orderCount;
        return sortDirection === 'asc' ? diff : -diff;
      });
    }

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    logger.info(`Found ${users.length} users for display (page ${currentPage}/${totalPages})`);

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

  // Server action to handle password setup invitation
  async function handleSendPasswordSetup(formData: FormData) {
    'use server';

    const id = formData.get('id') as string;

    if (!id) {
      logger.error('Send password setup submitted without user ID.');
      return;
    }

    logger.info(`Handling password setup invitation for user: ${id}`);

    const result = await resendPasswordSetupAction(id);

    if (result.success) {
      logger.info(
        `Successfully sent password setup invitation for user ${id}. Revalidating path /admin/users.`
      );
      revalidatePath('/admin/users');
    } else {
      logger.error(`Failed to send password setup invitation for user ${id}: ${result.error}`);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FormHeader
          title="User Management"
          description="Manage user accounts and permissions"
          backUrl="/admin"
          backLabel="Back to Dashboard"
        />

        <div className="space-y-10 mt-8">
          {/* Action Buttons */}
          <FormActions>
            <FormButton
              href="/admin/users/new"
              leftIcon={FormIcons.plus}
            >
              Add User
            </FormButton>
          </FormActions>

          {/* Filters Section */}
          <UserFilters
            currentSearch={searchQuery}
            currentRole={roleFilter}
            currentSort={sortField}
            currentDirection={sortDirection}
          />

          {users.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No users found{searchQuery && ` matching "${searchQuery}"`}.
            </div>
          ) : (
            <>
              <UserTableWrapper 
                users={users}
                currentUserId={currentUserId}
                sortKey={sortField}
                sortDirection={sortDirection}
                onDelete={handleDelete}
                onEdit={editUser}
                onSendInvite={handleSendPasswordSetup}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    searchParams={searchParamsResolved || {}}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  } catch (error) {
    // Enhanced error handling with more detailed information
    let errorInfo: any = {
      timestamp: new Date().toISOString(),
      searchParams: {
        page: currentPage,
        search: searchQuery,
        role: roleFilter,
        sort: sortField,
        direction: sortDirection
      }
    };

    if (error instanceof Error) {
      errorInfo.message = error.message;
      errorInfo.name = error.name;
      errorInfo.stack = error.stack;
    } else if (error && typeof error === 'object') {
      errorInfo.errorObject = JSON.stringify(error, null, 2);
    } else {
      errorInfo.message = String(error) || 'Unknown error with no details';
    }

    // Log both the original error and our formatted info
    console.error('[USERS_PAGE_ERROR]', error);
    logger.error('Error fetching users:', errorInfo);
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FormHeader
          title="User Management"
          description="Manage user accounts and permissions"
          backUrl="/admin"
          backLabel="Back to Dashboard"
        />
        <div className="mt-8">
          <ErrorDisplay
            title="Failed to Load Users"
            message="There was an error loading the users. Please try again later."
            returnLink={{ href: '/admin', label: 'Return to dashboard' }}
          />
        </div>
      </div>
    );
  }
}
