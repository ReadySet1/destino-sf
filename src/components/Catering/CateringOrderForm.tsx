'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { saveCateringContactInfo } from '@/actions/catering';
import { toast } from 'sonner';

// Form schema using Zod for validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  eventDate: z.date({
    required_error: "Please select an event date.",
  }).refine((date) => {
    const minDate = addDays(new Date(), 5);
    minDate.setHours(0, 0, 0, 0);
    return date >= minDate;
  }, {
    message: "Catering orders must be confirmed 5 days in advance.",
  }),
  specialRequests: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CateringOrderFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => void;
  isSubmitting: boolean;
}

export function CateringOrderForm({
  defaultValues,
  onSubmit,
  isSubmitting
}: CateringOrderFormProps) {
  console.log('🔍 CateringOrderForm received defaultValues:', defaultValues);
  
  // Get current date for minimum date selection (5 days advance)
  const today = new Date();
  const minDate = addDays(today, 5);
  minDate.setHours(0, 0, 0, 0);
  
  const formDefaults = {
    name: defaultValues?.name || '',
    email: defaultValues?.email || '',
    phone: defaultValues?.phone || '',
    eventDate: defaultValues?.eventDate || addDays(new Date(), 5),
    specialRequests: defaultValues?.specialRequests || '',
  };
  
  console.log('🔍 Form initialized with:', formDefaults);
  
  // Initialize form with defaultValues
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaults,
  });

  // State to track if contact info has been saved
  const [contactSaved, setContactSaved] = useState(false);

  // Function to save contact info immediately
  const saveContactInfo = async (name: string, email: string, phone: string) => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      return; // Don't save incomplete info
    }

    // Basic validation before saving
    if (name.length < 2 || !email.includes('@') || phone.length < 10) {
      return; // Don't save invalid info
    }

    try {
      const result = await saveCateringContactInfo({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      if (result.success) {
        setContactSaved(true);
        console.log('✅ Contact info saved successfully with profile ID:', result.data.profileId);
      } else {
        console.error('❌ Failed to save contact info:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving contact info:', error);
    }
  };

  // Fix hydration issue by resetting form values after mount
  useEffect(() => {
    if (defaultValues) {
      console.log('🔄 Resetting form with defaultValues after mount:', defaultValues);
      const resetValues = {
        name: defaultValues.name || '',
        email: defaultValues.email || '',
        phone: defaultValues.phone || '',
        eventDate: defaultValues.eventDate || addDays(new Date(), 5),
        specialRequests: defaultValues.specialRequests || '',
      };
      form.reset(resetValues);
    }
  }, [defaultValues, form]);

  // Watch for changes in contact fields and save automatically
  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      // Only save when all contact fields are filled and not already saved
      if (!contactSaved && fieldName && ['name', 'email', 'phone'].includes(fieldName)) {
        const { name, email, phone } = value;
        
        // Debounce the save operation
        const timeoutId = setTimeout(() => {
          if (name && email && phone) {
            saveContactInfo(name, email, phone);
          }
        }, 1000); // Wait 1 second after user stops typing

        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, contactSaved]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              {contactSaved && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Contact saved
                </div>
              )}
            </div>
            
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(415) 555-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Event Details</h3>
            
            <div className="grid gap-4 mb-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => {
                            return date < minDate;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please include any dietary restrictions, special requests, or questions about our catering service."
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        <Button 
          type="submit" 
          className="w-full bg-[#2d3538] hover:bg-[#2d3538]/90 py-6 text-lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : "Complete Order"}
        </Button>
      </form>
    </Form>
  );
}

export default CateringOrderForm; 