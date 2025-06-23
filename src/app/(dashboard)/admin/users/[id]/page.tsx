import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import UserForm from '../new/UserForm';

// Disable page caching to always fetch fresh data
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit User',
  description: 'Edit user details',
};

// Updated the type definition for Next.js 15: params and searchParams are Promises
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EditUserPage({ params, searchParams }: PageProps) {
  // params is now a Promise, need to await it
  const { id } = await params;
  // Await searchParams if it's provided
  if (searchParams) await searchParams;

  // Fetch the user from Prisma
  const user = await prisma.profile.findUnique({
    where: { id },
  });

  if (!user) {
    notFound();
  }

  // Instead of trying to access addresses directly, let's check what models are available
  console.log('Available Prisma models:', Object.keys(prisma));
  
  // Provide an empty array for addresses for now, we'll fix this in a more robust way
  const userData = {
    ...user,
    addresses: [],
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <UserForm user={userData} isEditing={true} />
    </div>
  );
}