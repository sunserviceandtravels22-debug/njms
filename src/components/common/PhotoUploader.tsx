'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Link as LinkIcon, X, Check, Image as ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  photoUrl?: string;
  photoDriveUrl?: string;
  onChange: (data: { photoUrl?: string; photoDriveUrl?: string }) => void;
  kind?: string; // 'CUS', 'DOC', etc.
  label?: string;
}

export function PhotoUploader({
  photoUrl,
  photoDriveUrl,
  onChange,
  kind = 'CUS',
  label = 'Customer Photo (WebP Auto-Convert)',
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDriveInput, setShowDriveInput] = useState(Boolean(photoDriveUrl));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  /**
   * Client-side WebP compression engine (0.92 quality)
   */
  const convertToWebPAndUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');

      // Max size bounding box for web/avatars while maintaining aspect ratio
      const maxDim = 1200;
      let width = imageBitmap.width;
      let height = imageBitmap.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(imageBitmap, 0, 0, width, height);

      // Convert to WebP blob @ 0.92 quality
      const webpBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.92);
      });

      if (!webpBlob) throw new Error('WebP compression failed');

      const formData = new FormData();
      formData.append('file', webpBlob, `photo_${Date.now()}.webp`);
      formData.append('kind', kind);

      const res = await fetch('/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Upload failed');
      }

      onChange({
        photoUrl: json.data.url,
        photoDriveUrl,
      });
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      convertToWebPAndUpload(file);
    }
  };

  const handleDriveUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({
      photoUrl,
      photoDriveUrl: val,
    });
  };

  const handleRemove = () => {
    onChange({ photoUrl: '', photoDriveUrl: photoDriveUrl || '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-3">
      {label && <label className="block text-sm font-medium text-amber-900">{label}</label>}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl border border-amber-200 bg-amber-50/40">
        {/* Preview Avatar */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-8 h-8 text-amber-400" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-white text-xs font-semibold">
              Converting...
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-2 w-full">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 active:scale-95 transition min-h-[44px]"
            >
              <Camera className="w-4 h-4" /> Camera
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 active:scale-95 transition min-h-[44px]"
            >
              <Upload className="w-4 h-4" /> Upload File
            </button>
            <button
              type="button"
              onClick={() => setShowDriveInput(!showDriveInput)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 min-h-[44px]"
            >
              <LinkIcon className="w-4 h-4 text-blue-600" /> Drive Link
            </button>
            {photoUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 min-h-[44px]"
              >
                <X className="w-4 h-4" /> Remove
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-amber-800">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
              <Check className="w-3 h-3" /> WebP 0.92 Auto-Lossless
            </span>
            <span className="text-stone-500">Fast & light storage</span>
          </div>
        </div>
      </div>

      {/* Optional Drive URL Input */}
      {showDriveInput && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
          <label className="block text-xs font-medium text-blue-900">
            Google Drive Preview Link (Optional Backup)
          </label>
          <input
            type="url"
            value={photoDriveUrl || ''}
            onChange={handleDriveUrlChange}
            placeholder="https://drive.google.com/file/d/..."
            className="w-full text-xs px-3 py-2 rounded border border-blue-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
