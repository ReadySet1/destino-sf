import React from 'react';

interface CategoryHeaderProps {
  className?: string;
  title: string;
  description?: string;
  type?: 'products' | 'menu' | 'default';
  children?: React.ReactNode;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({ 
  className = '', 
  title,
  description,
  type = 'default',
  children
}) => {
  const getBgColor = () => {
    // If custom className is provided, prefer that over default backgrounds
    if (className.includes('bg-[')) {
      return className;
    }
    
    switch (type) {
      case 'products':
      case 'menu':
        return 'bg-[hsl(var(--header-orange))]';
      default:
        return 'bg-[hsl(var(--accent))]';
    }
  };

  return (
    <div className="w-full">
      <div className={`w-full ${getBgColor()} -mt-2`}>
        <div className="max-w-[1400px] mx-auto px-4">
          <h1 className="text-white text-4xl md:text-5xl font-script text-center py-6">
            {title}
          </h1>
          {children}
        </div>
      </div>
      {description && (
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <p className="text-center text-gray-700 text-lg max-w-3xl mx-auto mb-12">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryHeader; 