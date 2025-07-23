'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface BusinessHour {
  id: string;
  day: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface BusinessHoursFormProps {
  businessHours: BusinessHour[];
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BusinessHoursForm({ businessHours }: BusinessHoursFormProps) {
  const [hours, setHours] = useState<BusinessHour[]>(businessHours);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleClosed = (index: number) => {
    const updatedHours = [...hours];
    updatedHours[index] = {
      ...updatedHours[index],
      isClosed: !updatedHours[index].isClosed,
    };
    setHours(updatedHours);
  };

  const handleTimeChange = (index: number, field: 'openTime' | 'closeTime', value: string) => {
    const updatedHours = [...hours];
    updatedHours[index] = {
      ...updatedHours[index],
      [field]: value || null,
    };
    setHours(updatedHours);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Enhanced validation with field focus
      const errors: string[] = [];

      for (const hour of hours) {
        if (!hour.isClosed) {
          if (!hour.openTime || !hour.closeTime) {
            errors.push(`Please set both opening and closing times for ${DAYS_OF_WEEK[hour.day]}`);

            // Focus on the first empty field
            const dayElement = document.getElementById(
              !hour.openTime ? `open-time-${hour.day}` : `close-time-${hour.day}`
            );
            if (dayElement && errors.length === 1) {
              setTimeout(() => dayElement.focus(), 100);
            }
          } else if (hour.openTime >= hour.closeTime) {
            errors.push(`Opening time must be before closing time for ${DAYS_OF_WEEK[hour.day]}`);

            // Focus on the close time field
            const closeTimeElement = document.getElementById(`close-time-${hour.day}`);
            if (closeTimeElement && errors.length === 1) {
              setTimeout(() => closeTimeElement.focus(), 100);
            }
          }
        }
      }

      // If validation errors exist, display them and stop submission
      if (errors.length > 0) {
        toast.error(errors[0], {
          description: errors.length > 1 ? `And ${errors.length - 1} more error(s)` : undefined,
          position: 'top-center',
          duration: 5000,
        });
        return;
      }

      // Prepare data for API - ensure dates are serialized properly
      const hoursData = hours.map(hour => ({
        ...hour,
        // Convert Date objects to ISO strings for JSON serialization
        createdAt: hour.createdAt instanceof Date ? hour.createdAt.toISOString() : hour.createdAt,
        updatedAt: hour.updatedAt instanceof Date ? hour.updatedAt.toISOString() : hour.updatedAt,
      }));

      const response = await fetch('/api/admin/business-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hours: hoursData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details && Array.isArray(errorData.details)) {
          // Handle structured validation errors from Zod
          const errorMessage = errorData.details
            .map((err: any) => `${err.path.join('.')} - ${err.message}`)
            .join('; ');
          throw new Error(errorMessage || errorData.error || 'Failed to update business hours');
        } else {
          throw new Error(errorData.error || 'Failed to update business hours');
        }
      }

      toast.success('Business hours updated successfully', {
        duration: 3000,
        position: 'top-center',
        description: 'Your store hours have been saved and are now live.',
      });
    } catch (error) {
      console.error('Error updating business hours:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update business hours', {
        position: 'top-center',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="overflow-hidden bg-white shadow sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {hours.map((hour, index) => (
            <li key={hour.day} className="px-0 py-4 sm:px-0">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                <div className="md:col-span-2">
                  <span className="text-md font-medium text-gray-900">
                    {DAYS_OF_WEEK[hour.day]}
                  </span>
                </div>

                <div className="flex items-center md:col-span-1">
                  <input
                    type="checkbox"
                    id={`closed-${hour.day}`}
                    checked={hour.isClosed}
                    onChange={() => handleToggleClosed(index)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                  />
                  <label htmlFor={`closed-${hour.day}`} className="text-sm text-gray-700">
                    Closed
                  </label>
                </div>

                <div className="md:col-span-3 grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor={`open-time-${hour.day}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Opening Time
                    </label>
                    <input
                      type="time"
                      id={`open-time-${hour.day}`}
                      value={hour.openTime || ''}
                      onChange={e => handleTimeChange(index, 'openTime', e.target.value)}
                      disabled={hour.isClosed}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:opacity-50 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`close-time-${hour.day}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Closing Time
                    </label>
                    <input
                      type="time"
                      id={`close-time-${hour.day}`}
                      value={hour.closeTime || ''}
                      onChange={e => handleTimeChange(index, 'closeTime', e.target.value)}
                      disabled={hour.isClosed}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:opacity-50 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Business Hours'}
          </button>
        </div>
      </div>
    </form>
  );
}
