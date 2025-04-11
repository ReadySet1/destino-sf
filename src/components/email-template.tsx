import * as React from 'react';

interface EmailTemplateProps {
  name: string;
  email: string;
  message: string;
}

// Template for the notification email sent to the owner
export const NotificationEmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  name,
  email,
  message,
}) => (
  <div>
    <h1>New Contact Form Submission</h1>
    <div>
      <p>
        <strong>Name:</strong> {name}
      </p>
      <p>
        <strong>Email:</strong> {email}
      </p>
      <p>
        <strong>Message:</strong>
      </p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
    </div>
  </div>
);

// Template for the confirmation email sent to the user
export const ConfirmationEmailTemplate: React.FC<Pick<EmailTemplateProps, 'name'>> = ({ name }) => (
  <div
    style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#ffffff',
    }}
  >
    <h1 style={{ color: '#f77c22', marginBottom: '20px' }}>Thank you for contacting Destino SF!</h1>
    <div>
      <p>Dear {name},</p>
      <p>
        Thank you for reaching out to us. We have received your message and will get back to you
        shortly with more information.
      </p>
      <p>In the meantime, feel free to explore our menu and offerings on our website.</p>
      <p style={{ marginTop: '20px' }}>Best regards,</p>
      <p style={{ marginBottom: '20px' }}>The Destino SF Team</p>
    </div>
  </div>
);
