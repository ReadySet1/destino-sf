/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountProfile } from '@/components/Store/AccountProfile';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@prisma/client';

// Add jest-dom matchers
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/utils/supabase/client');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Phone: () => <div data-testid="phone-icon">Phone</div>,
  User: () => <div data-testid="user-icon">User</div>,
  LogOut: () => <div data-testid="logout-icon">LogOut</div>,
  Save: () => <div data-testid="save-icon">Save</div>,
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
};

const mockSupabaseUpdate = {
  update: jest.fn(),
  eq: jest.fn(),
};

// Test data
const mockUser: User = {
  id: '1a35fe1c-1cf1-44f7-83c7-a052ff4d4463',
  email: 'emmanuel@alanis.dev',
  created_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  confirmation_sent_at: '2024-01-01T00:00:00.000Z',
  confirmed_at: '2024-01-01T00:00:00.000Z',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  role: 'authenticated',
  updated_at: '2024-01-01T00:00:00.000Z',
};

const mockProfile: Profile = {
  id: '1a35fe1c-1cf1-44f7-83c7-a052ff4d4463',
  email: 'emmanuel@alanis.dev',
  name: 'Emmanuel Alanis',
  phone: '+1-415-123-4567',
  role: 'ADMIN',
  created_at: new Date('2024-01-01T00:00:00.000Z'),
  updated_at: new Date('2024-01-01T00:00:00.000Z'),
};

const mockOnSignOut = jest.fn();

