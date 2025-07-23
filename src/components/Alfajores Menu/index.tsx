import React from 'react';
import { AlfajoresGrid, type AlfajoresItemProps } from './AlfajoresGrid';
import { useCartStore } from '@/store/cart';
import { useCartAlertStore } from '@/components/ui/cart-alert';

// Sample alfajores data - this would typically come from props or API
const SAMPLE_ALFAJORES: AlfajoresItemProps[] = [
  {
    id: 'alfajores-classic',
    name: 'Alfajores - Classic',
    description: 'South american butter cookies: shortbread / dulce de leche',
    price: 2.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: 'One Piece',
    featured: true,
    image: '/images/menu/alfajores.png',
  },
  {
    id: 'alfajores-chocolate',
    name: 'Alfajores - Chocolate',
    description: 'Dulce de leche / dark chocolate / peruvian sea salt',
    price: 2.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: 'One Piece',
    image: '/images/menu/alfajores.png',
  },
  {
    id: 'alfajores-lemon',
    name: 'Alfajores - Lemon',
    description: 'Shortbread / dulce de leche / lemon royal icing',
    price: 2.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: 'One Piece',
    image: '/images/menu/alfajores.png',
  },
  {
    id: 'alfajores-gluten-free',
    name: 'Alfajores - Gluten-Free',
    description: 'Gluten-free dulce de leche butter cookies',
    price: 2.5,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    servingSize: 'One Piece',
    image: '/images/menu/alfajores.png',
  },
];

interface AlfajoresMenuProps {
  alfajores?: AlfajoresItemProps[];
}

function AlfajoresMenu({ alfajores = SAMPLE_ALFAJORES }: AlfajoresMenuProps) {
  const { addItem } = useCartStore();
  const { showAlert } = useCartAlertStore();

  const handleAddToCart = (item: AlfajoresItemProps) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
    });

    showAlert(`1 ${item.name} has been added to your cart.`);
  };

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="bg-orange-500 py-6 text-center text-white mb-8">
        <h1 className="font-semibold text-3xl md:text-4xl">Alfajores Menu</h1>
        <p className="mt-2 text-orange-100 max-w-2xl mx-auto px-4">
          Handcrafted Argentine cookies filled with rich dulce de leche
        </p>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 pb-8">
        <AlfajoresGrid alfajores={alfajores} onAddToCart={handleAddToCart} />
      </div>
    </div>
  );
}

// Keep the original banner component for backward compatibility
export function AlfajoresMenuBanner() {
  return (
    <div className="bg-orange-500 py-3 text-center text-white font-semibold text-2xl">Menu</div>
  );
}

export default AlfajoresMenu;
