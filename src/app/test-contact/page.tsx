'use client';

import { useState } from 'react';
import { ContactForm } from '@/components/ContactForm';

export default function TestContactPage() {
  const [testResult, setTestResult] = useState<string>('');

  const handleTestAPI = async () => {
    try {
      const response = await fetch('/api/test-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'This is a test message',
        }),
      });

      const result = await response.json();
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Contact Form Test Page</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Test API Endpoint</h2>
          <button
            onClick={handleTestAPI}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Test API
          </button>

          {testResult && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-2">API Response:</h3>
              <pre className="text-sm overflow-auto">{testResult}</pre>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Contact Form</h2>
          <ContactForm
            onSubmitSuccess={() => {
              console.log('Contact form submitted successfully');
            }}
          />
        </div>
      </div>
    </div>
  );
}
