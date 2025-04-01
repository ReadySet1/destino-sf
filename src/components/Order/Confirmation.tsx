import React from 'react';

interface ConfirmationProps {
  productType: string; // e.g., "Alfajores", "Empanadas"
}

const Confirmation: React.FC<ConfirmationProps> = ({ productType }) => {
  return (
    <div>
      <h1>{productType} Order Confirmation</h1>
      <p>Order Tracking</p>
      {/* Reusable content/logic for confirmation will go here */}
      {/* This could include order summary, tracking link, etc. */}
    </div>
  );
};

export default Confirmation;
