'use client';

import { useState, useEffect } from 'react';

interface TestResult {
  success: boolean;
  message: string;
  data?: Array<{ test: number }>;
  error?: string;
}

export default function ClientSidePrismaDemo() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/prisma-test');
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold mb-4">Client Component Demo</h2>

      {loading && <div className="bg-gray-100 p-4 rounded animate-pulse">Loading...</div>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && result && (
        <div
          className={`bg-${result.success ? 'green' : 'red'}-100 border border-${result.success ? 'green' : 'red'}-400 text-${result.success ? 'green' : 'red'}-700 px-4 py-3 rounded`}
        >
          <p className="font-bold">{result.message}</p>
          {result.data && <p>Test query result: {result.data[0]?.test}</p>}
          {result.error && <p>Error: {result.error}</p>}
        </div>
      )}

      <div className="mt-4">
        <p className="text-gray-700">
          This component demonstrates how to properly fetch data from a Prisma-powered API route in
          a client component. The database query runs on the server side only.
        </p>
      </div>
    </div>
  );
}
