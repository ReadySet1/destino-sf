'use client';
import { useState } from 'react';
import EmailTemplate from './email-template';

export const EmailSender = () => {
  const [firstName, setFirstName] = useState<string>('');
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const handleEmailSent = () => {
    setEmailSent(true);
    // Reset the email sent status after 5 seconds
    setTimeout(() => {
      setEmailSent(false);
    }, 5000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Email Sender</h1>

      {emailSent && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
          Email sent successfully! You can send another one if needed.
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">First Name:</label>
        <input
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mt-8 p-4 border border-gray-200 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Email Preview:</h2>
        <div className="p-4 bg-gray-50 rounded-md">
          <EmailTemplate firstName={firstName} />
        </div>
      </div>

      <div className="mt-8 p-4 border border-gray-200 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Send Email:</h2>
        <div className="p-4 bg-gray-50 rounded-md">
          <EmailTemplate firstName={firstName} onEmailSent={handleEmailSent} />
        </div>
      </div>
    </div>
  );
};
