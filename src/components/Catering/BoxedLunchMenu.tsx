'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Users, Cookie, Loader2, AlertCircle } from 'lucide-react';
import {
  BOXED_LUNCH_SALADS,
  BOXED_LUNCH_ADD_ONS,
  SaladOption,
  AddOnOption,
  BoxedLunchResponse,
  BoxedLunchItem,
} from '@/types/catering';
import { useCateringCartStore } from '@/store/catering-cart';
import { BoxedLunchCard } from './BoxedLunchCard';
import { BoxedLunchBuilder } from './BoxedLunchBuilder';
import { toast } from '@/lib/toast';
import { sanitizeProductDescription } from '@/lib/utils/product-description';

// Define menu context to determine which items to show
type MenuContext = 'lunch' | 'appetizer' | 'buffet' | 'all';

interface DessertItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  servingSize: string;
  availableIn: MenuContext[]; // Define where item is available
}

// All dessert items with menu context availability
const ALL_DESSERT_ITEMS: DessertItem[] = [
  // ALFAJORES - Available in ALL menus including lunch
  {
    id: 'alfajores-classic',
    name: 'Alfajores - Classic',
    description: 'South american butter cookies: shortbread / dulce de leche',
    price: 2.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '1 piece',
    availableIn: ['lunch', 'appetizer', 'buffet', 'all'],
  },
  {
    id: 'alfajores-chocolate',
    name: 'Alfajores - Chocolate',
    description: 'Dulce de leche / dark chocolate / peruvian sea salt',
    price: 2.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '1 piece',
    availableIn: ['lunch', 'appetizer', 'buffet', 'all'],
  },
  {
    id: 'alfajores-lemon',
    name: 'Alfajores - Lemon',
    description: 'Shortbread / dulce de leche / lemon royal icing',
    price: 2.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '1 piece',
    availableIn: ['lunch', 'appetizer', 'buffet', 'all'],
  },
  {
    id: 'alfajores-gluten-free',
    name: 'Alfajores - Gluten-Free',
    description: 'Gluten-free dulce de leche butter cookies',
    price: 2.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    servingSize: '1 piece',
    availableIn: ['lunch', 'appetizer', 'buffet', 'all'],
  },
  
  // ITEMS REMOVED FROM LUNCH MENU - Only available in appetizer/buffet
  {
    id: 'lemon-bars',
    name: 'Lemon Bars',
    description: 'Tangy lemon custard on buttery shortbread crust',
    price: 3.0,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '1 piece',
    availableIn: ['appetizer', 'buffet'], // NOT in lunch
  },
  {
    id: 'cupcakes',
    name: 'Cupcakes',
    description: 'Moist vanilla or chocolate cupcakes with buttercream frosting',
    price: 3.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '1 piece',
    availableIn: ['appetizer', 'buffet'], // NOT in lunch
  },
  {
    id: 'brownies',
    name: 'Brownies',
    description: 'Fudgy chocolate brownies with walnuts',
    price: 3.0,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '1 piece',
    availableIn: ['appetizer', 'buffet'], // NOT in lunch
  },
];

/**
 * Filter dessert items based on menu context
 */
const filterDessertsByMenu = (
  items: DessertItem[], 
  context: MenuContext
): DessertItem[] => {
  if (context === 'all') {
    return items;
  }
  
  return items.filter(item => 
    item.availableIn.includes(context) || 
    item.availableIn.includes('all')
  );
};

// Protein image mapping moved to BoxedLunchBuilder component

interface BoxedLunchMenuProps {
  className?: string;
  menuContext?: MenuContext; // Allow context to be passed in
}

