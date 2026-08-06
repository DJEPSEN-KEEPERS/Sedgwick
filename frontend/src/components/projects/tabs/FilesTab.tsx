import { useState, useRef, useCallback } from 'react'
import { Download, FileText, Video, FileArchive, Upload, X, Loader2, CheckCircle2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'
import { ImageGallery } from '@/components/files/ImageGallery'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? '/api'
const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip'
const MAX_MB = 25

interface FileRecord {
  id: string
  fileName: string
  fileType: string
  blobUrl: string
  fileSizeMb: number
  uploadedByUserId: string
  attachmentCategory: string
  isClientVisible: boolean
  createdAt: string
}

interface ProjectFiles {
  projectDocuments: FileRecord[]
  bidAttachments: FileRecord[]
  statusUpdatePhotos: Record<string, FileRecord[]>
  finalReportFiles: Record<string, FileRecord[]>
  chatAttachments: FileRecord[]
}

async function uploadRaw(projectId: string, file: File, clientVisible: boolean): Promise<void> {
  const token = localStorage.getItem('accessToken') ?? ''
  const res = await fetch(
    `${BASE_URL}/projects/${projectId}/files?category=general&clientVisible=${clientVisible}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'X-Auth-Token': token,
      },
      body: file,
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? `Upload fejlede (${res.status})`)
  }
}

export function FilesTab({ projectId }: { projectId: string }) {
  const { data, loading, refetch } = useApi<ProjectFiles>(`/projects/${projectId}/files`)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [clientVisible, setClientVisible] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return
    const arr = Array.from(list).filter((f) => f.size <= MAX_MB * 1024 * 1024)
    setPendingFiles((prev) => [...prev, ...arr].slice(0, 10))
    setUploadError('')
    setUploadSuccess(false)
  }, [])

  const removeFile = (idx: number) =>
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return
    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)
    try {
      await Promise.all(pendingFiles.map((f) => uploadRaw(projectId, f, clientVisible)))
      setPendingFiles([])
      setUploadSuccess(true)
      refetch()
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload fejlede')
    } finally {
      setUploading(false)
    }
  }

  const raw = data as (ProjectFiles & { files?: unknown }) | null
  const files: ProjectFiles = {
    projectDocuments:   raw?.projectDocuments   ?? (Array.isArray(raw?.files) ? (raw.files as FileRecord[]) : []),
    bidAttachments:     raw?.bidAttachments      ?? [],
    statusUpdatePhotos: raw?.statusUpdatePhotos  ?? {},
    finalReportFiles:   raw?.finalReportFiles    ?? {},
    chatAttachments:    raw?.chatAttachments     ?? [],
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card p-4 space-y-3">
        <h3 className="text-sm font-display font-semibold text-gray-900">Upload filer</h3>

        <div
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-gray-100',
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-7 w-7 text-gray-400 mb-2" />
          <p className="text-sm font-display font-medium text-gray-700">Træk filer hertil eller klik for at vælge</p>
          <p className="mt-1 text-xs text-gray-400">Maks {MAX_MB} MB · billeder, PDF, Word, Excel, ZIP</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPT}
            multiple
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {pendingFiles.length > 0 && (
          <div className="space-y-1">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5">
                <span className="flex-1 text-xs text-gray-700 truncate">{f.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="rounded border-gray-300"
            />
            Synlig for forsikringsselskab
          </label>

          <div className="flex items-center gap-2 ml-auto">
            {uploadSuccess && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Uploadet
              </span>
            )}
            {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
            <Button
              size="sm"
              disabled={pendingFiles.length === 0 || uploading}
              onClick={handleUpload}
            >
              {uploading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Uploader...</>
              ) : (
                `Upload${pendingFiles.length > 0 ? ` (${pendingFiles.length})` : ''}`
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* File list */}
      {loading ? (
        <Skeleton />
      ) : (
        <>
          <FileSection title="Sagsdokumenter" files={files.projectDocuments} />
          <FileSection title="Tilbudsbilag" files={files.bidAttachments} />
          {Object.entries(files.statusUpdatePhotos).map(([label, fileList]) => (
            <FileSection key={label} title={`Statusfotos — ${label}`} files={fileList} showGallery />
          ))}
          {Object.entries(files.finalReportFiles).map(([label, fileList]) => (
            <FileSection key={label} title={`Slutrapport — ${label}`} files={fileList} />
          ))}
          <FileSection title="Chatvedhæftninger" files={files.chatAttachments} />
        </>
      )}
    </div>
  )
}

function FileSection({ title, files, showGallery }: { title: string; files: FileRecord[]; showGallery?: boolean }) {
  if (files.length === 0) return null
  const images = files.filter((f) => f.fileType.startsWith('image/'))
  const others = files.filter((f) => !f.fileType.startsWith('image/'))

  return (
    <div>
      <h3 className="text-sm font-display font-semibold text-gray-900 mb-3">{title}</h3>
      {showGallery && images.length > 0 && <ImageGallery images={images} className="mb-3" />}
      {others.length > 0 && (
        <div className="divide-y divide-[#e5e7eb] rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-card">
          {others.map((f) => <FileRow key={f.id} file={f} />)}
        </div>
      )}
    </div>
  )
}

function FileRow({ file }: { file: FileRecord }) {
  const Icon = file.fileType.startsWith('video/') ? Video : file.fileType === 'application/pdf' ? FileText : FileArchive

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
      <Icon className={`h-5 w-5 shrink-0 ${file.fileType === 'application/pdf' ? 'text-red-500' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-medium text-gray-900 truncate">{file.fileName}</p>
        <p className="text-xs text-gray-400">{file.fileSizeMb.toFixed(1)} MB · {formatDate(file.createdAt)}</p>
      </div>
      {file.isClientVisible && (
        <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 shrink-0">Synlig for klient</span>
      )}
      <a
        href={file.blobUrl}
        download={file.fileName}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-gray-400 hover:text-primary-600 transition-colors"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  )
}

function Skeleton() {
  return <div className="space-y-3 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}</div>
}
