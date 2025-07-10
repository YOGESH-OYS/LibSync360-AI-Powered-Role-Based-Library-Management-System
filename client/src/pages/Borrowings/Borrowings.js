// TODO: When adding API calls to this page, use the session expiry utility functions:
// import { isSessionExpiredResponse, isSessionExpiredError } from '../../utils/sessionUtils';
// and follow the same error handling pattern as in BookCatalog.js and Dashboard.js.

import React, { useEffect, useState } from "react";
import { borrowingsAPI, userAPI } from "../../services/api";

const Borrowings = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [borrowedBooks, setBorrowedBooks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [borrowingsRes, profileRes] = await Promise.all([
          borrowingsAPI.getMyBorrowings({}),
          userAPI.getProfile(),
        ]);
        setBorrowings(
          borrowingsRes.data.fines ? [] : borrowingsRes.data.borrowings || []
        );
        setBorrowedBooks(profileRes.data.borrowedBooks || []);
      } catch (err) {
        setBorrowings([]);
        setBorrowedBooks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openModal = (borrowing) => {
    setSelected(borrowing);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  // Helper to get fineAccrued from borrowedBooks if available
  const getFineForSelected = () => {
    if (!selected) return 0;
    // Try to find the fineAccrued from the user's borrowedBooks array
    let match = null;
    if (selected.book && selected.book._id) {
      match = borrowedBooks.find(
        (b) => b.bookId === selected.book._id || b.bookId === selected.bookId
      );
    } else if (selected.bookId) {
      match = borrowedBooks.find((b) => b.bookId === selected.bookId);
    }
    if (match && match.fineAccrued !== undefined) return match.fineAccrued;
    // Fallback to calculated fine from borrowing object
    return (
      selected.fineAccrued ||
      selected.fine ||
      selected.amount ||
      selected.calculatedFine ||
      0
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Borrowed Books</h1>
      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : borrowings.length === 0 ? (
        <div className="text-gray-600">No books currently borrowed.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {borrowings.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-lg shadow-md flex flex-col"
            >
              <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    b.book?.coverImage ||
                    "https://via.placeholder.com/300x400/4A90E2/FFFFFF?text=No+Cover"
                  }
                  alt={b.book?.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://via.placeholder.com/300x400/4A90E2/FFFFFF?text=No+Cover";
                  }}
                />
              </div>
              <div className="flex-1 p-4 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
                  {b.book?.title}
                </h3>
                <button
                  className="mt-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  onClick={() => openModal(b)}
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Details Modal */}
      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={closeModal}
            >
              &times;
            </button>
            <div className="flex gap-6">
              <img
                src={
                  selected.book?.coverImage ||
                  "https://via.placeholder.com/120x160/4A90E2/FFFFFF?text=No+Cover"
                }
                alt={selected.book?.title}
                className="w-28 h-40 object-cover rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://via.placeholder.com/120x160/4A90E2/FFFFFF?text=No+Cover";
                }}
              />
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {selected.book?.title}
                </h2>
                <div className="text-gray-700 mb-1">
                  {selected.book?.author}
                </div>
                <div className="text-gray-500 text-sm mb-4">
                  ISBN: {selected.book?.isbn}
                </div>
                <div className="mt-4 space-y-2">
                  <div>
                    <span className="font-semibold">Borrowed:</span>{" "}
                    {selected.borrowedAt
                      ? new Date(selected.borrowedAt).toLocaleString()
                      : "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Due:</span>{" "}
                    {selected.dueDate
                      ? new Date(selected.dueDate).toLocaleString()
                      : "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Fine:</span> ₹
                    {getFineForSelected()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Borrowings;
