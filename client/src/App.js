import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import BookCatalog from './pages/Books/BookCatalog';
import BookDetail from './pages/Books/BookDetail';
import MyBooks from './pages/Books/MyBooks';
import Borrowings from './pages/Borrowings/Borrowings';
import Fines from './pages/Fines/Fines';
import Notifications from './pages/Notifications/Notifications';
import Profile from './pages/Profile/Profile';
import AdminPanel from './pages/Admin/AdminPanel';
import StaffPanel from './pages/Staff/StaffPanel';
import Awards from './pages/Awards/Awards';
import Help from './pages/Help/Help';

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/help" element={<Help />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/books" element={
          <ProtectedRoute>
            <Layout>
              <BookCatalog />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/books/:id" element={
          <ProtectedRoute>
            <Layout>
              <BookDetail />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/my-books" element={
          <ProtectedRoute>
            <Layout>
              <MyBooks />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/borrowings" element={
          <ProtectedRoute>
            <Layout>
              <Borrowings />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/fines" element={
          <ProtectedRoute>
            <Layout>
              <Fines />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Layout>
              <Notifications />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/awards" element={
          <ProtectedRoute>
            <Layout>
              <Awards />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Admin routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute requiredRole="admin">
            <Layout>
              <AdminPanel />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Staff routes */}
        <Route path="/staff/*" element={
          <ProtectedRoute requiredRole={['admin', 'staff']}>
            <Layout>
              <StaffPanel />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App; 