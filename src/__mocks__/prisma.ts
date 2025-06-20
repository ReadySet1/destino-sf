import { jest } from '@jest/globals';
import { createMockPrismaClient } from '../__tests__/setup/database-mocks';

// Use the improved mock client configuration
export const mockPrismaClient = createMockPrismaClient();

export const prisma = mockPrismaClient; 