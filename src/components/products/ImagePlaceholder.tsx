import React from 'react';
import { Utensils, Coffee, Cookie } from 'lucide-react';

interface ImagePlaceholderProps {
  productName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  category?: 'food' | 'beverage' | 'dessert' | 'default';
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  productName,
  className = '',
  size = 'md',
  category = 'default',
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  };

  // Choose icon based on category or product name
  const getIcon = () => {
    const name = productName.toLowerCase();

    if (
      category === 'dessert' ||
      name.includes('alfajor') ||
      name.includes('cookie') ||
      name.includes('dessert')
    ) {
      return <Cookie className="w-8 h-8 mx-auto" />;
    }

    if (
      category === 'beverage' ||
      name.includes('coffee') ||
      name.includes('tea') ||
      name.includes('drink')
    ) {
      return <Coffee className="w-8 h-8 mx-auto" />;
    }

    // Default to food icon
    return <Utensils className="w-8 h-8 mx-auto" />;
  };

  // Choose gradient based on category
  const getGradientClasses = () => {
    const name = productName.toLowerCase();

    if (
      category === 'dessert' ||
      name.includes('alfajor') ||
      name.includes('cookie') ||
      name.includes('dessert')
    ) {
      return 'bg-gradient-to-br from-orange-100 to-orange-200';
    }

    if (
      category === 'beverage' ||
      name.includes('coffee') ||
      name.includes('tea') ||
      name.includes('drink')
    ) {
      return 'bg-gradient-to-br from-amber-100 to-amber-200';
    }

    if (name.includes('carne') || name.includes('beef') || name.includes('asada')) {
      return 'bg-gradient-to-br from-red-100 to-red-200';
    }

    if (name.includes('pollo') || name.includes('chicken') || name.includes('carbon')) {
      return 'bg-gradient-to-br from-yellow-100 to-yellow-200';
    }

    // Default gradient
    return 'bg-gradient-to-br from-gray-100 to-gray-200';
  };

  const getIconColor = () => {
    const name = productName.toLowerCase();

    if (
      category === 'dessert' ||
      name.includes('alfajor') ||
      name.includes('cookie') ||
      name.includes('dessert')
    ) {
      return 'text-orange-600';
    }

    if (
      category === 'beverage' ||
      name.includes('coffee') ||
      name.includes('tea') ||
      name.includes('drink')
    ) {
      return 'text-amber-600';
    }

    if (name.includes('carne') || name.includes('beef') || name.includes('asada')) {
      return 'text-red-600';
    }

    if (name.includes('pollo') || name.includes('chicken') || name.includes('carbon')) {
      return 'text-yellow-600';
    }

    return 'text-gray-600';
  };

  const getTextColor = () => {
    const name = productName.toLowerCase();

    if (
      category === 'dessert' ||
      name.includes('alfajor') ||
      name.includes('cookie') ||
      name.includes('dessert')
    ) {
      return 'text-orange-700';
    }

    if (
      category === 'beverage' ||
      name.includes('coffee') ||
      name.includes('tea') ||
      name.includes('drink')
    ) {
      return 'text-amber-700';
    }

    if (name.includes('carne') || name.includes('beef') || name.includes('asada')) {
      return 'text-red-700';
    }

    if (name.includes('pollo') || name.includes('chicken') || name.includes('carbon')) {
      return 'text-yellow-700';
    }

    return 'text-gray-700';
  };

  return (
    <div
      className={`
      ${sizeClasses[size]} 
      ${getGradientClasses()}
      rounded-lg flex items-center justify-center
      ${className}
    `}
    >
      <div className="text-center p-2">
        <div className={`${getIconColor()} mb-1`}>{getIcon()}</div>
        <span className={`text-xs ${getTextColor()} font-medium leading-tight`}>{productName}</span>
      </div>
    </div>
  );
};
