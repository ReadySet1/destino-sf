import { NotificationEmailTemplate, ConfirmationEmailTemplate } from '@/components/email-template';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { ReactElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email address of the Resend account owner
const RESEND_OWNER_EMAIL = 'info@ready-set.co';

// For testing purposes, we'll send all emails to the verified email
const IS_TESTING = !process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL.includes('localhost');

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    // Send notification email to owner
    const notificationEmail = await resend.emails.send({
      from: 'Destino SF Contact Form <solutions@updates.readysetllc.com>',
      to: [RESEND_OWNER_EMAIL],
      subject: 'New Contact Form Submission - Destino SF',
      replyTo: email,
      react: NotificationEmailTemplate({ name, email, message }) as ReactElement,
    });

    if (notificationEmail.error) {
      console.error('Error sending notification email:', notificationEmail.error);
      return NextResponse.json({ error: notificationEmail.error }, { status: 400 });
    }

    const confirmationEmail = await resend.emails.send({
      from: 'Destino SF <solutions@updates.readysetllc.com>',
      to: [email],
      subject: 'Thank you for contacting Destino SF',
      react: ConfirmationEmailTemplate({ name }) as ReactElement,
    });

    if (confirmationEmail.error) {
      console.error('Error sending confirmation email:', confirmationEmail.error);
      return NextResponse.json({ error: confirmationEmail.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        notificationEmail: notificationEmail.data,
        confirmationEmail: confirmationEmail.data,
        testMode: IS_TESTING
      }
    });
  } catch (error) {
    console.error('Error in email sending process:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
