import React from 'react';

interface CheckoutProps {
  productType: string; // e.g., "Alfajores", "Empanadas"
}

const Checkout: React.FC<CheckoutProps> = ({ productType }) => {
  return (
    <div>
      <h1>{productType} Checkout</h1>
      <p>Delivery Options</p>
      {/* Reusable content/logic for checkout will go here */}
      {/* This could include address forms, payment integration, etc. */}
    </div>
  );
};

export default Checkout;
