
import React, { useState } from 'react';
import { InventoryProvider } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { Purchase } from './pages/Purchase';
import { Sales } from './pages/Sales';
import { Inventory } from './pages/Inventory';
import { SKUMasterPage } from './pages/SKUMaster';
import { SalesHistory } from './pages/SalesHistory';
import { AuditLog } from './pages/AuditLog';
import { Reports } from './pages/Reports';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'purchase': return <Purchase />;
      case 'sales': return <Sales />;
      case 'inventory': return <Inventory />;
      case 'skus': return <SKUMasterPage />;
      case 'history': return <SalesHistory />;
      case 'audit': return <AuditLog />;
      case 'reports': return <Reports />;
      default: return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
          <span className="text-6xl">🚧</span>
          <h2 className="text-2xl font-bold">Module Under Construction</h2>
          <p>We are still polishing the {activePage} interface.</p>
        </div>
      );
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <InventoryProvider>
        <AppContent />
      </InventoryProvider>
    </AuthProvider>
  );
};

export default App;
