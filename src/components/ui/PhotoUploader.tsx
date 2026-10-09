'use client';

import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, RefreshCw } from 'lucide-react';

interface PhotoUploaderProps {
  label?: string;
  onPhotoUploaded: (url: string) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  label = 'WebP Direct Photo Upload',
  onPhotoUploaded,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'PHOTO');

      const res = await fetch('/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.ok && json.data?.url) {
        setPreviewUrl(json.data.url);
        onPhotoUploaded(json.data.url);
      } else {
        alert(json.error || 'Upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'Photo upload error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-text-muted block">{label}</label>
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <img src={previewUrl} alt="Uploaded" className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-surface-2 border border-dashed border-border flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6 text-text-muted" />
          </div>
        )}

        <label className="flex-1 cursor-pointer">
          <div className="px-3 py-2 bg-surface-2 border border-border hover:bg-border rounded-xl text-xs font-bold text-text flex items-center justify-center gap-2 transition-colors">
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                <span>Uploading WebP 0.92...</span>
              </>
            ) : previewUrl ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Change Photo</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-primary" />
                <span>Upload / Take Photo</span>
              </>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      </div>
    </div>
  );
};
