'use client';

import { useState } from 'react';
import EmailTemplate from '../../components/email-template';

export default function TestEmailPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('John');

  const sendTestEmail = async () => {
    try {
      setStatus('loading');
      setMessage('Sending email...');

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setStatus('success');
      setMessage('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to send email');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Test Email Sending</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">First Name:</label>
        <input
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <button
          onClick={sendTestEmail}
          disabled={status === 'loading'}
          className={`px-4 py-2 rounded ${
            status === 'loading'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {status === 'loading' ? 'Sending...' : 'Send Test Email'}
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

      <div className="mt-8 p-4 border border-gray-200 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Email Preview:</h2>
        <div className="p-4 bg-gray-50 rounded-md">
          <EmailTemplate firstName={firstName} />
        </div>
      </div>
    </div>
  );
}
