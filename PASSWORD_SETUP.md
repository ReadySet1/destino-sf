# Password Setup Functionality

This document explains how the secure password setup functionality works for users created by administrators.

## Overview

When administrators create new users through the admin interface, users receive an invitation email that allows them to set up a secure password for their account. This ensures that:

1. Users have control over their own passwords
2. Passwords meet security requirements
3. The invitation process is secure and time-limited

## How It Works

### 1. Admin Creates User
- Admin goes to `/admin/users` and creates a new user
- System creates the user in Supabase Auth and sends an invitation email
- User profile is created in the database

### 2. User Receives Invitation
- User receives an email with a secure invitation link
- Link redirects to `/setup-password` page
- Link includes authentication tokens for security

### 3. User Sets Password
- User fills out the password setup form with:
  - New password (with strength requirements)
  - Password confirmation
- Real-time password strength indicator helps create secure passwords
- Form validates password requirements before submission

### 4. Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character

### 5. Completion
- Password is securely set in Supabase Auth
- User is redirected to sign-in page
- User can now sign in with their email and password

## Admin Features

### Send Password Setup Invitation
- Admins can resend password setup invitations from the users table
- Click "Send Password Setup" button for any user
- Useful if original invitation expires or gets lost

### User Management
- View all users in the admin interface
- Edit user details
- Delete users (removes from both Auth and database)
- Send password setup invitations

## Technical Implementation

### Components
- `/setup-password` - Password setup page
- `PasswordStrengthIndicator` - Real-time password validation
- `setupPasswordAction` - Server action for password setup
- `resendPasswordSetupAction` - Server action for resending invitations

### Security Features
- Time-limited invitation tokens
- Server-side password validation
- Secure redirect handling
- Protection against email prefetching attacks

### Environment Variables Required
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Supabase Configuration

### Email Templates
Configure the "Invite user" email template in your Supabase dashboard:
- Go to Authentication > Email Templates
- Edit the "Invite user" template
- Use `{{ .ConfirmationURL }}` for the invitation link

### SMTP Settings
Configure SMTP settings in Supabase for email delivery:
- Go to Authentication > Settings
- Configure your SMTP provider
- Test email delivery

## Testing

### Test Page
Visit `/setup-password/test` for testing instructions and links.

### Manual Testing
1. Create a test user in admin interface
2. Check email for invitation
3. Click invitation link
4. Set up password
5. Sign in with new credentials

## Troubleshooting

### Common Issues
1. **Email not received**: Check SMTP configuration and spam folder
2. **Invalid token**: Invitation may have expired, resend invitation
3. **Redirect issues**: Verify NEXT_PUBLIC_SITE_URL is set correctly
4. **Password validation**: Ensure password meets all requirements

### Logs
Check server logs for detailed error messages:
- User creation process
- Email sending
- Password setup process
- Authentication flow

## Security Considerations

1. **Invitation Expiry**: Supabase handles token expiration automatically
2. **Password Strength**: Enforced both client-side and server-side
3. **Secure Redirects**: Only allowed redirect URLs are accepted
4. **Email Security**: Protection against email prefetching attacks
5. **Session Management**: Proper session handling throughout the flow 