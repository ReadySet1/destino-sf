"use client";

import React from "react";

export function DeleteButton({ productName }: { productName: string }) {
  const handleClick = (e: React.MouseEvent) => {
    if (!confirm(`Are you sure you want to delete ${productName}?`)) {
      e.preventDefault();
    }
  };

  return (
    <button 
      type="submit"
      className="text-red-600 hover:text-red-900"
      onClick={handleClick}
    >
      Delete
    </button>
  );
} 