"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContextType {
    toasts: ToastProps[];
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const addToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer />
            <ToastContextUpdater />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// This is the actual visual component that renders the toasts
function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function Toast({ toast, onClose }: { toast: ToastProps; onClose: () => void }) {
    useEffect(() => {
        // Auto-dismiss after 3 seconds
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor =
        toast.type === 'success' ? 'bg-green-50 border-green-200' :
            toast.type === 'error' ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200';

    const textColor =
        toast.type === 'success' ? 'text-green-800' :
            toast.type === 'error' ? 'text-red-800' :
                'text-blue-800';

    return (
        <div className={`${bgColor} ${textColor} px-4 py-3 rounded-md shadow-md border flex items-center justify-between min-w-[300px]`}>
            <p>{toast.message}</p>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// Helper functions that don't rely on hooks directly
// This will allow us to use them outside of components
let toastContextValue: ToastContextType | undefined;

export const toast = {
    _getContext: () => {
        return toastContextValue;
    },
    _setContext: (context: ToastContextType | undefined) => {
        toastContextValue = context;
    },
    success: (message: string) => {
        const context = toastContextValue;
        if (context) {
            context.addToast(message, 'success');
        } else {
            console.warn('Toast context not available. Make sure ToastProvider is in the component tree.');
        }
    },
    error: (message: string) => {
        const context = toastContextValue;
        if (context) {
            context.addToast(message, 'error');
        } else {
            console.warn('Toast context not available. Make sure ToastProvider is in the component tree.');
        }
    },
    info: (message: string) => {
        const context = toastContextValue;
        if (context) {
            context.addToast(message, 'info');
        } else {
            console.warn('Toast context not available. Make sure ToastProvider is in the component tree.');
        }
    }
};

// Update the context value when it changes
export function ToastContextUpdater() {
    const context = useToast();

    useEffect(() => {
        toast._setContext(context);
        return () => {
            toast._setContext(undefined);
        };
    }, [context]);

    return null;
} 