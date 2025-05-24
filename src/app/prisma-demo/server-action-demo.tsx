'use client';

import { useState } from 'react';
import { testPrismaServerAction } from './actions';

interface ActionResult {
  success: boolean;
  message: string;
  data?: number;
  error?: string;
}

export default function ServerActionDemo() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      const actionResult = await testPrismaServerAction();
      setResult(actionResult);
    } catch (err) {
      setResult({
        success: false,
        message: 'Error invoking server action',
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold mb-4">Server Action Demo</h2>
      
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Test Server Action'}
      </button>
      
      {result && (
        <div className={`mt-4 bg-${result.success ? 'green' : 'red'}-100 border border-${result.success ? 'green' : 'red'}-400 text-${result.success ? 'green' : 'red'}-700 px-4 py-3 rounded`}>
          <p className="font-bold">{result.message}</p>
          {result.data !== undefined && (
            <p>Test query result: {result.data}</p>
          )}
          {result.error && (
            <p>Error: {result.error}</p>
          )}
        </div>
      )}
      
      <div className="mt-4">
        <p className="text-gray-700">
          This component demonstrates how to properly use a Prisma-powered server action
          from a client component. The database query runs on the server side only.
        </p>
      </div>
    </div>
  );
} 