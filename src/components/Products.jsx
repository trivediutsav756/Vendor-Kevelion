import React, { useState, useEffect } from 'react';

const Products = ({ user }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [sellers, setSellers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  // Bulk Upload States
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [imageFiles, setImageFiles] = useState({
    f_image: null,
    image_2: null,
    image_3: null,
    image_4: null,
    product_catalogue: null
  });
  const [imagePreviews, setImagePreviews] = useState({
    f_image: null,
    image_2: null,
    image_3: null,
    image_4: null,
    product_catalogue: null
  });
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    status: 'Active',
    detail: '',
    pricing_tiers: '[]',
    moq: 1,
    cat_id: '',
    cat_sub_id: '',
    brand: '',
    material: '',
    made_in: '',
    specification: '',
    warranty: '',
    seller_id: ''
  });
  // Pricing Tiers State for UI - now with strings for empty defaults
  const [pricingTiers, setPricingTiers] = useState([]);
  const BASE_URL = "https://adminapi.kevelion.com";
  const SELLER_ID = user?.id || (localStorage.getItem('retaillian_user') ? JSON.parse(localStorage.getItem('retaillian_user') || '{}').id : null);
  // ✅ HELPER TO UNESCAPE DOUBLE-QUOTED JSON STRINGS
  const unescapeJsonString = (str) => {
    if (typeof str !== 'string') return str;
    // Remove outer quotes and unescape inner quotes if it's a double-escaped JSON string
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return str;
  };
  // ✅ VALIDATE PRICING TIERS HELPER
  const validatePricingTiers = (tiers) => {
    // Get valid tiers with their original indices
    const validTiersWithIndex = tiers
      .map((tier, originalIndex) => {
        if (tier.min === '' || tier.price === '') return null;
        const min = parseInt(tier.min);
        const price = parseFloat(tier.price);
        if (isNaN(min) || isNaN(price)) return null;
        return { min, price, originalIndex };
      })
      .filter(tier => tier !== null);
    let errorMessage = null;
    let invalidOriginalIndex = null;
    // Check individual validity first
    for (let j = 0; j < validTiersWithIndex.length; j++) {
      const vt = validTiersWithIndex[j];
      if (vt.min < 1 || vt.price < 0) {
        errorMessage = 'Each tier must have positive numeric min (>=1) and price (>=0)';
        invalidOriginalIndex = vt.originalIndex;
        return { isValid: false, errorMessage, validTiers: [], invalidIndex: invalidOriginalIndex };
      }
    }
    // Validate min quantities are strictly increasing
    for (let i = 1; i < validTiersWithIndex.length; i++) {
      if (validTiersWithIndex[i].min <= validTiersWithIndex[i - 1].min) {
        errorMessage = 'Min quantities must be in strictly increasing order (each next quantity > previous)';
        invalidOriginalIndex = validTiersWithIndex[i].originalIndex;
        return { isValid: false, errorMessage, validTiers: [], invalidIndex: invalidOriginalIndex };
      }
    }
    // If all good, return valid ones without indices
    const validTiers = validTiersWithIndex.map(vt => ({min: vt.min, price: vt.price}));
    return { isValid: true, errorMessage: null, validTiers, invalidIndex: null };
  };
  // ✅ VALIDATE UPLOAD FILES
  const validateUploadFiles = () => {
    const errors = [];
    if (!excelFile) {
      errors.push('❌ Excel file is required');
      return errors;
    }
    const excelExt = excelFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(excelExt)) {
      errors.push(`❌ Invalid Excel file extension: .${excelExt} (allowed: .xlsx, .xls, .csv)`);
    }
    const excelSizeMB = excelFile.size / 1024 / 1024;
    if (excelFile.size > 10 * 1024 * 1024) {
      errors.push(`❌ Excel file too large: ${excelSizeMB.toFixed(2)} MB (max 10 MB)`);
    }
    if (zipFile) {
      const zipExt = zipFile.name.split('.').pop().toLowerCase();
      if (zipExt !== 'zip') {
        errors.push(`❌ Invalid ZIP file extension: .${zipExt} (must be .zip)`);
      }
      const zipSizeMB = zipFile.size / 1024 / 1024;
      if (zipFile.size > 100 * 1024 * 1024) {
        errors.push(`❌ ZIP file too large: ${zipSizeMB.toFixed(2)} MB (max 100 MB)`);
      }
    }
    return errors;
  };
  // ✅ ENHANCED BULK UPLOAD HANDLER
  const handleBulkUpload = async () => {
    const validationErrors = validateUploadFiles();
    if (validationErrors.length > 0) {
      alert(`⚠️ Validation Failed:\n\n${validationErrors.join('\n')}`);
      console.error('Validation errors:', validationErrors);
      return;
    }
    console.log('🚀 Starting bulk upload process...');
    console.log('📊 Excel file:', {
      name: excelFile.name,
      size: `${(excelFile.size / 1024).toFixed(2)} KB`,
      type: excelFile.type
    });
    if (zipFile) {
      console.log('🗂️ ZIP file:', {
        name: zipFile.name,
        size: `${(zipFile.size / 1024 / 1024).toFixed(2)} MB`,
        type: zipFile.type
      });
    }
    setBulkUploadLoading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('excel', excelFile, excelFile.name);
      if (zipFile) {
        formData.append('images_zip', zipFile, zipFile.name);
        setUploadStatus('📤 Uploading Excel and Images...');
      } else {
        setUploadStatus('📤 Uploading Excel file...');
      }
      console.log('📦 FormData contents:');
      for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
          console.log(` - ${pair[0]}: [File] ${pair[1].name} (${(pair[1].size / 1024).toFixed(2)} KB)`);
        } else {
          console.log(` - ${pair[0]}:`, pair[1]);
        }
      }
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
            console.log(`📊 Upload progress: ${percentComplete}% (${e.loaded}/${e.total} bytes)`);
            if (percentComplete < 100) {
              setUploadStatus(`📤 Uploading... ${percentComplete}%`);
            } else {
              setUploadStatus('⏳ Processing data on server...');
            }
          }
        });
        xhr.addEventListener('load', () => {
          console.log('📡 Response received');
          console.log(' Status:', xhr.status, xhr.statusText);
          console.log(' Headers:', xhr.getAllResponseHeaders());
          console.log(' Response text:', xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('✅ Parsed response:', response);
              setUploadProgress(100);
              setUploadStatus('✅ Upload successful!');
              setUploadResult({
                success: true,
                message: response.message || 'Products uploaded successfully!',
                data: response
              });
              const totalProducts = response.count
                || response.total
                || response.products_count
                || (response.products?.length)
                || (response.data?.length)
                || 'N/A';
              setTimeout(async () => {
                await fetchProducts();
                alert(`✅ Success!\n\n${response.message || 'Products uploaded successfully!'}\n\nTotal Products: ${totalProducts}`);
                setShowBulkUploadModal(false);
                resetBulkUpload();
              }, 1500);
              resolve(response);
            } catch (parseError) {
              console.error('⚠️ JSON parse error:', parseError);
              console.error('📄 Response text:', xhr.responseText);
              setUploadProgress(100);
              setUploadStatus('✅ Upload completed!');
              setUploadResult({
                success: true,
                message: 'Upload completed successfully!'
              });
              setTimeout(async () => {
                await fetchProducts();
                alert('✅ Products uploaded successfully!');
                setShowBulkUploadModal(false);
                resetBulkUpload();
              }, 1500);
              resolve({ success: true });
            }
          } else {
            console.error('❌ HTTP Error:', xhr.status, xhr.statusText);
            let errorMessage = `HTTP Error ${xhr.status}: ${xhr.statusText}`;
            let errorDetails = null;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              console.error('❌ Error response:', errorResponse);
              errorMessage = errorResponse.error
                || errorResponse.message
                || errorResponse.details
                || errorResponse.msg
                || errorMessage;
              errorDetails = errorResponse;
              if (errorResponse.details) {
                console.error('📋 Error details:', errorResponse.details);
              }
              if (errorResponse.validation_errors) {
                console.error('📋 Validation errors:', errorResponse.validation_errors);
              }
            } catch (e) {
              console.error('⚠️ Could not parse error response as JSON');
              errorMessage = xhr.responseText.substring(0, 500) || errorMessage;
            }
            setUploadStatus('❌ Upload failed');
            setUploadResult({
              success: false,
              message: errorMessage,
              details: errorDetails
            });
            const displayError = `❌ Upload Failed!\n\nStatus Code: ${xhr.status}\n\n${errorMessage}\n\nCheck browser console (F12) for details.`;
            alert(displayError);
            setBulkUploadLoading(false);
            reject(new Error(errorMessage));
          }
        });
        xhr.addEventListener('error', (e) => {
          console.error('❌ Network error occurred:', e);
          const errorMsg = 'Network error occurred. Please check your internet connection and try again.';
          setUploadStatus('❌ Network error');
          setUploadResult({
            success: false,
            message: errorMsg
          });
          alert(`❌ ${errorMsg}\n\nTroubleshooting:\n- Check your internet connection\n- Verify server is running\n- Check CORS settings`);
          setBulkUploadLoading(false);
          reject(new Error(errorMsg));
        });
        xhr.addEventListener('abort', () => {
          console.warn('⚠️ Upload aborted by user');
          setUploadStatus('⚠️ Upload cancelled');
          setUploadResult({
            success: false,
            message: 'Upload was cancelled'
          });
          setBulkUploadLoading(false);
          reject(new Error('Upload cancelled'));
        });
        xhr.addEventListener('timeout', () => {
          console.error('⏱️ Upload timeout (5 minutes)');
          const errorMsg = 'Upload timed out after 5 minutes. The file might be too large or connection is slow.';
          setUploadStatus('❌ Upload timeout');
          setUploadResult({
            success: false,
            message: errorMsg
          });
          alert(`❌ ${errorMsg}\n\nSuggestions:\n- Try with smaller files\n- Check your internet speed\n- Split the upload into batches`);
          setBulkUploadLoading(false);
          reject(new Error(errorMsg));
        });
        const uploadUrl = `${BASE_URL}/upload-excel-folder/${SELLER_ID}`;
        console.log(`📡 Sending POST request to: ${uploadUrl}`);
        xhr.open('POST', uploadUrl, true);
        xhr.timeout = 300000;
        xhr.send(formData);
        console.log('📤 Request sent, waiting for response...');
      });
    } catch (error) {
      console.error('❌ Bulk upload error:', error);
      console.error('❌ Error stack:', error.stack);
      setUploadStatus('❌ Upload failed');
      setUploadResult({
        success: false,
        message: error.message || 'Unknown error occurred'
      });
      alert(`❌ Upload failed!\n\n${error.message}\n\nPlease check the browser console (F12 → Console) for detailed error information.`);
      setBulkUploadLoading(false);
    }
  };
  const resetBulkUpload = () => {
    setExcelFile(null);
    setZipFile(null);
    setUploadProgress(0);
    setUploadStatus('');
    setUploadResult(null);
    setBulkUploadLoading(false);
    const excelInput = document.querySelector('input[type="file"][accept*="xlsx"]');
    const zipInput = document.querySelector('input[type="file"][accept*="zip"]');
    if (excelInput) excelInput.value = '';
    if (zipInput) zipInput.value = '';
    console.log('🔄 Bulk upload form reset');
  };
  const handleExcelFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log('📊 Excel file selected:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    const validExtensions = /\.(xlsx|xls|csv)$/i;
    if (!validTypes.includes(file.type) && !file.name.match(validExtensions)) {
      alert('⚠️ Please select a valid Excel file (.xlsx, .xls, or .csv)');
      e.target.value = '';
      console.error('Invalid file type:', file.type);
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`⚠️ Excel file size should not exceed 10MB\n\nYour file: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      e.target.value = '';
      console.error('File too large:', file.size);
      return;
    }
    setExcelFile(file);
    setUploadStatus('');
    setUploadResult(null);
    console.log('✅ Excel file validated and set');
  };
  const handleZipFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log('🗂️ ZIP file selected:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    const validTypes = ['application/zip', 'application/x-zip-compressed'];
    const validExtension = /\.zip$/i;
    if (!validTypes.includes(file.type) && !file.name.match(validExtension)) {
      alert('⚠️ Please select a valid ZIP file');
      e.target.value = '';
      console.error('Invalid file type:', file.type);
      return;
    }
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`⚠️ ZIP file size should not exceed 100MB\n\nYour file: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      e.target.value = '';
      console.error('File too large:', file.size);
      return;
    }
    setZipFile(file);
    setUploadStatus('');
    setUploadResult(null);
    console.log('✅ ZIP file validated and set');
  };
  const downloadSampleExcel = () => {
    console.log('📥 Downloading sample Excel template...');
    const sampleData = [
      'name,sku,status,detail,pricing_tiers,moq,cat_id,cat_sub_id,brand,material,made_in,specification,warranty,seller_id,highlight,f_image,image_2,image_3,image_4,product_catalogue',
      'Toy Car,TC01845,Active,Mini car toy for kids,[{"min":1,"price":150}],1,5,25,HotWheels,Plastic,India,Durable toy,6 months,1,Yes,p1.jpg,p2.jpg,p3.jpg,p4.jpg,',
      'Building Blocks,BB149845,Active,50 colorful blocks set,[{"min":1,"price":499}],1,5,25,Lego,Plastic,India,Educational toy,1 year,1,Yes,p5.jpg,p6.jpg,p7.jpg,p8.jpg,'
    ].join('\n');
    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log('✅ Sample template downloaded');
  };
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    if (imagePath.startsWith('/')) {
      return `${BASE_URL}${imagePath}`;
    }
    if (imagePath.includes('/')) {
      return `${BASE_URL}/${imagePath}`;
    }
    return `${BASE_URL}/uploads/${imagePath}`;
  };
  const isPDF = (url) => {
    if (!url) return false;
    const urlString = String(url).toLowerCase();
    return urlString.includes('.pdf') || urlString.includes('application/pdf');
  };
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };
  const handleFileSelect = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validDocTypes = ['application/pdf'];
    if (fieldName === 'product_catalogue') {
      if (!validDocTypes.includes(file.type) && !validImageTypes.includes(file.type)) {
        alert('Please select a valid PDF or image file for catalogue');
        return;
      }
    } else {
      if (!validImageTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size should not exceed 5MB');
      return;
    }
    try {
      let processedFile = file;
      if (validImageTypes.includes(file.type) && file.size > 500 * 1024) {
        console.log(`Compressing ${fieldName}...`);
        processedFile = await compressImage(file);
        console.log(`Compressed from ${(file.size / 1024).toFixed(2)}KB to ${(processedFile.size / 1024).toFixed(2)}KB`);
      }
      setImageFiles(prev => ({
        ...prev,
        [fieldName]: processedFile
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => ({
          ...prev,
          [fieldName]: reader.result
        }));
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Failed to process image. Please try another file.');
    }
  };
  const handleRemoveImage = (fieldName) => {
    setImageFiles(prev => ({
      ...prev,
      [fieldName]: null
    }));
    setImagePreviews(prev => ({
      ...prev,
      [fieldName]: null
    }));
  };
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/product_seller/${SELLER_ID}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let productsArray = [];
      if (Array.isArray(data)) {
        productsArray = data;
      } else if (data && Array.isArray(data.data)) {
        productsArray = data.data;
      } else if (data && Array.isArray(data.products)) {
        productsArray = data.products;
      }
      setProducts(productsArray);
      console.log(`✅ Fetched ${productsArray.length} products`);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(`Failed to fetch products: ${error.message}`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchProductDetails = async (productId) => {
    setViewLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/product/${productId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let productData = null;
      if (data.data) {
        productData = data.data;
      } else if (data.product) {
        productData = data.product;
      } else {
        productData = data;
      }
      return productData;
    } catch (error) {
      console.error('Error fetching product details:', error);
      return null;
    } finally {
      setViewLoading(false);
    }
  };
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BASE_URL}/categories`);
      const data = await response.json();
      let categoriesArray = [];
      if (Array.isArray(data)) {
        categoriesArray = data;
      } else if (data && Array.isArray(data.data)) {
        categoriesArray = data.data;
      } else if (data && Array.isArray(data.categories)) {
        categoriesArray = data.categories;
      }
      setCategories(categoriesArray);
      console.log(`✅ Fetched ${categoriesArray.length} categories`);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };
  const fetchSubCategories = async () => {
    try {
      const response = await fetch(`${BASE_URL}/subcategories`);
      const data = await response.json();
      let subCategoriesArray = [];
      if (Array.isArray(data)) {
        subCategoriesArray = data;
      } else if (data && Array.isArray(data.data)) {
        subCategoriesArray = data.data;
      } else if (data && Array.isArray(data.subcategories)) {
        subCategoriesArray = data.subcategories;
      }
      setSubCategories(subCategoriesArray);
      console.log(`✅ Fetched ${subCategoriesArray.length} subcategories`);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubCategories([]);
    }
  };
  const fetchSellers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/sellers`);
      if (!response.ok) throw new Error('Failed to fetch sellers');
      const data = await response.json();
      const sellersMap = {};
      let sellersArray = [];
      if (Array.isArray(data)) {
        sellersArray = data;
      } else if (data && Array.isArray(data.data)) {
        sellersArray = data.data;
      } else if (data && Array.isArray(data.sellers)) {
        sellersArray = data.sellers;
      }
      sellersArray.forEach(seller => {
        sellersMap[seller.id] = seller.name || seller.company_name || `Seller ${seller.id}`;
      });
      setSellers(sellersMap);
      console.log(`✅ Fetched ${sellersArray.length} sellers`);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSubCategories();
    fetchSellers();
  }, []);
  const getSubCategoriesByCategory = (categoryId) => {
    if (!categoryId) return [];
    return subCategories.filter(sub => {
      if (!sub || !sub.category_id) return false;
      return sub.category_id.toString() === categoryId.toString();
    });
  };
  const checkDuplicateSKU = (sku, currentProductId = null) => {
    return products.some(product =>
      product.sku === sku && product.id !== currentProductId
    );
  };
  const updatePricingTiers = (tiers) => {
    const { isValid, errorMessage, validTiers, invalidIndex } = validatePricingTiers(tiers);
    if (!isValid) {
      setFormErrors(prev => ({ ...prev, pricing_tiers: errorMessage, pricing_tiers_invalid_index: invalidIndex }));
      return;
    }
    setFormErrors(prev => {
      const newErrors = { ...prev, pricing_tiers: null };
      delete newErrors.pricing_tiers_invalid_index;
      return newErrors;
    });
    // Update newProduct with valid tiers only
    setNewProduct(prev => ({ ...prev, pricing_tiers: JSON.stringify(validTiers) }));
  };
  const validateForm = () => {
    const errors = {};
    if (!newProduct.name.trim()) errors.name = 'Product name is required';
    if (!newProduct.sku.trim()) {
      errors.sku = 'SKU is required';
    } else if (checkDuplicateSKU(newProduct.sku, editingProduct?.id)) {
      errors.sku = 'This SKU already exists. Please use a unique SKU';
    }
    if (!newProduct.cat_id) errors.cat_id = 'Category is required';
    if (!newProduct.cat_sub_id) errors.cat_sub_id = 'Sub category is required';
    if (newProduct.moq < 1) errors.moq = 'MOQ must be at least 1';
    // Validate pricing tiers based on current UI state
    const pricingValidation = validatePricingTiers(pricingTiers);
    if (!pricingValidation.isValid) {
      errors.pricing_tiers = pricingValidation.errorMessage;
      errors.pricing_tiers_invalid_index = pricingValidation.invalidIndex;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleViewProduct = async (product) => {
    const completeProduct = await fetchProductDetails(product.id);
    setViewingProduct(completeProduct || product);
    setShowViewModal(true);
  };
  const handleAddProduct = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields correctly');
      return;
    }
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', newProduct.name.trim());
      formData.append('sku', newProduct.sku.trim());
      formData.append('status', newProduct.status);
      formData.append('detail', newProduct.detail.trim());
      formData.append('pricing_tiers', newProduct.pricing_tiers || '[]');
      formData.append('moq', parseInt(newProduct.moq) || 1);
      formData.append('cat_id', parseInt(newProduct.cat_id));
      formData.append('cat_sub_id', parseInt(newProduct.cat_sub_id));
      formData.append('brand', newProduct.brand.trim());
      formData.append('material', newProduct.material.trim());
      formData.append('made_in', newProduct.made_in.trim());
      formData.append('specification', newProduct.specification.trim());
      formData.append('warranty', newProduct.warranty.trim());
      formData.append('seller_id', SELLER_ID);
      if (imageFiles.f_image) formData.append('f_image', imageFiles.f_image);
      if (imageFiles.image_2) formData.append('image_2', imageFiles.image_2);
      if (imageFiles.image_3) formData.append('image_3', imageFiles.image_3);
      if (imageFiles.image_4) formData.append('image_4', imageFiles.image_4);
      if (imageFiles.product_catalogue) formData.append('product_catalogue', imageFiles.product_catalogue);
      const response = await fetch(`${BASE_URL}/product`, {
        method: 'POST',
        body: formData
      });
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response. Please check server configuration.');
      }
      const result = await response.json();
      if (response.ok) {
        await fetchProducts();
        setShowAddModal(false);
        resetForm();
        alert('✅ Product added successfully!');
      } else {
        let errorMessage = 'Failed to add product';
        if (result.error) {
          if (result.error.includes('Duplicate entry') && result.error.includes('sku')) {
            errorMessage = `❌ This SKU "${newProduct.sku}" already exists in the database. Please use a unique SKU.`;
            setFormErrors(prev => ({ ...prev, sku: 'SKU already exists' }));
          } else {
            errorMessage = `❌ ${result.error}`;
          }
        } else if (result.message) {
          errorMessage = `❌ ${result.message}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name || '',
      sku: product.sku || '',
      status: product.status || 'Active',
      detail: product.detail || '',
      pricing_tiers: product.pricing_tiers || '[]',
      moq: product.moq || 1,
      cat_id: product.cat_id || '',
      cat_sub_id: product.cat_sub_id || '',
      brand: product.brand || '',
      material: product.material || '',
      made_in: product.made_in || '',
      specification: product.specification || '',
      warranty: product.warranty || '',
      seller_id: product.seller_id || SELLER_ID
    });
    // Parse and set pricing tiers for UI - convert to strings
    let tiers = [];
    try {
      let tiersStr = product.pricing_tiers || '[]';
      tiersStr = unescapeJsonString(tiersStr);
      tiers = tiersStr && tiersStr !== '[]' ? JSON.parse(tiersStr) : [];
      if (!Array.isArray(tiers)) tiers = [];
      // Convert numbers to strings for inputs
      tiers = tiers.map(t => ({
        min: t.min ? t.min.toString() : '',
        price: t.price ? t.price.toString() : ''
      }));
    } catch (e) {
      console.error('Invalid pricing tiers JSON:', e);
      tiers = [];
    }
    // ✅ FIX: If no tiers exist during edit, add a default empty row for easy price editing
    if (tiers.length === 0) {
      tiers = [{ min: '', price: '' }];
    }
    setPricingTiers(tiers);
    // Ensure newProduct.pricing_tiers is updated to valid JSON string
    updatePricingTiers(tiers);
    setImagePreviews({
      f_image: product.f_image ? getImageUrl(product.f_image) : null,
      image_2: product.image_2 ? getImageUrl(product.image_2) : null,
      image_3: product.image_3 ? getImageUrl(product.image_3) : null,
      image_4: product.image_4 ? getImageUrl(product.image_4) : null,
      product_catalogue: product.product_catalogue ? getImageUrl(product.product_catalogue) : null
    });
    setImageFiles({
      f_image: null,
      image_2: null,
      image_3: null,
      image_4: null,
      product_catalogue: null
    });
    setFormErrors({});
    setShowAddModal(true);
    setShowViewModal(false);
  };
  const handleUpdateProduct = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields correctly');
      return;
    }
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', newProduct.name.trim());
      formData.append('sku', newProduct.sku.trim());
      formData.append('status', newProduct.status);
      formData.append('detail', newProduct.detail.trim());
      formData.append('pricing_tiers', newProduct.pricing_tiers || '[]');
      formData.append('moq', parseInt(newProduct.moq) || 1);
      formData.append('cat_id', parseInt(newProduct.cat_id));
      formData.append('cat_sub_id', parseInt(newProduct.cat_sub_id));
      formData.append('brand', newProduct.brand.trim());
      formData.append('material', newProduct.material.trim());
      formData.append('made_in', newProduct.made_in.trim());
      formData.append('specification', newProduct.specification.trim());
      formData.append('warranty', newProduct.warranty.trim());
      formData.append('seller_id', editingProduct.seller_id || SELLER_ID);
      if (imageFiles.f_image) formData.append('f_image', imageFiles.f_image);
      if (imageFiles.image_2) formData.append('image_2', imageFiles.image_2);
      if (imageFiles.image_3) formData.append('image_3', imageFiles.image_3);
      if (imageFiles.image_4) formData.append('image_4', imageFiles.image_4);
      if (imageFiles.product_catalogue) formData.append('product_catalogue', imageFiles.product_catalogue);
      const response = await fetch(`${BASE_URL}/product/${editingProduct.id}`, {
        method: 'PATCH',
        body: formData
      });
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response. Please check server configuration.');
      }
      const result = await response.json();
      if (response.ok) {
        await fetchProducts();
        setShowAddModal(false);
        setEditingProduct(null);
        resetForm();
        alert('✅ Product updated successfully!');
      } else {
        let errorMessage = 'Failed to update product';
        if (result.error) {
          if (result.error.includes('Duplicate entry') && result.error.includes('sku')) {
            errorMessage = `❌ This SKU "${newProduct.sku}" already exists. Please use a unique SKU.`;
            setFormErrors(prev => ({ ...prev, sku: 'SKU already exists' }));
          } else {
            errorMessage = `❌ ${result.error}`;
          }
        } else if (result.message) {
          errorMessage = `❌ ${result.message}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };
  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        const response = await fetch(`${BASE_URL}/product/${productId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          await fetchProducts();
          alert('✅ Product deleted successfully!');
        } else {
          const errorText = await response.text();
          console.error('Delete failed with status:', response.status, errorText);
          if (response.status === 404) throw new Error('Product not found on server');
          else if (response.status === 500) throw new Error('Server error while deleting product');
          else throw new Error(`Delete failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert(`❌ Failed to delete product: ${error.message}`);
      }
    }
  };
  const toggleStatus = async (productId, newStatus) => {
    if (newStatus === undefined) return;
    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      const response = await fetch(`${BASE_URL}/product/${productId}`, {
        method: 'PATCH',
        body: formData
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Update local state
      setProducts(prevProducts =>
        prevProducts.map(product =>
          product.id === productId ? { ...product, status: newStatus } : product
        )
      );
      console.log(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Failed to update status: ${error.message}`);
    }
  };
  const resetForm = () => {
    setNewProduct({
      name: '', sku: '', status: 'Active', detail: '', pricing_tiers: '[]',
      moq: 1, cat_id: '', cat_sub_id: '', brand: '', material: '', made_in: '',
      specification: '', warranty: '', seller_id: SELLER_ID
    });
    // ✅ FIX: Always start with a default empty tier row for easy editing
    setPricingTiers([{ min: '', price: '' }]);
    setImagePreviews({
      f_image: null, image_2: null, image_3: null, image_4: null, product_catalogue: null
    });
    setImageFiles({
      f_image: null, image_2: null, image_3: null, image_4: null, product_catalogue: null
    });
    setFormErrors({});
  };
  useEffect(() => {
    if (newProduct.cat_id && !editingProduct) {
      const availableSubCategories = getSubCategoriesByCategory(newProduct.cat_id);
      if (availableSubCategories.length > 0) {
        setNewProduct(prev => ({
          ...prev,
          cat_sub_id: availableSubCategories[0].id.toString()
        }));
      }
    }
  }, [newProduct.cat_id]);
  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'N/A';
    const category = categories.find(cat => cat && cat.id == categoryId);
    return category ? category.category_name : 'N/A';
  };
  const getSubCategoryName = (subCategoryId) => {
    if (!subCategoryId) return 'N/A';
    const subCategory = subCategories.find(sub => sub && sub.id == subCategoryId);
    return subCategory ? subCategory.subcategory_name : 'N/A';
  };
  const getSellerName = (sellerId) => {
    return sellers[sellerId] || `Seller ${sellerId}`;
  };
  const ProductImage = ({ src, alt, className, showBadge = false }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const imageUrl = getImageUrl(src);
    if (!imageUrl || imageError) {
      return (
        <div className={`${className} bg-gradient-to-br from-gray-200 to-gray-300 flex flex-col items-center justify-center`}>
          <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs text-gray-500">No Image</p>
        </div>
      );
    }
    return (
      <div className="relative group">
        {imageLoading && (
          <div className={`${className} bg-gray-200 flex items-center justify-center absolute inset-0`}>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        <img
          src={imageUrl}
          alt={alt || 'Product Image'}
          className={`${className} ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={() => setImageLoading(false)}
          onError={(e) => {
            console.error('Image failed to load:', imageUrl);
            setImageError(true);
            setImageLoading(false);
          }}
          loading="lazy"
        />
        {showBadge && !imageLoading && !imageError && (
          <span className="absolute top-3 left-3 bg-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            ⭐ Featured
          </span>
        )}
      </div>
    );
  };
  const ImageUploadField = ({ label, fieldName, isRequired = false, acceptType = "image/*" }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <div className="space-y-3">
        <label className="cursor-pointer block">
          <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-gray-600">
              {imageFiles[fieldName] ? imageFiles[fieldName].name : 'Choose File'}
            </span>
          </div>
          <input
            type="file"
            accept={acceptType}
            onChange={(e) => handleFileSelect(e, fieldName)}
            className="hidden"
          />
        </label>
        {imagePreviews[fieldName] && (
          <div className="relative inline-block">
            {fieldName === 'product_catalogue' && isPDF(imagePreviews[fieldName]) ? (
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-700">PDF Catalogue Selected</span>
              </div>
            ) : (
              <img
                src={imagePreviews[fieldName]}
                alt={`Preview ${fieldName}`}
                className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">No Image</text></svg>';
                }}
              />
            )}
            <button
              type="button"
              onClick={() => handleRemoveImage(fieldName)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
              title="Remove image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Max file size: 5MB. Images will be auto-compressed. Supported: JPEG, PNG, GIF, WebP
        {fieldName === 'product_catalogue' && ', PDF'}
      </p>
    </div>
  );
  // Helper function to handle quantity change - allow input, validation via updatePricingTiers
  const handleQuantityChange = (index, newValue) => {
    const newTiers = [...pricingTiers];
    newTiers[index].min = newValue;
    setPricingTiers(newTiers);
    updatePricingTiers(newTiers);
  };
  // Helper function to handle price change with prevention
  const handlePriceChange = (index, newValue) => {
    if (newValue === '') {
      const newTiers = [...pricingTiers];
      newTiers[index].price = '';
      setPricingTiers(newTiers);
      updatePricingTiers(newTiers);
      return;
    }
    const newPrice = parseFloat(newValue);
    if (isNaN(newPrice) || newPrice < 0) return;
    // Valid, update (no restrictions on price relative to others)
    const newTiers = [...pricingTiers];
    newTiers[index].price = newValue;
    setPricingTiers(newTiers);
    updatePricingTiers(newTiers);
  };
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Error Loading Products</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchProducts}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Product Management</h1>
              <p className="text-gray-600 mt-1">Manage all your product inventory</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkUploadModal(true);
                  console.log('📤 Bulk upload modal opened');
                }}
                // ✅ FIX: Removed disabled condition - allow bulk upload even if no products
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition duration-200 shadow-md flex items-center gap-2 hover:from-green-700 hover:to-emerald-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Bulk Upload
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  resetForm();
                  setShowAddModal(true);
                }}
                // ✅ FIX: Removed disabled condition - allow add even if no products
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition duration-200 shadow-md flex items-center gap-2 hover:bg-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold text-gray-700">
                  Total Products: {products.length}
                </span>
                <span className="text-sm text-gray-500">
                  Categories: {categories.length} | Subcategories: {subCategories.length}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Products Table - WITH F_IMAGE COLUMN ADDED */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Image</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">MOQ</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-gray-500 text-lg font-medium">No products found</p>
                          <p className="text-gray-400 text-sm mt-1">Add your first product to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    products.map((product, index) => (
                      <tr key={product.id} className="hover:bg-blue-50 transition duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{index + 1}</div>
                        </td>
                        {/* ✅ NEW IMAGE COLUMN */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ProductImage
                            src={product.f_image}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-semibold text-gray-900">
                              {product.name || 'Unnamed Product'}
                            </div>
                            {product.detail && (
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {product.detail.substring(0, 50)}...
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{getCategoryName(product.cat_id)}</div>
                          <div className="text-xs text-gray-500">{getSubCategoryName(product.cat_sub_id)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.brand || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-blue-600">{product.moq || 1}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                              product.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {product.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewProduct(product)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                              title="View Full Details"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete Product"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* BULK UPLOAD MODAL */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-6 z-10 rounded-t-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    <span className="text-4xl">📤</span>
                    Bulk Product Upload
                  </h2>
                  <p className="text-green-100 text-sm mt-1">Upload multiple products via Excel & Images ZIP</p>
                </div>
                <button
                  onClick={() => {
                    if (!bulkUploadLoading) {
                      setShowBulkUploadModal(false);
                      resetBulkUpload();
                    }
                  }}
                  disabled={bulkUploadLoading}
                  className="text-white hover:bg-white hover:text-green-600 w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 mb-3">📋 How to Upload Products in Bulk:</h3>
                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                      <li><strong>Step 1:</strong> Download the sample Excel template below</li>
                      <li><strong>Step 2:</strong> Fill in product details (name, sku, cat_id, cat_sub_id, brand, moq, etc.)</li>
                      <li><strong>Step 3:</strong> Add image filenames in columns: f_image, image_2, image_3, image_4, product_catalogue</li>
                      <li><strong>Step 4:</strong> Create a ZIP file containing all product images</li>
                      <li><strong>Step 5:</strong> Upload both Excel file (required) and ZIP file (optional)</li>
                      <li><strong>Note:</strong> Image filenames in Excel must exactly match files in ZIP</li>
                    </ol>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        <strong>⚠️ Important:</strong> Ensure cat_id and cat_sub_id exist in your database.
                        Status values: "Active" or "Inactive".
                      </p>
                    </div>
                    <button
                      onClick={downloadSampleExcel}
                      className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Sample Excel Template
                    </button>
                  </div>
                </div>
              </div>
              {/* Excel File Upload */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
                <label className="block text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Excel File <span className="text-red-500">*</span> (Required)
                </label>
                <label className="cursor-pointer block">
                  <div className={`flex items-center justify-center px-6 py-8 border-3 border-dashed rounded-xl transition-all ${
                    excelFile
                      ? 'border-green-500 bg-green-100'
                      : 'border-green-400 hover:border-green-600 hover:bg-green-100'
                  }`}>
                    <div className="text-center">
                      <svg className="w-16 h-16 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-semibold text-green-700">
                        {excelFile ? `✓ ${excelFile.name}` : 'Click to select Excel file'}
                      </p>
                      <p className="text-sm text-green-600 mt-2">
                        Formats: .xlsx, .xls, .csv | Max: 10MB
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={handleExcelFileSelect}
                    disabled={bulkUploadLoading}
                    className="hidden"
                  />
                </label>
                {excelFile && (
                  <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-md border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{excelFile.name}</p>
                        <p className="text-xs text-gray-500">{(excelFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setExcelFile(null);
                        const input = document.querySelector('input[type="file"][accept*="xlsx"]');
                        if (input) input.value = '';
                        console.log('Excel file removed');
                      }}
                      disabled={bulkUploadLoading}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove file"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {/* ZIP File Upload */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
                <label className="block text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🗂️</span>
                  Images ZIP File (Optional)
                </label>
                <label className="cursor-pointer block">
                  <div className={`flex items-center justify-center px-6 py-8 border-3 border-dashed rounded-xl transition-all ${
                    zipFile
                      ? 'border-purple-500 bg-purple-100'
                      : 'border-purple-400 hover:border-purple-600 hover:bg-purple-100'
                  }`}>
                    <div className="text-center">
                      <svg className="w-16 h-16 text-purple-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-lg font-semibold text-purple-700">
                        {zipFile ? `✓ ${zipFile.name}` : 'Click to select ZIP file'}
                      </p>
                      <p className="text-sm text-purple-600 mt-2">
                        Format: .zip | Max: 100MB
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={handleZipFileSelect}
                    disabled={bulkUploadLoading}
                    className="hidden"
                  />
                </label>
                {zipFile && (
                  <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-md border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{zipFile.name}</p>
                        <p className="text-xs text-gray-500">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setZipFile(null);
                        const input = document.querySelector('input[type="file"][accept*="zip"]');
                        if (input) input.value = '';
                        console.log('ZIP file removed');
                      }}
                      disabled={bulkUploadLoading}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove file"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {/* Upload Progress */}
              {bulkUploadLoading && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-3 border-b-3 border-blue-600"></div>
                    <div className="flex-1">
                      <p className="font-bold text-blue-900 text-lg">{uploadStatus}</p>
                      <p className="text-sm text-blue-700">Please don't close this window...</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-center text-xs font-bold text-white shadow-lg"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      {uploadProgress > 5 && `${uploadProgress}%`}
                    </div>
                  </div>
                  {uploadProgress === 100 && (
                    <p className="text-center text-sm text-green-600 mt-3 font-semibold">
                      Processing completed! Refreshing products list...
                    </p>
                  )}
                </div>
              )}
              {/* Upload Result */}
              {uploadResult && !bulkUploadLoading && (
                <div className={`${uploadResult.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'} border-2 rounded-xl p-5 shadow-md`}>
                  <div className="flex items-start gap-3">
                    <div className={`${uploadResult.success ? 'text-green-500' : 'text-red-500'} text-3xl`}>
                      {uploadResult.success ? '✅' : '❌'}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
                      </h4>
                      <p className={`text-sm mt-1 ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {uploadResult.message}
                      </p>
                      {!uploadResult.success && uploadResult.details && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-900">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(uploadResult.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-gradient-to-r from-gray-100 to-gray-200 border-t-2 border-gray-300 p-6 rounded-b-2xl">
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const validationErrors = validateUploadFiles();
                    if (validationErrors.length > 0) {
                      alert(`⚠️ Validation Failed:\n\n${validationErrors.join('\n')}`);
                      console.error('Validation errors:', validationErrors);
                      return;
                    }
                    handleBulkUpload();
                  }}
                  disabled={!excelFile || bulkUploadLoading}
                  className={`flex-1 ${
                    !excelFile || bulkUploadLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                  } text-white px-6 py-4 rounded-xl transition-all font-bold flex items-center justify-center gap-3 text-lg`}
                >
                  {bulkUploadLoading ? (
                    <>
                      <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Start Upload
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!bulkUploadLoading) {
                      setShowBulkUploadModal(false);
                      resetBulkUpload();
                    }
                  }}
                  disabled={bulkUploadLoading}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-4 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-bold shadow-lg flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {bulkUploadLoading ? 'Please Wait...' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* VIEW PRODUCT MODAL */}
      {showViewModal && viewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-6 z-10 rounded-t-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    <span className="text-4xl">📦</span>
                    Complete Product Details
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">All information about this product</p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingProduct(null);
                  }}
                  className="text-white hover:bg-white hover:text-blue-600 w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            {viewLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {(viewingProduct.f_image || viewingProduct.image_2 || viewingProduct.image_3 || viewingProduct.image_4) && (
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border-2 border-orange-200 shadow-lg">
                    <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">🖼️</span>
                      Product Images Gallery
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {viewingProduct.f_image && (
                        <ProductImage
                          src={viewingProduct.f_image}
                          alt="Featured Image"
                          className="w-full h-48 object-cover rounded-xl border-4 border-orange-300 shadow-xl hover:scale-105 transition-transform duration-300"
                          showBadge={true}
                        />
                      )}
                      {viewingProduct.image_2 && (
                        <ProductImage
                          src={viewingProduct.image_2}
                          alt="Image 2"
                          className="w-full h-48 object-cover rounded-xl border-4 border-orange-300 shadow-xl hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      {viewingProduct.image_3 && (
                        <ProductImage
                          src={viewingProduct.image_3}
                          alt="Image 3"
                          className="w-full h-48 object-cover rounded-xl border-4 border-orange-300 shadow-xl hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      {viewingProduct.image_4 && (
                        <ProductImage
                          src={viewingProduct.image_4}
                          alt="Image 4"
                          className="w-full h-48 object-cover rounded-xl border-4 border-orange-300 shadow-xl hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                  </div>
                )}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 shadow-lg">
                  <h3 className="text-xl font-bold text-blue-900 mb-5 flex items-center gap-2">
                    <span className="text-2xl">ℹ️</span>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Product ID</p>
                      <p className="text-2xl font-bold text-blue-600">#{viewingProduct.id}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow col-span-2">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Product Name</p>
                      <p className="text-lg font-bold text-gray-900">{viewingProduct.name || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Status</p>
                      <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-full ${
                        viewingProduct.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {viewingProduct.status || 'Active'}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow col-span-2">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">SKU (Stock Keeping Unit)</p>
                      <p className="text-lg font-mono bg-gray-100 px-3 py-2 rounded-lg font-bold text-gray-900">
                        {viewingProduct.sku || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">🏪 Seller Name</p>
                      <p className="text-lg font-bold text-gray-900">{getSellerName(viewingProduct.seller_id)}</p>
                      <p className="text-xs text-gray-500 mt-1">Seller ID: {viewingProduct.seller_id}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200 shadow-lg">
                  <h3 className="text-xl font-bold text-green-900 mb-5 flex items-center gap-2">
                    <span className="text-2xl">🏷️</span>
                    Category Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Main Category</p>
                      <p className="text-xl font-bold text-green-700">{getCategoryName(viewingProduct.cat_id)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Sub Category</p>
                      <p className="text-xl font-bold text-green-700">{getSubCategoryName(viewingProduct.cat_sub_id)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200 shadow-lg">
                  <h3 className="text-xl font-bold text-purple-900 mb-5 flex items-center gap-2">
                    <span className="text-2xl">📝</span>
                    Product Details & Specifications
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">🏢 Brand</p>
                      <p className="text-lg font-bold text-gray-900">{viewingProduct.brand || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">🧵 Material</p>
                      <p className="text-lg font-bold text-gray-900">{viewingProduct.material || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">🌍 Made In</p>
                      <p className="text-lg font-bold text-gray-900">{viewingProduct.made_in || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">📦 MOQ (Min. Order)</p>
                      <p className="text-xl font-bold text-blue-600">{viewingProduct.moq || 1} units</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">🛡️ Warranty</p>
                      <p className="text-lg font-bold text-gray-900">{viewingProduct.warranty || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">💰 Pricing Tiers</p>
                      {(() => {
                        console.log('🔍 View Product Pricing Debug:');
                        console.log('Raw pricing_tiers:', viewingProduct.pricing_tiers);
                        console.log('Type:', typeof viewingProduct.pricing_tiers);
                  
                        // SIMPLIFIED: Just show whatever pricing data exists
                        if (!viewingProduct.pricing_tiers) {
                          console.log('❌ No pricing_tiers field');
                          return <p className="text-gray-500 text-sm italic">No pricing data</p>;
                        }
                  
                        // Show raw data for debugging
                        console.log('Raw data exists, attempting to parse...');
                  
                        try {
                          let tiers = [];
                    
                          if (typeof viewingProduct.pricing_tiers === 'string') {
                            if (viewingProduct.pricing_tiers === '' || viewingProduct.pricing_tiers === '[]' || viewingProduct.pricing_tiers === 'null') {
                              console.log('Empty string data');
                              return <p className="text-gray-500 text-sm italic">No pricing set</p>;
                            }
                      
                            let tiersStr = unescapeJsonString(viewingProduct.pricing_tiers);
                            console.log('String to parse:', tiersStr);
                            tiers = JSON.parse(tiersStr);
                          } else if (Array.isArray(viewingProduct.pricing_tiers)) {
                            tiers = viewingProduct.pricing_tiers;
                            console.log('Already array:', tiers);
                          } else {
                            console.log('Unknown format, showing as-is');
                            return (
                              <div>
                                <p className="text-orange-500 text-xs">Unknown format</p>
                                <p className="text-xs text-gray-400">{JSON.stringify(viewingProduct.pricing_tiers)}</p>
                              </div>
                            );
                          }
                    
                          console.log('Final tiers to display:', tiers);
                    
                          // Show ALL tiers, no filtering
                          if (Array.isArray(tiers) && tiers.length > 0) {
                            return (
                              <div className="space-y-1">
                                {tiers.map((tier, index) => (
                                  <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                    <span className="font-medium">Min {tier.min || 1} units</span>
                                    <span className="text-green-600 font-bold">₹{parseFloat(tier.price || 0).toFixed(2)}/unit</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } else {
                            console.log('Empty array, checking for other price fields...');
                      
                            // Check if there's a direct price field
                            if (viewingProduct.price && !isNaN(parseFloat(viewingProduct.price))) {
                              console.log('Found direct price field:', viewingProduct.price);
                              return (
                                <div className="bg-gray-50 p-2 rounded text-sm">
                                  <span className="text-green-600 font-bold text-lg">₹{parseFloat(viewingProduct.price).toFixed(2)}</span>
                                </div>
                              );
                            }
                      
                            // Show a default pricing tier for editing
                            console.log('No pricing data found, showing default');
                            return (
                              <div>
                                <p className="text-gray-500 text-sm italic mb-2">No pricing set</p>
                                <div className="bg-yellow-50 p-2 rounded text-sm border border-yellow-200">
                                  <span className="text-yellow-700 text-xs">Click Edit to add pricing</span>
                                </div>
                              </div>
                            );
                          }
                    
                        } catch (e) {
                          console.error('❌ Parse error:', e);
                          return (
                            <div>
                              <p className="text-red-500 text-xs">Error: {e.message}</p>
                              <p className="text-xs text-gray-400 mt-1">Raw: {String(viewingProduct.pricing_tiers)}</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  {viewingProduct.detail && (
                    <div className="mt-4 bg-white p-5 rounded-xl shadow-md">
                      <p className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <span className="text-lg">📄</span>
                        Product Description
                      </p>
                      <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {viewingProduct.detail}
                      </p>
                    </div>
                  )}
                  {viewingProduct.specification && (
                    <div className="mt-4 bg-white p-5 rounded-xl shadow-md">
                      <p className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <span className="text-lg">⚙️</span>
                        Technical Specifications
                      </p>
                      <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {viewingProduct.specification}
                      </p>
                    </div>
                  )}
                  {viewingProduct.product_catalogue && (
                    <div className="mt-4 bg-white p-5 rounded-xl shadow-md">
                      <p className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <span className="text-lg">📚</span>
                        Product Catalogue
                      </p>
                      {isPDF(viewingProduct.product_catalogue) ? (
                        <a
                          href={getImageUrl(viewingProduct.product_catalogue)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 transition-colors font-semibold"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          View PDF Catalogue
                        </a>
                      ) : (
                        <ProductImage
                          src={viewingProduct.product_catalogue}
                          alt="Product Catalogue"
                          className="w-full max-w-md h-auto rounded-lg border-2 border-gray-200 shadow-md"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="sticky bottom-0 bg-gradient-to-r from-gray-100 to-gray-200 border-t-2 border-gray-300 p-6 rounded-b-2xl">
              <div className="flex gap-4">
                <button
                  onClick={() => handleEditProduct(viewingProduct)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-bold shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Product
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingProduct(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-bold shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ADD/EDIT PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Fill in the product information below. Images will be auto-compressed to reduce upload size.
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* PROMINENT PRICING TIERS VALIDATION ERROR - MOVED TO TOP */}
              {formErrors.pricing_tiers && (
                <div className="p-6 bg-red-50 border-2 border-red-300 rounded-xl shadow-xl mb-6 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <svg className="w-12 h-12 text-red-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-red-800 mb-3">⚠️ Critical Validation Error</h3>
                      <p className="text-lg text-red-700 leading-relaxed mb-4">{formErrors.pricing_tiers}</p>
                      <p className="text-base text-red-600 font-semibold">
                        Please correct the pricing tiers before saving. Each subsequent minimum quantity must be strictly greater than the previous one.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, name: e.target.value });
                        if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                      }}
                      className={`w-full px-4 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="e.g., Premium Cotton T-Shirt"
                    />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU (Stock Keeping Unit) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newProduct.sku}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, sku: e.target.value });
                        if (formErrors.sku) setFormErrors({ ...formErrors, sku: null });
                      }}
                      className={`w-full px-4 py-2 border ${formErrors.sku ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="e.g., TSHIRT-001"
                    />
                    {formErrors.sku && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {formErrors.sku}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                    <input
                      type="text"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Nike"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MOQ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={newProduct.moq}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, moq: parseInt(e.target.value) || 1 });
                        if (formErrors.moq) setFormErrors({ ...formErrors, moq: null });
                      }}
                      className={`w-full px-4 py-2 border ${formErrors.moq ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      min="1"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-4">Category Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newProduct.cat_id}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, cat_id: e.target.value, cat_sub_id: '' });
                        if (formErrors.cat_id) setFormErrors({ ...formErrors, cat_id: null });
                      }}
                      className={`w-full px-4 py-2 border ${formErrors.cat_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.category_name}
                        </option>
                      ))}
                    </select>
                    {formErrors.cat_id && <p className="text-red-500 text-xs mt-1">{formErrors.cat_id}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sub Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newProduct.cat_sub_id}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, cat_sub_id: e.target.value });
                        if (formErrors.cat_sub_id) setFormErrors({ ...formErrors, cat_sub_id: null });
                      }}
                      className={`w-full px-4 py-2 border ${formErrors.cat_sub_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      disabled={!newProduct.cat_id}
                    >
                      <option value="">Select Sub Category</option>
                      {newProduct.cat_id && getSubCategoriesByCategory(newProduct.cat_id).map(subCategory => (
                        <option key={subCategory.id} value={subCategory.id}>
                          {subCategory.subcategory_name || 'Unnamed Subcategory'}
                        </option>
                      ))}
                    </select>
                    {formErrors.cat_sub_id && <p className="text-red-500 text-xs mt-1">{formErrors.cat_sub_id}</p>}
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Product Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                    <input
                      type="text"
                      value={newProduct.material}
                      onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Made In</label>
                    <input
                      type="text"
                      value={newProduct.made_in}
                      onChange={(e) => setNewProduct({ ...newProduct, made_in: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warranty</label>
                    <input
                      type="text"
                      value={newProduct.warranty}
                      onChange={(e) => setNewProduct({ ...newProduct, warranty: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newProduct.detail}
                      onChange={(e) => setNewProduct({ ...newProduct, detail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                    <textarea
                      value={newProduct.specification}
                      onChange={(e) => setNewProduct({ ...newProduct, specification: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-900 mb-4">Product Images (Auto-Compressed)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImageUploadField label="Featured Image" fieldName="f_image" />
                  <ImageUploadField label="Image 2" fieldName="image_2" />
                  <ImageUploadField label="Image 3" fieldName="image_3" />
                  <ImageUploadField label="Image 4" fieldName="image_4" />
                  <div className="md:col-span-2">
                    <ImageUploadField label="Product Catalogue" fieldName="product_catalogue" acceptType="image/*,application/pdf" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
                {formErrors.pricing_tiers && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-red-800">⚠️ Critical Validation Error</h4>
                        <p className="text-sm text-red-700">{formErrors.pricing_tiers}</p>
                        <p className="text-xs text-red-600 mt-1">Please correct the pricing tiers before saving. Each subsequent minimum quantity must be strictly greater than the previous one.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Tiers</label>
                    <div className="space-y-3">
                      {pricingTiers.map((tier, index) => (
                        <div key={index} className="flex gap-3 items-end bg-white p-3 rounded-lg border border-gray-200">
                          <input
                            type="number"
                            placeholder="Min Quantity (e.g., 1)"
                            value={tier.min}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className={`flex-1 px-3 py-2 border ${index === formErrors.pricing_tiers_invalid_index ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-300'} rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            min="1"
                          />
                          <input
                            type="number"
                            placeholder="Price (e.g., 99.99)"
                            value={tier.price}
                            onChange={(e) => handlePriceChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0"
                          />
                          {/* ✅ FIX: Disable remove if only one tier to prevent empty list */}
                          <button
                            type="button"
                            onClick={() => {
                              if (pricingTiers.length > 1) {
                                const newTiers = pricingTiers.filter((_, i) => i !== index);
                                setPricingTiers(newTiers);
                                updatePricingTiers(newTiers);
                              }
                            }}
                            disabled={pricingTiers.length === 1}
                            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const lastTier = pricingTiers[pricingTiers.length - 1];
                          const nextMin = lastTier && lastTier.min ? (parseInt(lastTier.min) + 1).toString() : '';
                          const newTiers = [...pricingTiers, { min: nextMin, price: '' }];
                          setPricingTiers(newTiers);
                          updatePricingTiers(newTiers);
                        }}
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Price Tier
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Add multiple pricing options based on quantity tiers (e.g., lower price for higher volumes). Leave empty for no tiers. Empty rows will be ignored. New tiers auto-start with min quantity higher than previous.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
              <div className="flex gap-3">
                <button
                  onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                  disabled={submitLoading}
                  className={`flex-1 ${submitLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white py-3 rounded-lg transition-colors font-semibold shadow-md flex items-center justify-center gap-2`}
                >
                  {submitLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  disabled={submitLoading}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;