/**
 * Utility functions for handling session expired errors consistently
 */

/**
 * Check if a response indicates session expired
 * @param {Object} response - The API response object
 * @returns {boolean} - True if session expired, false otherwise
 */
export const isSessionExpiredResponse = (response) => {
  return response && response.error === "session_expired";
};

/**
 * Check if an error indicates session expired
 * @param {Error} error - The error object
 * @returns {boolean} - True if session expired, false otherwise
 */
export const isSessionExpiredError = (error) => {
  return (
    error.response?.status === 401 &&
    error.response?.data?.message?.toLowerCase().includes("session expired")
  );
};

/**
 * Handle API response with session expired check
 * @param {Object} response - The API response
 * @param {Function} onSessionExpired - Callback when session expired
 * @returns {boolean} - True if session expired, false otherwise
 */
export const handleSessionExpiredResponse = (response, onSessionExpired) => {
  if (isSessionExpiredResponse(response)) {
    if (onSessionExpired) {
      onSessionExpired();
    }
    return true;
  }
  return false;
};

/**
 * Handle API error with session expired check
 * @param {Error} error - The error object
 * @param {Function} onSessionExpired - Callback when session expired
 * @returns {boolean} - True if session expired, false otherwise
 */
export const handleSessionExpiredError = (error, onSessionExpired) => {
  if (isSessionExpiredError(error)) {
    if (onSessionExpired) {
      onSessionExpired();
    }
    return true;
  }
  return false;
};

/**
 * Wrapper for API calls that handles session expired errors
 * @param {Function} apiCall - The API call function
 * @param {Function} onSessionExpired - Callback when session expired
 * @param {Function} onError - Callback for other errors
 * @returns {Promise} - The API call result
 */
export const withSessionExpiredHandling = async (
  apiCall,
  onSessionExpired,
  onError
) => {
  try {
    const response = await apiCall();

    if (isSessionExpiredResponse(response)) {
      if (onSessionExpired) {
        onSessionExpired();
      }
      return null;
    }

    return response;
  } catch (error) {
    if (isSessionExpiredError(error)) {
      if (onSessionExpired) {
        onSessionExpired();
      }
      return null;
    }

    if (onError) {
      onError(error);
    }
    throw error;
  }
};
