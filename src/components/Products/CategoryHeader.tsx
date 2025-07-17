import React from 'react';

interface CategoryHeaderProps {
  className?: string;
  titleClassName?: string;
  title: string;
  description?: string;
  type?: 'products' | 'menu' | 'default';
  children?: React.ReactNode;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  className = '',
  titleClassName = '',
  title,
  description,
  type = 'default',
}) => {
  const getBgColor = () => {
    if (className.includes('bg-[')) {
      return className;
    }

    return 'bg-destino-orange';
  };

  return (
    <div className="w-full">
      <div className={`w-full ${getBgColor()} -mt-2`}>
        <div className="max-w-[1400px] mx-auto px-4">
          {/* QUITAR font-script de aquí directamente si no lo quieres */}
          {/* O asegúrate de que titleClassName pueda sobrescribir estilos de fuente */}
          <h1 className={`text-white text-4xl md:text-5xl text-center py-6 ${titleClassName}`}>
            {title}
          </h1>
        </div>
      </div>
      {description && (
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <p
            className="mx-auto mt-3 text-xl text-slate-700 sm:mt-4 text-center"
            style={{ fontStyle: 'italic' }}
          >
            {description}
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryHeader;