export const BoxedLunchMenu: React.FC<BoxedLunchMenuProps> = ({ 
  className,
  menuContext = 'lunch' // Default to lunch context
}) => {
  // Database-driven boxed lunch items state
  const [boxedLunchItems, setBoxedLunchItems] = useState<BoxedLunchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Note: Tier system now handled by BoxedLunchBuilder component
  
  // Shared state for salads, add-ons, and quantities
  const [selectedSalads, setSelectedSalads] = useState<Set<SaladOption>>(new Set());
  const [selectedAddOns, setSelectedAddOns] = useState<Set<AddOnOption>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { addItem } = useCateringCartStore();

  // Fetch boxed lunch items from the database
  useEffect(() => {
    const fetchBoxedLunchItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/catering/boxed-lunches');
        const data: BoxedLunchResponse = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch boxed lunch items');
        }
        
        if (data.success) {
          setBoxedLunchItems(data.items);
        } else {
          throw new Error(data.error || 'Failed to load boxed lunch items');
        }
      } catch (err) {
        console.error('Error fetching boxed lunch items:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoxedLunchItems();
  }, []);

  // Note: Tier handlers now handled by BoxedLunchBuilder component

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

  // Filter desserts based on menu context
  const availableDesserts = React.useMemo(
    () => filterDessertsByMenu(ALL_DESSERT_ITEMS, menuContext),
    [menuContext]
  );

  const addToCart = (type: 'salad' | 'addon' | 'alfajores', itemId: string, item: any) => {
    const quantity = getQuantity(itemId);

    // For salads, add-ons, and alfajores
    const productId = `boxed-lunch-${type}-${itemId}`;

    const metadata = {
      type: 'boxed-lunch',
      subType: type,
      itemId,
      ...(type === 'salad' && { saladOption: itemId }),
      ...(type === 'addon' && { addOnOption: itemId }),
      ...(type === 'alfajores' && { alfajoresOption: itemId }),
    };

    addItem({
      id: productId,
      name: item.name,
      price: item.price,
      quantity,
      variantId: JSON.stringify(metadata),
      image: undefined,
    });

    toast.success(`Added ${quantity}x ${item.name} to catering cart!`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-full space-y-8 ${className}`}>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            <span className="text-lg text-gray-600">Loading boxed lunch options...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`w-full space-y-8 ${className}`}>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <span className="text-lg">Error loading boxed lunch options</span>
          </div>
          <p className="text-gray-600 mt-2">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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
            Choose from our pre-made boxed lunches or build your own with our customizable tier system. 
            Each option includes carefully selected sides and fresh ingredients. Perfect for corporate events, meetings, and group gatherings.
          </p>
        </motion.div>
      </div>

      {/* Database-Driven Boxed Lunch Items */}
      {boxedLunchItems.length > 0 && (
        <section>
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-amber-600" />
            Pre-Made Boxed Lunches ({boxedLunchItems.length} options)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boxedLunchItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <BoxedLunchCard item={item} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Build Your Own Boxed Lunch - New Dynamic System */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BoxedLunchBuilder />
        </motion.div>
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
              onQuantityChange={qty => setQuantity(key, qty)}
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
          {Object.values(BOXED_LUNCH_ADD_ONS).map(addOn => (
            <AddOnCard
              key={addOn.id}
              addOn={addOn}
              isSelected={selectedAddOns.has(addOn.type)}
              onToggle={() => handleAddOnToggle(addOn.type)}
              onAddToCart={() => addToCart('addon', addOn.id, addOn)}
              quantity={getQuantity(addOn.id)}
              onQuantityChange={qty => setQuantity(addOn.id, qty)}
            />
          ))}
        </div>
      </section>

      {/* Desserts Section - Context-aware filtering */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Cookie className="h-6 w-6 text-orange-600" />
          {menuContext === 'lunch' 
            ? 'Alfajores - $2.50 each' 
            : 'Desserts - Starting at $2.50'
          }
        </h3>
        
        {availableDesserts.length === 0 && (
          <p className="text-gray-600 italic">
            No desserts available for this menu. Please check other menu sections.
          </p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableDesserts.map(dessert => (
            <AlfajorCard
              key={dessert.id}
              alfajor={dessert}
              onAddToCart={() => addToCart('alfajores', dessert.id, dessert)}
              quantity={getQuantity(dessert.id)}
              onQuantityChange={qty => setQuantity(dessert.id, qty)}
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
          <li>
            • All boxed lunches use the same starch and vegetable sides for the total headcount
          </li>
          <li>
            • Each box includes entrée, starch, and vegetable with set pricing that includes
            product, packaging, and labor
          </li>
          <li>
            • Side salads are priced, ordered, and packaged separately (3oz salad + 1oz dressing)
          </li>
          <li>• Minimum quantities and advance notice may apply for large orders</li>
        </ul>
      </motion.div>
    </div>
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
  onQuantityChange,
}) => {
  return (
    <Card
      className={`transition-all duration-300 hover:shadow-md ${
        isSelected ? 'ring-2 ring-green-500' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-gray-800">{salad.name}</CardTitle>
          <div className="text-xl font-bold text-green-600">${salad.price.toFixed(2)}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="text-gray-600 text-sm"
          dangerouslySetInnerHTML={{
            __html: sanitizeProductDescription(salad.description)
          }}
        />

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
            <Button variant="outline" size="sm" onClick={() => onQuantityChange(quantity + 1)}>
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
  onQuantityChange,
}) => {
  return (
    <Card
      className={`transition-all duration-300 hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-gray-800">{addOn.name}</CardTitle>
          <div className="text-xl font-bold text-blue-600">${addOn.price.toFixed(2)}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="text-gray-600 text-sm"
          dangerouslySetInnerHTML={{
            __html: sanitizeProductDescription(addOn.description)
          }}
        />

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
            <Button variant="outline" size="sm" onClick={() => onQuantityChange(quantity + 1)}>
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

// Alfajor Card Component
interface AlfajorCardProps {
  alfajor: {
    id: string;
    name: string;
    description: string;
    price: number;
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    servingSize: string;
  };
  onAddToCart: () => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const AlfajorCard: React.FC<AlfajorCardProps> = ({
  alfajor,
  onAddToCart,
  quantity,
  onQuantityChange,
}) => {
  return (
    <Card className="transition-all duration-300 hover:shadow-md h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-lg font-bold text-gray-800 line-clamp-2 flex-1 mr-2">
            {alfajor.name}
          </CardTitle>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold text-orange-600">${alfajor.price.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">{alfajor.servingSize}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Per piece</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        <div
          className="text-gray-600 text-sm flex-1"
          dangerouslySetInnerHTML={{
            __html: sanitizeProductDescription(alfajor.description)
          }}
        />

        <div className="flex flex-wrap gap-1">
          {alfajor.isVegan && (
            <Badge
              variant="outline"
              className="text-xs border-green-600 text-green-700 bg-green-50"
            >
              Vegan
            </Badge>
          )}
          {alfajor.isVegetarian && !alfajor.isVegan && (
            <Badge
              variant="outline"
              className="text-xs border-green-500 text-green-700 bg-green-50"
            >
              Vegetarian
            </Badge>
          )}
          {alfajor.isGlutenFree && (
            <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 bg-blue-50">
              Gluten-Free
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 mt-auto">
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
            <Button variant="outline" size="sm" onClick={() => onQuantityChange(quantity + 1)}>
              +
            </Button>
          </div>

          <Button
            onClick={onAddToCart}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// TierCard component removed - now handled by BoxedLunchBuilder

export default BoxedLunchMenu;
