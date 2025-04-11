import React, { useState } from 'react';

interface EmailTemplateProps {
  firstName: string;
  email?: string;
  onEmailSent?: () => void;
}

export default function EmailTemplate({ firstName, email = '', onEmailSent }: EmailTemplateProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testMode, setTestMode] = useState<boolean>(true);

  const sendEmail = async () => {
    if (!firstName) {
      setErrorMessage('Please enter a name');
      setStatus('error');
      return;
    }

    if (!email) {
      setErrorMessage('Please enter an email address');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      console.log('Sending email to:', email);
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, email }),
      });

      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok) {
        const errorMessage =
          typeof data.error === 'object'
            ? JSON.stringify(data.error)
            : data.error || 'Failed to send email';

        throw new Error(errorMessage);
      }

      setStatus('success');
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Email Preview</h2>

      {testMode && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
          <p className="font-medium">Test Mode</p>
          <p className="text-sm">
            In test mode, emails will be sent to the account owner (info@ready-set.co) instead of
            the specified email address.
          </p>
        </div>
      )}

      <div className="mb-4 p-4 border border-gray-200 rounded-md">
        <p className="font-medium">To: {email}</p>
        <p className="font-medium">Subject: Welcome to Destino SF</p>
        <div className="mt-2 p-3 bg-gray-50 rounded-md">
          <h1 className="text-xl font-bold">Welcome, {firstName}!</h1>
          <p className="mt-2">
            Thank you for joining Destino SF. We&apos;re excited to have you on board!
          </p>
          <p className="mt-4">
            Best regards,
            <br />
            The Destino SF Team
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={sendEmail}
          disabled={status === 'loading'}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            status === 'loading'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {status === 'loading' ? 'Sending...' : 'Send Email'}
        </button>

        {status === 'success' && (
          <div className="p-3 bg-green-100 text-green-800 rounded-md">
            <p className="font-medium">Email sent successfully!</p>
            {testMode && (
              <p className="text-sm mt-1">
                Note: In test mode, the email was sent to info@ready-set.co instead of {email}.
              </p>
            )}
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="p-3 bg-red-100 text-red-800 rounded-md">
            <p className="font-medium">Error sending email</p>
            <p className="text-sm mt-1">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
