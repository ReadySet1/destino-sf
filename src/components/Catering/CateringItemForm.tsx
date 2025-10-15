// This component is temporarily disabled since CateringItem management has been removed
// in favor of Square integration. Individual catering items are now managed through Square.

/*
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CateringItem, CateringItemCategory } from '@/types/catering';
import { createCateringItem, updateCateringItem } from '@/actions/catering';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Upload, Eye } from 'lucide-react';
import Image from 'next/image';

// Enhanced form schema with better validation
const formSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: 'Item name must be at least 3 characters.',
    })
    .max(100, {
      message: 'Item name must be less than 100 characters.',
    }),
  description: z
    .string()
    .optional()
    .refine(
      val => {
        if (val && val.length > 500) {
          return false;
        }
        return true;
      },
      {
        message: 'Description must be less than 500 characters.',
      }
    ),
  price: z.coerce
    .number()
    .min(0.01, {
      message: 'Price must be greater than $0.00.',
    })
    .max(10000, {
      message: 'Price cannot exceed $10,000.',
    }),
  category: z.nativeEnum(CateringItemCategory, {
    message: 'Please select a valid category.',
  }),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  servingSize: z.string().optional(),
  imageUrl: z
    .string()
    .optional()
    .refine(
      val => {
        if (!val) return true;
        // Allow relative paths and full URLs
        return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
      },
      {
        message:
          'Image URL must be a valid path (starting with /) or full URL (starting with http:// or https://)',
      }
    ),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface CateringItemFormProps {
  item?: CateringItem;
  isEditing?: boolean;
}

export default function CateringItemForm({ item, isEditing = false }: CateringItemFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageUrl || null);

  // ... rest of component implementation would go here
  return (
    <div className="text-center py-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        Catering Item Management Disabled
      </h3>
      <p className="text-gray-600">
        Individual catering items are now managed through our Square integration. 
        This form has been temporarily disabled.
      </p>
    </div>
  );
}
*/

export default function CateringItemForm() {
  return (
    <div className="text-center py-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        Catering Item Management Disabled
      </h3>
      <p className="text-gray-600">
        Individual catering items are now managed through our Square integration. This form has been
        temporarily disabled.
      </p>
    </div>
  );
}
