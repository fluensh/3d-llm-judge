import { useRef, useState, type DragEvent } from "react";
import ImagePreview from "./ImagePreview";
import { ACCEPT_ATTR, MAX_FILES, type ImageList } from "../hooks/useImageList";

interface ImageUploadSectionProps {
  titleZh: string;
  titleEn: string;
  hint?: string;
  list: ImageList;
}

export default function ImageUploadSection({ titleZh, titleEn, hint, list }: ImageUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { files, error, addFiles, removeFile } = list;

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{titleZh}</h2>
          <p className="text-sm text-gray-500">{titleEn}</p>
        </div>
        <span className={`text-sm font-medium ${files.length >= MAX_FILES ? "text-amber-600" : "text-gray-500"}`}>
          {files.length} / {MAX_FILES}
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        className={`mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
        }`}
      >
        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="mt-2 text-sm font-medium text-gray-700">拖拽图片到此处，或点击选择</p>
        <p className="mt-1 text-xs text-gray-500">支持 JPG / JPEG / PNG / WEBP，单张 ≤ 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {hint && <p className="mt-2 text-xs leading-5 text-gray-500">{hint}</p>}

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="group relative">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <ImagePreview
                  file={file}
                  alt={file.name}
                  className="h-28 w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`删除 ${file.name}`}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/80 text-white opacity-0 transition-opacity hover:bg-red-600 focus:opacity-100 group-hover:opacity-100"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="mt-1 truncate text-xs text-gray-500">{file.name}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
