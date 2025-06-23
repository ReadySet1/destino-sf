import { db } from '@/lib/db';
import ClientSidePrismaDemo from './client-component';
import ServerActionDemo from './server-action-demo';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

interface TestResult {
  test: number;
}

export default async function PrismaTestPage() {
  // This is a server component, so this query runs on the server
  const result = await db.$queryRaw<TestResult[]>`SELECT 1 as test`;
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Prisma Test Page</h1>
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        <p className="font-bold">Prisma is working correctly!</p>
        <p>Test query result: {result[0]?.test}</p>
      </div>
      <div className="mt-6">
        <p className="text-gray-700">
          This page demonstrates that Prisma is correctly configured to work with Next.js 15
          and Turbopack. The query is executed on the server side only.
        </p>
      </div>
      
      {/* Client Component Demo */}
      <ClientSidePrismaDemo />
      
      {/* Server Action Demo */}
      <ServerActionDemo />
    </div>
  );
} 