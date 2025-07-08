import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminBooks from './AdminBooks';
import AdminBorrowings from './AdminBorrowings';
import AdminFines from './AdminFines';
import AdminUsers from './AdminUsers';

const AdminPanel = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/books" replace />} />
      <Route path="/books" element={<AdminBooks />} />
      <Route path="/borrowings" element={<AdminBorrowings />} />
      <Route path="/fines" element={<AdminFines />} />
      <Route path="/users" element={<AdminUsers />} />
    </Routes>
  );
};

export default AdminPanel; 