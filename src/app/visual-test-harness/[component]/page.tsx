/**
 * Visual Test Harness
 *
 * This page renders UI components in isolation for visual regression testing.
 * Navigate to /visual-test-harness/{component}?variant=X&size=Y&state=Z
 *
 * Examples:
 * - /visual-test-harness/button?variant=default&size=default
 * - /visual-test-harness/button?variant=destructive&size=lg&state=disabled
 * - /visual-test-harness/input?state=error
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface PageProps {
  params: Promise<{
    component: string;
  }>;
  searchParams: Promise<{
    variant?: string;
    size?: string;
    state?: string;
  }>;
}

export default async function VisualTestHarnessPage({
  params,
  searchParams,
}: PageProps) {
  const { component } = await params;
  const { variant = 'default', size = 'default', state } = await searchParams;

  // Disable hover effects for visual testing
  const testingStyles = `
    * {
      animation: none !important;
      transition: none !important;
    }
  `;

  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: testingStyles }} />
      </head>
      <body className="p-8 bg-background">
        <div data-testid={`${component}-harness`} className="space-y-8">
          {renderComponent(component, variant, size, state)}
        </div>
      </body>
    </html>
  );
}

function renderComponent(
  component: string,
  variant: string,
  size: string,
  state: string | undefined
): React.ReactNode {
  const isDisabled = state === 'disabled';
  const isError = state === 'error';
  const isHover = state === 'hover';
  const isFocus = state === 'focus';

  switch (component) {
    case 'button':
      return (
        <div className="space-y-4" data-testid="button-showcase">
          <Button
            variant={variant as any}
            size={size as any}
            disabled={isDisabled}
            className={isHover ? 'hover:bg-primary/90' : ''}
            data-testid={`button-${variant}-${size}${isDisabled ? '-disabled' : ''}`}
          >
            {variant.charAt(0).toUpperCase() + variant.slice(1)} Button
          </Button>
        </div>
      );

    case 'input':
      return (
        <div className="space-y-4 max-w-md" data-testid="input-showcase">
          <div className="space-y-2">
            <Label htmlFor="test-input">Test Input</Label>
            <Input
              id="test-input"
              type="text"
              placeholder={isError ? 'Error state' : 'Enter text...'}
              disabled={isDisabled}
              className={isError ? 'border-destructive' : ''}
              data-testid={`input${isDisabled ? '-disabled' : ''}${isError ? '-error' : ''}`}
            />
            {isError && (
              <p className="text-sm text-destructive">This field has an error</p>
            )}
          </div>
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-4 max-w-md" data-testid="textarea-showcase">
          <div className="space-y-2">
            <Label htmlFor="test-textarea">Test Textarea</Label>
            <Textarea
              id="test-textarea"
              placeholder={isError ? 'Error state' : 'Enter text...'}
              disabled={isDisabled}
              className={isError ? 'border-destructive' : ''}
              data-testid={`textarea${isDisabled ? '-disabled' : ''}${isError ? '-error' : ''}`}
            />
            {isError && (
              <p className="text-sm text-destructive">This field has an error</p>
            )}
          </div>
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-4" data-testid="checkbox-showcase">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="test-checkbox"
              disabled={isDisabled}
              checked={state === 'checked'}
              data-testid={`checkbox${isDisabled ? '-disabled' : ''}${state === 'checked' ? '-checked' : ''}`}
            />
            <Label htmlFor="test-checkbox">
              Checkbox {state === 'checked' ? '(Checked)' : '(Unchecked)'}
            </Label>
          </div>
        </div>
      );

    case 'radio':
      return (
        <div className="space-y-4" data-testid="radio-showcase">
          <RadioGroup defaultValue={state === 'selected' ? 'option-1' : undefined} disabled={isDisabled}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option-1" id="option-1" data-testid="radio-option-1" />
              <Label htmlFor="option-1">Option 1</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option-2" id="option-2" data-testid="radio-option-2" />
              <Label htmlFor="option-2">Option 2</Label>
            </div>
          </RadioGroup>
        </div>
      );

    case 'switch':
      return (
        <div className="space-y-4" data-testid="switch-showcase">
          <div className="flex items-center space-x-2">
            <Switch
              id="test-switch"
              disabled={isDisabled}
              checked={state === 'checked'}
              data-testid={`switch${isDisabled ? '-disabled' : ''}${state === 'checked' ? '-checked' : ''}`}
            />
            <Label htmlFor="test-switch">
              Switch {state === 'checked' ? '(On)' : '(Off)'}
            </Label>
          </div>
        </div>
      );

    case 'alert':
      return (
        <div className="space-y-4 max-w-2xl" data-testid="alert-showcase">
          <Alert variant={variant as any} data-testid={`alert-${variant}`}>
            {variant === 'destructive' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertTitle>Alert Title</AlertTitle>
            <AlertDescription>
              This is an alert description with some example text to show the layout.
            </AlertDescription>
          </Alert>
        </div>
      );

    case 'badge':
      return (
        <div className="space-y-4" data-testid="badge-showcase">
          <Badge variant={variant as any} data-testid={`badge-${variant}`}>
            {variant.charAt(0).toUpperCase() + variant.slice(1)} Badge
          </Badge>
        </div>
      );

    case 'card':
      return (
        <div className="space-y-4 max-w-md" data-testid="card-showcase">
          <Card data-testid="card">
            {state !== 'no-header' && (
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
            )}
            <CardContent>
              <p>This is the card content area with some example text.</p>
            </CardContent>
            {state !== 'no-footer' && (
              <CardFooter>
                <Button>Action</Button>
              </CardFooter>
            )}
          </Card>
        </div>
      );

    case 'separator':
      return (
        <div className="space-y-4 max-w-md" data-testid="separator-showcase">
          <div>
            <p>Content above separator</p>
            <Separator
              orientation={state === 'vertical' ? 'vertical' : 'horizontal'}
              className={state === 'vertical' ? 'h-20' : ''}
              data-testid={`separator-${state === 'vertical' ? 'vertical' : 'horizontal'}`}
            />
            <p>Content below separator</p>
          </div>
        </div>
      );

    case 'loading-spinner':
      return (
        <div className="space-y-4" data-testid="loading-spinner-showcase">
          <LoadingSpinner
            size={size as any}
            data-testid={`loading-spinner-${size}`}
          />
        </div>
      );

    case 'error-display':
      return (
        <div className="space-y-4 max-w-md" data-testid="error-display-showcase">
          <ErrorDisplay
            title="Error"
            message="An error occurred while processing your request."
            returnLink={state === 'with-link' ? { href: '/', label: 'Return home' } : undefined}
          />
        </div>
      );

    case 'skeleton':
      return (
        <div className="space-y-4 max-w-md" data-testid="skeleton-showcase">
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" data-testid="skeleton-large" />
            <Skeleton className="h-8 w-3/4" data-testid="skeleton-medium" />
            <Skeleton className="h-4 w-1/2" data-testid="skeleton-small" />
          </div>
        </div>
      );

    default:
      return (
        <div data-testid="unknown-component">
          <p>Component &quot;{component}&quot; not found.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Available components: button, input, textarea, checkbox, radio, switch, alert, badge,
            card, separator, loading-spinner, error-display, skeleton
          </p>
        </div>
      );
  }
}
