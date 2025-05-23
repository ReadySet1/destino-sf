'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Plus, ShoppingCart, Utensils, Users, Package, Minus, UserPlus, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

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

interface PersonOrder {
  id: string;
  name: string;
  tier?: LunchPacketTier;
  protein?: string;
  salads: SaladOption[];
  addOns: AddOnOption[];
}

interface LunchPacketsMenuProps {
  className?: string;
}

// Lunch Packet Tier configurations
const LUNCH_PACKET_TIERS: LunchPacketTier[] = [
  {
    id: 'tier-1',
    name: 'Tier #1',
    price: 14.00,
    proteinSize: '6oz',
    description: 'Choice of protein with 2 classic sides',
    sides: ['4oz Arroz Rojo', '4oz Sautéed Veggies']
  },
  {
    id: 'tier-2', 
    name: 'Tier #2',
    price: 15.00,
    proteinSize: '6oz',
    description: 'Choice of protein with 2 flavorful sides',
    sides: ['4oz Chipotle Potatoes', '4oz Kale']
  },
  {
    id: 'tier-3',
    name: 'Tier #3', 
    price: 17.00,
    proteinSize: '8oz',
    description: 'Generous protein portion with 2 premium sides',
    sides: ['4oz Sautéed Veggies', '4oz Chipotle Potatoes']
  }
];

// Side salad options
const SIDE_SALADS: SaladOption[] = [
  {
    id: 'arugula-jicama',
    name: 'Arugula-Jicama Salad',
    price: 3.75,
    description: 'Fresh arugula and jicama with honey vinaigrette',
    serving: '3oz salad + 1oz dressing (side container)'
  },
  {
    id: 'strawberry-beet',
    name: 'Strawberry-Beet Salad', 
    price: 3.75,
    description: 'Seasonal strawberries and beets with citrus vinaigrette',
    serving: '3oz salad + 1oz dressing (side container)'
  }
];

// Add-on options
const ADD_ONS: AddOnOption[] = [
  {
    id: 'bamboo-cutlery',
    name: 'Individually Wrapped Bamboo Cutlery w/ Napkin',
    price: 1.50,
    description: 'Eco-friendly bamboo cutlery set with napkin',
    category: 'boxed-lunch'
  },
  {
    id: 'compostable-spoon',
    name: 'Compostable Serving Spoon',
    price: 1.50,
    description: 'Compostable serving spoon for family style service',
    category: 'family-style'
  },
  {
    id: 'individual-setup',
    name: 'Individual Set-Up: Bamboo Cutlery w/ Napkin, Compostable Plate',
    price: 2.00,
    description: 'Complete individual place setting',
    category: 'individual-setup'
  }
];

// Available protein options
const PROTEIN_OPTIONS = [
  'Carne Asada',
  'Pollo Asado', 
  'Carnitas',
  'Pollo al Carbón',
  'Pescado',
  'Vegetarian Option'
];

