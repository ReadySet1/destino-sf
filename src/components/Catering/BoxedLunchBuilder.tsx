'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  Plus, 
  ShoppingCart, 
  Utensils, 
  Users, 
  Loader2, 
  AlertCircle,
  Star
} from 'lucide-react';
import Image from 'next/image';
import {
  BoxedLunchEntree,
  BoxedLunchTierWithEntrees,
  BuildYourOwnBoxCartItem,
  BoxedLunchTierModel
} from '@/types/catering';
import { useCateringCartStore } from '@/store/catering-cart';
import { toast } from '@/lib/toast';

interface BoxedLunchBuilderProps {
  onClose?: () => void;
}

interface BuildYourOwnBoxResponse {
  success: boolean;
  tiers: BoxedLunchTierWithEntrees[];
  entrees: BoxedLunchEntree[];
  mode: 'build-your-own';
  error?: string;
}

export const BoxedLunchBuilder: React.FC<BoxedLunchBuilderProps> = ({ onClose }) => {
  const [selectedTier, setSelectedTier] = useState<BoxedLunchTierWithEntrees | null>(null);
  const [selectedEntree, setSelectedEntree] = useState<BoxedLunchEntree | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [nameLabel, setNameLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<BuildYourOwnBoxResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { addItem } = useCateringCartStore();

  // Fetch Build Your Own Box data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/catering/boxed-lunches?mode=build-your-own');
        const result: BuildYourOwnBoxResponse = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch Build Your Own Box data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        toast.error('Failed to load Build Your Own Box options');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddToCart = () => {
    if (!selectedTier || !selectedEntree) {
      toast.error('Please select a tier and entree');
      return;
    }

    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const cartItem: BuildYourOwnBoxCartItem = {
      id: `boxed-lunch-${selectedTier.tier}-${selectedEntree.id}-${Date.now()}`,
      type: 'BUILD_YOUR_OWN_BOX',
      tierConfig: {
        id: '',
        tierNumber: parseInt(selectedTier.tier.replace('TIER_', '')),
        name: selectedTier.name,
        priceCents: selectedTier.price * 100,
        proteinAmount: selectedTier.proteinAmount,
        sides: selectedTier.sides,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      selectedEntree,
      quantity,
      unitPrice: selectedTier.price,
      totalPrice: selectedTier.price * quantity,
      customizations: {
        notes: notes || undefined,
        nameLabel: nameLabel || undefined,
      },
    };

    // Add to cart using the existing cart store
    addItem({
      id: cartItem.id,
      name: `${selectedTier.name} - ${selectedEntree.name}`,
      price: selectedTier.price,
      quantity,
      image: selectedEntree.imageUrl || undefined,
      variantId: JSON.stringify({
        type: 'build-your-own-box',
        tierId: selectedTier.tier,
        tierName: selectedTier.name,
        entreeId: selectedEntree.id,
        entreeName: selectedEntree.name,
        nameLabel: nameLabel || undefined,
        notes: notes || undefined,
      }),
      category: 'BUILD_YOUR_OWN_BOX',
      customizations: cartItem.customizations,
    });

    toast.success(`Added ${quantity}x ${selectedTier.name} with ${selectedEntree.name} to cart!`);
    
    // Reset form
    setSelectedEntree(null);
    setQuantity(1);
    setNameLabel('');
    setNotes('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Build Your Own Box options...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to Load Options</h3>
        <p className="text-gray-600 text-center mb-4">
          {error || 'Please try again later or contact support.'}
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const { tiers, entrees } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Build Your Own Boxed Lunch
        </h2>
        <p className="text-gray-600">
          Choose your tier, select your entree, and customize your meal
        </p>
      </div>

      {/* Step 1: Select Tier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Step 1: Choose Your Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <motion.div
                key={tier.tier}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedTier?.tier === tier.tier
                      ? 'ring-2 ring-orange-500 border-orange-500'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedTier(tier)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{tier.name}</h3>
                      <div className="text-right">
                        <div className="text-xl font-bold text-orange-600">
                          ${tier.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>• {tier.proteinAmount} protein</p>
                      {tier.sides.map((side, index) => (
                        <p key={index}>• {side}</p>
                      ))}
                    </div>
                    {selectedTier?.tier === tier.tier && (
                      <div className="mt-3 flex items-center text-orange-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Select Entree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Step 2: Choose Your Entree
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTier ? (
            <div className="text-center py-8 text-gray-500">
              Please select a tier first
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {entrees.map((entree) => (
                <motion.div
                  key={entree.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all ${
                      selectedEntree?.id === entree.id
                        ? 'ring-2 ring-orange-500 border-orange-500'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedEntree(entree)}
                  >
                    <CardContent className="p-4">
                      {entree.imageUrl && (
                        <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                          <Image
                            src={entree.imageUrl}
                            alt={entree.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <h4 className="font-semibold text-sm mb-2">{entree.name}</h4>
                      {entree.description && (
                        <p className="text-xs text-gray-600 mb-2">{entree.description}</p>
                      )}
                      {entree.dietaryPreferences.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {entree.dietaryPreferences.map((pref) => (
                            <Badge key={pref} variant="secondary" className="text-xs">
                              {pref}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {selectedEntree?.id === entree.id && (
                        <div className="flex items-center text-orange-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Selected</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Customize Order */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Step 3: Customize Your Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTier || !selectedEntree ? (
            <div className="text-center py-8 text-gray-500">
              Please select a tier and entree first
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nameLabel">Name Label (Optional)</Label>
                  <Input
                    id="nameLabel"
                    placeholder="For individual packaging"
                    value={nameLabel}
                    onChange={(e) => setNameLabel(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Special Instructions (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requests or dietary needs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary & Add to Cart */}
      {selectedTier && selectedEntree && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Order Summary
                </h3>
                <p className="text-sm text-gray-600">
                  {quantity}x {selectedTier.name} - {selectedEntree.name}
                </p>
                {nameLabel && (
                  <p className="text-sm text-gray-600">
                    Label: {nameLabel}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">
                  ${(selectedTier.price * quantity).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  ${selectedTier.price.toFixed(2)} each
                </div>
              </div>
            </div>
            <Button 
              onClick={handleAddToCart}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
