# User-Triggered Square Sync Feature Plan

## Executive Summary

This plan creates a simplified, user-friendly Square sync feature that allows authorized users to trigger product synchronization on-demand through your existing admin dashboard. This builds on your current `ProductionSyncManager` while providing a seamless user experience optimized for Vercel's serverless environment.

## Feature Overview

### **What it provides:**
- **One-click sync button** in admin dashboard
- **Real-time progress tracking** with live updates
- **User-friendly status messages** instead of technical logs
- **Safe execution** with built-in safeguards
- **Mobile responsive** sync interface

### **Who can use it:**
- Admin users (`ADMIN` role)
- Manager users (`MANAGER` role) 
- Configurable permissions via your existing auth system

## Technical Architecture

### 1. **Frontend Components (React/TypeScript)**

```
src/components/admin/sync/
├── SyncTrigger.tsx          # Main sync button component
├── SyncProgress.tsx         # Real-time progress display
├── SyncStatus.tsx           # Status indicators and history
├── SyncResults.tsx          # Results summary modal
└── SyncSettings.tsx         # User-configurable options
```

### 2. **API Endpoints (Vercel Serverless)**

```
src/app/api/admin/sync/
├── trigger/route.ts         # Start sync operation
├── status/route.ts          # Get current sync status
├── history/route.ts         # Sync history for user
└── cancel/route.ts          # Cancel running sync
```

### 3. **Database Extensions**

```typescript
// Add to existing Prisma schema
model UserSyncLog {
  id          String      @id @default(uuid())
  userId      String      @db.Uuid
  syncId      String      @unique
  status      SyncStatus  
  startedBy   String      // User's name/email
  startTime   DateTime    @default(now())
  endTime     DateTime?
  progress    Int         @default(0) // 0-100 percentage
  message     String?     // User-friendly message
  results     Json?       // Summary for user
  errors      Json?       // User-friendly error messages
  
  user        Profile     @relation(fields: [userId], references: [id])
  
  @@map("user_sync_logs")
}
```

## Implementation Plan

### **Phase 1: Core Sync Interface (Week 1)**

#### 1.1 Admin Dashboard Integration
- Add sync section to existing admin layout
- Create main sync trigger component
- Implement basic progress tracking
- Add user permissions checking

#### 1.2 User-Friendly API Wrapper
```typescript
// src/lib/square/user-sync-manager.ts
export class UserSyncManager {
  private userId: string;
  private syncId: string;
  
  async startUserSync(options: UserSyncOptions): Promise<UserSyncResult>
  async getProgress(): Promise<SyncProgress>
  async cancelSync(): Promise<void>
  private async updateUserProgress(progress: SyncProgress): Promise<void>
}

interface UserSyncOptions {
  includeImages: boolean;
  batchSize: 'small' | 'medium' | 'large'; // User-friendly sizes
  notifyOnComplete: boolean;
}
```

#### 1.3 Real-time Progress Updates
```typescript
// Using React hooks for live updates
export function useSyncProgress(syncId: string) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await fetchSyncStatus(syncId);
      setProgress(status);
    }, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [syncId]);
  
  return progress;
}
```

### **Phase 2: Enhanced User Experience (Week 2)**

#### 2.1 Progressive UI Components
```tsx
// Example: Main sync trigger component
export function SyncTrigger() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncId, setSyncId] = useState<string | null>(null);
  
  const handleTriggerSync = async () => {
    setIsLoading(true);
    try {
      const result = await triggerUserSync({
        includeImages: true,
        batchSize: 'medium',
        notifyOnComplete: true
      });
      setSyncId(result.syncId);
    } catch (error) {
      showUserFriendlyError(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Synchronization</CardTitle>
        <CardDescription>
          Sync products from Square to update your catalog
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleTriggerSync}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Sync...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Products
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### 2.2 Real-time Progress Display
```tsx
export function SyncProgress({ syncId }: { syncId: string }) {
  const progress = useSyncProgress(syncId);
  
  if (!progress) return <SyncProgressSkeleton />;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync in Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress.percentage} className="w-full" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{progress.currentStep}</span>
          <span>{progress.percentage}% complete</span>
        </div>
        <div className="text-sm">
          <p>Products processed: {progress.processed} / {progress.total}</p>
          <p>Current: {progress.currentProduct}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### **Phase 3: Advanced Features (Week 3)**

