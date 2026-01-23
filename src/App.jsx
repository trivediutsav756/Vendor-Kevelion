// App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MyProfile from './components/MyProfile';
import PackageHistory from './components/PackageHistory';
import Category from './components/Category';
import Subcategory from './components/Subcategory';
import Products from './components/Products';
import OrderDashboard from './components/OrderDashboard';
import Login from './components/Login';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Check authentication status on component mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('retaillian_auth');
    const savedUser = localStorage.getItem('retaillian_user');
    
    if (savedAuth === 'true' && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('retaillian_auth');
    localStorage.removeItem('retaillian_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard user={user} onNavigate={setActiveSection} />;
      case 'myprofile':
        return <MyProfile user={user} />;
      case 'packagehistory':
        return <PackageHistory user={user} />;
      case 'category':
        return <Category user={user} />;
      case 'subcategory':
        return <Subcategory user={user} />;
      case 'products':
        return <Products user={user} />;
      case 'ordermanagement':
        return <OrderDashboard user={user} />;
      default:
        return <Dashboard user={user} onNavigate={setActiveSection} />;
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;