export const LunchPacketsMenu: React.FC<LunchPacketsMenuProps> = ({ className }) => {
  const [orderingMode, setOrderingMode] = useState<'single' | 'multiple'>('single');
  const [peopleCount, setPeopleCount] = useState(1);
  const [personOrders, setPersonOrders] = useState<PersonOrder[]>([
    { id: '1', name: 'Person 1', salads: [], addOns: [] }
  ]);
  const [selectedActivePerson, setSelectedActivePerson] = useState<string>('1');
  
  // Legacy single-person state (kept for backward compatibility)
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set());
  const [selectedProteins, setSelectedProteins] = useState<Record<string, string>>({});
  const [selectedSalads, setSelectedSalads] = useState<Set<string>>(new Set());
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  const { addItem } = useCartStore();

  // Handle switching between ordering modes
  const handleOrderingModeChange = (mode: 'single' | 'multiple') => {
    setOrderingMode(mode);
    if (mode === 'single') {
      // Reset to single person ordering
      setPersonOrders([{ id: '1', name: 'Person 1', salads: [], addOns: [] }]);
      setPeopleCount(1);
      setSelectedActivePerson('1');
    }
  };

  // Handle changing number of people
  const handlePeopleCountChange = (count: number) => {
    const newCount = Math.max(1, Math.min(20, count)); // Limit between 1-20 people
    setPeopleCount(newCount);
    
    const newPersonOrders: PersonOrder[] = [];
    for (let i = 1; i <= newCount; i++) {
      const existing = personOrders.find(p => p.id === i.toString());
      newPersonOrders.push(
        existing || { 
          id: i.toString(), 
          name: `Person ${i}`, 
          salads: [], 
          addOns: [] 
        }
      );
    }
    setPersonOrders(newPersonOrders);
    
    // Set active person to first person if current selection is out of range
    if (parseInt(selectedActivePerson) > newCount) {
      setSelectedActivePerson('1');
    }
  };

  // Handle person-specific tier selection
  const handlePersonTierSelect = (personId: string, tier: LunchPacketTier) => {
    setPersonOrders(prev => prev.map(person => 
      person.id === personId 
        ? { ...person, tier: person.tier?.id === tier.id ? undefined : tier, protein: undefined }
        : person
    ));
  };

  // Handle person-specific protein selection
  const handlePersonProteinSelect = (personId: string, protein: string) => {
    setPersonOrders(prev => prev.map(person => 
      person.id === personId 
        ? { ...person, protein: person.protein === protein ? undefined : protein }
        : person
    ));
  };

  // Handle person-specific salad selection
  const handlePersonSaladToggle = (personId: string, salad: SaladOption) => {
    setPersonOrders(prev => prev.map(person => {
      if (person.id === personId) {
        const hasSalad = person.salads.some(s => s.id === salad.id);
        return {
          ...person,
          salads: hasSalad 
            ? person.salads.filter(s => s.id !== salad.id)
            : [...person.salads, salad]
        };
      }
      return person;
    }));
  };

  // Handle person-specific add-on selection
  const handlePersonAddOnToggle = (personId: string, addOn: AddOnOption) => {
    setPersonOrders(prev => prev.map(person => {
      if (person.id === personId) {
        const hasAddOn = person.addOns.some(a => a.id === addOn.id);
        return {
          ...person,
          addOns: hasAddOn 
            ? person.addOns.filter(a => a.id !== addOn.id)
            : [...person.addOns, addOn]
        };
      }
      return person;
    }));
  };

  // Add complete order to cart
  const addCompleteOrderToCart = () => {
    let totalItemsAdded = 0;
    
    personOrders.forEach(person => {
      if (person.tier && person.protein) {
        // Add main lunch packet
        const cartItem = {
          id: `lunch-packet-${person.tier.id}-${person.id}-${Date.now()}`,
          name: `${person.name}: ${person.tier.name} - ${person.protein}`,
          price: person.tier.price,
          quantity: 1,
          variantId: JSON.stringify({
            type: 'lunch-packet',
            personId: person.id,
            personName: person.name,
            tierId: person.tier.id,
            tierName: person.tier.name,
            protein: person.protein,
            sides: person.tier.sides,
            proteinSize: person.tier.proteinSize
          }),
          image: '/images/catering/default-item.jpg'
        };
        addItem(cartItem);
        totalItemsAdded++;

        // Add salads for this person
        person.salads.forEach(salad => {
          const saladCartItem = {
            id: `lunch-packet-salad-${salad.id}-${person.id}-${Date.now()}`,
            name: `${person.name}: ${salad.name}`,
            price: salad.price,
            quantity: 1,
            variantId: JSON.stringify({
              type: 'lunch-packet-salad',
              personId: person.id,
              personName: person.name,
              saladId: salad.id,
              serving: salad.serving
            }),
            image: '/images/catering/default-item.jpg'
          };
          addItem(saladCartItem);
          totalItemsAdded++;
        });

        // Add add-ons for this person
        person.addOns.forEach(addOn => {
          const addOnCartItem = {
            id: `lunch-packet-addon-${addOn.id}-${person.id}-${Date.now()}`,
            name: `${person.name}: ${addOn.name}`,
            price: addOn.price,
            quantity: 1,
            variantId: JSON.stringify({
              type: 'lunch-packet-addon',
              personId: person.id,
              personName: person.name,
              addOnId: addOn.id,
              category: addOn.category
            }),
            image: '/images/catering/default-item.jpg'
          };
          addItem(addOnCartItem);
          totalItemsAdded++;
        });
      }
    });

    if (totalItemsAdded > 0) {
      toast.success(`Added ${totalItemsAdded} items to cart for ${personOrders.length} people!`);
    } else {
      toast.error('Please complete at least one person&apos;s order before adding to cart');
    }
  };

  // Calculate total price for current selections
  const calculateTotalPrice = () => {
    return personOrders.reduce((total, person) => {
      let personTotal = 0;
      if (person.tier) personTotal += person.tier.price;
      personTotal += person.salads.reduce((sum, salad) => sum + salad.price, 0);
      personTotal += person.addOns.reduce((sum, addOn) => sum + addOn.price, 0);
      return total + personTotal;
    }, 0);
  };

  // Legacy functions for single-person ordering
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
      [tierId]: prev[tierId] === protein ? '' : protein
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
            proteinSize: tier.proteinSize
          }),
          image: '/images/catering/default-item.jpg'
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
            serving: salad.serving
          }),
          image: '/images/catering/default-item.jpg'
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
            category: addOn.category
          }),
          image: '/images/catering/default-item.jpg'
        };
      }

      addItem(cartItem);
      toast.success(`Added ${cartItem.name} to cart`);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  return (
    <div className={`w-full space-y-8 ${className}`}>
      <Toaster position="top-right" />
      
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
            Choose from three delicious tiers of packaged lunches. Each lunch includes your choice of protein 
            and carefully selected sides. Perfect for corporate events, meetings, and group gatherings.
          </p>
        </motion.div>
      </div>

      {/* Ordering Mode Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-600" />
          Ordering Options
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex gap-2">
            <Button
              variant={orderingMode === 'single' ? 'default' : 'outline'}
              onClick={() => handleOrderingModeChange('single')}
              className="flex items-center gap-2"
            >
              <Utensils className="h-4 w-4" />
              Single Order
            </Button>
            <Button
              variant={orderingMode === 'multiple' ? 'default' : 'outline'}
              onClick={() => handleOrderingModeChange('multiple')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Multiple People
            </Button>
          </div>
          
          {orderingMode === 'multiple' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Number of people:</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePeopleCountChange(peopleCount - 1)}
                  disabled={peopleCount <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="px-3 py-1 text-sm font-medium bg-gray-100 rounded">
                  {peopleCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePeopleCountChange(peopleCount + 1)}
                  disabled={peopleCount >= 20}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {orderingMode === 'multiple' && (
        <>
          {/* Person Selection Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Select orders for each person:
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {personOrders.map((person) => {
                const isComplete = person.tier && person.protein;
                return (
                  <Button
                    key={person.id}
                    variant={selectedActivePerson === person.id ? 'default' : 'outline'}
                    onClick={() => setSelectedActivePerson(person.id)}
                    className="flex items-center gap-2"
                  >
                    {person.name}
                    {isComplete && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </Button>
                );
              })}
            </div>

            {/* Current Person's Order Form */}
            {(() => {
              const activePerson = personOrders.find(p => p.id === selectedActivePerson);
              if (!activePerson) return null;

              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-semibold text-gray-800">
                      {activePerson.name}&apos;s Order
                    </h4>
                    {activePerson.tier && activePerson.protein && (
                      <Badge variant="secondary" className="text-sm">
                        ${(
                          activePerson.tier.price + 
                          activePerson.salads.reduce((sum, s) => sum + s.price, 0) +
                          activePerson.addOns.reduce((sum, a) => sum + a.price, 0)
                        ).toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  {/* Tier Selection for Active Person */}
                  <div>
                    <h5 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Package className="h-5 w-5 text-amber-600" />
                      Choose Lunch Tier
                    </h5>
                    <div className="grid md:grid-cols-3 gap-4">
                      {LUNCH_PACKET_TIERS.map((tier) => (
                        <Card
                          key={tier.id}
                          className={`cursor-pointer transition-all duration-300 ${
                            activePerson.tier?.id === tier.id 
                              ? 'ring-2 ring-amber-500 bg-amber-50' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handlePersonTierSelect(activePerson.id, tier)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="flex justify-between items-center">
                              <span className="text-lg font-bold">{tier.name}</span>
                              <Badge variant="secondary" className="text-lg font-bold">
                                ${tier.price.toFixed(2)}
                              </Badge>
                            </CardTitle>
                            <p className="text-sm text-gray-600">{tier.proteinSize} protein, 2 sides</p>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            <p className="text-gray-600 text-sm">{tier.description}</p>
                            
                            <div className="space-y-2">
                              <h6 className="font-medium text-xs text-gray-700">Included Sides:</h6>
                              <ul className="space-y-1">
                                {tier.sides.map((side, idx) => (
                                  <li key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    {side}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Protein Selection for Active Person */}
                  {activePerson.tier && (
                    <div>
                      <h5 className="text-lg font-medium text-gray-700 mb-3">
                        Choose Protein for {activePerson.name}
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {PROTEIN_OPTIONS.map((protein) => {
                          const isSelected = activePerson.protein === protein;
                          return (
                            <button
                              key={protein}
                              onClick={() => handlePersonProteinSelect(activePerson.id, protein)}
                              className={`text-left p-3 rounded border transition-all duration-200 ${
                                isSelected 
                                  ? 'border-amber-500 bg-amber-100 ring-1 ring-amber-200' 
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className={`text-sm font-medium ${isSelected ? 'text-amber-800' : 'text-gray-800'}`}>
                                  {protein}
                                </span>
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 text-amber-600" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Optional Salads for Active Person */}
                  <div>
                    <h5 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-green-600" />
                      Optional Side Salads - $3.75
                    </h5>
                    <div className="grid md:grid-cols-2 gap-4">
                      {SIDE_SALADS.map((salad) => {
                        const isSelected = activePerson.salads.some(s => s.id === salad.id);
                        return (
                          <Card
                            key={salad.id}
                            className={`cursor-pointer transition-all duration-300 ${
                              isSelected 
                                ? 'ring-2 ring-green-500 bg-green-50' 
                                : 'hover:shadow-md'
                            }`}
                            onClick={() => handlePersonSaladToggle(activePerson.id, salad)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="flex justify-between items-center">
                                <span className="text-lg font-bold">{salad.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-sm font-bold">
                                    ${salad.price.toFixed(2)}
                                  </Badge>
                                  {isSelected && (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                              </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="space-y-2">
                              <p className="text-sm text-gray-600">{salad.serving}</p>
                              <p className="text-sm text-gray-500">{salad.description}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Add-ons for Active Person */}
                  <div>
                    <h5 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                      Optional Add-ons
                    </h5>
                    <div className="grid md:grid-cols-3 gap-4">
                      {ADD_ONS.map((addOn) => {
                        const isSelected = activePerson.addOns.some(a => a.id === addOn.id);
                        return (
                          <Card
                            key={addOn.id}
                            className={`cursor-pointer transition-all duration-300 ${
                              isSelected 
                                ? 'ring-2 ring-blue-500 bg-blue-50' 
                                : 'hover:shadow-md'
                            }`}
                            onClick={() => handlePersonAddOnToggle(activePerson.id, addOn)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="flex justify-between items-start">
                                <span className="text-sm font-bold pr-2">{addOn.name}</span>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="secondary" className="text-xs font-bold">
                                    ${addOn.price.toFixed(2)}
                                  </Badge>
                                  {isSelected && (
                                    <CheckCircle className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              </CardTitle>
                            </CardHeader>
                            
                            <CardContent>
                              <p className="text-xs text-gray-600">{addOn.description}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Order Summary and Add to Cart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h3>
            
            <div className="space-y-4 mb-6">
              {personOrders.map((person) => {
                const personTotal = (person.tier?.price || 0) + 
                  person.salads.reduce((sum, s) => sum + s.price, 0) +
                  person.addOns.reduce((sum, a) => sum + a.price, 0);
                
                return (
                  <div key={person.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-800">{person.name}</div>
                      {person.tier && person.protein ? (
                        <div className="text-sm text-gray-600">
                          {person.tier.name} - {person.protein}
                          {person.salads.length > 0 && ` + ${person.salads.length} salad(s)`}
                          {person.addOns.length > 0 && ` + ${person.addOns.length} add-on(s)`}
                        </div>
                      ) : (
                        <div className="text-sm text-amber-600">Incomplete order</div>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-gray-800">
                      ${personTotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-xl font-bold text-gray-800">
                Total: ${calculateTotalPrice().toFixed(2)}
              </div>
              <Button
                onClick={addCompleteOrderToCart}
                className="flex items-center gap-2"
                disabled={!personOrders.some(p => p.tier && p.protein)}
              >
                <ShoppingCart className="h-4 w-4" />
                Add Complete Order to Cart
              </Button>
            </div>
          </div>
        </>
      )}

      {orderingMode === 'single' && (
        <>
          {/* Original Single-Person Tier Selection */}
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
                  onProteinSelect={(protein) => handleProteinSelect(tier.id, protein)}
                  onAddToCart={() => addToCart('tier', tier.id, tier)}
                  quantity={getQuantity(tier.id)}
                  onQuantityChange={(qty) => setQuantity(tier.id, qty)}
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
                  <Card className={`cursor-pointer transition-all duration-300 ${
                    selectedSalads.has(salad.id) ? 'ring-2 ring-green-500 bg-green-50' : 'hover:shadow-md'
                  }`} onClick={() => handleSaladToggle(salad.id)}>
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
                      <p className="text-gray-500">{salad.description}</p>
                      
                      {selectedSalads.has(salad.id) && (
                        <div className="flex items-center gap-2 pt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuantity(salad.id, getQuantity(salad.id) - 1);
                              }}
                              disabled={getQuantity(salad.id) <= 1}
                            >
                              -
                            </Button>
                            <span className="px-3 py-1 text-sm font-medium">{getQuantity(salad.id)}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuantity(salad.id, getQuantity(salad.id) + 1);
                              }}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            onClick={(e) => {
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
                  <Card className={`cursor-pointer transition-all duration-300 ${
                    selectedAddOns.has(addOn.id) ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                  }`} onClick={() => handleAddOnToggle(addOn.id)}>
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
                      <div className="text-sm text-gray-500">
                        Category: {addOn.category}
                      </div>
                      
                      {selectedAddOns.has(addOn.id) && (
                        <div className="flex items-center gap-2 pt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuantity(addOn.id, getQuantity(addOn.id) - 1);
                              }}
                              disabled={getQuantity(addOn.id) <= 1}
                            >
                              -
                            </Button>
                            <span className="px-3 py-1 text-sm font-medium">{getQuantity(addOn.id)}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuantity(addOn.id, getQuantity(addOn.id) + 1);
                              }}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            onClick={(e) => {
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
        </>
      )}
    </div>
  );
};

// Individual Tier Card Component (for single-person ordering)
interface TierCardProps {
  tier: LunchPacketTier;
  isSelected: boolean;
  selectedProtein: string | undefined;
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
  index
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className={`h-full cursor-pointer transition-all duration-300 ${
        isSelected ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:shadow-md'
      }`} onClick={onSelect}>
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
              <div className="grid gap-2">
                {PROTEIN_OPTIONS.map((protein) => {
                  const isSelected = selectedProtein === protein;
                  
                  return (
                    <button
                      key={protein}
                      onClick={(e) => {
                        e.stopPropagation();
                        onProteinSelect(protein);
                      }}
                      className={`text-left p-2 rounded border transition-all duration-200 ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-100 ring-1 ring-amber-200' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${isSelected ? 'text-amber-800' : 'text-gray-800'}`}>
                          {protein}
                        </span>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Quantity and Add to Cart */}
              {selectedProtein && (
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuantityChange(quantity - 1);
                      }}
                      disabled={quantity <= 1}
                    >
                      -
                    </Button>
                    <span className="px-3 py-1 text-sm font-medium">{quantity}</span>
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuantityChange(quantity + 1);
                      }}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart();
                    }}
                    className="flex-1"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LunchPacketsMenu; 