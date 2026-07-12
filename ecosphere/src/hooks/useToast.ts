import { useToast as useToastFromContext } from '../context/ToastContext';
export type { ToastOptions } from '../context/ToastContext';

export const useToast = useToastFromContext;
