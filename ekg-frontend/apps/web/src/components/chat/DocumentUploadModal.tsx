'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    targetType: 'DuAn' | 'PhongBan' | 'CongTy';
    targetId: string;
    targetName: string;
  };
  onSuccess: (result: any) => void;
}

const ALLOWED_FILE_TYPES = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.json',
  '.xlsx',
  '.pptx',
  '.csv',
];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export function DocumentUploadModal({
  isOpen,
  onClose,
  config,
  onSuccess,
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [ten, setTen] = useState('');
  const [moTa, setMoTa] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const selectedFile = acceptedFiles[0];
    
    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File quá lớn! Kích thước tối đa 200MB.');
      return;
    }

    // Validate file type
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExt)) {
      setError(`Định dạng file không hỗ trợ. Chỉ chấp nhận: ${ALLOWED_FILE_TYPES.join(', ')}`);
      return;
    }

    setFile(selectedFile);
    // Auto-fill name if empty
    if (!ten) {
      setTen(selectedFile.name.replace(/\.[^/.]+$/, '')); // Remove extension
    }
  }, [ten]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Vui lòng chọn file!');
      return;
    }
    
    if (!ten.trim()) {
      setError('Vui lòng nhập tên tài liệu!');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ten', ten.trim());
      formData.append('targetType', config.targetType);
      formData.append('targetId', config.targetId);
      
      if (moTa.trim()) {
        formData.append('mo_ta', moTa.trim());
      }
      
      if (tags.trim()) {
        formData.append('tags', tags.trim());
      }

      // Simulate progress (real progress would need XHR or axios)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload thất bại');
      }

      const result = await response.json();
      
      // Success!
      setTimeout(() => {
        onSuccess(result);
        resetForm();
        onClose();
      }, 500);

    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi upload');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTen('');
    setMoTa('');
    setTags('');
    setUploadProgress(0);
    setError(null);
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  const getTargetLabel = () => {
    switch (config.targetType) {
      case 'DuAn':
        return 'dự án';
      case 'PhongBan':
        return 'phòng ban';
      case 'CongTy':
        return 'công ty';
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                📎 Upload Tài Liệu
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Upload cho {getTargetLabel()}: <span className="font-medium">{config.targetName}</span>
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              disabled={uploading}
            >
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Dropzone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File tài liệu *
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : file
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input {...getInputProps()} />
                
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-green-500" />
                    <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Click để chọn file khác</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      {isDragActive ? 'Thả file vào đây' : 'Kéo thả file hoặc click để chọn'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Hỗ trợ: PDF, DOCX, TXT, MD, JSON, XLSX, PPTX, CSV
                    </p>
                    <p className="text-xs text-gray-400">Tối đa 200MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <label htmlFor="ten" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tên tài liệu *
              </label>
              <input
                id="ten"
                type="text"
                value={ten}
                onChange={(e) => setTen(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Nhập tên tài liệu"
                required
                minLength={3}
              />
            </div>

            <div>
              <label htmlFor="moTa" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mô tả
              </label>
              <textarea
                id="moTa"
                value={moTa}
                onChange={(e) => setMoTa(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                placeholder="Mô tả ngắn gọn về tài liệu"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Phân cách bằng dấu phẩy: quan-trong, noi-bo"
              />
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Đang upload...</span>
                  <span className="font-medium text-blue-600">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!file || !ten.trim() || uploading}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang upload...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
