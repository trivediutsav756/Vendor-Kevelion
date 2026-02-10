import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

const API_BASE = "https://adminapi.kevelion.com";

const COMPANY_TYPES = [
  "Proprietorship",
  "Partnership",
  "Limited Liability Partnership (LLP)",
  "Private Limited Company",
  "Public Limited Company",
  "Proprietorship Firm",
  "MSME",
  "other",
];

const ANNUAL_TURNOVER_OPTIONS = [
  "below 20 lakh",
  "20-50 lakh",
  "50-1 cr",
  "1-5 cr",
  "5-10 cr",
  "10-20 cr",
];

const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getSellerIdFromLocalStorage = () => {
  const raw = localStorage.getItem("retaillian_user");
  const user = raw ? safeJsonParse(raw) : null;
  return user?.id ?? user?.seller?.id ?? null;
};

// If your API needs auth, this is a common pattern.
// Adjust key names if your app stores token differently.
const getAuthHeader = () => {
  const raw = localStorage.getItem("retaillian_user");
  const user = raw ? safeJsonParse(raw) : null;

  const token =
    user?.token ??
    user?.access_token ??
    localStorage.getItem("token") ??
    localStorage.getItem("access_token");

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const flattenProfileForForm = (data) => ({
  // SELLER
  name: data?.seller?.name || "",
  mobile: data?.seller?.mobile || "",
  email: data?.seller?.email || "",
  status: data?.seller?.status || "",
  approve_status: data?.seller?.approve_status || "",
  device_token: data?.seller?.device_token || "",
  subscription: data?.seller?.subscription || "",
  current_package_id: data?.seller?.current_package_id || "",
  current_package_start: data?.seller?.current_package_start || "",
  current_package_end: data?.seller?.current_package_end || "",

  // COMPANY
  company_name: data?.company?.company_name || "",
  company_type: data?.company?.company_type || "",
  company_GST_number: data?.company?.company_GST_number || "",
  company_website: data?.company?.company_website || "",
  IEC_code: data?.company?.IEC_code || "",
  annual_turnover: data?.company?.annual_turnover || "",
  facebook_link: data?.company?.facebook_link || "",
  linkedin_link: data?.company?.linkedin_link || "",
  insta_link: data?.company?.insta_link || "",
  city: data?.company?.city || "",
  state: data?.company?.state || "",
  pincode: data?.company?.pincode || "",
  company_logo: data?.company?.company_logo || "",

  // KYC
  aadhar_number: data?.kyc?.aadhar_number || "",
  aadhar_front: data?.kyc?.aadhar_front || "",
  aadhar_back: data?.kyc?.aadhar_back || "",
  company_registration: data?.kyc?.company_registration || "",
  company_pan_card: data?.kyc?.company_pan_card || "",
  gst_certificate: data?.kyc?.gst_certificate || "",

  // BANK
  bank_name: data?.bank?.bank_name || "",
  bank_IFSC_code: data?.bank?.bank_IFSC_code || "",
  account_number: data?.bank?.account_number || "",
  account_type: data?.bank?.account_type || "",
  cancelled_cheque_photo: data?.bank?.cancelled_cheque_photo || "",
});

const MyProfile = () => {
  const [activeTab, setActiveTab] = useState("personal");
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [sellerId, setSellerId] = useState(null);

  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState({});

  const authHeaders = useMemo(() => getAuthHeader(), []);
  const hasSellerId = !!sellerId;

  // init seller id once
  useEffect(() => {
    setSellerId(getSellerIdFromLocalStorage());
  }, []);

  // fetch profile
  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/seller/${sellerId}`, {
          headers: { ...authHeaders },
        });

        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        setProfile(data);
        setFormData(flattenProfileForForm(data));
        setFiles({});
      } catch (err) {
        console.log("Fetch error:", err?.response?.status, err?.response?.data || err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [sellerId, authHeaders]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: f } = e.target;
    const file = f && f[0] ? f[0] : null;
    setFiles((p) => {
      if (!file) {
        const next = { ...p };
        delete next[name];
        return next;
      }
      return { ...p, [name]: file };
    });
  };

  // ONE proper update: FormData for both text + files
  const handleSave = async () => {
    if (!sellerId) {
      toast.error("Seller ID not found. Please login again.");
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();

      // 1) Append ALL text fields as FLAT KEYS (most APIs accept this)
      const textKeys = [
        // seller
        "name",
        "mobile",
        "email",
        "status",
        "approve_status",
        "device_token",
        "subscription",
        "current_package_id",
        "current_package_start",
        "current_package_end",

        // company
        "company_name",
        "company_type",
        "company_GST_number",
        "company_website",
        "IEC_code",
        "annual_turnover",
        "facebook_link",
        "linkedin_link",
        "insta_link",
        "city",
        "state",
        "pincode",

        // kyc
        "aadhar_number",

        // bank
        "bank_name",
        "bank_IFSC_code",
        "account_number",
        "account_type",
      ];

      textKeys.forEach((k) => {
        const v = formData[k];
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });

      // 2) Also append nested style keys as BACKUP (some backends expect this)
      // If backend ignores unknown fields, this is safe.
      fd.append("seller[name]", formData.name ?? "");
      fd.append("seller[mobile]", formData.mobile ?? "");
      fd.append("seller[email]", formData.email ?? "");

      fd.append("company[company_name]", formData.company_name ?? "");
      fd.append("company[company_type]", formData.company_type ?? "");
      fd.append("company[company_GST_number]", formData.company_GST_number ?? "");

      fd.append("kyc[aadhar_number]", formData.aadhar_number ?? "");

      fd.append("bank[bank_name]", formData.bank_name ?? "");
      fd.append("bank[bank_IFSC_code]", formData.bank_IFSC_code ?? "");
      fd.append("bank[account_number]", formData.account_number ?? "");
      fd.append("bank[account_type]", formData.account_type ?? "");

      // 3) Append files (only if user selected)
      Object.entries(files).forEach(([key, file]) => {
        if (file) fd.append(key, file);
      });

      // 4) PATCH with multipart
      const res = await axios.patch(`${API_BASE}/seller/${sellerId}`, fd, {
        headers: {
          ...authHeaders,
          "Content-Type": "multipart/form-data",
        },
      });

      // Some APIs return updated object; some return message.
      // We re-fetch to be sure.
      toast.success("Profile updated!");

      const refreshed = await axios.get(`${API_BASE}/seller/${sellerId}`, {
        headers: { ...authHeaders },
      });
      const data = Array.isArray(refreshed.data) ? refreshed.data[0] : refreshed.data;

      setProfile(data);
      setFormData(flattenProfileForForm(data));
      setFiles({});
      setEditing(false);

      console.log("Update response:", res?.data);
    } catch (err) {
      console.log("Update error:", err?.response?.status, err?.response?.data || err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Update failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (profile) setFormData(flattenProfileForForm(profile));
    setFiles({});
    setEditing(false);
  };

  if (loading) return <div className="p-8 text-center text-xl">Loading...</div>;

  if (!hasSellerId)
    return (
      <div className="p-8 text-center">
        <Toaster />
        <div className="text-xl mb-2">Seller ID not found</div>
        <div className="text-gray-600">Please login again.</div>
      </div>
    );

  return (
    <>
      <Toaster />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-5">My Profile</h1>

        <div className="flex gap-3 mb-6">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 bg-green-600 text-white rounded-lg"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="flex border-b mb-6">
          {["personal", "company", "kyc", "bank"].map((tab) => (
            <button
              type="button"
              key={tab}
              className={`px-4 py-2 ${
                activeTab === tab ? "border-b-2 border-blue-600 font-bold" : ""
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === "personal" && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" name="name" editing={editing} value={formData.name} onChange={handleInputChange} />
            <Input label="Mobile" name="mobile" editing={editing} value={formData.mobile} onChange={handleInputChange} />
            <Input label="Email" name="email" editing={editing} value={formData.email} onChange={handleInputChange} />
            <Input label="Status" name="status" editing={editing} value={formData.status} onChange={handleInputChange} />
            <Input label="Approval Status" name="approve_status" editing={editing} value={formData.approve_status} onChange={handleInputChange} />
          </div>
        )}

        {activeTab === "company" && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company Name" name="company_name" editing={editing} value={formData.company_name} onChange={handleInputChange} />
            <SelectInput label="Company Type" name="company_type" editing={editing} value={formData.company_type} onChange={handleInputChange} options={COMPANY_TYPES} />
            <Input label="GST Number" name="company_GST_number" editing={editing} value={formData.company_GST_number} onChange={handleInputChange} />
            <Input label="Website" name="company_website" editing={editing} value={formData.company_website} onChange={handleInputChange} />
            <Input label="IEC Code" name="IEC_code" editing={editing} value={formData.IEC_code} onChange={handleInputChange} />
            <SelectInput label="Annual Turnover" name="annual_turnover" editing={editing} value={formData.annual_turnover} onChange={handleInputChange} options={ANNUAL_TURNOVER_OPTIONS} />
            <Input label="Facebook" name="facebook_link" editing={editing} value={formData.facebook_link} onChange={handleInputChange} />
            <Input label="LinkedIn" name="linkedin_link" editing={editing} value={formData.linkedin_link} onChange={handleInputChange} />
            <Input label="Instagram" name="insta_link" editing={editing} value={formData.insta_link} onChange={handleInputChange} />
            <Input label="City" name="city" editing={editing} value={formData.city} onChange={handleInputChange} />
            <Input label="State" name="state" editing={editing} value={formData.state} onChange={handleInputChange} />
            <Input label="Pincode" name="pincode" editing={editing} value={formData.pincode} onChange={handleInputChange} />
            <FileInput label="Company Logo" name="company_logo" existing={formData.company_logo} editing={editing} onChange={handleFileChange} />
          </div>
        )}

        {activeTab === "kyc" && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Aadhar Number" name="aadhar_number" editing={editing} value={formData.aadhar_number} onChange={handleInputChange} />
            <FileInput label="Aadhar Front" name="aadhar_front" existing={formData.aadhar_front} editing={editing} onChange={handleFileChange} />
            <FileInput label="Aadhar Back" name="aadhar_back" existing={formData.aadhar_back} editing={editing} onChange={handleFileChange} />
            <FileInput label="Company Registration" name="company_registration" existing={formData.company_registration} editing={editing} onChange={handleFileChange} />
            <FileInput label="Company PAN" name="company_pan_card" existing={formData.company_pan_card} editing={editing} onChange={handleFileChange} />
            <FileInput label="GST Certificate" name="gst_certificate" existing={formData.gst_certificate} editing={editing} onChange={handleFileChange} />
          </div>
        )}

        {activeTab === "bank" && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bank Name" name="bank_name" editing={editing} value={formData.bank_name} onChange={handleInputChange} />
            <Input label="IFSC Code" name="bank_IFSC_code" editing={editing} value={formData.bank_IFSC_code} onChange={handleInputChange} />
            <Input label="Account Number" name="account_number" editing={editing} value={formData.account_number} onChange={handleInputChange} />
            <Input label="Account Type" name="account_type" editing={editing} value={formData.account_type} onChange={handleInputChange} />
            <FileInput label="Cancelled Cheque" name="cancelled_cheque_photo" existing={formData.cancelled_cheque_photo} editing={editing} onChange={handleFileChange} />
          </div>
        )}
      </div>
    </>
  );
};