#### 3.1 Sync History & Analytics
```tsx
export function SyncHistory() {
  const { data: history } = useSyncHistory();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Syncs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history?.map((sync) => (
            <div key={sync.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <p className="font-medium">{formatDate(sync.startTime)}</p>
                <p className="text-sm text-muted-foreground">
                  {sync.results?.productsProcessed} products processed
                </p>
              </div>
              <Badge variant={sync.status === 'completed' ? 'default' : 'destructive'}>
                {sync.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3.2 User-Configurable Settings
```tsx
export function SyncSettings() {
  const [settings, setSettings] = useState<UserSyncSettings>({
    batchSize: 'medium',
    includeImages: true,
    notifyOnComplete: true,
    autoRetry: true
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Settings</CardTitle>
        <CardDescription>
          Customize how product sync works for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="include-images">Include image updates</Label>
          <Switch
            id="include-images"
            checked={settings.includeImages}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, includeImages: checked }))
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label>Sync Speed</Label>
          <RadioGroup 
            value={settings.batchSize} 
            onValueChange={(value) => 
              setSettings(prev => ({ ...prev, batchSize: value as BatchSize }))
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="small" id="small" />
              <Label htmlFor="small">Slow & Careful (recommended)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="medium" />
              <Label htmlFor="medium">Normal Speed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="large" id="large" />
              <Label htmlFor="large">Fast (for large catalogs)</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
```

## API Implementation

### **User-Friendly API Routes**

#### 1. Trigger Sync Endpoint
```typescript
// src/app/api/admin/sync/trigger/route.ts
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser(request);
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse user options
    const body = await request.json();
    const options = validateUserSyncOptions(body);
    
    // 3. Check if sync already running
    const existingSync = await getActiveSyncForUser(user.id);
    if (existingSync) {
      return NextResponse.json({ 
        error: 'A sync is already running',
        syncId: existingSync.syncId 
      }, { status: 409 });
    }
    
    // 4. Start user sync
    const userSyncManager = new UserSyncManager(user.id);
    const result = await userSyncManager.startUserSync(options);
    
    return NextResponse.json({
      success: true,
      syncId: result.syncId,
      message: 'Sync started successfully',
      estimatedDuration: result.estimatedDuration
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to start sync',
      details: error.message
    }, { status: 500 });
  }
}
```

#### 2. Status Monitoring Endpoint
```typescript
// src/app/api/admin/sync/status/[syncId]/route.ts
export async function GET(
  request: Request, 
  { params }: { params: { syncId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const syncLog = await prisma.userSyncLog.findUnique({
      where: { 
        syncId: params.syncId,
        userId: user.id // Ensure user can only see their own syncs
      }
    });
    
    if (!syncLog) {
      return NextResponse.json({ error: 'Sync not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      status: syncLog.status,
      progress: syncLog.progress,
      message: syncLog.message,
      startTime: syncLog.startTime,
      endTime: syncLog.endTime,
      results: syncLog.results
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get sync status'
    }, { status: 500 });
  }
}
```

### **Serverless-Optimized Execution**

#### Background Processing Strategy
```typescript
// src/lib/square/user-sync-manager.ts
export class UserSyncManager {
  async startUserSync(options: UserSyncOptions): Promise<UserSyncResult> {
    const syncId = uuidv4();
    
    // 1. Create user sync log
    await this.createUserSyncLog(syncId, options);
    
    // 2. Start sync in background (non-blocking)
    this.executeUserSyncInBackground(syncId, options);
    
    // 3. Return immediately to user
    return {
      syncId,
      status: 'started',
      estimatedDuration: this.estimateDuration(options),
      message: 'Sync started successfully'
    };
  }
  
  private async executeUserSyncInBackground(
    syncId: string, 
    options: UserSyncOptions
  ): Promise<void> {
    try {
      // Update progress: Starting
      await this.updateProgress(syncId, {
        percentage: 0,
        message: 'Initializing sync...',
        currentStep: 'setup'
      });
      
      // Convert user options to production options
      const productionOptions = this.convertToProductionOptions(options);
      
      // Execute with progress tracking
      const productionManager = new ProductionSyncManager(productionOptions);
      
      // Custom progress callback for user updates
      productionManager.onProgress = (progress) => {
        this.updateProgress(syncId, {
          percentage: progress.percentage,
          message: this.createUserFriendlyMessage(progress),
          currentStep: progress.currentStep,
          processed: progress.processed,
          total: progress.total,
          currentProduct: progress.currentProduct
        });
      };
      
      const result = await productionManager.syncProducts();
      
      // Final success update
      await this.completeUserSync(syncId, result);
      
    } catch (error) {
      await this.failUserSync(syncId, error);
    }
  }
  
  private createUserFriendlyMessage(progress: any): string {
    switch (progress.currentStep) {
      case 'fetching':
        return 'Getting product data from Square...';
      case 'processing':
        return `Processing product: ${progress.currentProduct}`;
      case 'images':
        return 'Updating product images...';
      case 'completing':
        return 'Finishing up...';
      default:
        return 'Working on your products...';
    }
  }
}
```

## User Experience Features

### **1. Smart Notifications**
```typescript
// In-app notifications for sync completion
export function useSyncNotifications() {
  const { toast } = useToast();
  
  useEffect(() => {
    // Check for completed syncs
    const checkCompletedSyncs = async () => {
      const completed = await getCompletedSyncsForUser();
      
      completed.forEach(sync => {
        if (sync.status === 'completed') {
          toast({
            title: "Sync Completed! 🎉",
            description: `${sync.results.productsProcessed} products updated successfully`,
            action: <ToastAction altText="View Details">View Details</ToastAction>
          });
        } else if (sync.status === 'failed') {
          toast({
            title: "Sync Failed",
            description: sync.message || "Something went wrong",
            variant: "destructive"
          });
        }
      });
    };
    
    checkCompletedSyncs();
  }, []);
}
```

### **2. Intelligent Error Handling**
```typescript
// User-friendly error messages
export function handleSyncError(error: SyncError): UserFriendlyError {
  switch (error.type) {
    case 'SQUARE_API_ERROR':
      return {
        title: 'Connection Issue',
        message: 'Having trouble connecting to Square. Please try again in a few minutes.',
        action: 'retry'
      };
    
    case 'DATABASE_ERROR':
      return {
        title: 'Database Busy',
        message: 'Our database is currently busy. Your sync will retry automatically.',
        action: 'wait'
      };
    
    case 'TIMEOUT_ERROR':
      return {
        title: 'Sync Taking Longer Than Expected',
        message: 'Your sync is taking longer than usual but will continue running.',
        action: 'continue'
      };
      
    default:
      return {
        title: 'Sync Issue',
        message: 'Something unexpected happened. Our team has been notified.',
        action: 'contact_support'
      };
  }
}
```

### **3. Mobile-Optimized Interface**
```tsx
// Responsive sync interface
export function MobileSyncInterface() {
  const [activeTab, setActiveTab] = useState('trigger');
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trigger">Sync</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trigger" className="space-y-4">
            <SyncTrigger />
            <SyncSettings />
          </TabsContent>
          
          <TabsContent value="status" className="space-y-4">
            <CurrentSyncStatus />
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <SyncHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

## Security & Permissions

### **Role-Based Access Control**
```typescript
// Integrate with existing auth system
export function hasAdminAccess(user: User): boolean {
  return user.role === 'ADMIN' || user.role === 'MANAGER';
}

export function canTriggerSync(user: User): boolean {
  // Additional checks for sync permissions
  return hasAdminAccess(user) && 
         user.permissions?.includes('SYNC_PRODUCTS') &&
         !user.account?.suspended;
}

// Middleware for sync endpoints
export async function validateSyncAccess(request: Request): Promise<User | null> {
  const user = await getCurrentUser(request);
  
  if (!user || !canTriggerSync(user)) {
    throw new Error('Insufficient permissions for product sync');
  }
  
  return user;
}
```

### **Rate Limiting for Users**
```typescript
// Prevent users from spamming sync requests
export class UserSyncRateLimit {
  private static readonly MAX_SYNCS_PER_HOUR = 3;
  private static readonly COOLDOWN_MINUTES = 10;
  
  static async checkUserLimit(userId: string): Promise<boolean> {
    const recentSyncs = await prisma.userSyncLog.count({
      where: {
        userId,
        startTime: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });
    
    return recentSyncs < this.MAX_SYNCS_PER_HOUR;
  }
  
  static async getNextAllowedTime(userId: string): Promise<Date | null> {
    const lastSync = await prisma.userSyncLog.findFirst({
      where: { userId },
      orderBy: { startTime: 'desc' }
    });
    
    if (!lastSync) return null;
    
    const nextAllowed = new Date(
      lastSync.startTime.getTime() + this.COOLDOWN_MINUTES * 60 * 1000
    );
    
    return nextAllowed > new Date() ? nextAllowed : null;
  }
}
```

## Integration with Existing Dashboard

### **Admin Layout Integration**
```tsx
// Add to existing admin layout
// src/app/admin/sync/page.tsx
import { SyncDashboard } from '@/components/admin/sync/SyncDashboard';

export default function AdminSyncPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Product Sync</h1>
          <p className="text-muted-foreground">
            Manage product synchronization with Square
          </p>
        </div>
      </div>
      
      <SyncDashboard />
    </div>
  );
}

// Update admin navigation
const adminNavigation = [
  // ... existing items
  {
    name: 'Product Sync',
    href: '/admin/sync',
    icon: RefreshCw,
    description: 'Sync products with Square'
  }
];
```

## Testing Strategy

### **Component Testing**
```typescript
// Test user interactions
describe('SyncTrigger Component', () => {
  test('shows loading state when sync starts', async () => {
    render(<SyncTrigger />);
    
    const syncButton = screen.getByRole('button', { name: /sync products/i });
    fireEvent.click(syncButton);
    
    expect(screen.getByText(/starting sync/i)).toBeInTheDocument();
  });
  
  test('displays error message on sync failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Network error'));
    
    render(<SyncTrigger />);
    
    const syncButton = screen.getByRole('button', { name: /sync products/i });
    fireEvent.click(syncButton);
    
    await waitFor(() => {
      expect(screen.getByText(/connection issue/i)).toBeInTheDocument();
    });
  });
});
```

### **E2E Testing**
```typescript
// Test complete user flow
test('user can trigger and monitor sync', async ({ page }) => {
  // Login as admin
  await page.goto('/admin/login');
  await page.fill('[data-testid=email]', 'admin@destino-sf.com');
  await page.click('[data-testid=login-button]');
  
  // Navigate to sync page
  await page.goto('/admin/sync');
  
  // Trigger sync
  await page.click('[data-testid=sync-trigger]');
  
  // Wait for progress to appear
  await expect(page.locator('[data-testid=sync-progress]')).toBeVisible();
  
  // Verify completion
  await expect(page.locator('[data-testid=sync-success]')).toBeVisible({
    timeout: 60000 // Allow up to 1 minute for sync
  });
});
```

## Deployment Checklist

### **Pre-Deployment**
- [ ] Database migration for UserSyncLog table
- [ ] Environment variables configured
- [ ] User permissions properly set
- [ ] Rate limiting configured
- [ ] Mobile UI tested
- [ ] Error handling verified

### **Post-Deployment**
- [ ] Test sync trigger for admin users
- [ ] Verify progress tracking works
- [ ] Check mobile responsiveness
- [ ] Monitor for any errors
- [ ] Validate user permissions

## Future Enhancements

### **Phase 4 Possibilities:**
1. **Scheduled User Syncs**: Allow users to schedule recurring syncs
2. **Sync Templates**: Pre-configured sync options for different scenarios
3. **Team Collaboration**: Multiple admin users working on syncs
4. **Advanced Analytics**: Detailed sync performance metrics
5. **Sync Previews**: Show what will change before actually syncing

This user-triggered sync feature provides a perfect balance of power and simplicity, allowing your admin users to confidently manage product synchronization while leveraging your existing robust sync infrastructure.