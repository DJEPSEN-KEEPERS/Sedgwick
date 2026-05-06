import { Download, FileText, Image, Video, FileArchive } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'
import { ImageGallery } from '@/components/files/ImageGallery'

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

export function FilesTab({ projectId }: { projectId: string }) {
  const { data, loading } = useApi<ProjectFiles>(`/projects/${projectId}/files`)

  if (loading) return <Skeleton />

  const files = data ?? { projectDocuments: [], bidAttachments: [], statusUpdatePhotos: {}, finalReportFiles: {}, chatAttachments: [] }

  return (
    <div className="space-y-6">
      <FileSection title="Sagsdokumenter" files={files.projectDocuments} />
      <FileSection title="Tilbudsbilag" files={files.bidAttachments} />

      {Object.entries(files.statusUpdatePhotos).map(([label, fileList]) => (
        <FileSection key={label} title={`Statusfotos — ${label}`} files={fileList} showGallery />
      ))}

      {Object.entries(files.finalReportFiles).map(([label, fileList]) => (
        <FileSection key={label} title={`Slutrapport — ${label}`} files={fileList} />
      ))}

      <FileSection title="Chatvedhæftninger" files={files.chatAttachments} />
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
      {showGallery && images.length > 0 && (
        <ImageGallery images={images} className="mb-3" />
      )}
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
