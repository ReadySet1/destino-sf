'use client';

import { useState } from 'react';

export default function TestResendPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const testResend = async () => {
    try {
      setStatus('loading');
      setMessage('Testing Resend API...');

      console.log('Testing Resend API...');

      const response = await fetch('/api/test-resend');
      console.log('API response status:', response.status);

      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test Resend API');
      }

      setStatus('success');
      setMessage('Resend API test successful! Check your email.');
    } catch (error) {
      console.error('Error testing Resend API:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to test Resend API');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Test Resend API</h1>

      <div className="mb-4">
        <button
          onClick={testResend}
          disabled={status === 'loading'}
          className={`px-4 py-2 rounded ${
            status === 'loading'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {status === 'loading' ? 'Testing...' : 'Test Resend API'}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded ${
            status === 'error'
              ? 'bg-red-100 text-red-700'
              : status === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
