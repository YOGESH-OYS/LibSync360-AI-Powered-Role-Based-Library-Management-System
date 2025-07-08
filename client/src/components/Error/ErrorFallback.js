import React from "react";
import { useAuth } from "../../context/AuthContext";

function ErrorFallback({ error, resetErrorBoundary }) {
  const { logout } = useAuth();

  // Check if it's a session expired error
  const isSessionExpired =
    error?.message?.toLowerCase().includes("session expired") ||
    error?.response?.status === 401;

  if (isSessionExpired) {
    // Handle session expired by logging out
    logout();
    return null;
  }

  return (
    <div
      role="alert"
      className="p-6 bg-red-50 border border-red-200 rounded-lg"
    >
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Something went wrong
          </h3>
        </div>
      </div>
      <div className="text-sm text-red-700">
        <p className="mb-2">An unexpected error occurred:</p>
        <pre className="bg-red-100 p-2 rounded text-xs overflow-auto">
          {error?.message || "Unknown error"}
        </pre>
      </div>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorFallback;
