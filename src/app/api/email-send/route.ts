import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email address of the Resend account owner
const RESEND_OWNER_EMAIL = 'info@ready-set.co';

export async function POST(request: NextRequest) {
  console.log('Email sending process started');
  console.log('RESEND_API_KEY available:', !!process.env.RESEND_API_KEY);

  try {
    // Parse the request body
    const body = await request.json();
    const { firstName, email } = body;

    console.log('Received data:', { firstName, email });

    if (!firstName) {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    console.log('Attempting to send email...');

    // Create a simple HTML email template
    const emailHtml = `
      <div>
        <h1>Welcome, ${firstName}!</h1>
        <p>Thank you for joining Destino SF. We're excited to have you on board!</p>
        <p>Best regards,<br />The Destino SF Team</p>
      </div>
    `;

    // For testing with a free Resend account, we can only send to the account owner's email
    // In production, you would verify a domain and send to any email address
    const { data, error } = await resend.emails.send({
      from: 'Destino SF <onboarding@resend.dev>',
      to: [RESEND_OWNER_EMAIL], // Always send to the account owner's email for testing
      subject: 'Welcome to Destino SF',
      html: emailHtml,
      // Include the intended recipient in the email body for testing purposes
      text: `This email would be sent to: ${email}\n\n${emailHtml.replace(/<[^>]*>/g, '')}`,
    });

    if (error) {
      console.error('Error sending email:', error);
      // Return a more detailed error message
      return NextResponse.json(
        { error: `Failed to send email: ${error.message || JSON.stringify(error)}` },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({
      ...data,
      message: `Email sent successfully to ${RESEND_OWNER_EMAIL} (testing mode). In production, this would be sent to ${email}.`,
    });
  } catch (error) {
    console.error('Exception during email sending:', error);
    // Return a more detailed error message
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