describe('AccountProfile Component', () => {
  beforeEach(() => {
    cleanup();
    jest.clearAllMocks();

    // Setup Supabase client mock
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Setup Supabase query chain mock
    mockSupabaseClient.from.mockReturnValue({
      update: mockSupabaseUpdate.update,
    });
    
    mockSupabaseUpdate.update.mockReturnValue({
      eq: mockSupabaseUpdate.eq,
    });
    
    (mockSupabaseUpdate.eq as jest.Mock).mockResolvedValue({ error: null });
  });

  describe('Component Rendering', () => {
    it('should render user profile information correctly', () => {
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Check header
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Manage your account details and preferences')).toBeInTheDocument();
      
      // Check email display
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('emmanuel@alanis.dev')).toBeInTheDocument();
      expect(screen.getByText('Your email address is verified and cannot be changed here.')).toBeInTheDocument();
      
      // Check form fields
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      
      // Check buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should display profile data in form fields', () => {
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      const nameInput = screen.getByDisplayValue('Emmanuel Alanis');
      const phoneInput = screen.getByDisplayValue('+1-415-123-4567');

      expect(nameInput).toBeInTheDocument();
      expect(phoneInput).toBeInTheDocument();
    });

    it('should show loading state when user is null', () => {
      render(
        <AccountProfile 
          user={null} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('should handle empty profile data', () => {
      const emptyProfile: Profile = {
        ...mockProfile,
        name: null,
        phone: null,
      };

      render(
        <AccountProfile 
          user={mockUser} 
          profile={emptyProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
      const phoneInput = screen.getByLabelText('Phone Number') as HTMLInputElement;

      expect(nameInput.value).toBe('');
      expect(phoneInput.value).toBe('');
    });
  });

  describe('Form Interaction', () => {
    it('should enable save button when form data changes', async () => {
      const user = userEvent.setup();
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Emmanuel Updated');

      expect(saveButton).not.toBeDisabled();
    });

    it('should call onSignOut when sign out button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      expect(mockOnSignOut).toHaveBeenCalledTimes(1);
    });

    it('should validate required name field', async () => {
      const user = userEvent.setup();
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
      });
    });
  });

  describe('Profile Update Functionality', () => {
    it('should successfully update profile when form is submitted', async () => {
      const user = userEvent.setup();
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Update form fields
      const nameInput = screen.getByLabelText('Full Name');
      const phoneInput = screen.getByLabelText('Phone Number');
      
      await user.clear(nameInput);
      await user.type(nameInput, 'Emmanuel Updated');
      await user.clear(phoneInput);
      await user.type(phoneInput, '+1-415-999-8888');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify Supabase call
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
        expect(mockSupabaseUpdate.update).toHaveBeenCalledWith({
          name: 'Emmanuel Updated',
          phone: '+1-415-999-8888',
          updated_at: expect.any(String),
        });
        expect(mockSupabaseUpdate.eq).toHaveBeenCalledWith('id', mockUser.id);
      });

      // Verify success toast
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    });

    it('should handle null/empty values in profile update', async () => {
      const user = userEvent.setup();
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Clear form fields
      const nameInput = screen.getByLabelText('Full Name');
      const phoneInput = screen.getByLabelText('Phone Number');
      
      await user.clear(nameInput);
      await user.clear(phoneInput);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify Supabase call with null values
      await waitFor(() => {
        expect(mockSupabaseUpdate.update).toHaveBeenCalledWith({
          name: null,
          phone: null,
          updated_at: expect.any(String),
        });
      });
    });

    it('should show loading state during profile update', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      mockSupabaseUpdate.eq.mockReturnValue(updatePromise);

      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Update form and submit
      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Emmanuel Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      // Resolve the promise
      resolveUpdate!({ error: null });
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle permission denied error (42501)', async () => {
      const user = userEvent.setup();
      
      // Mock permission denied error
      mockSupabaseUpdate.eq.mockResolvedValue({
        error: {
          code: '42501',
          message: 'permission denied for schema public',
          details: null,
          hint: null,
        },
      });

      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Update form and submit
      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Emmanuel Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Permission denied. You might not be allowed to update this profile.');
      });
    });

    it('should handle general database errors', async () => {
      const user = userEvent.setup();
      
      // Mock general error
      mockSupabaseUpdate.eq.mockResolvedValue({
        error: {
          code: 'PGRST000',
          message: 'Database connection failed',
          details: null,
          hint: null,
        },
      });

      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Update form and submit
      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Emmanuel Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update profile: Database connection failed');
      });
    });

    it('should handle errors with undefined message', async () => {
      const user = userEvent.setup();
      
      // Mock error with undefined message
      mockSupabaseUpdate.eq.mockResolvedValue({
        error: {
          code: 'UNKNOWN',
          message: undefined,
          details: null,
          hint: null,
        },
      });

      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Update form and submit
      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Emmanuel Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify error handling with fallback message
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update profile: Unknown error');
      });
    });

    it('should handle missing user error', async () => {
      const user = userEvent.setup();
      render(
        <AccountProfile 
          user={null} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Should show loading state and not be able to submit
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should prevent submission when user is missing', async () => {
      const user = userEvent.setup();
      
      // Start with user, then set to null to simulate sign out
      const { rerender } = render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Update form first
      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Emmanuel Updated');

      // Simulate user sign out
      rerender(
        <AccountProfile 
          user={null} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Should show loading state
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });
  });

  describe('Enhanced Error Logging', () => {
    it('should log detailed error information', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockError = {
        code: '42501',
        message: 'permission denied for schema public',
        details: 'Access denied to public schema',
        hint: 'Grant USAGE permission',
      };

      mockSupabaseUpdate.eq.mockResolvedValue({ error: mockError });

      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Update form and submit
      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Emmanuel Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify detailed error logging
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Supabase error details:', mockError);
        expect(consoleSpy).toHaveBeenCalledWith('Error code:', '42501');
        expect(consoleSpy).toHaveBeenCalledWith('Error message:', 'permission denied for schema public');
        expect(consoleSpy).toHaveBeenCalledWith('Error details:', 'Access denied to public schema');
        expect(consoleSpy).toHaveBeenCalledWith('Error hint:', 'Grant USAGE permission');
        expect(consoleSpy).toHaveBeenCalledWith('Full error object:', JSON.stringify(mockError, null, 2));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and accessibility attributes', () => {
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      // Check form labels
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();

      // Check button accessibility
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      const signOutButton = screen.getByRole('button', { name: /sign out/i });

      expect(saveButton).toBeInTheDocument();
      expect(signOutButton).toBeInTheDocument();

      // Check input types
      const phoneInput = screen.getByLabelText('Phone Number');
      expect(phoneInput).toHaveAttribute('type', 'tel');
    });

    it('should show validation errors with proper styling', async () => {
      const user = userEvent.setup();
      render(
        <AccountProfile 
          user={mockUser} 
          profile={mockProfile} 
          onSignOut={mockOnSignOut} 
        />
      );

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.tab();

      await waitFor(() => {
        const errorMessage = screen.getByText('Name cannot be empty');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-xs', 'text-red-500');
      });
    });
  });
}); 