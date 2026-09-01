import { useCallback, useState } from "react";

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILES = 8;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp";

export interface ImageList {
  files: File[];
  error: string | null;
  addFiles: (incoming: File[] | FileList) => void;
  removeFile: (index: number) => void;
  clear: () => void;
}

export function useImageList(): ImageList {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((incoming: File[] | FileList) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;
    setError(null);

    const accepted: File[] = [];
    for (const file of list) {
      const extensionAccepted = ALLOWED_TYPES.includes(file.type);
      if (!extensionAccepted) {
        setError(`不支持的文件格式：${file.name}（仅支持 JPG / JPEG / PNG / WEBP）`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`文件过大：${file.name}（单张不能超过 10 MB）`);
        continue;
      }
      accepted.push(file);
    }

    setFiles((prev) => {
      const room = Math.max(0, MAX_FILES - prev.length);
      if (accepted.length > room) {
        setError(`最多上传 ${MAX_FILES} 张图片，已超出部分被忽略。`);
      }
      return [...prev, ...accepted.slice(0, room)];
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  return { files, error, addFiles, removeFile, clear };
}
