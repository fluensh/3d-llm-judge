import { useEffect, useState } from "react";

interface ImagePreviewProps {
  file: File;
  alt: string;
  className?: string;
}

/** Creates and revokes an object URL for the given file. */
export default function ImagePreview({ file, alt, className }: ImagePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) {
    return <div className={`${className ?? ""} bg-gray-100`} aria-label={alt} />;
  }

  return <img src={url} alt={alt} className={className} />;
}
