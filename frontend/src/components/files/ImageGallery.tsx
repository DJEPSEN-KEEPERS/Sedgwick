import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GalleryImage {
  id: string
  blobUrl: string
  fileName: string
  fileType: string
}

interface ImageGalleryProps {
  images: GalleryImage[]
  className?: string
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const imageItems = images.filter((img) => img.fileType.startsWith('image/'))

  if (imageItems.length === 0) return null

  const prev = () =>
    setLightboxIndex((i) => (i !== null ? (i - 1 + imageItems.length) % imageItems.length : null))
  const next = () =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % imageItems.length : null))

  return (
    <>
      <div className={`grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 ${className ?? ''}`}>
        {imageItems.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100"
          >
            <img
              src={img.blobUrl}
              alt={img.fileName}
              className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 text-white/80 hover:text-white"
          >
            <X className="h-8 w-8" />
          </button>

          <button onClick={prev} className="absolute left-4 text-white/80 hover:text-white">
            <ChevronLeft className="h-10 w-10" />
          </button>

          <div className="flex flex-col items-center gap-3 max-w-4xl w-full">
            <img
              src={imageItems[lightboxIndex].blobUrl}
              alt={imageItems[lightboxIndex].fileName}
              className="max-h-[80vh] w-auto rounded-lg object-contain"
            />
            <div className="flex items-center gap-3">
              <p className="text-sm text-white/80">{imageItems[lightboxIndex].fileName}</p>
              <a
                href={imageItems[lightboxIndex].blobUrl}
                download={imageItems[lightboxIndex].fileName}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </div>
            <p className="text-xs text-white/40">
              {lightboxIndex + 1} / {imageItems.length}
            </p>
          </div>

          <button onClick={next} className="absolute right-4 text-white/80 hover:text-white">
            <ChevronRight className="h-10 w-10" />
          </button>
        </div>
      )}
    </>
  )
}
