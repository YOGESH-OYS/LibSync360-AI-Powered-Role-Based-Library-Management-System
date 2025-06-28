import React from 'react';
import { useRouteError } from 'react-router-dom';
import { ExclamationTriangleIcon, HomeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const routeError = useRouteError();
  const errorToDisplay = error || routeError;

  const handleReset = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              We're sorry, but something unexpected happened. Please try again.
            </p>
            
            {process.env.NODE_ENV === 'development' && errorToDisplay && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <h3 className="text-sm font-medium text-red-800">Error Details:</h3>
                <pre className="mt-2 text-xs text-red-700 overflow-auto">
                  {errorToDisplay.message || errorToDisplay.toString()}
                </pre>
              </div>
            )}
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleReset}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowPathIcon className="mr-2 h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={handleGoHome}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <HomeIcon className="mr-2 h-4 w-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback; 