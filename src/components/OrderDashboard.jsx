import React, { useRef, useState, useEffect, useMemo } from 'react';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';

const ALLOWED_ORDER_STATUSES = ['New', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const ALLOWED_PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded', 'Cancelled'];
const ORDER_TYPES = ['Order', 'inquiry'];

const normalizeToAllowed = (value, allowed, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const v = String(value).trim();
  if (!v) return fallback;
  const found = allowed.find(opt => opt.toLowerCase() === v.toLowerCase());
  return found || fallback;
};

// ---------- Date helpers ----------
const todayInput = () => {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isoToInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Convert "YYYY-MM-DD" -> ISO midnight UTC, else null
const inputToIso = (val) => {
  if (!val) return null;
  // midnight UTC
  return new Date(`${val}T00:00:00.000Z`).toISOString();
};

const nowIso = () => new Date().toISOString();

const readErrorBody = async (res) => {
  try {
    const t = await res.text();
    return t || '';
  } catch {
    return '';
  }
};

// ---------- StatusDropdown ----------
const StatusDropdown = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusColors = {
    New: 'blue',
    Pending: 'yellow',
    Confirmed: 'cyan',
    Shipped: 'purple',
    Delivered: 'green',
    Cancelled: 'red',
    Returned: 'orange',
  };

  const getStatusColorClasses = (status, selected = false) => {
    const baseColor = statusColors[status] || 'gray';
    if (selected) return `bg-${baseColor}-100 text-${baseColor}-800 border-${baseColor}-300`;
    return `bg-${baseColor}-50 text-${baseColor}-700 border-${baseColor}-200 hover:bg-${baseColor}-100`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-3 py-1 rounded-md text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors ${getStatusColorClasses(value, true)}`}
      >
        {value || 'Select Status'}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px] overflow-hidden">
          {ALLOWED_ORDER_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                onChange(status);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${getStatusColorClasses(status, status === value)}`}
            >
              <div className={`w-2 h-2 rounded-full bg-${statusColors[status] || 'gray'}-500`}></div>
              {status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** ---------------- Shipping Modal ---------------- */

const Field = ({ label, children }) => (
  <label className="block">
    <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
    {children}
  </label>
);

const ShippingModal = ({
  open,
  onClose,
  onSubmit,
  loading,
  initial,
  orderId,
  buyerId,
  sellerId,
}) => {
  const [form, setForm] = useState({
    courierName: '',
    courierCompanyName: '',
    courierMobile: '',
    trackingNumber: '',
    shippingAddress: '',
    deliveryType: 'Standard',
    totalWeight: 0,
    shippingCost: 0,
    shippingStatus: 'Shipped',
    remarks: '',
    estimatedDeliveryDate: '',
    actualDeliveryDate: '',
    cancelledDate: '',
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fill initial (ISO -> input)
  useEffect(() => {
    if (!open) return;
    setForm({
      courierName: initial?.courierName ?? '',
      courierCompanyName: initial?.courierCompanyName ?? '',
      courierMobile: initial?.courierMobile ?? '',
      trackingNumber: initial?.trackingNumber ?? '',
      shippingAddress: initial?.shippingAddress ?? '',
      deliveryType: initial?.deliveryType ?? 'Standard',
      totalWeight: Number(initial?.totalWeight ?? 0),
      shippingCost: Number(initial?.shippingCost ?? 0),
      shippingStatus: initial?.shippingStatus ?? 'Shipped',
      remarks: initial?.remarks ?? '',
      estimatedDeliveryDate: isoToInput(initial?.estimatedDeliveryDate),
      actualDeliveryDate: isoToInput(initial?.actualDeliveryDate),
      cancelledDate: isoToInput(initial?.cancelledDate),
    });
  }, [open, initial]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && open && !loading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const onStatusChange = (nextStatus) => {
    setForm(prev => {
      const next = String(nextStatus);
      const lower = next.toLowerCase();

      // ✅ enforce auto-dates when status changes
      if (lower === 'delivered') {
        return {
          ...prev,
          shippingStatus: next,
          actualDeliveryDate: prev.actualDeliveryDate || todayInput(),
        };
      }
      if (lower === 'cancelled') {
        return {
          ...prev,
          shippingStatus: next,
          cancelledDate: prev.cancelledDate || todayInput(),
        };
      }
      return { ...prev, shippingStatus: next };
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="h-full w-full flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
          <div className="bg-blue-600 text-white p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold">Create / Update Shipping</div>
              <div className="text-xs sm:text-sm opacity-90 break-words">
                Order #{orderId} • Buyer #{buyerId} • Seller #{sellerId}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white text-2xl font-bold leading-none px-2"
              disabled={loading}
              title="Close"
            >
              ✖
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Field label="Courier Name">
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.courierName} onChange={(e) => update('courierName', e.target.value)} />
              </Field>

              <Field label="Courier Company">
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.courierCompanyName} onChange={(e) => update('courierCompanyName', e.target.value)} />
              </Field>

              <Field label="Courier Mobile">
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.courierMobile} onChange={(e) => update('courierMobile', e.target.value)} />
              </Field>

              <Field label="Tracking Number">
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.trackingNumber} onChange={(e) => update('trackingNumber', e.target.value)} />
              </Field>

              <Field label="Delivery Type">
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.deliveryType} onChange={(e) => update('deliveryType', e.target.value)}>
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                </select>
              </Field>

              <Field label="Shipping Status">
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.shippingStatus} onChange={(e) => onStatusChange(e.target.value)}>
                  <option value="Shipped">Shipped</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </Field>

              <Field label="Total Weight (kg)">
                <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.totalWeight} onChange={(e) => update('totalWeight', Number(e.target.value))} />
              </Field>

              <Field label="Shipping Cost">
                <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.shippingCost} onChange={(e) => update('shippingCost', Number(e.target.value))} />
              </Field>

              <Field label="Estimated Delivery Date">
                <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={form.estimatedDeliveryDate} onChange={(e) => update('estimatedDeliveryDate', e.target.value)} />
              </Field>

              <Field label="Actual Delivery Date">
                <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={form.actualDeliveryDate} onChange={(e) => update('actualDeliveryDate', e.target.value)} />
              </Field>

              {String(form.shippingStatus).toLowerCase() === 'cancelled' && (
                <Field label="Cancellation Date">
                  <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={form.cancelledDate} onChange={(e) => update('cancelledDate', e.target.value)} />
                </Field>
              )}

              <div className="sm:col-span-2">
                <Field label="Shipping Address">
                  <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={form.shippingAddress} onChange={(e) => update('shippingAddress', e.target.value)} />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="remarks">
                  <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          <div className="border-t bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500">

            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={onClose} disabled={loading} className="flex-1 sm:flex-none px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50">
                Cancel
              </button>

              <button onClick={() => onSubmit({ form, orderId, buyerId, sellerId })} disabled={loading} className="flex-1 sm:flex-none px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Shipping'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/** ---------------- Main Component ---------------- */

const OrderDashboard = ({ user }) => {
  const SELLER_ID = Number(user?.id || JSON.parse(localStorage.getItem('kevelion_user'))?.id || 6);
  const API_BASE_URL = 'https://adminapi.kevelion.com';

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [buyers, setBuyers] = useState({});
  const [products, setProducts] = useState({});
  const [sellers, setSellers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  const [shippingOpen, setShippingOpen] = useState(false);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingInitial, setShippingInitial] = useState(null);
  const [shippingCtx, setShippingCtx] = useState({ orderId: null, buyerId: null, sellerId: null });
  const shippingCtxRef = useRef({ orderId: null, buyerId: null, sellerId: null });

  const filterOptions = useMemo(() => ([
    { value: 'all', label: 'All Orders', color: 'gray' },
    { value: 'new', label: 'New Orders', color: 'blue' },
    { value: 'pending', label: 'Pending Orders', color: 'yellow' },
    { value: 'confirmed', label: 'Confirmed Orders', color: 'cyan' },
    { value: 'shipped', label: 'Shipped Orders', color: 'purple' },
    { value: 'delivered', label: 'Delivered Orders', color: 'green' },
    { value: 'cancelled', label: 'Cancelled Orders', color: 'red' },
    { value: 'returned', label: 'Returned Orders', color: 'orange' }
  ]), []);

  const orderTypeOptions = useMemo(() => ([
    { value: 'all', label: 'All Types', icon: '📦' },
    { value: 'Order', label: 'Orders', icon: '🛒' },
    { value: 'inquiry', label: 'Inquiries', icon: '❓' }
  ]), []);

  const getOrderStatus = (order) => {
    if (!order?.products || order.products.length === 0) return 'New';
    return order.products[0]?.order_status || 'New';
  };

  const getPaymentStatus = (order) => {
    if (!order?.products || order.products.length === 0) return 'Pending';
    return order.products[0]?.payment_status || 'Pending';
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrders(prev => {
      const s = new Set(prev);
      if (s.has(orderId)) s.delete(orderId);
      else s.add(orderId);
      return s;
    });
  };

  const fetchBuyers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/buyers`);
      if (!res.ok) throw new Error('Failed to fetch buyers');
      const data = await res.json();
      const buyersMap = {};
      if (Array.isArray(data)) data.forEach(b => (buyersMap[b.id] = b.name || `Buyer ${b.id}`));
      setBuyers(buyersMap);
    } catch (err) {
      console.error('Error fetching buyers:', err);
    }
  };

  const upsertShippingForStatus = async ({ orderId, buyerId, sellerId, orderStatus }) => {
    if (!orderId || !buyerId || !sellerId) return;

    const nowIso = new Date().toISOString();
    const statusLower = String(orderStatus || '').toLowerCase();

    const shippingPatch = {};
    if (statusLower === 'shipped') {
      shippingPatch.shipping_status = 'Shipped';
      shippingPatch.estimated_delivery_date = nowIso;
    } else if (statusLower === 'delivered') {
      shippingPatch.shipping_status = 'Delivered';
      shippingPatch.actual_delivery_date = nowIso;
    } else if (statusLower === 'cancelled') {
      shippingPatch.shipping_status = 'Cancelled';
      shippingPatch.cancelled_date = nowIso;
      shippingPatch.canceled_date = nowIso;
    }

    if (Object.keys(shippingPatch).length === 0) return;

    try {
      const createRes = await fetch(`${API_BASE_URL}/shipping/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: Number(orderId), buyer_id: Number(buyerId) }),
      });

      if (!createRes.ok) console.warn('Create shipping (status sync) failed (continuing to PATCH):', createRes.status);

      const patchRes = await fetch(`${API_BASE_URL}/shipping/${orderId}/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shippingPatch),
      });

      if (!patchRes.ok) console.warn('Shipping status/date PATCH failed:', patchRes.status);
    } catch (e) {
      console.warn('upsertShippingForStatus failed:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/product_seller/${SELLER_ID}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      const productsMap = {};
      const productsArray =
        Array.isArray(data) ? data :
          Array.isArray(data?.data) ? data.data :
            Array.isArray(data?.products) ? data.products : [];
      productsArray.forEach(p => (productsMap[p.id] = p.name || `Product ${p.id}`));
      setProducts(productsMap);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSellers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sellers`);
      if (!res.ok) throw new Error('Failed to fetch sellers');
      const data = await res.json();
      const sellersMap = {};
      const sellersArray =
        Array.isArray(data) ? data :
          Array.isArray(data?.data) ? data.data :
            Array.isArray(data?.sellers) ? data.sellers : [];
      sellersArray.forEach(s => (sellersMap[s.id] = s.name || s.company_name || `Seller ${s.id}`));
      setSellers(sellersMap);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/orderseller/${SELLER_ID}`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 204) {
          setOrders([]);
          return;
        }
        throw new Error(`Failed to fetch orders: ${res.status}`);
      }
      const data = await res.json();

      const normalizedOrders = (Array.isArray(data) ? data : []).map(order => {
        const filteredProducts = (order.products || []).filter(p => Number(p.seller_id) === Number(SELLER_ID));
        const normalizedProducts = filteredProducts.map(p => ({
          ...p,
          order_status: normalizeToAllowed(p.order_status, ALLOWED_ORDER_STATUSES, 'New'),
          payment_status: normalizeToAllowed(p.payment_status, ALLOWED_PAYMENT_STATUSES, 'Pending'),
        }));
        return {
          ...order,
          order_type: normalizeToAllowed(order.order_type, ORDER_TYPES, 'Order'),
          products: normalizedProducts
        };
      }).filter(o => Array.isArray(o.products) && o.products.length > 0);

      setOrders(normalizedOrders);
    } catch (err) {
      setError(err.message || 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = orders;
    if (orderTypeFilter !== 'all') filtered = filtered.filter(o => o.order_type === orderTypeFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(o => getOrderStatus(o).toLowerCase() === statusFilter);
    setFilteredOrders(filtered);
  }, [statusFilter, orderTypeFilter, orders]);

  const openShippingForOrder = async ({ orderId, buyerId, sellerId }) => {
    try {
      setError(null);

      if (!orderId || !buyerId) {
        return;
      }

      const nextCtx = { orderId, buyerId, sellerId: sellerId ?? SELLER_ID };
      shippingCtxRef.current = nextCtx;
      setShippingCtx(nextCtx);
      setShippingInitial(null);
      setShippingOpen(true);

      const res = await fetch(`${API_BASE_URL}/ordershipping/${orderId}`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 204) {
          setShippingInitial(null);
          return;
        }
        throw new Error(`Shipping GET failed: ${res.status} ${await readErrorBody(res)}`);
      }

      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const row = rows.find(r => Number(r?.seller_id) === Number(nextCtx.sellerId)) || rows[0];

      if (!row) {
        setShippingInitial(null);
        return;
      }

      setShippingInitial({
        courier_name: row.courier_name ?? '',
        courier_company_name: row.courier_company_name ?? '',
        courier_mobile: row.courier_mobile ?? '',
        tracking_number: row.tracking_number ?? '',
        shipping_address: row.shipping_address ?? '',
        delivery_type: row.delivery_type ?? 'Standard',
        total_weight: row.total_weight ?? 0,
        shipping_cost: row.shipping_cost ?? 0,
        shipping_status: row.shipping_status ?? 'Shipped',
        remarks: row.remarks ?? '',
        estimated_delivery_date: row.estimated_delivery_date ?? null,
        actual_delivery_date: row.actual_delivery_date ?? null,
        cancelled_date: row.cancelled_date ?? null,
      });
    } catch (e) {
      console.error('openShippingForOrder error:', e);
      setError(e?.message || 'Failed to fetch shipping details');
      setShippingOpen(true);
    }
  };

  const submitShipping = async ({ form, orderId: orderIdArg, buyerId: buyerIdArg, sellerId: sellerIdArg }) => {
    const orderId = orderIdArg ?? shippingCtx.orderId ?? shippingCtxRef.current.orderId;
    const buyerId = buyerIdArg ?? shippingCtx.buyerId ?? shippingCtxRef.current.buyerId;
    const sellerId = sellerIdArg ?? shippingCtx.sellerId ?? shippingCtxRef.current.sellerId ?? SELLER_ID;

    if (!orderId || !buyerId) {
      return;
    }

    setShippingLoading(true);
    setError(null);
    try {
      // POST create (ignore failure; row may exist)
      await fetch(`${API_BASE_URL}/shipping/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: Number(orderId), buyer_id: Number(buyerId) }),
      });

      const status = String(form.shipping_status || 'Shipped');
      const lower = status.toLowerCase();

      // FORCE set date values when status requires it
      const estimatedISO = inputToIso(form.estimated_delivery_date);
      const actualISO =
        lower === 'delivered'
          ? (inputToIso(form.actual_delivery_date) || nowIso())
          : inputToIso(form.actual_delivery_date);

      const cancelledISO =
        lower === 'cancelled'
          ? (inputToIso(form.cancelled_date) || nowIso())
          : inputToIso(form.cancelled_date);

      // IMPORTANT: send BOTH spellings to avoid backend mismatch
      const patchPayload = {
        courier_name: form.courier_name ?? '',
        courier_company_name: form.courier_company_name ?? '',
        courier_mobile: form.courier_mobile ?? '',
        tracking_number: form.tracking_number ?? '',
        shipping_address: form.shipping_address ?? '',
        delivery_type: form.delivery_type ?? 'Standard',
        total_weight: form.total_weight ?? 0,
        shipping_cost: form.shipping_cost ?? 0,
        shipping_status: status,
        remarks: form.remarks ?? '',

        estimated_delivery_date: estimatedISO,
        actual_delivery_date: actualISO,

        cancelled_date: cancelledISO,
        canceled_date: cancelledISO, // fallback for backend spelling
      };

      const patchRes = await fetch(`${API_BASE_URL}/shipping/${orderId}/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });

      if (!patchRes.ok) throw new Error(`Shipping PATCH failed: ${patchRes.status} ${await readErrorBody(patchRes)}`);

      setShippingOpen(false);
      setShippingInitial(null);
      await fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to save shipping');
    } finally {
      setShippingLoading(false);
    }
  };

  const updateStatus = async (orderProduct, newStatus) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/orderProduct/${orderProduct.order_product_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_product_id: orderProduct.order_product_id,
          order_status: newStatus
        })
      });

      if (!res.ok) throw new Error(`Failed to update status: ${res.status}`);

      await upsertShippingForStatus({
        orderId: orderProduct.order_id,
        buyerId: orderProduct.buyer_id,
        sellerId: orderProduct.seller_id,
        orderStatus: newStatus,
      });

      if (String(newStatus).toLowerCase() === 'shipped') {
        await fetchOrders();
        await openShippingForOrder({ orderId: orderProduct.order_id, buyerId: orderProduct.buyer_id, sellerId: orderProduct.seller_id });
        return;
      }

      await fetchOrders();
    } catch (err) {
      setError(err.message || 'Update error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderType = async (orderId, newType) => {
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, order_type: newType } : o)));
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/ordersOrderType`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, order_type: newType })
      });
      if (!res.ok) throw new Error(`Failed to update order type: ${res.status}`);
      await fetchOrders();
    } catch (err) {
      await fetchOrders();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusColor = (status) => {
    const colors = {
      'New': 'bg-blue-100 text-blue-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-indigo-100 text-indigo-800',
      'Shipped': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Returned': 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Paid': 'bg-green-100 text-green-800',
      'Failed': 'bg-red-100 text-red-800',
      'Refunded': 'bg-gray-100 text-gray-800',
      'Cancelled': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getOrderTypeColor = (orderType) => {
    if (orderType === 'Order') return 'bg-blue-100 text-blue-800';
    if (orderType === 'inquiry') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getBuyerName = (buyerId) => buyers[buyerId] || `Buyer ${buyerId}`;
  const getProductName = (productId) => products[productId] || `Product ${productId}`;

  const getStats = () => {
    const totalOrders = orders.length;
    const newOrders = orders.filter(o => (o.products?.[0]?.order_status || 'New') === 'New').length;
    const pendingOrders = orders.filter(o => (o.products?.[0]?.order_status || 'New') === 'Pending').length;
    const deliveredOrders = orders.filter(o => (o.products?.[0]?.order_status || 'New') === 'Delivered').length;
    const confirmedOrders = orders.filter(o => (o.products?.[0]?.order_status || 'New') === 'Confirmed').length;
    const shippedOrders = orders.filter(o => (o.products?.[0]?.order_status || 'New') === 'Shipped').length;
    const cancelledOrders = orders.filter(o => (o.products?.[0]?.order_status || 'New') === 'Cancelled').length;
    const returnedOrders = orders.filter(o => (o.products?.[0]?.order_status || 'New') === 'Returned').length;
    const orderOrders = orders.filter(o => o.order_type === 'Order').length;
    const inquiryOrders = orders.filter(o => o.order_type === 'inquiry').length;

    return {
      totalOrders,
      newOrders,
      pendingOrders,
      deliveredOrders,
      confirmedOrders,
      shippedOrders,
      cancelledOrders,
      returnedOrders,
      orderOrders,
      inquiryOrders
    };
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const dayMonthYear = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    return `${dayMonthYear}, ${time}`;
  };

  useEffect(() => {
    fetchOrders();
    fetchBuyers();
    fetchProducts();
    fetchSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = getStats();

  const displayError = error && String(error).toLowerCase().includes('missing orderid/buyerid for shipping') ? null : error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        <ShippingModal
          open={shippingOpen}
          onClose={() => !shippingLoading && setShippingOpen(false)}
          onSubmit={submitShipping}
          loading={shippingLoading}
          initial={shippingInitial}
          orderId={shippingCtx.orderId}
          buyerId={shippingCtx.buyerId}
          sellerId={shippingCtx.sellerId ?? SELLER_ID}
        />

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">📦 Order Management Dashboard</h1>
              <p className="text-gray-600 mt-1">Showing orders for Seller ID: {SELLER_ID}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <select
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium"
                >
                  {[
                    { value: 'all', label: 'All Types', icon: '📦' },
                    { value: 'Order', label: 'Orders', icon: '🛒' },
                    { value: 'inquiry', label: 'Inquiries', icon: '❓' }
                  ].map(option => {
                    const count = option.value === 'all'
                      ? stats.totalOrders
                      : option.value === 'Order'
                        ? stats.orderOrders
                        : stats.inquiryOrders;
                    return (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label} ({count})
                      </option>
                    );
                  })}
                </select>
                <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                >
                  {filterOptions.map(option => {
                    const count = option.value === 'all' ? stats.totalOrders : stats[`${option.value}Orders`] || 0;
                    return (
                      <option key={option.value} value={option.value}>
                        {option.label} ({count})
                      </option>
                    );
                  })}
                </select>
                <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {(statusFilter !== 'all' || orderTypeFilter !== 'all') && (
                <button
                  onClick={() => { setStatusFilter('all'); setOrderTypeFilter('all'); }}
                  className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  <FiX className="w-4 h-4" />
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {displayError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-700 font-medium">{displayError}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✖</button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Table */}
        {!loading && filteredOrders.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Buyer Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedOrders.has(order.id);
                    const orderStatus = getOrderStatus(order);
                    const paymentStatus = getPaymentStatus(order);
                    const totalQty = order.products.reduce((sum, p) => sum + parseInt(p?.quantity || 0, 10), 0);
                    const totalAmount = order.products.reduce((sum, p) => sum + (parseFloat(p?.price || 0) * parseInt(p?.quantity || 0, 10)), 0);
                    const numProducts = order.products.length;
                    const currentType = order.order_type || 'Order';
                    const newOrderType = currentType === 'Order' ? 'inquiry' : 'Order';

                    return (
                      <React.Fragment key={order.id}>
                        <tr onClick={() => toggleExpanded(order.id)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-bold text-blue-600">#{order.id}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-gray-900">{formatDate(order.created_at)}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-all ${getOrderTypeColor(currentType)}`}
                              onClick={() => updateOrderType(order.id, newOrderType)}
                            >
                              {currentType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-gray-900 font-medium">{getBuyerName(order.buyer_id)} ID: {order.buyer_id}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900">{numProducts} Product{numProducts !== 1 ? 's' : ''}</span>
                              <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              <span className="text-sm text-gray-600">Qty: {totalQty}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-bold text-green-700">₹{totalAmount.toFixed(2)}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getOrderStatusColor(orderStatus)}`}>{orderStatus}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(paymentStatus)}`}>{paymentStatus || 'Not Set'}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { setShowViewModal(true); setViewingOrder(order); }} className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" disabled={loading}>
                              View
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (order.products || []).map((p) => {
                          if (!p) return null;
                          const productTotal = (parseFloat(p.price || 0) * parseInt(p.quantity || 0, 10)).toFixed(2);

                          const orderProductWithCtx = {
                            order_product_id: p.id,
                            order_id: order.id,
                            buyer_id: order.buyer_id,
                            seller_id: p.seller_id
                          };

                          return (
                            <tr key={`${order.id}-${p.id}`} className="bg-gray-50">
                              <td colSpan={9} className="px-6 py-4">
                                <div className="pl-12 border-l-4 border-blue-300 bg-blue-50 rounded p-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                                    <div className="flex-1 min-w-0"><strong>Product:</strong> {getProductName(p.product_id)}</div>
                                    <div className="min-w-[80px]"><strong>Qty:</strong> {p.quantity}</div>
                                    <div className="min-w-[100px]"><strong>Unit Price:</strong> ₹{p.price}</div>
                                    <div className="min-w-[100px]"><strong>Total:</strong> ₹{productTotal}</div>

                                    <div className="min-w-[120px] whitespace-nowrap">
                                      <StatusDropdown
                                        value={p.order_status}
                                        onChange={(newStatus) => updateStatus(orderProductWithCtx, newStatus)}
                                        disabled={loading || shippingLoading}
                                      />
                                    </div>

                                    <div className="min-w-[160px] whitespace-nowrap">
                                      <button
                                        className="px-3 py-2 rounded bg-purple-700 text-white hover:bg-purple-800 text-xs font-semibold disabled:opacity-50"
                                        disabled={shippingLoading || !order?.id || !order?.buyer_id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openShippingForOrder({ orderId: order.id, buyerId: order.buyer_id, sellerId: p.seller_id });
                                        }}
                                      >
                                        Shipping
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500">No orders.</p>
          </div>
        )}

        {showViewModal && viewingOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Order #{viewingOrder.id}</h2>
                <button onClick={() => { setShowViewModal(false); setViewingOrder(null); }} className="text-xl font-bold">✖</button>
              </div>

              {(() => {
                const orderStatus = getOrderStatus(viewingOrder);
                const paymentStatus = getPaymentStatus(viewingOrder);
                const productsList = Array.isArray(viewingOrder.products) ? viewingOrder.products : [];
                const totalQty = productsList.reduce((sum, p) => sum + parseInt(p?.quantity || 0, 10), 0);
                const totalAmount = productsList.reduce((sum, p) => sum + (parseFloat(p?.price || 0) * parseInt(p?.quantity || 0, 10)), 0);
                const orderType = viewingOrder.order_type || 'Order';

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 border rounded-lg p-4">
                        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Buyer</div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">
                          {getBuyerName(viewingOrder.buyer_id)}
                          <span className="text-gray-500 font-medium"> {' '} (ID: {viewingOrder.buyer_id})</span>
                        </div>
                      </div>

                      <div className="bg-gray-50 border rounded-lg p-4">
                        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Date</div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">{formatDate(viewingOrder.created_at)}</div>
                      </div>

                      <div className="bg-gray-50 border rounded-lg p-4">
                        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Order Type</div>
                        <div className="mt-2">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getOrderTypeColor(orderType)}`}>{orderType}</span>
                        </div>
                      </div>

                      <div className="bg-gray-50 border rounded-lg p-4">
                        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Status</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getOrderStatusColor(orderStatus)}`}>{orderStatus}</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(paymentStatus)}`}>{paymentStatus || 'Not Set'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-800">Products</div>
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold">Qty:</span> {totalQty}
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="font-semibold">Total:</span> <span className="font-bold text-green-700">₹{totalAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      {productsList.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500">No products found for this order.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Price</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment</th>
                              </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-200">
                              {productsList.map((p) => {
                                const qty = parseInt(p?.quantity || 0, 10);
                                const unit = parseFloat(p?.price || 0);
                                const lineTotal = unit * qty;
                                const pOrderStatus = p?.order_status ? String(p.order_status) : 'New';
                                const pPaymentStatus = p?.payment_status ? String(p.payment_status) : paymentStatus;

                                return (
                                  <tr key={p?.id || `${viewingOrder.id}-${p?.product_id || 'p'}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{getProductName(p?.product_id)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{qty}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">₹{unit.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">₹{lineTotal.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOrderStatusColor(pOrderStatus)}`}>{pOrderStatus}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(pPaymentStatus)}`}>{pPaymentStatus || 'Not Set'}</span>
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
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OrderDashboard;