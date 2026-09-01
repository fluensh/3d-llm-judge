import ImagePreview from "./ImagePreview";

interface ImageCompareGalleryProps {
  referenceImages: File[];
  candidateImages: File[];
}

function GalleryColumn({
  title,
  images,
  accent,
}: {
  title: string;
  images: File[];
  accent: string;
}) {
  return (
    <div>
      <p className={`mb-2 text-sm font-semibold ${accent}`}>{title}</p>
      {images.length === 0 ? (
        <p className="text-sm text-gray-400">无图片</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {images.map((file, index) => (
            <li key={index} className="w-28">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <ImagePreview file={file} alt={file.name} className="h-28 w-full object-cover" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ImageCompareGallery({ referenceImages, candidateImages }: ImageCompareGalleryProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">图片对比</h3>
      <p className="text-xs text-gray-500">Reference vs. Candidate — 便于人工复核 Evidence</p>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <GalleryColumn title="Reference" images={referenceImages} accent="text-blue-700" />
        <p className="hidden pt-10 text-sm font-medium text-gray-400 md:block">vs.</p>
        <GalleryColumn title="Candidate" images={candidateImages} accent="text-emerald-700" />
      </div>
    </section>
  );
}
