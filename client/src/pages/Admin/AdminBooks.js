import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const AdminBooks = () => {
  const { logout } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  // Add book form state
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    isbn: "",
    description: "",
    genre: [],
    totalCopies: 1,
    availableCopies: 1,
    coverImage: "",
    publisher: "",
    publicationYear: new Date().getFullYear(),
    pages: 0,
  });

  const [formErrors, setFormErrors] = useState({});

  const [actionBook, setActionBook] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [hasChanged, setHasChanged] = useState(false);

  // Fetch books
  const fetchBooks = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        search: searchQuery,
        genre: selectedGenre,
      };
      const response = await adminAPI.getBooks(params);
      if (response?.error === "session_expired") {
        return;
      }
      setBooks(
        Array.isArray(response.data.data?.books) ? response.data.data.books : []
      );
      setPagination(
        response.data.data?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 1,
        }
      );
    } catch (error) {
      const isSessionExpired =
        error.response?.status === 401 &&
        typeof error.response.data?.message === "string" &&
        (error.response.data.message
          .toLowerCase()
          .includes("session expired") ||
          error.response.data.message
            .toLowerCase()
            .includes("access token required"));
      if (isSessionExpired) {
        console.log("Session expired detected in catch block");
        return;
      }
      console.log("Not session expired, showing toast:", error.response?.data);
      toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [searchQuery, selectedGenre]);

  // When opening modal, set editBook to actionBook
  useEffect(() => {
    if (actionBook) {
      console.log("[MODAL OPEN] actionBook:", actionBook);
      setEditBook({ ...actionBook });
      setIsEditing(false);
      setHasChanged(false);
    }
  }, [actionBook]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (actionBook) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [actionBook]);

  // Save changes to book
  const handleSave = async () => {
    try {
      const response = await adminAPI.update(editBook._id, editBook);
      if (response?.error === "session_expired") {
        return;
      }
      toast.success("Book updated successfully!");
      setActionBook(null);
      fetchBooks();
    } catch (error) {
      console.error("Update book error:", error);
      const isSessionExpired =
        error.response?.status === 401 &&
        typeof error.response.data?.message === "string" &&
        (error.response.data.message
          .toLowerCase()
          .includes("session expired") ||
          error.response.data.message
            .toLowerCase()
            .includes("access token required"));
      if (isSessionExpired) {
        console.log("Session expired detected in catch block");
        return;
      }
      console.log("Not session expired, showing toast:", error.response?.data);
      toast.error("Failed to update book");
    }
  };

  // Add new book
  const handleAddBook = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = {};
    if (!newBook.title.trim()) errors.title = "Title is required";
    if (!newBook.author.trim()) errors.author = "Author is required";
    if (!newBook.isbn.trim()) errors.isbn = "ISBN is required";
    if (newBook.genre.length === 0)
      errors.genre = "At least one genre is required";
    if (newBook.totalCopies < 1)
      errors.totalCopies = "Total copies must be at least 1";
    if (newBook.availableCopies < 0)
      errors.availableCopies = "Available copies cannot be negative";
    if (newBook.availableCopies > newBook.totalCopies)
      errors.availableCopies = "Available copies cannot exceed total copies";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const response = await adminAPI.addBook(newBook);
      if (response?.error === "session_expired") {
        return;
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setNewBook({
        title: "",
        author: "",
        isbn: "",
        description: "",
        genre: [],
        totalCopies: 1,
        availableCopies: 1,
        coverImage: "",
        publisher: "",
        publicationYear: new Date().getFullYear(),
        pages: 0,
      });
      setFormErrors({});
      setShowAddForm(false);
      fetchBooks();
      toast.success("Book added successfully!");
    } catch (error) {
      console.error("Error adding book:", error);
      const isSessionExpired =
        error.response?.status === 401 &&
        typeof error.response.data?.message === "string" &&
        (error.response.data.message
          .toLowerCase()
          .includes("session expired") ||
          error.response.data.message
            .toLowerCase()
            .includes("access token required"));
      if (isSessionExpired) {
        console.log("Session expired detected in catch block");
        return;
      }
      console.log("Not session expired, showing toast:", error.response?.data);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to add book");
      }
    }
  };

  // Delete book
  const handleDeleteBook = async (bookId, bookTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${bookTitle}"?`)) {
      return;
    }
    try {
      const response = await adminAPI.deleteBook(bookId);
      if (response?.error === "session_expired") {
        return;
      }
      setBooks(books.filter((book) => book._id !== bookId));
      toast.success("Book deleted successfully!");
    } catch (error) {
      console.error("Error deleting book:", error);
      const isSessionExpired =
        error.response?.status === 401 &&
        typeof error.response.data?.message === "string" &&
        (error.response.data.message
          .toLowerCase()
          .includes("session expired") ||
          error.response.data.message
            .toLowerCase()
            .includes("access token required"));
      if (isSessionExpired) {
        console.log("Session expired detected in catch block");
        return;
      }
      console.log("Not session expired, showing toast:", error.response?.data);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete book");
      }
    }
  };

  // Handle genre input
  const handleGenreChange = (e) => {
    const value = e.target.value;
    if (value && !newBook.genre.includes(value)) {
      setNewBook({ ...newBook, genre: [...newBook.genre, value] });
      e.target.value = "";
    }
  };

  const removeGenre = (genreToRemove) => {
    setNewBook({
      ...newBook,
      genre: newBook.genre.filter((g) => g !== genreToRemove),
    });
  };

  // Available genres for selection
  const availableGenres = [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Engineering",
    "Fiction",
    "Non-Fiction",
    "Classic",
    "Romance",
    "Dystopian",
    "Science Fiction",
    "Philosophy",
    "History",
    "Psychology",
    "Economics",
    "Business",
    "Design",
    "Medicine",
    "Environmental Science",
    "Astronomy",
    "Linguistics",
    "Political Science",
    "Sociology",
    "Architecture",
    "Music",
    "Film Studies",
    "Poetry",
    "Art",
  ];

  return (
    <>
      {/* Blur and Modal Overlay */}
      {actionBook && editBook && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-all"
            onClick={() => setActionBook(null)}
            aria-label="Close modal"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full mx-4 p-10 flex flex-col max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActionBook(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                Book Details
              </h2>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editBook.title || ""}
                      readOnly={!isEditing}
                      onChange={(e) => {
                        setEditBook({ ...editBook, title: e.target.value });
                        setHasChanged(true);
                        console.log("[FIELD CHANGE] title:", e.target.value);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${
                        !isEditing ? "cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                      Author
                    </label>
                    <input
                      type="text"
                      value={editBook.author || ""}
                      readOnly={!isEditing}
                      onChange={(e) => {
                        setEditBook({ ...editBook, author: e.target.value });
                        setHasChanged(true);
                        console.log("[FIELD CHANGE] author:", e.target.value);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${
                        !isEditing ? "cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                      ISBN
                    </label>
                    <input
                      type="text"
                      value={editBook.isbn || ""}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={editBook.publisher || ""}
                      readOnly={!isEditing}
                      onChange={(e) => {
                        setEditBook({ ...editBook, publisher: e.target.value });
                        setHasChanged(true);
                        console.log(
                          "[FIELD CHANGE] publisher:",
                          e.target.value
                        );
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${
                        !isEditing ? "cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                      Year
                    </label>
                    <input
                      type="number"
                      value={editBook.publicationYear || ""}
                      readOnly={!isEditing}
                      onChange={(e) => {
                        setEditBook({
                          ...editBook,
                          publicationYear: e.target.value,
                        });
                        setHasChanged(true);
                        console.log(
                          "[FIELD CHANGE] publicationYear:",
                          e.target.value
                        );
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${
                        !isEditing ? "cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                      Genre
                    </label>
                    {!isEditing ? (
                      <input
                        type="text"
                        value={
                          Array.isArray(editBook.genre)
                            ? editBook.genre.join(", ")
                            : editBook.genre || ""
                        }
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Array.isArray(editBook.genre) &&
                            editBook.genre.map((genre) => (
                              <span
                                key={genre}
                                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
                              >
                                {genre}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditBook({
                                      ...editBook,
                                      genre: editBook.genre.filter(
                                        (g) => g !== genre
                                      ),
                                    });
                                    setHasChanged(true);
                                    console.log("[FIELD CHANGE] genre:", genre);
                                  }}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                        </div>
                        <select
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value && !editBook.genre.includes(value)) {
                              setEditBook({
                                ...editBook,
                                genre: [...editBook.genre, value],
                              });
                              setHasChanged(true);
                              console.log("[FIELD CHANGE] genre:", value);
                            }
                            e.target.value = "";
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a genre to add</option>
                          {availableGenres
                            .filter((g) => !editBook.genre.includes(g))
                            .map((genre) => (
                              <option key={genre} value={genre}>
                                {genre}
                              </option>
                            ))}
                        </select>
                      </>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                      Available
                    </label>
                    <input
                      type="number"
                      value={editBook.availableCopies || 0}
                      readOnly={!isEditing}
                      onChange={(e) => {
                        setEditBook({
                          ...editBook,
                          availableCopies: e.target.value,
                        });
                        setHasChanged(true);
                        console.log(
                          "[FIELD CHANGE] availableCopies:",
                          e.target.value
                        );
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${
                        !isEditing ? "cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                      Total Copies
                    </label>
                    <input
                      type="number"
                      value={editBook.totalCopies || 0}
                      readOnly={!isEditing}
                      onChange={(e) => {
                        setEditBook({
                          ...editBook,
                          totalCopies: e.target.value,
                        });
                        setHasChanged(true);
                        console.log(
                          "[FIELD CHANGE] totalCopies:",
                          e.target.value
                        );
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${
                        !isEditing ? "cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                    Description
                  </label>
                  <textarea
                    value={editBook.description || ""}
                    readOnly={!isEditing}
                    onChange={(e) => {
                      setEditBook({ ...editBook, description: e.target.value });
                      setHasChanged(true);
                      console.log(
                        "[FIELD CHANGE] description:",
                        e.target.value
                      );
                    }}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${
                      !isEditing ? "cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  {!isEditing ? (
                    <button
                      type="button"
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      onClick={() => {
                        setIsEditing(true);
                        console.log("[EDIT CLICKED]");
                      }}
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                        onClick={() => {
                          setEditBook({ ...actionBook });
                          setIsEditing(false);
                          setHasChanged(false);
                          console.log("[CANCEL CLICKED]");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`px-5 py-2 rounded-lg font-semibold text-white transition-colors ${
                          hasChanged
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
                        onClick={async () => {
                          console.log("[SAVE CLICKED] Payload:", editBook);
                          try {
                            await handleSave();
                            console.log("[SAVE SUCCESS]");
                          } catch (err) {
                            console.log("[SAVE ERROR]", err);
                          }
                        }}
                        disabled={!hasChanged}
                      >
                        Save
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </>
      )}
      {/* Main page content, always visible but blurred if modal open */}
      <div
        className={
          actionBook
            ? "min-h-screen bg-gray-50 dark:bg-gray-900 p-6 overflow-hidden pointer-events-none select-none blur-sm"
            : "min-h-screen bg-gray-50 dark:bg-gray-900 p-6"
        }
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Book Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage the library's book collection
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New Book
            </motion.button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
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
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Genres</option>
                {availableGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Books Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {books.map((book) => (
                  <motion.div
                    key={book._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
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
                        <button
                          onClick={() => setActionBook(book)}
                          className="flex-1 py-2 px-3 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                        >
                          Take Action
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No books found in the library.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => fetchBooks(page)}
                      className={`px-3 py-2 rounded-lg ${
                        page === pagination.page
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Add Book Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Add New Book
                    </h2>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddBook} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={newBook.title}
                        onChange={(e) =>
                          setNewBook({ ...newBook, title: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.title
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.title && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.title}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Author *
                      </label>
                      <input
                        type="text"
                        value={newBook.author}
                        onChange={(e) =>
                          setNewBook({ ...newBook, author: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.author
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.author && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.author}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ISBN *
                      </label>
                      <input
                        type="text"
                        value={newBook.isbn}
                        onChange={(e) =>
                          setNewBook({ ...newBook, isbn: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.isbn ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {formErrors.isbn && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.isbn}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Publisher
                      </label>
                      <input
                        type="text"
                        value={newBook.publisher}
                        onChange={(e) =>
                          setNewBook({ ...newBook, publisher: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Publication Year
                      </label>
                      <input
                        type="number"
                        value={newBook.publicationYear}
                        onChange={(e) =>
                          setNewBook({
                            ...newBook,
                            publicationYear: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pages
                      </label>
                      <input
                        type="number"
                        value={newBook.pages}
                        onChange={(e) =>
                          setNewBook({
                            ...newBook,
                            pages: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Copies *
                      </label>
                      <input
                        type="number"
                        value={newBook.totalCopies}
                        onChange={(e) =>
                          setNewBook({
                            ...newBook,
                            totalCopies: parseInt(e.target.value),
                          })
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.totalCopies
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.totalCopies && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.totalCopies}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Copies *
                      </label>
                      <input
                        type="number"
                        value={newBook.availableCopies}
                        onChange={(e) =>
                          setNewBook({
                            ...newBook,
                            availableCopies: parseInt(e.target.value),
                          })
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.availableCopies
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.availableCopies && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.availableCopies}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newBook.description}
                      onChange={(e) =>
                        setNewBook({ ...newBook, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cover Image URL
                    </label>
                    <input
                      type="url"
                      value={newBook.coverImage}
                      onChange={(e) =>
                        setNewBook({ ...newBook, coverImage: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Genres *
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newBook.genre.map((genre) => (
                        <span
                          key={genre}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
                        >
                          {genre}
                          <button
                            type="button"
                            onClick={() => removeGenre(genre)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <select
                      onChange={handleGenreChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a genre to add</option>
                      {availableGenres.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                    {formErrors.genre && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.genre}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Book
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Success Animation */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center"
              >
                <CheckCircleIcon className="h-6 w-6 mr-2" />
                <span className="font-medium">Book added successfully! ✅</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default AdminBooks;
