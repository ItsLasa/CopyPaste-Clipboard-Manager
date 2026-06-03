export type ClipType =
  | 'text'
  | 'url'
  | 'color'
  | 'code'
  | 'email'
  | 'json'
  | 'svg'
  | 'html'
  | 'image'
  | 'file'

export interface Clip {
  id: number
  contentHash: string
  type: ClipType
  textValue: string | null
  blobPath: string | null
  sourceApp: string | null
  sourceTitle: string | null
  byteSize: number
  isSensitive: boolean
  isPinned: boolean
  createdAt: number
  lastUsedAt: number
  useCount: number
  categories?: number[]
}

export interface Category {
  id: number
  name: string
  icon: string | null
  color: string | null
  sortOrder: number
}

export interface CapturePayload {
  type: ClipType
  text?: string
  html?: string
  imageBuffer?: Buffer
  filePaths?: string[]
}
