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
}

export const AddressForm: React.FC<AddressFormProps> = ({ form, prefix, title }) => {
  const { register, formState: { errors } } = form;
  
  // Get nested error
  const getError = (field: string): string => {
    const nestedErrors = errors[prefix] as Record<string, any> | undefined;
    if (nestedErrors && nestedErrors[field] && 'message' in nestedErrors[field]) {
      return nestedErrors[field].message as string;
    }
    return '';
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
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}.city`}>City</Label>
          <Input
            id={`${prefix}.city`}
            {...register(`${prefix}.city`)}
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
            className={getError('postalCode') ? 'border-red-500' : ''}
          />
          {getError('postalCode') && (
            <p className="mt-1 text-sm text-red-500">{getError('postalCode')}</p>
          )}
        </div>

        <div>
          <Label htmlFor={`${prefix}.country`}>Country</Label>
          <Input
            id={`${prefix}.country`}
            defaultValue="US"
            {...register(`${prefix}.country`)}
            className={getError('country') ? 'border-red-500' : ''}
          />
          {getError('country') && (
            <p className="mt-1 text-sm text-red-500">{getError('country')}</p>
          )}
        </div>
      </div>
    </div>
  );
}; 