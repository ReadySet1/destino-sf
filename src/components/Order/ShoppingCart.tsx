import React from 'react';

interface ShoppingCartProps {
  productType: string; // e.g., "Alfajores", "Empanadas"
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ productType }) => {
  return (
    <div>
      <h1>{productType} Shopping Cart</h1>
      <p>Review Selections</p>
      {/* Reusable content/logic for shopping cart will go here */}
      {/* This could include displaying items, totals, etc. */}
    </div>
  );
};

export default ShoppingCart;
