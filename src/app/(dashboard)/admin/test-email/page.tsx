'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'SQUARE' | 'CASH'>('SQUARE');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, paymentMethod }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, error: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setResult({ success: false, error: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Test Email Functionality</CardTitle>
          <CardDescription>
            Send a test order confirmation email using Resend API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recipient@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as 'SQUARE' | 'CASH')}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SQUARE" id="payment-square" />
                  <Label htmlFor="payment-square">Square</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CASH" id="payment-cash" />
                  <Label htmlFor="payment-cash">Cash</Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Test Email'}
            </Button>

            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'} className="mt-4">
                {result.success ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <AlertCircleIcon className="h-4 w-4" />
                )}
                <AlertTitle>{result.success ? 'Success' : 'Error'}</AlertTitle>
                <AlertDescription>
                  {result.success ? result.message : result.error}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between text-xs text-muted-foreground">
          <p>Note: This page is only available in development mode.</p>
        </CardFooter>
      </Card>
    </div>
  );
} 