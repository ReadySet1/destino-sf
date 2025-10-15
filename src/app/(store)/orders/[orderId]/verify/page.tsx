'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { use } from 'react';

export default function VerifyOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsVerifying(true);

    // Simply redirect with email as query parameter
    // The order details page will verify the email matches the order
    router.push(`/orders/${resolvedParams.orderId}?email=${encodeURIComponent(email)}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-xl">
        <CardHeader className="space-y-1 bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-orange/20">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-gradient-to-br from-destino-orange to-amber-600 p-4 shadow-lg">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-destino-charcoal">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-center">
            Enter the email address used for this order
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <Alert className="border-destino-yellow/40 bg-destino-cream/30">
              <Mail className="h-4 w-4 text-destino-orange" />
              <AlertDescription className="text-destino-charcoal">
                For security, please verify your email address to view order details.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="border-destino-yellow/40 focus:border-destino-orange focus:ring-destino-orange/20"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-50/80">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-destino-yellow to-yellow-400 hover:from-yellow-400 hover:to-destino-yellow text-destino-charcoal shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={isVerifying}
            >
              {isVerifying ? (
                'Verifying...'
              ) : (
                <>
                  View Order Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <p>Order #{resolvedParams.orderId.slice(-8)}</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
