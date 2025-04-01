import React from 'react';

interface ProductSelectionProps {
  productType: string; // e.g., "Alfajores", "Empanadas"
}

const ProductSelection: React.FC<ProductSelectionProps> = ({ productType }) => {
  return (
    <div>
      <h1>{productType} Product Selection</h1>
      <p>Browse varieties</p>
      {/* Reusable content/logic for product selection will go here */}
      {/* This could include fetching products, displaying them, etc. */}
    </div>
  );
};

export default ProductSelection; 