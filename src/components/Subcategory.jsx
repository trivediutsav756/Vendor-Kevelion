// components/Subcategory.jsx
import React, { useEffect, useState } from "react";
import { FiImage } from "react-icons/fi";

const API_BASE = "https://kevelionapi.kevelion.com";
// IMPORTANT: use the same base where images are actually hosted.
// If your API returns image paths like "/uploads/....", this should be the domain that serves them.
const IMAGE_BASE = "https://kevelionapi.kevelion.com"; // <-- changed from rettalion.apxfarms.com

const Subcategory = ({ user }) => {
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getImageUrl = (image) => {
    if (!image) return "";

    // If API already returns a full URL, use it as-is
    if (typeof image === "string" && image.startsWith("http")) return image;

    // Ensure it has a leading slash and build full URL
    const path = image.startsWith("/") ? image : `/${image}`;
    return `${IMAGE_BASE}${path}`;
  };

  const fetchSubcategories = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/subcategories`);
      if (!response.ok) throw new Error("Failed to fetch subcategories");
      const data = await response.json();
      setSubcategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Error fetching subcategories: " + err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcategories();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Subcategory Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage all your product subcategories
          </p>
        </div>
      </div>

      {/* Container */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            All Subcategories ({subcategories.length})
          </h2>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError("")} className="float-right font-bold">
              ×
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : subcategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No subcategories found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-10 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-16 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-16 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subcategory Name
                    </th>
                    <th className="px-16 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category Name
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {subcategories.map((subcategory, index) => {
                    const name =
                      subcategory.subcategory_name ||
                      subcategory.name ||
                      "Unnamed";

                    const imgUrl = getImageUrl(subcategory.image);

                    return (
                      <tr key={subcategory.id ?? index} className="hover:bg-gray-50">
                        <td className="px-10 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subcategory.id}
                        </td>

                        <td className="px-16 py-4 whitespace-nowrap">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={name}
                              className="h-12 w-12 rounded-lg object-cover border"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // fallback if broken URL
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  "https://via.placeholder.com/48?text=No+Image";
                              }}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center border">
                              <FiImage className="text-gray-400 text-xl" />
                            </div>
                          )}
                        </td>

                        <td className="px-16 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {name}
                          </div>
                          {subcategory.subcategory_sku && (
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {subcategory.subcategory_sku}
                            </div>
                          )}
                        </td>

                        <td className="px-16 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {subcategory.category_name || "N/A"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subcategory;