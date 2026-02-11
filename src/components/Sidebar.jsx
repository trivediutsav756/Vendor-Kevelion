// /seller/Sidebar.jsx
import React, { useState } from 'react';
import { 
  FiLayout, 
  FiGrid, 
  FiLayers, 
  FiBox,
  FiShoppingBag,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiUser,
  FiPackage
} from 'react-icons/fi';

const Sidebar = ({ activeSection, onSectionChange, onLogout, user }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isApproved = String(user?.approve_status || '').toLowerCase() === 'approved';
  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <FiLayout className="text-xl" />,
    },
    {
      id: 'category',
      label: 'Category',
      icon: <FiGrid className="text-xl" />,
    },
    {
      id: 'subcategory',
      label: 'Subcategory',
      icon: <FiLayers className="text-xl" />,
    },
    {
      id: 'products',
      label: 'Products',
      icon: <FiBox className="text-xl" />,
    },
    {
      id: 'ordermanagement',
      label: 'Order Management',
      icon: <FiShoppingBag className="text-xl" />,
    },
  ];
  const menuItems = isApproved ? allMenuItems : allMenuItems.filter(i => i.id === 'dashboard');

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    if (onLogout) {
      onLogout();
    }
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <div className={`bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-screen flex flex-col relative`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-gray-800">Seller Panel</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className={`${isCollapsed ? '' : 'mr-3'}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Profile and Logout Section */}
        <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'space-y-3' : 'space-y-4'}`}>
          
          {/* Profile Info */}
          {!isCollapsed ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  <FiUser className="text-xl" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-gray-800 truncate">{user?.name || user?.email || 'Seller'}</p>
                  <p className="text-xs text-gray-600">ID: {user?.id || 'N/A'}</p>
                </div>
              </div>
              {/* Additional Seller Details */}
              <div className="mt-2 pt-2 border-t border-blue-200 space-y-1">
                {user?.email && (
                  <div className="flex items-center text-xs text-gray-600">
                    <svg className="w-3 h-3 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                {user?.phone && (
                  <div className="flex items-center text-xs text-gray-600">
                    <svg className="w-3 h-3 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="truncate">{user.phone}</span>
                  </div>
                )}
                {user?.business_name && (
                  <div className="flex items-center text-xs text-gray-600">
                    <svg className="w-3 h-3 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate font-medium">{user.business_name}</span>
                  </div>
                )}
                {user?.city && (
                  <div className="flex items-center text-xs text-gray-600">
                    <svg className="w-3 h-3 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{user.city}{user.state ? `, ${user.state}` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                <FiUser className="text-lg" />
              </div>
            </div>
          )}

          {!isCollapsed && (
            <div className="mt-2 text-xs">
              <span className={`inline-block px-2 py-1 rounded ${
                isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {isApproved ? 'Approved' : (String(user?.approve_status || 'Pending'))}
              </span>
            </div>
          )}

          {/* My Profile Button */}
          <button
            onClick={() => onSectionChange('myprofile')}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
              activeSection === 'myprofile'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'My Profile' : ''}
          >
            <span className={`${isCollapsed ? '' : 'mr-3'}`}>
              <FiUser className="text-xl" />
            </span>
            {!isCollapsed && (
              <span className="font-medium">My Profile</span>
            )}
          </button>

          {/* Package History Button */}
          <button
            onClick={() => onSectionChange('packagehistory')}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
              activeSection === 'packagehistory'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Package History' : ''}
          >
            <span className={`${isCollapsed ? '' : 'mr-3'}`}>
              <FiPackage className="text-xl" />
            </span>
            {!isCollapsed && (
              <span className="font-medium">Package History</span>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-gray-600 hover:bg-red-50 hover:text-red-600 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <span className={`${isCollapsed ? '' : 'mr-3'}`}>
              <FiLogOut className="text-xl" />
            </span>
            {!isCollapsed && (
              <span className="font-medium">Logout</span>
            )}
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="text-center">
              {/* Warning Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FiLogOut className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirm Logout
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to logout from your account?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={cancelLogout}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
