'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUmamiFormTracking, useUmamiTracking } from '@/lib/analytics';

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

  // Initialize analytics tracking
  const { trackFormStart, trackFormSubmit, trackFormFieldInteraction } = useUmamiFormTracking();
  const { trackButtonClick } = useUmamiTracking();

  // Initialize the form
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  // Track form start when component mounts
  useEffect(() => {
    trackFormStart('contact_form');
  }, [trackFormStart]);

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
          contactType: 'general',
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
        
        // Track successful form submission
        trackFormSubmit('contact_form', true);
        trackButtonClick('contact_form_submit', 'contact_page');
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setSubmitError(errorMessage);
      
      // Track failed form submission
      trackFormSubmit('contact_form', false, errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track field interactions
  const handleFieldFocus = (fieldName: string) => {
    trackFormFieldInteraction('contact_form', fieldName);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    onFocus={() => handleFieldFocus('name')}
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
                    onFocus={() => handleFieldFocus('email')}
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
                    onFocus={() => handleFieldFocus('message')}
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
          onClick={() => trackButtonClick('contact_form_submit_button', 'contact_page')}
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>

        {submitSuccess && (
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            Thank you! Your message has been sent successfully.
          </div>
        )}

        {submitError && (
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            Error: {submitError}
          </div>
        )}
      </form>
    </Form>
  );
}
