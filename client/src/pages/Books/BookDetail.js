import React from 'react';
import { useParams } from 'react-router-dom';

const BookDetail = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Book Details</h1>
      <p className="text-gray-600">Book ID: {id}</p>
      <p className="text-gray-600">This page will show detailed book information.</p>
    </div>
  );
};

export default BookDetail; 