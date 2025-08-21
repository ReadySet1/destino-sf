'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Plus,
  ShoppingCart,
  Utensils,
  Users,
  Package,
  Minus,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { useCateringCartStore } from '@/store/catering-cart';
import { toast } from '@/lib/toast';


// Define the lunch packet tiers based on user requirements
interface LunchPacketTier {
  id: string;
  name: string;
  price: number;
  proteinSize: string;
  description: string;
  sides: string[];
}

interface SaladOption {
  id: string;
  name: string;
  price: number;
  description: string;
  serving: string;
}

interface AddOnOption {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
}

interface LunchPacketsMenuProps {
  className?: string;
}

interface PersonOrder {
  id: string;
  name: string;
  tier?: LunchPacketTier;
  protein?: string;
  salads: SaladOption[];
  addOns: AddOnOption[];
}

// Lunch Packet Tier configurations
const LUNCH_PACKET_TIERS: LunchPacketTier[] = [
  {
    id: 'tier-1',
    name: 'Tier #1',
    price: 14.0,
    proteinSize: '6oz',
    description: 'Choice of protein with 2 classic sides',
    sides: ['4oz Arroz Rojo', '4oz Sautéed Veggies'],
  },
  {
    id: 'tier-2',
    name: 'Tier #2',
    price: 15.0,
    proteinSize: '6oz',
    description: 'Choice of protein with 2 flavorful sides',
    sides: ['4oz Chipotle Potatoes', '4oz Kale'],
  },
  {
    id: 'tier-3',
    name: 'Tier #3',
    price: 17.0,
    proteinSize: '8oz',
    description: 'Generous protein portion with 2 premium sides',
    sides: ['4oz Sautéed Veggies', '4oz Chipotle Potatoes'],
  },
];

// Side salad options
const SIDE_SALADS: SaladOption[] = [
  {
    id: 'arugula-jicama',
    name: 'Arugula-Jicama Salad',
    price: 3.75,
    description: 'Fresh arugula and jicama with honey vinaigrette',
    serving: '3oz salad + 1oz dressing (side container)',
  },
  {
    id: 'strawberry-beet',
    name: 'Strawberry-Beet Salad',
    price: 3.75,
    description: 'Seasonal strawberries and beets with citrus vinaigrette',
    serving: '3oz salad + 1oz dressing (side container)',
  },
];

// Add-on options
const ADD_ONS: AddOnOption[] = [
  {
    id: 'bamboo-cutlery',
    name: 'Individually Wrapped Bamboo Cutlery w/ Napkin',
    price: 1.5,
    description: 'Eco-friendly bamboo cutlery set with napkin',
    category: 'boxed-lunch',
  },
  {
    id: 'individual-setup',
    name: 'Individual Set-Up: Bamboo Cutlery w/ Napkin, Compostable Plate',
    price: 2.0,
    description: 'Complete individual place setting',
    category: 'individual-setup',
  },
];

// Available protein options
const PROTEIN_OPTIONS = [
  'Carne Asada',
  'Pollo Asado',
  'Carnitas',
  'Pollo al Carbón',
  'Pescado',
  'Vegetarian Option',
];

