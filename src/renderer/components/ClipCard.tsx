import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Link, Palette, Code, Mail, FileImage, Pin, Trash2, Copy, MoreHorizontal,
} from 'lucide-react'
import type { Clip, ClipType } from '@shared/types'
import { ColorSwatch } from './ColorSwatch'
import { CodeBlock } from './CodeBlock'
import { ImageThumb } from './ImageThumb'

const typeIcons: Record<ClipType, React.FC<{ size?: number }>> = {
  text: FileText, url: Link, color: Palette, code: Code,
  email: Mail, json: Code, svg: FileImage, html: Code,
  image: FileImage, file: FileText,
}

const typeLabels: Record<ClipType, string> = {
  text: 'Text', url: 'Link', color: 'Color', code: 'Code',
  email: 'Email', json: 'JSON', svg: 'SVG', html: 'HTML',
  image: 'Image', file: 'File',
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

interface ClipCardProps {
  clip: Clip
  onPin: (id: number) => void
  onDelete: (id: number) => void
  onCopy: (id: number) => void
}

export function ClipCard({ clip, onPin, onDelete, onCopy }: ClipCardProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const Icon = typeIcons[clip.type] ?? FileText

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setMenuOpen((prev) => !prev)
  }, [])

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (clip.blobPath) {
        e.preventDefault()
        e.stopPropagation()
        window.api.send('drag:start', { clipId: clip.id, blobPath: clip.blobPath })
      }
    },
    [clip.id, clip.blobPath]
  )

  const truncate = (text: string | null, max: number): string => {
    if (!text) return ''
    return text.length > max ? text.slice(0, max) + '…' : text
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className={`relative group bg-bg-elevated rounded-card border border-border shadow-card p-3 transition-colors ${
        clip.blobPath ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } hover:border-accent/30`}
      draggable={!!clip.blobPath}
      onDragStart={handleDragStart}
      onContextMenu={handleContextMenu}
      onClick={() => onCopy(clip.id)}
    >
      {/* Type badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon size={14} className="text-fg-subtle" />
          <span className="text-[11px] text-fg-subtle">{typeLabels[clip.type]}</span>
        </div>
        <div className="flex items-center gap-1">
          {clip.isPinned && <Pin size={12} className="text-accent" />}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((prev) => !prev)
            }}
            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-bg transition-all"
          >
            <MoreHorizontal size={14} className="text-fg-muted" />
          </button>
        </div>
      </div>

      {/* Type-specific preview */}
      <div className="mb-2">
        {clip.type === 'color' && clip.textValue ? (
          <ColorSwatch color={clip.textValue} />
        ) : clip.type === 'code' && clip.textValue ? (
          <CodeBlock code={clip.textValue} />
        ) : clip.type === 'image' ? (
          <ImageThumb blobPath={clip.blobPath} />
        ) : (
          <p className="text-[12px] text-fg-muted leading-relaxed line-clamp-3 font-mono break-all">
            {clip.textValue ? truncate(clip.textValue, 150) : (
              <span className="italic text-fg-subtle">Empty clip</span>
            )}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-border">
        <span className="text-[10px] text-fg-subtle truncate max-w-[60%]">
          {clip.sourceApp ?? 'Unknown'}
        </span>
        <span className="text-[10px] text-fg-subtle">{formatTime(clip.createdAt)}</span>
      </div>

      {/* Context menu */}
      {menuOpen && (
        <div
          className="absolute right-2 top-8 z-50 bg-bg-elevated border border-border rounded-lg shadow-pop py-1 min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-fg hover:bg-bg transition-colors"
            onClick={() => {
              onCopy(clip.id)
              setMenuOpen(false)
            }}
          >
            <Copy size={13} /> Copy again
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-fg hover:bg-bg transition-colors"
            onClick={() => {
              onPin(clip.id)
              setMenuOpen(false)
            }}
          >
            <Pin size={13} /> {clip.isPinned ? 'Unpin' : 'Pin'}
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-danger hover:bg-bg transition-colors"
            onClick={() => {
              onDelete(clip.id)
              setMenuOpen(false)
            }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </motion.div>
  )
}
