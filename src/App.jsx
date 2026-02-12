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
import Stocks from './components/Stocks';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const API_BASE_URL = 'https://adminapi.kevelion.com';

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

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let stopped = false;
    const refreshSeller = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/sellers`);
        let nextUser = null;
        if (res.ok) {
          const body = await res.json();
          const arr = Array.isArray(body)
            ? body
            : Array.isArray(body?.data)
            ? body.data
            : Array.isArray(body?.sellers)
            ? body.sellers
            : [];
          const matched = arr.find((s) => Number(s.id) === Number(user.id));
          if (matched) {
            nextUser = {
              ...user,
              ...matched,
              id: user.id,
              email: user.email || matched.email,
              name: user.name || matched.name || user.email,
            };
          }
        }
        if (!nextUser) {
          const res2 = await fetch(`${API_BASE_URL}/seller/${user.id}`);
          if (res2.ok) {
            const details = await res2.json();
            nextUser = {
              ...user,
              ...details,
              id: user.id,
              email: user.email || details.email,
              name: user.name || details.name || user.email,
            };
          }
        }
        if (!nextUser) return;
        const prev = String(user.approve_status || '').toLowerCase();
        const curr = String(nextUser.approve_status || '').toLowerCase();
        if (prev !== curr) {
          localStorage.setItem('retaillian_user', JSON.stringify(nextUser));
          setUser(nextUser);
        }
      } catch {}
    };
    const immediate = () => refreshSeller();
    immediate();
    const onFocus = () => refreshSeller();
    const onVisible = () => {
      if (!document.hidden) refreshSeller();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    const isApproved = String(user?.approve_status || '').toLowerCase() === 'approved';
    const pollInterval = isApproved ? 30000 : 1500;
    const interval = setInterval(() => {
      if (!stopped) refreshSeller();
    }, pollInterval);
    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, user?.id, user?.approve_status]);

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
      case 'stocks':
        return <Stocks user={user} />;
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
