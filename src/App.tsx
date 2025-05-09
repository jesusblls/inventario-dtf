import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { DesignsPage } from './pages/DesignsPage';
import { AlertsPage } from './pages/AlertsPage';
import { TrendsPage } from './pages/TrendsPage';
import { SyncPage } from './pages/SyncPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './contexts/ThemeContext';
import { Menu } from 'lucide-react';

interface User {
  id: number;
  role: 'admin' | 'user';
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    // Here you would clear any auth tokens/state
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar 
        isOpen={sidebarOpen} 
        onLogout={handleLogout}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col">
        <div className="sticky top-0 z-10 md:hidden flex items-center p-4 bg-white dark:bg-gray-800 shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 text-lg font-semibold text-gray-800 dark:text-white">DTF Manager</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const [isLoggedIn] = useState(true); // Replace with actual auth logic
  const [currentUser] = useState<User>({ id: 1, role: 'admin' }); // Replace with actual user data

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && currentUser.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={() => {}} />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/designs"
            element={
              <ProtectedRoute>
                <DesignsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trends"
            element={
              <ProtectedRoute>
                <TrendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sync"
            element={
              <ProtectedRoute>
                <SyncPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute adminOnly={true}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;