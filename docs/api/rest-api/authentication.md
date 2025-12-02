# Authentication API

## Overview

The Authentication API provides secure user registration, login, and session management for Destino SF customers and administrators.

## Authentication Endpoints

### User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1-555-0123"
}
```

**Response:**

```typescript
interface RegisterResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'customer' | 'admin';
  };
  accessToken: string;
  refreshToken: string;
}
```

### User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "securePassword123"
}
```

### Token Refresh

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Password Reset Request

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "customer@example.com"
}
```

### Password Reset Confirmation

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword123"
}
```

## JWT Token Structure

### Access Token Payload

```typescript
interface AccessTokenPayload {
  userId: string;
  email: string;
  role: 'customer' | 'admin' | 'staff';
  iat: number; // Issued at
  exp: number; // Expires at (1 hour)
}
```

### Refresh Token Payload

```typescript
interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number; // Issued at
  exp: number; // Expires at (30 days)
}
```

## Security Features

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security

- Access tokens expire in 1 hour
- Refresh tokens expire in 30 days
- Secure HTTP-only cookies for refresh tokens
- Automatic token rotation on refresh

### Rate Limiting

- Login attempts: 5 per minute per IP
- Registration: 3 per minute per IP
- Password reset: 1 per 5 minutes per email

## Error Responses

### Common Error Codes

```typescript
enum AuthErrorCodes {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
  RESET_TOKEN_INVALID = 'RESET_TOKEN_INVALID',
}
```

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "The email or password you entered is incorrect"
  }
}
```

## Integration Examples

### React Hook Usage

```typescript
import { useAuth } from '@/hooks/useAuth';

export const LoginForm: React.FC = () => {
  const { login, loading, error } = useAuth();

  const handleSubmit = async (data: LoginData) => {
    try {
      await login(data.email, data.password);
      // Redirect to dashboard
    } catch (error) {
      // Handle login error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Login form fields */}
    </form>
  );
};
```

### API Client Configuration

```typescript
// Configure axios interceptors for automatic token handling
apiClient.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        await refreshToken();
        // Retry original request
        return apiClient.request(error.config);
      } catch (refreshError) {
        // Redirect to login
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  }
);
```

## Admin Authentication

### Admin Login

```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@destinosf.com",
  "password": "adminPassword123",
  "role": "admin"
}
```

### Role-Based Permissions

```typescript
enum AdminRoles {
  SUPER_ADMIN = 'super_admin', // Full system access
  ADMIN = 'admin', // Order and product management
  STAFF = 'staff', // Order fulfillment only
  VIEWER = 'viewer', // Read-only access
}
```

### Protected Route Middleware

```typescript
export const requireAuth = (requiredRole?: AdminRoles) => {
  return async (req: NextApiRequest, res: NextApiResponse, next: NextFunction) => {
    try {
      const token = extractTokenFromHeader(req);
      const payload = verifyAccessToken(token);

      if (requiredRole && !hasPermission(payload.role, requiredRole)) {
        return res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS' },
        });
      }

      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN' },
      });
    }
  };
};
```
