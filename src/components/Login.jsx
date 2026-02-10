import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = 'https://adminapi.kevelion.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Login with email and password
      const loginResponse = await fetch(`${API_BASE_URL}/seller-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok && loginData.seller) {
        const sellerId = loginData.seller.id;
        
        // Step 2: Fetch complete seller details from live API
        try {
          const sellerDetailsResponse = await fetch(`${API_BASE_URL}/seller/${sellerId}`);
          
          if (sellerDetailsResponse.ok) {
            const sellerDetails = await sellerDetailsResponse.json();
            
            // Merge login data with complete seller details
            const completeUserData = {
              ...loginData.seller,
              ...sellerDetails,
              // Ensure critical fields are present
              id: sellerId,
              email: loginData.seller.email || sellerDetails.email,
              name: sellerDetails.name || loginData.seller.name || loginData.seller.email,
            };
            
            // Store complete authentication data
            localStorage.setItem('retaillian_auth', 'true');
            localStorage.setItem('retaillian_user', JSON.stringify(completeUserData));
            
            // Call the onLogin callback with complete data
            onLogin(completeUserData);
            
            console.log('✅ Login successful with complete seller details:', completeUserData);
          } else {
            // If seller details fetch fails, use basic login data
            console.warn('⚠️ Could not fetch complete seller details, using basic data');
            const basicUserData = {
              id: sellerId,
              email: loginData.seller.email,
              name: loginData.seller.name || loginData.seller.email,
              ...loginData.seller
            };
            
            localStorage.setItem('retaillian_auth', 'true');
            localStorage.setItem('retaillian_user', JSON.stringify(basicUserData));
            onLogin(basicUserData);
            
            console.log('✅ Login successful with basic data:', basicUserData);
          }
        } catch (detailsErr) {
          // If seller details fetch fails, use basic login data
          console.warn('⚠️ Error fetching seller details:', detailsErr);
          const basicUserData = {
            id: sellerId,
            email: loginData.seller.email,
            name: loginData.seller.name || loginData.seller.email,
            ...loginData.seller
          };
          
          localStorage.setItem('retaillian_auth', 'true');
          localStorage.setItem('retaillian_user', JSON.stringify(basicUserData));
          onLogin(basicUserData);
          
          console.log('✅ Login successful with basic data:', basicUserData);
        }
      } else {
        setError(loginData.message || 'Invalid email or password');
        console.error('❌ Login failed:', loginData);
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('❌ Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Login</h1>
          <p className="text-gray-600">Sign in to your seller dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;