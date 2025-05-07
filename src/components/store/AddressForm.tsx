import React from 'react';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddressFormProps {
  form: UseFormReturn<any>;
  prefix: string;
  title: string;
  onAddressChange?: () => void;
}

export const AddressForm: React.FC<AddressFormProps> = ({ form, prefix, title, onAddressChange }) => {
  const { register, formState: { errors } } = form;
  
  // Get nested error
  const getError = (field: string): string => {
    const nestedErrors = errors[prefix] as Record<string, any> | undefined;
    if (nestedErrors && nestedErrors[field] && 'message' in nestedErrors[field]) {
      return nestedErrors[field].message as string;
    }
    return '';
  };

  // Handle input change and trigger callback if provided
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onAddressChange) {
      // Call the callback after a small delay to ensure form values are updated
      setTimeout(onAddressChange, 100);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">{title}</h3>
      <Separator />
      
      <div>
        <Label htmlFor={`${prefix}.street`}>Street Address</Label>
        <Input
          id={`${prefix}.street`}
          {...register(`${prefix}.street`)}
          onChange={(e) => {
            register(`${prefix}.street`).onChange(e);
            handleInputChange(e);
          }}
          className={getError('street') ? 'border-red-500' : ''}
        />
        {getError('street') && (
          <p className="mt-1 text-sm text-red-500">{getError('street')}</p>
        )}
      </div>

      <div>
        <Label htmlFor={`${prefix}.street2`}>Apartment, suite, etc. (optional)</Label>
        <Input
          id={`${prefix}.street2`}
          {...register(`${prefix}.street2`)}
          onChange={(e) => {
            register(`${prefix}.street2`).onChange(e);
            handleInputChange(e);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}.city`}>City</Label>
          <Input
            id={`${prefix}.city`}
            {...register(`${prefix}.city`)}
            onChange={(e) => {
              register(`${prefix}.city`).onChange(e);
              handleInputChange(e);
            }}
            className={getError('city') ? 'border-red-500' : ''}
          />
          {getError('city') && (
            <p className="mt-1 text-sm text-red-500">{getError('city')}</p>
          )}
        </div>

        <div>
          <Label htmlFor={`${prefix}.state`}>State</Label>
          <Input
            id={`${prefix}.state`}
            {...register(`${prefix}.state`)}
            onChange={(e) => {
              register(`${prefix}.state`).onChange(e);
              handleInputChange(e);
            }}
            className={getError('state') ? 'border-red-500' : ''}
          />
          {getError('state') && (
            <p className="mt-1 text-sm text-red-500">{getError('state')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}.postalCode`}>Postal Code</Label>
          <Input
            id={`${prefix}.postalCode`}
            {...register(`${prefix}.postalCode`)}
            onChange={(e) => {
              register(`${prefix}.postalCode`).onChange(e);
              handleInputChange(e);
            }}
            className={getError('postalCode') ? 'border-red-500' : ''}
          />
          {getError('postalCode') && (
            <p className="mt-1 text-sm text-red-500">{getError('postalCode')}</p>
          )}
        </div>
      </div>
    </div>
  );
}; 