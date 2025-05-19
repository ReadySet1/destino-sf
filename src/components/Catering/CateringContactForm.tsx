'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { submitCateringInquiry } from '@/actions/catering';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Form schema with validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  phone: z.string().min(10, {
    message: 'Please enter a valid phone number.',
  }),
  eventDate: z.date({
    required_error: 'Please select a date for your event.',
  }).refine(date => date >= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), {
    message: 'Event date must be at least 2 days from now.',
  }),
  numberOfPeople: z.coerce.number().int().positive({
    message: 'Number of people must be a positive number.',
  }),
  notes: z.string().optional(),
  packageId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CateringContactFormProps {
  packageId?: string;
  packageName?: string;
  onSubmitSuccess?: () => void;
}

export function CateringContactForm({ packageId, packageName, onSubmitSuccess }: CateringContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      eventDate: undefined,
      numberOfPeople: undefined,
      notes: '',
      packageId: packageId,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Convert to the format expected by the server action
      const result = await submitCateringInquiry({
        ...data,
        eventDate: data.eventDate,
      });

      if (result.success) {
        setSubmitSuccess(true);
        form.reset();
        onSubmitSuccess?.();
      } else {
        console.error('Failed to submit inquiry:', result.error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-800">Get in Touch</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Fill out the form below to discuss your event needs and get a customized quote.
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {packageName && (
              <div className="rounded-lg bg-amber-50 p-5 mb-6 border border-amber-200">
                <p className="text-amber-800">
                  Your inquiry is for the <span className="font-semibold">{packageName}</span> package.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" className="h-12" {...field} />
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
                    <FormLabel className="text-base">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Your email" type="email" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Your phone number" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberOfPeople"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Number of People</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter number of guests" 
                        className="h-12" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-base">Event Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full h-12 pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          // Disable dates in the past and dates less than 2 days from now
                          date < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription className="text-gray-500">
                    Please select a date at least 2 days from today.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Special Requests or Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any dietary restrictions, preferred serving time, or other special requests"
                      {...field}
                      className="min-h-32 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#fab526] hover:bg-[#fab526]/90 text-black font-medium py-4 text-lg mt-6"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Catering Inquiry'}
            </Button>

            {submitSuccess && (
              <div className="rounded-lg bg-green-50 p-6 text-green-800 border border-green-200 mt-8">
                <p className="font-medium text-lg">Thank you for your inquiry!</p>
                <p className="mt-2">We&apos;ll get back to you soon to discuss your catering needs.</p>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
} 