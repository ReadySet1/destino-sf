import { EmailSender } from '../../components/email-sender';

export const metadata = {
  title: 'Email Sender - Destino SF',
  description: 'Send personalized emails to your customers',
};

export default function EmailSenderPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Email Sender</h1>
        <p className="text-center text-gray-600 mb-8">
          Use this tool to send personalized emails to your customers.
        </p>
        <EmailSender />
      </div>
    </div>
  );
}
