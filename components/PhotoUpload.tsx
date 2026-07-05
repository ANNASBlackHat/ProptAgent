'use client';

import React, { useCallback, useRef, useState } from 'react';

export interface StoredFile {
  url: string;
  fileId: string;
  provider: string;
}

interface PhotoUploadProps {
  /** Already-persisted URLs or objects (from the server) */
  existingPhotos?: (string | StoredFile)[];
  /** Called with the final merged list of objects */
  onChange: (photos: StoredFile[]) => void;
  maxFiles?: number;
  className?: string;
}

interface PreviewItem {
  id: string;
  src: string;
  persisted: boolean;
  serverUrl?: string;
  fileId?: string;
  provider?: string;
}

export default function PhotoUpload({
  existingPhotos = [],
  onChange,
  maxFiles = 5,
  className = '',
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [previews, setPreviews] = useState<PreviewItem[]>(() =>
    existingPhotos.map((item) => {
      const isStr = typeof item === 'string';
      const url = isStr ? item : item.url;
      const fileId = isStr ? item : item.fileId || item.url;
      const provider = isStr ? 'local' : item.provider || 'local';
      return {
        id: fileId,
        src: url,
        persisted: true,
        serverUrl: url,
        fileId: fileId,
        provider: provider,
      };
    })
  );

  const notifyParent = useCallback(
    (items: PreviewItem[]) => {
      const photos = items
        .filter((i) => i.persisted && i.serverUrl)
        .map((i) => ({
          url: i.serverUrl!,
          fileId: i.fileId || i.serverUrl!,
          provider: i.provider || 'local',
        }));
      onChange(photos);
    },
    [onChange]
  );

  const uploadFiles = useCallback(
    async (files: FileList) => {
      const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
      const valid = Array.from(files).filter((f) => ACCEPTED.includes(f.type));

      if (valid.length === 0) {
        setUploadError('Only JPG, PNG, and WebP images are accepted.');
        return;
      }

      const remaining = maxFiles - previews.length;
      if (remaining <= 0) {
        setUploadError(`Maximum ${maxFiles} photos allowed.`);
        return;
      }

      const toUpload = valid.slice(0, remaining);
      setUploadError(null);

      // Create optimistic local previews
      const newPreviews: PreviewItem[] = toUpload.map((file) => ({
        id: `local-${Date.now()}-${Math.random()}`,
        src: URL.createObjectURL(file),
        persisted: false,
      }));

      const updated = [...previews, ...newPreviews];
      setPreviews(updated);

      // Upload to server
      setIsUploading(true);
      try {
        const formData = new FormData();
        toUpload.forEach((f) => formData.append('files', f));

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        const serverFiles: StoredFile[] = data.data.files || data.data.urls.map((u: string) => ({
          url: u,
          fileId: u,
          provider: 'local',
        }));

        // Replace optimistic previews with server URLs
        setPreviews((prev) => {
          const next = [...prev];
          let fileIdx = 0;
          for (let i = 0; i < next.length; i++) {
            if (!next[i].persisted && fileIdx < serverFiles.length) {
              // Revoke object URL to free memory
              URL.revokeObjectURL(next[i].src);
              next[i] = {
                ...next[i],
                src: serverFiles[fileIdx].url,
                persisted: true,
                serverUrl: serverFiles[fileIdx].url,
                fileId: serverFiles[fileIdx].fileId,
                provider: serverFiles[fileIdx].provider,
              };
              fileIdx++;
            }
          }
          notifyParent(next);
          return next;
        });
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        // Remove optimistic previews on failure
        setPreviews((prev) => {
          const reverted = prev.filter((p) => p.persisted);
          notifyParent(reverted);
          return reverted;
        });
      } finally {
        setIsUploading(false);
      }
    },
    [previews, maxFiles, notifyParent]
  );

  const handleRemove = (id: string) => {
    setPreviews((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item && !item.persisted) URL.revokeObjectURL(item.src);
      const next = prev.filter((p) => p.id !== id);
      notifyParent(next);
      return next;
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const canAdd = previews.length < maxFiles && !isUploading;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload photos — drag and drop or click to browse"
        onClick={() => canAdd && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && canAdd && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 p-6 cursor-pointer select-none',
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : canAdd
            ? 'border-slate-600 bg-slate-800/50 hover:border-blue-500/70 hover:bg-blue-500/5'
            : 'border-slate-700 bg-slate-800/30 cursor-not-allowed opacity-60',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={handleInputChange}
          disabled={!canAdd}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Uploading…</p>
          </div>
        ) : (
          <>
            <svg
              className={`w-10 h-10 mb-2 ${isDragging ? 'text-blue-400' : 'text-slate-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 1.75 10.695"
              />
            </svg>
            <p className="text-sm font-medium text-slate-300">
              {isDragging ? 'Drop photos here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              JPG, PNG, WebP · Max 5 MB each · Up to {maxFiles} photos
            </p>
            {previews.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {previews.length}/{maxFiles} photos added
              </p>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {uploadError && (
        <p role="alert" className="text-xs text-red-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {uploadError}
        </p>
      )}

      {/* Thumbnails */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {previews.map((item) => (
            <div
              key={item.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt="Photo preview"
                className="w-full h-full object-cover"
              />

              {!item.persisted && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {item.persisted && (
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-red-500"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
