import { useRef, useState, useCallback } from 'react'
import { Upload, X, FileImage, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadedFile {
  file: File
  preview?: string
  id: string
}

interface FileUploadZoneProps {
  onFilesChange: (files: File[]) => void
  accept?: string
  maxFiles?: number
  maxSizeMb?: number
  label?: string
  className?: string
}

export function FileUploadZone({
  onFilesChange,
  accept = 'image/*,.pdf,.doc,.docx',
  maxFiles = 10,
  maxSizeMb = 25,
  label = 'Træk filer hertil eller klik for at vælge',
  className,
}: FileUploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return
      setError(null)

      const arr = Array.from(newFiles)
      const oversized = arr.filter((f) => f.size > maxSizeMb * 1024 * 1024)
      if (oversized.length > 0) {
        setError(`Filer må ikke overstige ${maxSizeMb} MB`)
        return
      }

      const updated = [
        ...files,
        ...arr.slice(0, maxFiles - files.length).map((file) => ({
          file,
          id: Math.random().toString(36).slice(2),
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        })),
      ]

      setFiles(updated)
      onFilesChange(updated.map((u) => u.file))
    },
    [files, maxFiles, maxSizeMb, onFilesChange],
  )

  const removeFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id)
    setFiles(updated)
    onFilesChange(updated.map((u) => u.file))
  }

  return (
    <div className={className}>
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-gray-100',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm font-display font-medium text-gray-700">{label}</p>
        <p className="mt-1 text-xs text-gray-500">Maks {maxSizeMb} MB per fil · Maks {maxFiles} filer</p>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {files.map(({ id, file, preview }) => (
            <div key={id} className="relative group rounded-md border border-gray-200 bg-white p-2">
              {preview ? (
                <img src={preview} alt={file.name} className="h-16 w-full object-cover rounded" />
              ) : (
                <div className="flex h-16 items-center justify-center">
                  <File className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <p className="mt-1 text-xs text-gray-600 truncate">{file.name}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(id) }}
                className="absolute -right-1.5 -top-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
