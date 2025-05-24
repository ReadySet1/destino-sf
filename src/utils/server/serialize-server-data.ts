'use server';

import { serializeObject } from '../serialization';
import { decimalToNumber, isDecimal } from './prisma-decimal';

/**
 * Server-side function to prepare data for client components
 * This ensures all Prisma-specific types like Decimal are properly serialized
 * before being passed to client components
 */
export async function serializeServerData<T>(data: T): Promise<T> {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  return serializeObject(data as Record<string, any>) as T;
}

/**
 * Convert any Prisma Decimal values to numbers on the server
 * before passing to client components
 */
export async function preparePrismaData<T extends Record<string, any>>(data: T): Promise<T> {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Handle Decimals in arrays
  if (Array.isArray(data)) {
    return Promise.all(data.map(async (item) =>
      typeof item === 'object' && item !== null ? await preparePrismaData(item) : item
    )) as unknown as T;
  }
  
  // Create a new object to hold the serialized data
  const result = {} as Record<string, any>;
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value;
      continue;
    }
    
    if (isDecimal(value)) {
      result[key] = decimalToNumber(value) ?? 0;
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        result[key] = await Promise.all(value.map(async (item) =>
          typeof item === 'object' && item !== null ? await preparePrismaData(item) : item
        ));
      } else if (value instanceof Date) {
        result[key] = value; // Keep Date objects as is
      } else {
        result[key] = await preparePrismaData(value as Record<string, any>);
      }
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
} 