import React, { useState, useRef } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from './icons/Icons';
import { useApp } from '@/context/AppContext';
import { PRODUCT_CATEGORIES } from '@/constants/categories';

interface ProductDetailsPageProps {
  productName: string;
  onBack: () => void;
  onSubmit: (attachments?: File[]) => void;
}

const UNITS = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'liters', label: 'Liters (L)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'meters', label: 'Meters (m)' },
  { value: 'feet', label: 'Feet (ft)' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'packets', label: 'Packets' },
  { value: 'dozens', label: 'Dozens' },
  { value: 'sets', label: 'Sets' },
  { value: 'pairs', label: 'Pairs' },
];

const FRAGRANCES = [
  'None',
  'Lavender',
  'Rose',
  'Jasmine',
  'Sandalwood',
  'Lemon',
  'Orange',
  'Mint',
  'Vanilla',
  'Coconut',
  'Aloe Vera',
  'Neem',
  'Other'
];

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/msword', // doc
  'application/vnd.ms-excel', // xls
];

const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({ productName, onBack, onSubmit }) => {
  const { productRequirement, setProductRequirement } = useApp();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showFragrance = productName.toLowerCase().includes('soap') || 
                        productName.toLowerCase().includes('perfume') ||
                        productName.toLowerCase().includes('shampoo') ||
                        productName.toLowerCase().includes('detergent') ||
                        productName.toLowerCase().includes('freshener');

  const handleChange = (field: string, value: string | number) => {
    setProductRequirement({ ...productRequirement, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File type not allowed: ${file.name}. Allowed types: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${file.name}. Maximum size is 10MB`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setAttachmentError('');
    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check if we've reached max files
      if (attachments.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        break;
      }

      // Check if file already exists
      if (attachments.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`File already added: ${file.name}`);
        continue;
      }

      // Validate file
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        continue;
      }

      newFiles.push(file);
    }

    if (errors.length > 0) {
      setAttachmentError(errors.join('. '));
    }

    if (newFiles.length > 0) {
      setAttachments(prev => [...prev, ...newFiles]);
    }

    // Reset input
    e.target.value = '';
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAttachmentError('');
    const file = files[0];

    // Check if we've reached max files
    if (attachments.length >= MAX_FILES) {
      setAttachmentError(`Maximum ${MAX_FILES} files allowed`);
      e.target.value = '';
      return;
    }

    // Validate file
    const error = validateFile(file);
    if (error) {
      setAttachmentError(error);
      e.target.value = '';
      return;
    }

    setAttachments(prev => [...prev, file]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentError('');
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (file.type === 'application/pdf') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    if (file.type.includes('word') || file.type.includes('document')) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
      return (
        <svg className="w-5 h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!productRequirement.category) {
      newErrors.category = 'Please select a category';
    }
    if (!productRequirement.brand.trim()) {
      newErrors.brand = 'Please enter brand or make';
    }
    if (!productRequirement.quantity || productRequirement.quantity <= 0) {
      newErrors.quantity = 'Please enter valid quantity';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(attachments.length > 0 ? attachments : undefined);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Product Details</h1>
            <p className="text-sm text-gray-500">Step 2 of 3</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"></div>
        </div>
      </div>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Product summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">Your requirement:</p>
            <p className="text-gray-800 font-semibold">{productName}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={productRequirement.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all bg-white ${
                  errors.category 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              >
                <option value="">Select a category</option>
                {PRODUCT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>

            {/* Brand/Make */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand / Make <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={productRequirement.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="e.g., Dove, Lux, Any brand"
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${
                  errors.brand 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={productRequirement.quantity}
                  onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${
                    errors.quantity 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit of Measurement
                </label>
                <select
                  value={productRequirement.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white"
                >
                  {UNITS.map(unit => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fragrance (conditional) */}
            {showFragrance && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fragrance Preference
                </label>
                <select
                  value={productRequirement.fragrance}
                  onChange={(e) => handleChange('fragrance', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white"
                >
                  <option value="">Select fragrance (optional)</option>
                  {FRAGRANCES.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details
              </label>
              <textarea
                value={productRequirement.details}
                onChange={(e) => handleChange('details', e.target.value)}
                placeholder="Any specific requirements, preferred delivery time, budget range, etc."
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
              />
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Add images or documents to help sellers understand your requirement better. 
                Supported: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (Max 10MB each, up to 5 files)
              </p>

              {/* Upload buttons */}
              <div className="flex gap-3 mb-4">
                {/* File upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= MAX_FILES}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm text-gray-600">Attach Files</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_EXTENSIONS}
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Camera capture button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={attachments.length >= MAX_FILES}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm text-gray-600">Take Photo</span>
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />
              </div>

              {/* Attachment error */}
              {attachmentError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{attachmentError}</p>
                </div>
              )}

              {/* Attached files list */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      {/* File preview for images */}
                      {file.type.startsWith('image/') ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {getFileIcon(file)}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 text-right">
                    {attachments.length}/{MAX_FILES} files attached
                  </p>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProductDetailsPage;
