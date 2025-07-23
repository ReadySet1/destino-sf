'use client';

import { useActionState } from 'react';
import { deleteCategoryAction, type ActionResult } from './actions';

interface DeleteCategoryFormProps {
  categoryId: string;
  categoryName: string;
  productCount: number;
}

const initialState: ActionResult = {
  success: false,
  message: '',
};

export default function DeleteCategoryForm({
  categoryId,
  categoryName,
  productCount,
}: DeleteCategoryFormProps) {
  // useActionState manages state returned from the server action
  const [state, formAction] = useActionState(deleteCategoryAction, initialState);

  // Although we don't display state.message here, using the hook resolves type issues
  // You could add logic here later to display state.message if needed

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={categoryId} />
      <button
        type="submit"
        className={`text-red-600 hover:text-red-900 ml-4 ${productCount > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={productCount > 0}
        title={
          productCount > 0
            ? `Cannot delete category '${categoryName}' with ${productCount} products`
            : `Delete category '${categoryName}'`
        }
      >
        Delete
      </button>
      {/* Optionally display feedback based on state */}
      {/* {state.message && <p className={`text-sm ml-2 ${state.success ? 'text-green-600' : 'text-red-600'}`}>{state.message}</p>} */}
    </form>
  );
}
