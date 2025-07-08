import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { booksAPI, notificationsAPI, userAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  isSessionExpiredResponse,
  isSessionExpiredError,
} from "../../utils/sessionUtils";

const BookCatalog = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    genre: "",
    availableOnly: false,
    minRating: 0,
  });
  const { user } = useAuth();
  const [isNotifyOpen, setNotifyOpen] = useState(false);
  const [notifyBook, setNotifyBook] = useState(null);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);

  // Fetch books from API
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchQuery,
        genre: filters.genre,
        availableOnly: filters.availableOnly,
        minRating: filters.minRating,
        limit: 50,
      };

      const response = await booksAPI.getAll(params);
      if (isSessionExpiredResponse(response)) {
        return; // Let the global handler show the popup
      }

      setBooks(response.data.books || []);
    } catch (error) {
      console.error("Error fetching books:", error);
      if (isSessionExpiredError(error)) {
        return;
      }
      toast.error("Failed to load books");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch books when component mounts or filters change
  useEffect(() => {
    fetchBooks();
  }, [searchQuery, filters]);

  const handleBorrow = async (bookId) => {
    try {
      // Borrow logic will be implemented later
      toast.success("Book borrowed successfully!");
    } catch (error) {
      toast.error("Failed to borrow book");
    }
  };

  // Get unique genres from books for filter options
  const availableGenres = [
    ...new Set(books.flatMap((book) => book.genre || [])),
  ];

  const handleNotify = async () => {
    if (!notifyBook || !notifyMessage.trim()) return;
    setNotifyLoading(true);
    try {
      await notificationsAPI.broadcastAdmins({
        type: "system",
        title: `Staff Notification: ${notifyBook.title}`,
        message: notifyMessage,
        relatedBook: notifyBook._id,
      });
      setNotifyOpen(false);
      setNotifyBook(null);
      setNotifyMessage("");
      toast.success("Notification sent to all admins");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err.message || "Failed to notify admins"
      );
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Catalog</h1>
        <p className="text-gray-600">
          Discover and borrow books from our extensive collection
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search books by title, author, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={filters.genre}
              onChange={(e) =>
                setFilters({ ...filters, genre: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Genres</option>
              {availableGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.availableOnly}
                onChange={(e) =>
                  setFilters({ ...filters, availableOnly: e.target.checked })
                }
                className="mr-2"
              />
              Available Only
            </label>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <div className="mb-4">
          <p className="text-gray-600">
            Found {books.length} book{books.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Book Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <div
              key={book._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full"
              style={{ minHeight: 420 }}
            >
              <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    book.coverImage ||
                    "https://via.placeholder.com/300x400/4A90E2/FFFFFF?text=No+Cover"
                  }
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://via.placeholder.com/300x400/4A90E2/FFFFFF?text=No+Cover";
                  }}
                />
              </div>
              <div className="flex flex-col flex-1 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
                  {book.title}
                </h3>
                <p className="text-gray-600 mb-2 min-h-[1.5rem]">
                  by {book.author}
                </p>
                <div className="flex items-center mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(book.averageRating || 0)
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-sm text-gray-600">
                      ({book.totalRatings || 0})
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    {book.availableCopies || 0} of {book.totalCopies || 1}{" "}
                    available
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {Array.isArray(book.genre) && book.genre.length > 0
                      ? book.genre[0]
                      : "Unknown"}
                  </span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Link
                    to={`/books/${book._id}`}
                    className="flex-1 text-center py-2 px-3 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                  >
                    Details
                  </Link>
                  {user?.role === "staff" ? (
                    <button
                      onClick={() => {
                        setNotifyBook(book);
                        setNotifyOpen(true);
                        setNotifyMessage("");
                      }}
                      disabled={(book.availableCopies || 0) === 0}
                      className={`flex-1 py-2 px-3 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${
                        (book.availableCopies || 0) === 1
                          ? "border-4 border-red-500"
                          : "border border-blue-600"
                      }`}
                    >
                      Notify
                    </button>
                  ) : user?.role === "student" ? (
                    <button
                      onClick={() => handleBorrow(book._id)}
                      disabled={(book.availableCopies || 0) === 0}
                      className="flex-1 py-2 px-3 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {(book.availableCopies || 0) > 0
                        ? "Borrow"
                        : "Unavailable"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && books.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No books found matching your criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilters({ genre: "", availableOnly: false, minRating: 0 });
            }}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Notify Modal placeholder - to be implemented next */}
      {isNotifyOpen && notifyBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative border-4 border-blue-400">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setNotifyOpen(false)}
              disabled={notifyLoading}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4">Notify Admin</h2>
            <p className="mb-2">
              <strong>Book:</strong> {notifyBook.title}
            </p>
            <p className="mb-2">
              <strong>ISBN:</strong> {notifyBook.isbn || "N/A"}
            </p>
            <textarea
              className="w-full border rounded p-2 mb-4"
              rows={4}
              placeholder="Enter your message to admin..."
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              autoFocus
              disabled={notifyLoading}
            ></textarea>
            <div className="flex justify-end">
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleNotify}
                disabled={!notifyMessage.trim() || notifyLoading}
              >
                {notifyLoading ? "Notifying..." : "Notify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookCatalog;
