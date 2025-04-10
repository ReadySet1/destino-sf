'use client';

import React from 'react';

interface DeleteButtonProps {
  id: string;
  onDelete: (formData: FormData) => Promise<void>;
  entityName: string;
  warningMessage?: string;
}

export function DeleteButton({ id, onDelete, entityName, warningMessage }: DeleteButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    const message = warningMessage || `Are you sure you want to delete this ${entityName}?`;
    if (!confirm(message)) {
      e.preventDefault();
    }
  };

  return (
    <form action={onDelete} className="inline">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-red-600 hover:text-red-900" onClick={handleClick}>
        Delete
      </button>
    </form>
  );
} 