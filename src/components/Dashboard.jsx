// components/Dashboard.jsx
import React, { useState, useEffect } from 'react';

const ALLOWED_ORDER_STATUSES = ['New', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const ORDER_TYPES = ['Order', 'inquiry'];

const normalizeToAllowed = (value, allowed, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const v = String(value).trim();
  if (!v) return fallback;
  const found = allowed.find(opt => opt.toLowerCase() === v.toLowerCase());
  return found || fallback;
};

const getOrderStatus = (order) => {
  if (!order.products || order.products.length === 0) return 'new';
  return order.products[0].order_status || 'new';
};

const fetchOrderStats = async (API_BASE_URL, SELLER_ID) => {
  try {
    const res = await fetch(`${API_BASE_URL}/orderseller/${SELLER_ID}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data = await res.json();

    const normalizedOrders = (Array.isArray(data) ? data : []).map(order => {
      const filteredProducts = (order.products || []).filter(p => Number(p.seller_id) === SELLER_ID);
      const normalizedProducts = filteredProducts.map(p => ({
        ...p,
        order_status: normalizeToAllowed(p.order_status, ALLOWED_ORDER_STATUSES, 'New').toLowerCase(),
      }));
      return {
        ...order,
        order_type: normalizeToAllowed(order.order_type, ORDER_TYPES, 'Order'),
        products: normalizedProducts
      };
    }).filter(o => Array.isArray(o.products) && o.products.length > 0);

    const totalOrders = normalizedOrders.length;
    const orderOrders = normalizedOrders.filter(o => o.order_type === 'Order').length;
    const inquiryOrders = normalizedOrders.filter(o => o.order_type === 'inquiry').length;

    // Compute status-based counts (lowercase for consistency)
    const statusCounts = {
      new: normalizedOrders.filter(o => getOrderStatus(o) === 'new').length,
      pending: normalizedOrders.filter(o => getOrderStatus(o) === 'pending').length,
      shipped: normalizedOrders.filter(o => getOrderStatus(o) === 'shipped').length,
      confirmed: normalizedOrders.filter(o => getOrderStatus(o) === 'confirmed').length,
      delivered: normalizedOrders.filter(o => getOrderStatus(o) === 'delivered').length,
      returned: normalizedOrders.filter(o => getOrderStatus(o) === 'returned').length,
      cancelled: normalizedOrders.filter(o => getOrderStatus(o) === 'cancelled').length,
    };

    return {
      totalOrders,
      orderOrders,
      inquiryOrders,
      ...statusCounts
    };
  } catch (err) {
    console.error('Error fetching order stats:', err);
    return {
      totalOrders: 0,
      orderOrders: 0,
      inquiryOrders: 0,
      new: 0,
      pending: 0,
      shipped: 0,
      confirmed: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0
    };
  }
};

const Dashboard = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({
    categories: 0,
    subcategories: 0,
    products: 0,
    orders: 0  // This will now be totalOrders
  });
  const [orderBreakdown, setOrderBreakdown] = useState({
    totalOrders: 0,
    orderOrders: 0,
    inquiryOrders: 0,
    new: 0,
    pending: 0,
    shipped: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE_URL = 'https://kevelionapi.kevelion.com';
  const SELLER_ID = user?.id || localStorage.getItem('retaillian_user') ? JSON.parse(localStorage.getItem('retaillian_user') || '{}').id : null;

  // ✅ Authentication Check - Redirect if not logged in
  useEffect(() => {
    const checkAuth = () => {
      const savedAuth = localStorage.getItem('retaillian_auth');
      const savedUser = localStorage.getItem('retaillian_user');
      
      if (!savedAuth || savedAuth !== 'true' || !savedUser) {
        console.log('⚠️ No authentication found, redirecting to login...');
        localStorage.removeItem('retaillian_auth');
        localStorage.removeItem('retaillian_user');
        window.location.reload();
      } else {
        console.log('✅ User authenticated:', JSON.parse(savedUser));
      }
    };
    
    checkAuth();
  }, []);

  // Fetch dashboard stats from API
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Fetch all data in parallel
        const [categoriesRes, subcategoriesRes, productsRes, orderStatsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/categories`),
          fetch(`${API_BASE_URL}/subcategories`),
          fetch(`${API_BASE_URL}/product_seller/${SELLER_ID}`),  // Changed to seller-specific products
          fetchOrderStats(API_BASE_URL, SELLER_ID)
        ]);

        // Parse categories
        let categoriesCount = 0;
        if (categoriesRes && categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          categoriesCount = Array.isArray(categoriesData) ? categoriesData.length : 0;
          console.log('📂 Categories count:', categoriesCount);
        } else {
          console.error('❌ Failed to fetch categories:', categoriesRes?.status);
        }

        // Parse subcategories
        let subcategoriesCount = 0;
        if (subcategoriesRes && subcategoriesRes.ok) {
          const subcategoriesData = await subcategoriesRes.json();
          subcategoriesCount = Array.isArray(subcategoriesData) ? subcategoriesData.length : 0;
          console.log('📁 Subcategories count:', subcategoriesCount);
        } else {
          console.error('❌ Failed to fetch subcategories:', subcategoriesRes?.status);
        }

        // Parse products - Enhanced parsing to handle different response formats
        let productsCount = 0;
        if (productsRes && productsRes.ok) {
          const productsData = await productsRes.json();
          
          let productsArray = [];
          if (Array.isArray(productsData)) {
            productsArray = productsData;
          } else if (productsData && Array.isArray(productsData.data)) {
            productsArray = productsData.data;
          } else if (productsData && Array.isArray(productsData.products)) {
            productsArray = productsData.products;
          }
          
          productsCount = productsArray.length;
          console.log('📦 Products count:', productsCount);
        } else {
          console.error('❌ Failed to fetch products:', productsRes?.status);
        }

        // orderStatsRes is already processed
        const orderStats = orderStatsRes;
        console.log('🛒 Order stats:', orderStats);

        setStats({
          categories: categoriesCount,
          subcategories: subcategoriesCount,
          products: productsCount,
          orders: orderStats.totalOrders
        });

        setOrderBreakdown(orderStats);

      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };
    
    if (SELLER_ID) {
      fetchStats();
    }

    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      if (SELLER_ID) {
        fetchStats();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [SELLER_ID]);

  // Function to manually refresh stats
  const refreshStats = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [categoriesRes, subcategoriesRes, productsRes, orderStatsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/categories`),
        fetch(`${API_BASE_URL}/subcategories`),
        fetch(`${API_BASE_URL}/product_seller/${SELLER_ID}`),
        fetchOrderStats(API_BASE_URL, SELLER_ID)
      ]);

      let categoriesCount = 0;
      if (categoriesRes && categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        categoriesCount = Array.isArray(categoriesData) ? categoriesData.length : 0;
      }

      let subcategoriesCount = 0;
      if (subcategoriesRes && subcategoriesRes.ok) {
        const subcategoriesData = await subcategoriesRes.json();
        subcategoriesCount = Array.isArray(subcategoriesData) ? subcategoriesData.length : 0;
      }

      let productsCount = 0;
      if (productsRes && productsRes.ok) {
        const productsData = await productsRes.json();
        
        let productsArray = [];
        if (Array.isArray(productsData)) {
          productsArray = productsData;
        } else if (productsData && Array.isArray(productsData.data)) {
          productsArray = productsData.data;
        } else if (productsData && Array.isArray(productsData.products)) {
          productsArray = productsData.products;
        }
        
        productsCount = productsArray.length;
      }

      const orderStats = orderStatsRes;

      setStats({
        categories: categoriesCount,
        subcategories: subcategoriesCount,
        products: productsCount,
        orders: orderStats.totalOrders
      });

      setOrderBreakdown(orderStats);

      console.log('✅ Stats refreshed successfully');

    } catch (err) {
      console.error('Error refreshing stats:', err);
      setError('Failed to refresh statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with User Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-sm text-gray-600 mt-1">
            Welcome back, <span className="font-semibold text-blue-600">{user?.name || 'Admin'}</span>
          </p>
        </div>
      
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button 
            onClick={() => setError('')}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Grid - Now 4 columns with Total Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Categories */}
        <div 
          className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigate?.('category')}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">Categories</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {loading ? (
              <span className="animate-pulse bg-gray-200 rounded w-16 h-8 inline-block"></span>
            ) : (
              stats.categories.toLocaleString()
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total categories</p>
        </div>

        {/* Subcategories */}
        <div 
          className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigate?.('subcategory')}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">Subcategories</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {loading ? (
              <span className="animate-pulse bg-gray-200 rounded w-16 h-8 inline-block"></span>
            ) : (
              stats.subcategories.toLocaleString()
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total subcategories</p>
        </div>

        {/* Products */}
        <div 
          className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow relative cursor-pointer"
          onClick={() => onNavigate?.('products')}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">Products</h3>
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {loading ? (
              <span className="animate-pulse bg-gray-200 rounded w-16 h-8 inline-block"></span>
            ) : (
              stats.products.toLocaleString()
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total products</p>
          
          {/* Live indicator */}
          {!loading && (
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          )}
        </div>

        {/* Total Orders */}
        <div 
          className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow relative cursor-pointer"
          onClick={() => onNavigate?.('ordermanagement')}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {loading ? (
              <span className="animate-pulse bg-gray-200 rounded w-16 h-8 inline-block"></span>
            ) : (
              stats.orders.toLocaleString()
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">All orders & inquiries</p>
          
          {/* Live indicator */}
          {!loading && (
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Order Status Breakdown Section - Updated to show New, Pending, Shipped */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* New Orders */}
          <div 
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-blue-500"
            onClick={() => onNavigate && onNavigate('ordermanagement')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">New Orders</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-600">{orderBreakdown.new.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Status: New</p>
          </div>

          {/* Pending Orders */}
          <div 
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-yellow-500"
            onClick={() => onNavigate && onNavigate('ordermanagement')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Pending Orders</h3>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{orderBreakdown.pending.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Status: Pending</p>
          </div>

          {/* Shipped Orders */}
          <div 
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-purple-500"
            onClick={() => onNavigate && onNavigate('ordermanagement')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Shipped Orders</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-600">{orderBreakdown.shipped.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Status: Shipped</p>
          </div>
        </div>
      )}

      {/* Additional Order Type Breakdown (Optional - kept for reference) */}
      {!loading && orderBreakdown.orderOrders + orderBreakdown.inquiryOrders > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate && onNavigate('ordermanagement')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Orders</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-600">{orderBreakdown.orderOrders.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Order type only</p>
          </div>

          <div 
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate && onNavigate('ordermanagement')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Inquiries</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-orange-600">{orderBreakdown.inquiryOrders.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Inquiry type only</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;