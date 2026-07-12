import { useState } from 'react';
import { useToast } from './useToast';

export function useOptimisticMutation<T>(
  onUpdateState: (newState: T) => void,
  onRollback: (oldState: T) => void
) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const mutate = async (
    action: () => Promise<void>,
    payload: {
      optimisticState: T;
      rollbackState: T;
      successMessage: string;
      errorMessage: string;
      undoAction?: () => void;
    }
  ) => {
    // 1. Update UI state optimistically
    onUpdateState(payload.optimisticState);
    setLoading(true);

    try {
      // 2. Perform DB write
      await action();
      
      // 3. Show Success toast
      showToast({
        message: payload.successMessage,
        type: 'success',
        undoAction: payload.undoAction
      });
    } catch (e: any) {
      console.error('Optimistic mutation failed:', e);
      // 4. Rollback on failure
      onRollback(payload.rollbackState);
      
      showToast({
        message: `${payload.errorMessage}: ${e.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading };
}
