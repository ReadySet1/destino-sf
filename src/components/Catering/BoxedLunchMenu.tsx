'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Plus, ShoppingCart, Utensils, Users } from 'lucide-react';
import { 
  BOXED_LUNCH_TIERS, 
  BOXED_LUNCH_SALADS, 
  BOXED_LUNCH_ADD_ONS,
  PROTEIN_OPTIONS,
  BoxedLunchTier,
  SaladOption,
  AddOnOption,
  ProteinOption,
  BoxedLunchTierConfig
} from '@/types/catering';
import { useCartStore } from '@/store/cart';
import toast from 'react-hot-toast';

interface BoxedLunchMenuProps {
  className?: string;
}

export const BoxedLunchMenu: React.FC<BoxedLunchMenuProps> = ({ className }) => {
  const [selectedTier, setSelectedTier] = useState<BoxedLunchTier | null>(null);
  const [selectedProteins, setSelectedProteins] = useState<Record<BoxedLunchTier, ProteinOption | null>>({
    [BoxedLunchTier.TIER_1]: null,
    [BoxedLunchTier.TIER_2]: null,
    [BoxedLunchTier.TIER_3]: null,
  });
  const [selectedSalads, setSelectedSalads] = useState<Set<SaladOption>>(new Set());
  const [selectedAddOns, setSelectedAddOns] = useState<Set<AddOnOption>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  const { addItem } = useCartStore();

  const handleTierSelect = (tier: BoxedLunchTier) => {
    setSelectedTier(selectedTier === tier ? null : tier);
  };

  const handleProteinSelect = (tier: BoxedLunchTier, protein: ProteinOption) => {
    setSelectedProteins(prev => ({
      ...prev,
      [tier]: prev[tier] === protein ? null : protein
    }));
  };

  const handleSaladToggle = (salad: SaladOption) => {
    const newSelectedSalads = new Set(selectedSalads);
    if (newSelectedSalads.has(salad)) {
      newSelectedSalads.delete(salad);
    } else {
      newSelectedSalads.add(salad);
    }
    setSelectedSalads(newSelectedSalads);
  };

  const handleAddOnToggle = (addOn: AddOnOption) => {
    const newSelectedAddOns = new Set(selectedAddOns);
    if (newSelectedAddOns.has(addOn)) {
      newSelectedAddOns.delete(addOn);
    } else {
      newSelectedAddOns.add(addOn);
    }
    setSelectedAddOns(newSelectedAddOns);
  };

  const getQuantity = (itemId: string) => quantities[itemId] || 1;

  const setQuantity = (itemId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [itemId]: Math.max(1, quantity) }));
  };

  const addToCart = (type: 'tier' | 'salad' | 'addon', itemId: string, item: any) => {
    const quantity = getQuantity(itemId);
    
    // For tier items, check if protein is selected
    if (type === 'tier') {
      const tier = itemId as BoxedLunchTier;
      const selectedProtein = selectedProteins[tier];
      
      if (!selectedProtein) {
        toast.error('Please select a protein option first!');
        return;
      }
      
      // Include protein information in the cart item
      const productId = `boxed-lunch-${type}-${itemId}-${selectedProtein}`;
      const proteinInfo = PROTEIN_OPTIONS[selectedProtein];
      
      const metadata = {
        type: 'boxed-lunch',
        subType: type,
        itemId,
        tier: item.tier,
        selectedProtein,
        proteinName: proteinInfo.name
      };

      addItem({
        id: productId,
        name: `${item.name} - ${proteinInfo.name}`,
        price: item.price,
        quantity,
        variantId: JSON.stringify(metadata),
        image: undefined
      });

      toast.success(`Added ${quantity}x ${item.name} with ${proteinInfo.name} to cart!`);
      return;
    }
    
    // For non-tier items (salads, add-ons), use existing logic
    const productId = `boxed-lunch-${type}-${itemId}`;
    
    const metadata = {
      type: 'boxed-lunch',
      subType: type,
      itemId,
      ...(type === 'salad' && { saladOption: itemId }),
      ...(type === 'addon' && { addOnOption: itemId })
    };

    addItem({
      id: productId,
      name: item.name,
      price: item.price,
      quantity,
      variantId: JSON.stringify(metadata),
      image: undefined
    });

    toast.success(`Added ${quantity}x ${item.name} to cart!`);
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
            Choose from three delicious tiers of boxed lunches. Each box includes your choice of protein 
            and carefully selected sides. Perfect for corporate events, meetings, and group gatherings.
          </p>
        </motion.div>
      </div>

      {/* Tier Selection */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Utensils className="h-6 w-6 text-amber-600" />
          Boxed Lunch Tiers
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(BOXED_LUNCH_TIERS).map((tier, index) => (
            <TierCard
              key={tier.tier}
              tier={tier}
              isSelected={selectedTier === tier.tier}
              selectedProtein={selectedProteins[tier.tier]}
              onSelect={() => handleTierSelect(tier.tier)}
              onProteinSelect={(protein) => handleProteinSelect(tier.tier, protein)}
              onAddToCart={() => addToCart('tier', tier.tier, tier)}
              quantity={getQuantity(tier.tier)}
              onQuantityChange={(qty) => setQuantity(tier.tier, qty)}
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
          {Object.entries(BOXED_LUNCH_SALADS).map(([key, salad]) => (
            <SaladCard
              key={key}
              saladOption={key as SaladOption}
              salad={salad}
              isSelected={selectedSalads.has(key as SaladOption)}
              onToggle={() => handleSaladToggle(key as SaladOption)}
              onAddToCart={() => addToCart('salad', key, salad)}
              quantity={getQuantity(key)}
              onQuantityChange={(qty) => setQuantity(key, qty)}
            />
          ))}
        </div>
      </section>

      {/* Add-Ons */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          Service Add-Ons
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(BOXED_LUNCH_ADD_ONS).map((addOn) => (
            <AddOnCard
              key={addOn.id}
              addOn={addOn}
              isSelected={selectedAddOns.has(addOn.type)}
              onToggle={() => handleAddOnToggle(addOn.type)}
              onAddToCart={() => addToCart('addon', addOn.id, addOn)}
              quantity={getQuantity(addOn.id)}
              onQuantityChange={(qty) => setQuantity(addOn.id, qty)}
            />
          ))}
        </div>
      </section>

      {/* Important Notes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg"
      >
        <h4 className="font-bold text-gray-800 mb-3">Important Notes:</h4>
        <ul className="space-y-2 text-gray-700">
          <li>• All boxed lunches use the same starch and vegetable sides for the total headcount</li>
          <li>• Each box includes entrée, starch, and vegetable with set pricing that includes product, packaging, and labor</li>
          <li>• Side salads are priced, ordered, and packaged separately (3oz salad + 1oz dressing)</li>
          <li>• Minimum quantities and advance notice may apply for large orders</li>
        </ul>
      </motion.div>
    </div>
  );
};

// Individual Tier Card Component
interface TierCardProps {
  tier: BoxedLunchTierConfig;
  isSelected: boolean;
  selectedProtein: ProteinOption | null;
  onSelect: () => void;
  onProteinSelect: (protein: ProteinOption) => void;
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
  index
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-amber-500 shadow-lg' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-bold text-gray-800">
              {tier.name}
            </CardTitle>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-600">
                ${tier.price.toFixed(2)}
              </div>
              <Badge variant="secondary" className="mt-1">
                {tier.proteinSize} protein
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">{tier.description}</p>
          
          {/* Protein Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Choose Your Protein:</h4>
            <div className="grid gap-2">
              {tier.availableProteins.map((protein) => {
                const proteinInfo = PROTEIN_OPTIONS[protein];
                const isSelected = selectedProtein === protein;
                
                return (
                  <button
                    key={protein}
                    onClick={() => onProteinSelect(protein)}
                    className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-200' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={`font-medium ${isSelected ? 'text-amber-800' : 'text-gray-800'}`}>
                          {proteinInfo.name}
                        </div>
                        <div className={`text-sm ${isSelected ? 'text-amber-600' : 'text-gray-600'}`}>
                          {proteinInfo.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="font-medium px-3">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange(quantity + 1)}
              >
                +
              </Button>
            </div>
            
            <Button
              onClick={onAddToCart}
              className={`transition-all duration-200 ${
                selectedProtein 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!selectedProtein}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Salad Card Component
interface SaladCardProps {
  saladOption: SaladOption;
  salad: { name: string; price: number; description: string };
  isSelected: boolean;
  onToggle: () => void;
  onAddToCart: () => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const SaladCard: React.FC<SaladCardProps> = ({
  salad,
  isSelected,
  onToggle,
  onAddToCart,
  quantity,
  onQuantityChange
}) => {
  return (
    <Card className={`transition-all duration-300 hover:shadow-md ${
      isSelected ? 'ring-2 ring-green-500' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-gray-800">
            {salad.name}
          </CardTitle>
          <div className="text-xl font-bold text-green-600">
            ${salad.price.toFixed(2)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm">{salad.description}</p>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
            >
              -
            </Button>
            <span className="font-medium px-3">{quantity}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuantityChange(quantity + 1)}
            >
              +
            </Button>
          </div>
          
          <Button
            onClick={onAddToCart}
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Salad
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Add-On Card Component
interface AddOnCardProps {
  addOn: { id: string; name: string; price: number; description: string };
  isSelected: boolean;
  onToggle: () => void;
  onAddToCart: () => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const AddOnCard: React.FC<AddOnCardProps> = ({
  addOn,
  isSelected,
  onToggle,
  onAddToCart,
  quantity,
  onQuantityChange
}) => {
  return (
    <Card className={`transition-all duration-300 hover:shadow-md ${
      isSelected ? 'ring-2 ring-blue-500' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-gray-800">
            {addOn.name}
          </CardTitle>
          <div className="text-xl font-bold text-blue-600">
            ${addOn.price.toFixed(2)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm">{addOn.description}</p>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
            >
              -
            </Button>
            <span className="font-medium px-3">{quantity}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuantityChange(quantity + 1)}
            >
              +
            </Button>
          </div>
          
          <Button
            onClick={onAddToCart}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BoxedLunchMenu; 