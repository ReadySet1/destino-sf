'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

// Define the form schema with validation
const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

// Define the type for our form data
type ContactFormValues = z.infer<typeof formSchema>;

export interface ContactFormProps {
  onSubmitSuccess?: () => void;
}

export function ContactForm({ onSubmitSuccess }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState<string>('');

  // Initialize the form
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/alerts/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'contact_form',
          name: data.name,
          email: data.email,
          message: data.message,
          contactType: 'catering',
          website: honeypot, // Honeypot field for spam detection
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      if (result.success) {
        setSubmitSuccess(true);
        form.reset();
        onSubmitSuccess?.();
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Honeypot field - hidden from users, bots will fill it */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <p className="text-sm font-bold mb-2">Name</p>
                <FormControl>
                  <Input
                    placeholder="Your name"
                    {...field}
                    disabled={isSubmitting}
                    className="rounded-md border-gray-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <p className="text-sm font-bold mb-2">Email</p>
                <FormControl>
                  <Input
                    placeholder="Your email"
                    type="email"
                    {...field}
                    disabled={isSubmitting}
                    className="rounded-md border-gray-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <p className="text-sm font-bold mb-2">Message</p>
                <FormControl>
                  <Textarea
                    placeholder="Your message"
                    {...field}
                    disabled={isSubmitting}
                    className="rounded-md border-gray-200 min-h-[120px] resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#fab526] hover:bg-[#fab526]/90 text-black rounded-md px-6 py-2 text-sm font-normal"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>

        {submitSuccess && (
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            Thank you! Your message has been sent successfully.
          </div>
        )}

        {submitError && (
          <div className="rounded-md bg-red-50 p-4 text-red-800">Error: {submitError}</div>
        )}
      </form>
    </Form>
  );
}
