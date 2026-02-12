import React, { useEffect, useMemo, useState } from 'react';
import { FiPackage, FiEdit2, FiTrash2, FiPlus, FiRefreshCw } from 'react-icons/fi';

const API_BASE = 'https://adminapi.kevelion.com';

const safeParseNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const Stocks = ({ user }) => {
  const SELLER_ID = Number(user?.id || (localStorage.getItem('retaillian_user') ? JSON.parse(localStorage.getItem('retaillian_user') || '{}').id : undefined));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filterMode, setFilterMode] = useState('seller'); // 'seller' | 'all'

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    product_id: '',
    quantity: ''
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    quantity: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const headers = useMemo(() => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }), []);

  const fetchStocks = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_BASE}/stock`;
      if (filterMode === 'seller' && SELLER_ID) {
        url = `${API_BASE}/stock/${SELLER_ID}`;
      }
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setItems(arr);
    } catch (err) {
      setError(err.message || 'Failed to load stocks');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, SELLER_ID]);

  const openAdd = () => {
    setAddForm({
      product_id: '',
      quantity: ''
    });
    setShowAdd(true);
  };
  const closeAdd = () => {
    setShowAdd(false);
  };
  const submitAdd = async () => {
    setAddSubmitting(true);
    setError('');
    try {
      const payload = {
        seller_id: SELLER_ID,
        product_id: safeParseNumber(addForm.product_id) ?? addForm.product_id,
        quantity: safeParseNumber(addForm.quantity) ?? addForm.quantity
      };
      const res = await fetch(`${API_BASE}/stock`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Create failed: HTTP ${res.status}`);
      closeAdd();
      await fetchStocks();
    } catch (err) {
      setError(err.message || 'Failed to add stock');
    } finally {
      setAddSubmitting(false);
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      quantity: item.quantity ?? ''
    });
  };
  const closeEdit = () => {
    setEditItem(null);
  };  
  const submitEdit = async () => {
    if (!editItem?.id) return;
    setEditSubmitting(true);
    setError('');
    try {
      const idNum = Number(editItem.id);
      const idPath = Number.isFinite(idNum) ? String(idNum) : String(editItem.id).trim();
      const url = `${API_BASE}/stock/${encodeURIComponent(idPath)}`;
      const payload = {
        quantity: safeParseNumber(editForm.quantity) ?? editForm.quantity
      };
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Update failed: HTTP ${res.status}`);
      closeEdit();
      await fetchStocks();
    } catch (err) {
      setError(err.message || 'Failed to update stock');
    } finally {
      setEditSubmitting(false);
    }
  };

  const confirmDelete = async (id) => {
    setDeletingId(id);
    setError('');
    try {
      const idNum = Number(id);
      const idPath = Number.isFinite(idNum) ? String(idNum) : String(id).trim();
      const url = `${API_BASE}/stock/${encodeURIComponent(idPath)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error(`Delete failed: HTTP ${res.status}`);
      await fetchStocks();
    } catch (err) {
      setError(err.message || 'Failed to delete stock');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-5 text-white shadow-md mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <FiPackage className="text-2xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Stocks</h1>
              <p className="text-sm">Seller ID: {SELLER_ID || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStocks}
              disabled={loading}
              className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30"
              title="Refresh"
            >
              <FiRefreshCw className={`text-xl ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openAdd}
              className="px-3 py-2 rounded-md bg-white text-blue-700 font-semibold hover:bg-blue-50 flex items-center gap-2"
              title="Add Stock"
            >
              <FiPlus /> Add
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Filter:</label>
          <button
            onClick={() => setFilterMode('seller')}
            className={`px-3 py-1 rounded ${filterMode === 'seller' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            My Stocks
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded ${filterMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            All Stocks
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h2 className="text-base font-semibold">
            Stock Items ({items.length})
          </h2>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <FiRefreshCw className="animate-spin text-2xl text-blue-600 mx-auto" />
              <p>Loading...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No stock items found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Seller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-6 py-3 text-sm">{it.id}</td>
                      <td className="px-6 py-3 text-sm">{it.seller_id ?? SELLER_ID ?? 'N/A'}</td>
                      <td className="px-6 py-3 text-sm">{it.product_id ?? 'N/A'}</td>
                      <td className="px-6 py-3 text-sm">{it.quantity ?? 'N/A'}</td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(it)}
                            className="px-2 py-1 border rounded text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                            title="Edit"
                          >
                            <FiEdit2 /> Edit
                          </button>
                          <button
                            onClick={() => confirmDelete(it.id)}
                            disabled={deletingId === it.id}
                            className="px-2 py-1 border rounded text-red-700 hover:bg-red-50 flex items-center gap-1 disabled:opacity-50"
                            title="Delete"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add Stock</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Product ID</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={addForm.product_id}
                  onChange={(e) => setAddForm({ ...addForm, product_id: e.target.value })}
                  placeholder="e.g. 123"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                  placeholder="e.g. 10"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={closeAdd} className="px-3 py-2 border rounded">Cancel</button>
              <button
                onClick={submitAdd}
                disabled={addSubmitting}
                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {addSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Stock #{editItem.id}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={closeEdit} className="px-3 py-2 border rounded">Cancel</button>
              <button
                onClick={submitEdit}
                disabled={editSubmitting}
                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {editSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stocks;