const Input = ({ label, name, value, editing, onChange, disabled }) => (
  <div>
    <label className="block mb-1">{label}</label>
    {editing && !disabled ? (
      <input
        type="text"
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full border rounded px-3 py-2"
      />
    ) : (
      <p className="font-semibold">{value ? value : "-"}</p>
    )}
  </div>
);

const SelectInput = ({ label, name, value, editing, onChange, options }) => (
  <div>
    <label className="block mb-1">{label}</label>
    {editing ? (
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full border rounded px-3 py-2 bg-white"
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <p className="font-semibold">{value ? value : "-"}</p>
    )}
  </div>
);

const FileInput = ({ label, name, existing, editing, onChange }) => {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!editing) setPreview(null);
  }, [editing]);

  const handleChange = (e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
    onChange(e);
  };

  const existingUrl = existing
    ? existing.startsWith("http")
      ? existing
      : `${API_BASE}${existing}`
    : "";

  return (
    <div>
      <label className="block mb-1">{label}</label>

      {editing && (
        <input type="file" name={name} onChange={handleChange} className="mb-2" />
      )}

      {preview ? (
        <img src={preview} alt={label} className="h-32 border rounded object-contain bg-gray-50" />
      ) : existingUrl ? (
        <img src={existingUrl} alt={label} className="h-32 border rounded object-contain bg-gray-50" />
      ) : (
        <div className="h-32 border border-dashed rounded flex items-center justify-center text-gray-400">
          No Image
        </div>
      )}
    </div>
  );
};

export default MyProfile;