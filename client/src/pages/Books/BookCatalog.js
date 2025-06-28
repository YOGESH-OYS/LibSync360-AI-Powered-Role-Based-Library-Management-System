import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const BookCatalog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    genre: '',
    availableOnly: false,
    minRating: 0
  });

  // Mock data for now - will be replaced with API calls
  const mockBooks = [
    {
      id: 1,
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: '978-0743273565',
      coverImage: 'https://via.placeholder.com/150x200',
      description: 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.',
      genre: ['Fiction', 'Classic'],
      averageRating: 4.2,
      totalRatings: 150,
      availableCopies: 3,
      totalCopies: 5
    },
    {
      id: 2,
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isbn: '978-0446310789',
      coverImage: 'https://via.placeholder.com/150x200',
      description: 'The story of young Scout Finch and her father Atticus in a racially divided Alabama town.',
      genre: ['Fiction', 'Classic'],
      averageRating: 4.5,
      totalRatings: 200,
      availableCopies: 2,
      totalCopies: 4
    },
    {
      id: 3,
      title: '1984',
      author: 'George Orwell',
      isbn: '978-0451524935',
      coverImage: 'https://via.placeholder.com/150x200',
      description: 'A dystopian novel about totalitarianism and surveillance society.',
      genre: ['Fiction', 'Dystopian'],
      averageRating: 4.3,
      totalRatings: 180,
      availableCopies: 0,
      totalCopies: 3
    }
  ];

  const filteredBooks = mockBooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !filters.genre || book.genre.includes(filters.genre);
    const matchesAvailability = !filters.availableOnly || book.availableCopies > 0;
    const matchesRating = book.averageRating >= filters.minRating;
    
    return matchesSearch && matchesGenre && matchesAvailability && matchesRating;
  });

  const handleBorrow = async (bookId) => {
    try {
      // Borrow logic will be implemented later
      toast.success('Book borrowed successfully!');
    } catch (error) {
      toast.error('Failed to borrow book');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Catalog</h1>
        <p className="text-gray-600">Discover and borrow books from our extensive collection</p>
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
              onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Genres</option>
              <option value="Fiction">Fiction</option>
              <option value="Non-Fiction">Non-Fiction</option>
              <option value="Classic">Classic</option>
              <option value="Dystopian">Dystopian</option>
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.availableOnly}
                onChange={(e) => setFilters({ ...filters, availableOnly: e.target.checked })}
                className="mr-2"
              />
              Available Only
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mb-4">
        <p className="text-gray-600">
          Found {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Book Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBooks.map((book) => (
          <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-w-3 aspect-h-4">
              <img
                src={book.coverImage}
                alt={book.title}
                className="w-full h-48 object-cover"
              />
            </div>
            
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                {book.title}
              </h3>
              <p className="text-gray-600 mb-2">by {book.author}</p>
              
              <div className="flex items-center mb-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(book.averageRating) ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-1 text-sm text-gray-600">
                    ({book.totalRatings})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  {book.availableCopies} of {book.totalCopies} available
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {book.genre[0]}
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/books/${book.id}`}
                  className="flex-1 text-center py-2 px-3 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                >
                  Details
                </Link>
                <button
                  onClick={() => handleBorrow(book.id)}
                  disabled={book.availableCopies === 0}
                  className="flex-1 py-2 px-3 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {book.availableCopies > 0 ? 'Borrow' : 'Unavailable'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No books found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilters({ genre: '', availableOnly: false, minRating: 0 });
            }}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default BookCatalog; 