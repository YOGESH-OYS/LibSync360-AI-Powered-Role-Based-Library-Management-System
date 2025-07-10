// TODO: When adding API calls to this page, use the session expiry utility functions:
// import { isSessionExpiredResponse, isSessionExpiredError } from '../../utils/sessionUtils';
// and follow the same error handling pattern as in BookCatalog.js and Dashboard.js.

import React, { useEffect, useState } from "react";
import { finesAPI } from "../../services/api";

const Fines = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 3;

  useEffect(() => {
    const fetchFines = async () => {
      setLoading(true);
      try {
        const res = await finesAPI.getMyFines({});
        setFines(res.data.fines || []);
      } catch (err) {
        setFines([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFines();
  }, []);

  // Filter fines by search (use borrowing.book.title)
  const filteredFines = fines.filter((f) =>
    f.borrowing?.book?.title?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredFines.length / pageSize);
  const paginatedFines = filteredFines.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Calculate stats from fines only
  const finesPaid = fines
    .filter((f) => f.status === "paid")
    .reduce((sum, f) => sum + f.amount, 0);
  const finesToPay = fines
    .filter((f) => f.status !== "paid")
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Fines</h1>
      {/* Stats UI */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8 flex flex-wrap gap-6">
        <div className="flex-1 min-w-[180px] text-center">
          <div className="text-gray-500">Fines Paid</div>
          <div className="text-2xl font-bold text-green-600">₹{finesPaid}</div>
        </div>
        <div className="flex-1 min-w-[180px] text-center">
          <div className="text-gray-500">Fines To Pay</div>
          <div className="text-2xl font-bold text-red-600">₹{finesToPay}</div>
        </div>
      </div>
      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by book name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {/* Fines List as Notification Cards */}
      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : paginatedFines.length === 0 ? (
        <div className="text-gray-600">No fines found.</div>
      ) : (
        <div className="space-y-4">
          {paginatedFines.map((f) => {
            const bookStatus =
              f.borrowing?.status === "returned" ? "Returned" : "With Student";
            const fineStatus = f.status === "paid" ? "Paid" : "Unpaid";
            return (
              <div
                key={f._id}
                className="flex items-center justify-between bg-white rounded-lg shadow p-4 border-l-4 border-red-500"
              >
                <div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {f.borrowing?.book?.title || "Book not found"}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {f.borrowing?.book?.author || ""}
                  </div>
                  <div className="text-gray-400 text-xs">
                    ISBN: {f.borrowing?.book?.isbn || ""}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                      Book: {bookStatus}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        f.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      Fine: {fineStatus}
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  ₹{f.amount}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            &lt;
          </button>
          <span className="font-semibold">
            {page} / {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default Fines;
