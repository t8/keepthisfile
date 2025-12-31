import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorContextType {
  showError: (message: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: React.ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    // Make error messages user-friendly
    const userFriendlyMessage = makeUserFriendly(message);
    setError(userFriendlyMessage);
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setError(null);
    }, 8000);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  // Set up global error handlers
  React.useEffect(() => {
    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);
      showError(event.error?.message || 'An unexpected error occurred');
      event.preventDefault(); // Prevent default browser error handling
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      const errorMessage = event.reason?.message || event.reason || 'An unexpected error occurred';
      showError(errorMessage);
      event.preventDefault(); // Prevent default browser error handling
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [showError]);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      <AnimatePresence>
        {error && (
          <ErrorNotification message={error} onDismiss={dismissError} />
        )}
      </AnimatePresence>
    </ErrorContext.Provider>
  );
}

function ErrorNotification({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-red-50 border-2 border-red-200 rounded-xl shadow-2xl max-w-md w-full p-4 pointer-events-auto"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
            <p className="text-sm text-red-800 break-words">{message}</p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Helper function to make error messages user-friendly
function makeUserFriendly(error: string): string {
  // Network errors
  if (error.includes('Failed to fetch') || error.includes('NetworkError') || error.includes('network')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  if (error.includes('timeout') || error.includes('timed out')) {
    return 'The request took too long. Please try again.';
  }

  // HTTP status errors
  if (error.includes('401') || error.includes('Unauthorized')) {
    return 'You need to sign in to perform this action.';
  }

  if (error.includes('403') || error.includes('Forbidden')) {
    return 'You don\'t have permission to perform this action.';
  }

  if (error.includes('404') || error.includes('Not Found')) {
    return 'The requested resource was not found.';
  }

  if (error.includes('429') || error.includes('Too Many Requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (error.includes('500') || error.includes('Internal Server Error')) {
    return 'A server error occurred. Please try again later.';
  }

  if (error.includes('503') || error.includes('Service Unavailable')) {
    return 'The service is temporarily unavailable. Please try again later.';
  }

  // Authentication errors
  if (error.includes('Authentication required') || error.includes('auth')) {
    return 'Please sign in to continue.';
  }

  if (error.includes('token') && (error.includes('expired') || error.includes('invalid'))) {
    return 'Your session has expired. Please sign in again.';
  }

  // Upload errors - but preserve our specific messages
  if (error.includes('Your file is greater than 100kb')) {
    return error; // Preserve our specific message
  }

  if (error.includes('Upload failed') || (error.includes('upload') && !error.includes('Please sign in'))) {
    return 'Failed to upload file. Please check your connection and try again.';
  }

  if (error.includes('File too large') || (error.includes('size') && !error.includes('100kb'))) {
    return 'The file is too large. Please choose a smaller file.';
  }

  // Payment errors
  if (error.includes('Payment') || error.includes('payment')) {
    return 'There was an issue processing your payment. Please try again.';
  }

  if (error.includes('session') && error.includes('not found')) {
    return 'The payment session has expired. Please start over.';
  }

  // Generic API errors
  if (error.includes('Invalid response') || error.includes('parse')) {
    return 'Received an invalid response from the server. Please try again.';
  }

  if (error.includes('HTTP')) {
    return 'A server error occurred. Please try again.';
  }

  // If it's already a user-friendly message, return as-is
  // Otherwise, return a generic message
  if (error.length < 100 && !error.includes('Error:') && !error.includes('Exception:')) {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