export const LunchPacketsMenu: React.FC<LunchPacketsMenuProps> = ({ className }) => {
  // Simplified state - removed multi-person ordering
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set());
  const [selectedProteins, setSelectedProteins] = useState<Record<string, string>>({});
  const [selectedSalads, setSelectedSalads] = useState<Set<string>>(new Set());
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { addItem } = useCateringCartStore();

  // Utility functions
  const getQuantity = (itemId: string) => quantities[itemId] || 1;

  const setQuantity = (itemId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [itemId]: Math.max(1, quantity) }));
  };

  const handleTierSelect = (tierId: string) => {
    const newSelected = new Set(selectedTiers);
    if (newSelected.has(tierId)) {
      newSelected.delete(tierId);
      // Remove protein selection when tier is deselected
      const newProteins = { ...selectedProteins };
      delete newProteins[tierId];
      setSelectedProteins(newProteins);
    } else {
      newSelected.add(tierId);
    }
    setSelectedTiers(newSelected);
  };

  const handleProteinSelect = (tierId: string, protein: string) => {
    setSelectedProteins(prev => ({
      ...prev,
      [tierId]: prev[tierId] === protein ? '' : protein,
    }));
  };

  const handleSaladToggle = (saladId: string) => {
    const newSelected = new Set(selectedSalads);
    if (newSelected.has(saladId)) {
      newSelected.delete(saladId);
    } else {
      newSelected.add(saladId);
    }
    setSelectedSalads(newSelected);
  };

  const handleAddOnToggle = (addOnId: string) => {
    const newSelected = new Set(selectedAddOns);
    if (newSelected.has(addOnId)) {
      newSelected.delete(addOnId);
    } else {
      newSelected.add(addOnId);
    }
    setSelectedAddOns(newSelected);
  };

  const addToCart = (type: 'tier' | 'salad' | 'addon', itemId: string, item: any) => {
    const quantity = getQuantity(itemId);

    try {
      let cartItem;

      if (type === 'tier') {
        const tier = item as LunchPacketTier;
        const selectedProtein = selectedProteins[tier.id];

        if (!selectedProtein) {
          toast.error('Please select a protein option first');
          return;
        }

        cartItem = {
          id: `lunch-packet-${tier.id}-${Date.now()}`,
          name: `${tier.name} - ${selectedProtein}`,
          price: tier.price,
          quantity,
          variantId: JSON.stringify({
            type: 'lunch-packet',
            tierId: tier.id,
            tierName: tier.name,
            protein: selectedProtein,
            sides: tier.sides,
            proteinSize: tier.proteinSize,
          }),
          image: '/images/catering/default-item.jpg',
        };
      } else if (type === 'salad') {
        const salad = item as SaladOption;
        cartItem = {
          id: `lunch-packet-salad-${salad.id}-${Date.now()}`,
          name: salad.name,
          price: salad.price,
          quantity,
          variantId: JSON.stringify({
            type: 'lunch-packet-salad',
            saladId: salad.id,
            serving: salad.serving,
          }),
          image: '/images/catering/default-item.jpg',
        };
      } else {
        const addOn = item as AddOnOption;
        cartItem = {
          id: `lunch-packet-addon-${addOn.id}-${Date.now()}`,
          name: addOn.name,
          price: addOn.price,
          quantity,
          variantId: JSON.stringify({
            type: 'lunch-packet-addon',
            addOnId: addOn.id,
            category: addOn.category,
          }),
          image: '/images/catering/default-item.jpg',
        };
      }

      addItem(cartItem);
      toast.success(`Added ${cartItem.name} to catering cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  return (
    <div className={`w-full space-y-8 ${className}`}>
      

      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Individual Packaged Lunch Options - 2025
          </h2>
          <p className="text-lg text-gray-600 max-w-4xl mx-auto">
            Choose from three delicious tiers of packaged lunches. Each lunch includes your choice
            of protein and carefully selected sides. Perfect for corporate events, meetings, and
            group gatherings.
          </p>
        </motion.div>
      </div>

      {/* Tier Selection */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-amber-600" />
          Lunch Packet Tiers
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {LUNCH_PACKET_TIERS.map((tier, index) => (
            <TierCard
              key={tier.id}
              tier={tier}
              isSelected={selectedTiers.has(tier.id)}
              selectedProtein={selectedProteins[tier.id]}
              onSelect={() => handleTierSelect(tier.id)}
              onProteinSelect={protein => handleProteinSelect(tier.id, protein)}
              onAddToCart={() => addToCart('tier', tier.id, tier)}
              quantity={getQuantity(tier.id)}
              onQuantityChange={qty => setQuantity(tier.id, qty)}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* Optional Side Salads */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Plus className="h-6 w-6 text-green-600" />
          Optional Side Salads - $3.75
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {SIDE_SALADS.map((salad, index) => (
            <motion.div
              key={salad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-300 ${
                  selectedSalads.has(salad.id)
                    ? 'ring-2 ring-green-500 bg-green-50'
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleSaladToggle(salad.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-xl font-bold">{salad.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-lg font-bold">
                        ${salad.price.toFixed(2)}
                      </Badge>
                      {selectedSalads.has(salad.id) && (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-gray-600">{salad.serving}</p>
                  <p className="text-gray-500 text-sm">{salad.description}</p>

                  {selectedSalads.has(salad.id) && (
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            setQuantity(salad.id, getQuantity(salad.id) - 1);
                          }}
                          disabled={getQuantity(salad.id) <= 1}
                        >
                          -
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium">
                          {getQuantity(salad.id)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            setQuantity(salad.id, getQuantity(salad.id) + 1);
                          }}
                        >
                          +
                        </Button>
                      </div>

                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          addToCart('salad', salad.id, salad);
                        }}
                        className="flex-1"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Optional Add-ons */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Plus className="h-6 w-6 text-blue-600" />
          Optional Add-ons
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {ADD_ONS.map((addOn, index) => (
            <motion.div
              key={addOn.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-300 ${
                  selectedAddOns.has(addOn.id)
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleAddOnToggle(addOn.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex justify-between items-start">
                    <span className="text-lg font-bold pr-2">{addOn.name}</span>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-lg font-bold">
                        ${addOn.price.toFixed(2)}
                      </Badge>
                      {selectedAddOns.has(addOn.id) && (
                        <CheckCircle className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-gray-600">{addOn.description}</p>
                  <div className="text-sm text-gray-500">Category: {addOn.category}</div>

                  {selectedAddOns.has(addOn.id) && (
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            setQuantity(addOn.id, getQuantity(addOn.id) - 1);
                          }}
                          disabled={getQuantity(addOn.id) <= 1}
                        >
                          -
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium">
                          {getQuantity(addOn.id)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            setQuantity(addOn.id, getQuantity(addOn.id) + 1);
                          }}
                        >
                          +
                        </Button>
                      </div>

                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          addToCart('addon', addOn.id, addOn);
                        }}
                        className="flex-1"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

// Individual Tier Card Component
interface TierCardProps {
  tier: LunchPacketTier;
  isSelected: boolean;
  selectedProtein: string;
  onSelect: () => void;
  onProteinSelect: (protein: string) => void;
  onAddToCart: () => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  index: number;
}

const TierCard: React.FC<TierCardProps> = ({
  tier,
  isSelected,
  selectedProtein,
  onSelect,
  onProteinSelect,
  onAddToCart,
  quantity,
  onQuantityChange,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card
        className={`cursor-pointer transition-all duration-300 ${
          isSelected ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-md'
        }`}
        onClick={onSelect}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex justify-between items-center">
            <span className="text-xl font-bold">{tier.name}</span>
            <Badge variant="secondary" className="text-lg font-bold">
              ${tier.price.toFixed(2)}
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">{tier.proteinSize} protein, 2 sides</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-600">{tier.description}</p>

          {/* Included Sides */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Included Sides:</h4>
            <ul className="space-y-1">
              {tier.sides.map((side, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {side}
                </li>
              ))}
            </ul>
          </div>

          {/* Protein Selection */}
          {isSelected && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-sm text-gray-700">Choose Your Protein:</h4>
              <div className="grid grid-cols-1 gap-2">
                {PROTEIN_OPTIONS.map(protein => {
                  const isProteinSelected = selectedProtein === protein;
                  return (
                    <button
                      key={protein}
                      onClick={e => {
                        e.stopPropagation();
                        onProteinSelect(protein);
                      }}
                      className={`text-left p-2 rounded border transition-all duration-200 ${
                        isProteinSelected
                          ? 'border-amber-500 bg-amber-100 ring-1 ring-amber-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-sm font-medium ${isProteinSelected ? 'text-amber-800' : 'text-gray-800'}`}
                        >
                          {protein}
                        </span>
                        {isProteinSelected && <CheckCircle className="h-4 w-4 text-amber-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add to Cart Section */}
          {isSelected && selectedProtein && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    onQuantityChange(quantity - 1);
                  }}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="px-3 py-1 text-sm font-medium bg-gray-100 rounded">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    onQuantityChange(quantity + 1);
                  }}
                >
                  +
                </Button>
              </div>

              <Button
                onClick={e => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                className="w-full"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LunchPacketsMenu;
