// TODO: When adding API calls to this page, use the session expiry utility functions:
// import { isSessionExpiredResponse, isSessionExpiredError } from '../../utils/sessionUtils';
// and follow the same error handling pattern as in BookCatalog.js and Dashboard.js.

import React from "react";

const Borrowings = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Borrowings</h1>
      <p className="text-gray-600">
        This page will show your borrowing history.
      </p>
    </div>
  );
};

export default Borrowings;
