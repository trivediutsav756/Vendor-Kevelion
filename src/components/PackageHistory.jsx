import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiPackage } from 'react-icons/fi';

const PackageHistory = ({ user }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const API_BASE_URL = "https://kevelionapi.kevelion.com";

  // Fetch package history
  const fetchPackageHistory = async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/seller/package-history/${user.id}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        setHistory([]);
        return;
      }

      const data = await response.json();

      let historyData =
        Array.isArray(data) ? data : data?.data || data?.items || [];

      // Sort data by latest created_at
      historyData = historyData.sort(
        (a, b) =>
          new Date(b.created_at || b.package_start_date) -
          new Date(a.created_at || a.package_start_date)
      );

      setHistory(historyData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("❌ Fetch Error:", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchPackageHistory();
  }, [user?.id]);

  // Format to Indian comma style
  const formatNumber = (value) => {
    const num = Number(value);
    if (!num || isNaN(num)) return "0";
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const formatValue = (value) => {
    if (!value) return "N/A";
    if (value.includes("T")) {
      return new Date(value).toLocaleDateString("en-IN");
    }
    return value;
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("active")) return "bg-green-100 text-green-800";
    if (s.includes("expired")) return "bg-red-100 text-red-800";
    if (s.includes("pending")) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-5 text-white shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <FiPackage className="text-2xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Package History</h1>
                <p className="text-sm">{user?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPackageHistory}
                disabled={loading}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30"
              >
                <FiRefreshCw className={`text-xl ${loading ? "animate-spin" : ""}`} />
              </button>
              <span className="text-xs">
                {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h2 className="text-base font-semibold">
              Package History ({history.length})
            </h2>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <FiRefreshCw className="animate-spin text-2xl text-blue-600 mx-auto" />
                <p>Loading...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiPackage className="mx-auto text-4xl mb-2" />
                <p>No package history found</p>
                <p>Seller ID: {user?.id}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Package Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Amount Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Total Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Payment Mode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Created At</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y">
                    {history.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        
                        <td className="px-6 py-4 text-sm">{item.package_name}</td>

                        <td className="px-6 py-4 text-sm">
                          ₹{formatNumber(item.package_price)}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          ₹{formatNumber(item.amount_paid)}
                        </td>

                        {/* FIXED TOTAL SALES */}
                        <td className="px-6 py-4 text-sm text-gray-900">
                          ₹{formatNumber(item?.total_sales)}
                        </td>

                        <td className="px-6 py-4 text-sm capitalize">
                          {item.payment_mode?.replace(/_/g, " ")}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          {formatValue(item.package_start_date)}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          {formatValue(item.package_end_date)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm">
                          {formatValue(item.created_at)}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PackageHistory;
